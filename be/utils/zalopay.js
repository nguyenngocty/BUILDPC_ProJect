const crypto = require("crypto");
const axios = require("axios");

const getZaloPayConfig = () => {
    return {
        appId: Number(process.env.ZALOPAY_APP_ID || 0),

        key1: String(
            process.env.ZALOPAY_KEY1 || "",
        ).trim(),

        key2: String(
            process.env.ZALOPAY_KEY2 || "",
        ).trim(),

        createUrl: String(
            process.env.ZALOPAY_CREATE_URL ||
            "https://sb-openapi.zalopay.vn/v2/create",
        ).trim(),

        queryUrl: String(
            process.env.ZALOPAY_QUERY_URL ||
            "https://sb-openapi.zalopay.vn/v2/query",
        ).trim(),

        redirectUrl: String(
            process.env.ZALOPAY_REDIRECT_URL || "",
        ).trim(),

        callbackUrl: String(
            process.env.ZALOPAY_CALLBACK_URL || "",
        ).trim(),
    };
};

const createHmacSha256 = (data, key) => {
    return crypto
        .createHmac("sha256", key)
        .update(String(data))
        .digest("hex");
};

const safeCompare = (value1, value2) => {
    const a = Buffer.from(
        String(value1 || ""),
        "utf8",
    );

    const b = Buffer.from(
        String(value2 || ""),
        "utf8",
    );

    if (a.length !== b.length) {
        return false;
    }

    return crypto.timingSafeEqual(a, b);
};

const getVietnamDatePrefix = () => {
    const formatter = new Intl.DateTimeFormat(
        "en-CA",
        {
            timeZone: "Asia/Ho_Chi_Minh",
            year: "2-digit",
            month: "2-digit",
            day: "2-digit",
        },
    );

    const parts = formatter.formatToParts(
        new Date(),
    );

    const values = {};

    parts.forEach((part) => {
        if (part.type !== "literal") {
            values[part.type] = part.value;
        }
    });

    return `${values.year}${values.month}${values.day}`;
};

const createAppTransId = (orderCode) => {
    const code = String(orderCode || "").trim();

    if (!code) {
        throw new Error(
            "Không tìm thấy mã đơn hàng",
        );
    }

    const appTransId =
        `${getVietnamDatePrefix()}_${code}`;

    if (appTransId.length > 40) {
        throw new Error(
            "Mã giao dịch ZaloPay vượt quá 40 ký tự",
        );
    }

    return appTransId;
};

const getOrderCodeFromAppTransId = (
    appTransId,
) => {
    const value = String(
        appTransId || "",
    ).trim();

    const underscoreIndex =
        value.indexOf("_");

    if (underscoreIndex === -1) {
        return value;
    }

    return value.slice(
        underscoreIndex + 1,
    );
};

const toFormBody = (data = {}) => {
    const params = new URLSearchParams();

    Object.entries(data).forEach(
        ([key, value]) => {
            if (
                value !== undefined &&
                value !== null
            ) {
                params.append(
                    key,
                    String(value),
                );
            }
        },
    );

    return params.toString();
};

const createZaloPayPayment = async ({
    order,
    user = null,
    items = [],
}) => {
    const {
        appId,
        key1,
        key2,
        createUrl,
        redirectUrl,
        callbackUrl,
    } = getZaloPayConfig();

    if (
        !appId ||
        !key1 ||
        !key2 ||
        !createUrl ||
        !redirectUrl
    ) {
        throw new Error(
            "Thiếu cấu hình ZaloPay trong file .env",
        );
    }

    if (!order?.order_code) {
        throw new Error(
            "Không tìm thấy mã đơn hàng",
        );
    }

    const amount = Math.round(
        Number(order.total_amount || 0),
    );

    if (
        !Number.isFinite(amount) ||
        amount < 1000
    ) {
        throw new Error(
            "Số tiền thanh toán ZaloPay không hợp lệ",
        );
    }

    const appTransId =
        createAppTransId(
            order.order_code,
        );

    const appTime = Date.now();

    const appUser = String(
        user?.id ||
        order.user_id ||
        order.shipping_email ||
        "BuildPC",
    );

    const itemData = JSON.stringify(
        Array.isArray(items)
            ? items
            : [],
    );

    /*
      bank_code rỗng:
      ZaloPay Gateway sẽ cho khách
      lựa chọn các hình thức thanh toán.
    */
    const embedData = JSON.stringify({
        redirecturl: redirectUrl,

        preferred_payment_method: [],

        order_id: order.id,

        order_code:
            order.order_code,
    });

    const paymentData = {
        app_id: appId,

        app_trans_id: appTransId,

        app_user: appUser,

        app_time: appTime,

        amount,

        item: itemData,

        embed_data: embedData,

        bank_code: "",

        description:
            `BuildPC - Thanh toán đơn hàng ${order.order_code}`,

        phone:
            order.shipping_phone || "",

        email:
            order.shipping_email || "",

        address:
            order.shipping_address || "",
    };

    if (callbackUrl) {
        paymentData.callback_url =
            callbackUrl;
    }

    /*
      MAC của create order:
  
      app_id
      | app_trans_id
      | app_user
      | amount
      | app_time
      | embed_data
      | item
    */
    const macData =
        `${paymentData.app_id}` +
        `|${paymentData.app_trans_id}` +
        `|${paymentData.app_user}` +
        `|${paymentData.amount}` +
        `|${paymentData.app_time}` +
        `|${paymentData.embed_data}` +
        `|${paymentData.item}`;

    paymentData.mac =
        createHmacSha256(
            macData,
            key1,
        );

    console.log(
        "ZALOPAY CREATE PAYMENT:",
        {
            appId,
            appTransId,
            amount,
            orderCode:
                order.order_code,
            createUrl,
        },
    );

    const response =
        await axios.post(
            createUrl,
            toFormBody(paymentData),
            {
                headers: {
                    "Content-Type":
                        "application/x-www-form-urlencoded",
                },

                timeout: 30000,
            },
        );

    console.log(
        "ZALOPAY CREATE RESPONSE:",
        response.data,
    );

    if (
        Number(
            response.data?.return_code,
        ) !== 1
    ) {
        throw new Error(
            response.data
                ?.sub_return_message ||
            response.data
                ?.return_message ||
            "ZaloPay không thể tạo giao dịch",
        );
    }

    if (
        !response.data?.order_url
    ) {
        throw new Error(
            "ZaloPay không trả về order_url",
        );
    }

    return {
        ...response.data,

        app_trans_id:
            appTransId,

        payment_url:
            response.data.order_url,
    };
};

const queryZaloPayOrder = async (
    appTransId,
) => {
    const {
        appId,
        key1,
        queryUrl,
    } = getZaloPayConfig();

    if (
        !appId ||
        !key1 ||
        !queryUrl
    ) {
        throw new Error(
            "Thiếu cấu hình query ZaloPay",
        );
    }

    const transactionId =
        String(
            appTransId || "",
        ).trim();

    if (!transactionId) {
        throw new Error(
            "Thiếu app_trans_id",
        );
    }

    /*
      Query MAC:
  
      app_id
      | app_trans_id
      | key1
    */
    const macData =
        `${appId}` +
        `|${transactionId}` +
        `|${key1}`;

    const payload = {
        app_id: appId,

        app_trans_id:
            transactionId,

        mac: createHmacSha256(
            macData,
            key1,
        ),
    };

    const response =
        await axios.post(
            queryUrl,
            toFormBody(payload),
            {
                headers: {
                    "Content-Type":
                        "application/x-www-form-urlencoded",
                },

                timeout: 30000,
            },
        );

    console.log(
        "ZALOPAY QUERY RESPONSE:",
        response.data,
    );

    return response.data;
};

const verifyZaloPayRedirect = (
    data = {},
) => {
    const { key2 } =
        getZaloPayConfig();

    if (!key2) {
        return false;
    }

    const checksumData =
        `${data.appid || ""}` +
        `|${data.apptransid || ""}` +
        `|${data.pmcid || ""}` +
        `|${data.bankcode || ""}` +
        `|${data.amount || ""}` +
        `|${data.discountamount || ""}` +
        `|${data.status || ""}`;

    const expectedChecksum =
        createHmacSha256(
            checksumData,
            key2,
        );

    return safeCompare(
        expectedChecksum,
        data.checksum,
    );
};

const verifyZaloPayCallback = (
    body = {},
) => {
    const { key2 } =
        getZaloPayConfig();

    if (
        !key2 ||
        !body.data ||
        !body.mac
    ) {
        return {
            valid: false,
            data: null,
        };
    }

    const expectedMac =
        createHmacSha256(
            body.data,
            key2,
        );

    const valid =
        safeCompare(
            expectedMac,
            body.mac,
        );

    if (!valid) {
        return {
            valid: false,
            data: null,
        };
    }

    try {
        return {
            valid: true,
            data: JSON.parse(
                body.data,
            ),
        };
    } catch {
        return {
            valid: false,
            data: null,
        };
    }
};

module.exports = {
    createZaloPayPayment,

    queryZaloPayOrder,

    verifyZaloPayRedirect,

    verifyZaloPayCallback,

    getOrderCodeFromAppTransId,
};