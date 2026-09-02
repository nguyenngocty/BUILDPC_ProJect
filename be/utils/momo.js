const crypto = require("crypto");
const axios = require("axios");

// ============================================================
// CONSTANTS
// ============================================================

const MOMO_MIN_ATM_AMOUNT = 10000;
const MOMO_MAX_ATM_AMOUNT = 50000000;

const MOMO_REQUEST_TYPE = "payWithATM";

const MOMO_TIMEOUT_MS = Number(process.env.MOMO_TIMEOUT_MS) || 30000;

// ============================================================
// CONFIG
// ============================================================

const getMomoConfig = () => {
  return {
    partnerCode: String(process.env.MOMO_PARTNER_CODE || "").trim(),

    accessKey: String(process.env.MOMO_ACCESS_KEY || "").trim(),

    secretKey: String(process.env.MOMO_SECRET_KEY || "").trim(),

    endpoint: String(
      process.env.MOMO_ENDPOINT ||
        "https://test-payment.momo.vn/v2/gateway/api/create",
    ).trim(),

    redirectUrl: String(process.env.MOMO_REDIRECT_URL || "").trim(),

    ipnUrl: String(process.env.MOMO_IPN_URL || "").trim(),
  };
};

// ============================================================
// HELPERS
// ============================================================

const createMomoError = (message, code = "MOMO_ERROR", data = null) => {
  const error = new Error(message);

  error.code = code;
  error.data = data;

  return error;
};

const validateHttpUrl = (value, fieldName) => {
  try {
    const url = new URL(value);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error();
    }

    return true;
  } catch {
    throw createMomoError(`${fieldName} không hợp lệ`, "MOMO_INVALID_URL");
  }
};

const validateMomoConfig = (config) => {
  if (!config.partnerCode) {
    throw createMomoError(
      "Thiếu MOMO_PARTNER_CODE trong file .env",
      "MOMO_PARTNER_CODE_MISSING",
    );
  }

  if (!config.accessKey) {
    throw createMomoError(
      "Thiếu MOMO_ACCESS_KEY trong file .env",
      "MOMO_ACCESS_KEY_MISSING",
    );
  }

  if (!config.secretKey) {
    throw createMomoError(
      "Thiếu MOMO_SECRET_KEY trong file .env",
      "MOMO_SECRET_KEY_MISSING",
    );
  }

  if (!config.endpoint) {
    throw createMomoError(
      "Thiếu MOMO_ENDPOINT trong file .env",
      "MOMO_ENDPOINT_MISSING",
    );
  }

  if (!config.redirectUrl) {
    throw createMomoError(
      "Thiếu MOMO_REDIRECT_URL trong file .env",
      "MOMO_REDIRECT_URL_MISSING",
    );
  }

  if (!config.ipnUrl) {
    throw createMomoError(
      "Thiếu MOMO_IPN_URL trong file .env",
      "MOMO_IPN_URL_MISSING",
    );
  }

  validateHttpUrl(config.endpoint, "MOMO_ENDPOINT");

  validateHttpUrl(config.redirectUrl, "MOMO_REDIRECT_URL");

  validateHttpUrl(config.ipnUrl, "MOMO_IPN_URL");
};

// ============================================================
// SIGNATURE
// ============================================================

const createSignature = (rawSignature, secretKey) => {
  return crypto
    .createHmac("sha256", secretKey)
    .update(rawSignature, "utf8")
    .digest("hex");
};

// ============================================================
// SAFE SIGNATURE COMPARE
// ============================================================

const safeCompareSignature = (signatureA, signatureB) => {
  const first = String(signatureA || "").trim();

  const second = String(signatureB || "").trim();

  if (!first || !second || first.length !== second.length) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(
      Buffer.from(first, "utf8"),

      Buffer.from(second, "utf8"),
    );
  } catch {
    return false;
  }
};

// ============================================================
// AMOUNT
// ============================================================

const normalizeAmount = (value) => {
  const amount = Math.round(Number(value || 0));

  if (!Number.isFinite(amount) || amount <= 0) {
    throw createMomoError(
      "Số tiền thanh toán MoMo không hợp lệ",
      "MOMO_INVALID_AMOUNT",
    );
  }

  if (amount < MOMO_MIN_ATM_AMOUNT) {
    throw createMomoError(
      `Thanh toán ATM qua MoMo yêu cầu tối thiểu ${MOMO_MIN_ATM_AMOUNT.toLocaleString(
        "vi-VN",
      )}đ`,
      "MOMO_AMOUNT_TOO_LOW",
    );
  }

  if (amount > MOMO_MAX_ATM_AMOUNT) {
    throw createMomoError(
      `Thanh toán ATM qua MoMo chỉ hỗ trợ tối đa ${MOMO_MAX_ATM_AMOUNT.toLocaleString(
        "vi-VN",
      )}đ`,
      "MOMO_AMOUNT_TOO_HIGH",
    );
  }

  return amount;
};

// ============================================================
// ORDER ID
// ============================================================

const normalizeOrderId = (value) => {
  const orderId = String(value || "").trim();

  if (!orderId) {
    throw createMomoError(
      "Đơn hàng không có order_code",
      "MOMO_ORDER_ID_MISSING",
    );
  }

  /*
   * Giữ orderId đơn giản:
   * chữ, số, -, _, .
   */
  if (!/^[0-9a-zA-Z][0-9a-zA-Z._-]*$/.test(orderId)) {
    throw createMomoError(
      "order_code chứa ký tự không hợp lệ với MoMo",
      "MOMO_INVALID_ORDER_ID",
    );
  }

  if (orderId.length > 50) {
    throw createMomoError(
      "order_code vượt quá độ dài cho phép của MoMo",
      "MOMO_ORDER_ID_TOO_LONG",
    );
  }

  return orderId;
};

// ============================================================
// REQUEST ID
// ============================================================

const createRequestId = (orderId) => {
  const timestamp = Date.now();

  /*
   * MoMo giới hạn requestId.
   */
  const value = `${orderId}_${timestamp}`;

  if (value.length <= 50) {
    return value;
  }

  return value.slice(0, 50);
};

// ============================================================
// EXTRA DATA
// ============================================================

const createExtraData = (order) => {
  const data = {
    order_id: Number(order.id),

    order_code: String(order.order_code || ""),
  };

  return Buffer.from(JSON.stringify(data), "utf8").toString("base64");
};

// ============================================================
// CREATE PAYMENT
//
// POST:
// https://test-payment.momo.vn/v2/gateway/api/create
//
// requestType:
// payWithATM
// ============================================================

const createMomoPayment = async ({ order }) => {
  if (!order || !order.id) {
    throw createMomoError(
      "Thông tin đơn hàng không hợp lệ",
      "MOMO_INVALID_ORDER",
    );
  }

  const config = getMomoConfig();

  validateMomoConfig(config);

  const { partnerCode, accessKey, secretKey, endpoint, redirectUrl, ipnUrl } =
    config;

  // ========================================================
  // AMOUNT
  // ========================================================

  const amount = normalizeAmount(order.total_amount);

  // ========================================================
  // ORDER ID
  // ========================================================

  const orderId = normalizeOrderId(order.order_code);

  // ========================================================
  // REQUEST ID
  // ========================================================

  const requestId = createRequestId(orderId);

  // ========================================================
  // ORDER INFO
  // ========================================================

  const orderInfo = `Thanh toan don hang ${orderId}`;

  // ========================================================
  // REQUEST TYPE
  // ========================================================

  const requestType = MOMO_REQUEST_TYPE;

  // ========================================================
  // EXTRA DATA
  // ========================================================

  const extraData = createExtraData(order);

  // ========================================================
  // RAW SIGNATURE
  //
  // QUAN TRỌNG:
  // Thứ tự field phải đúng theo MoMo.
  // ========================================================

  const rawSignature =
    `accessKey=${accessKey}` +
    `&amount=${amount}` +
    `&extraData=${extraData}` +
    `&ipnUrl=${ipnUrl}` +
    `&orderId=${orderId}` +
    `&orderInfo=${orderInfo}` +
    `&partnerCode=${partnerCode}` +
    `&redirectUrl=${redirectUrl}` +
    `&requestId=${requestId}` +
    `&requestType=${requestType}`;

  // ========================================================
  // SIGNATURE
  // ========================================================

  const signature = createSignature(rawSignature, secretKey);

  // ========================================================
  // REQUEST BODY
  //
  // amount dùng NUMBER,
  // không gửi String nữa.
  // ========================================================

  const body = {
    partnerCode,

    partnerName: "BuildPC",

    storeId: "BuildPCStore",

    requestId,

    amount,

    orderId,

    orderInfo,

    redirectUrl,

    ipnUrl,

    lang: "vi",

    requestType,

    autoCapture: true,

    extraData,

    signature,
  };

  // ========================================================
  // SAFE LOG
  // ========================================================

  console.log("[MOMO][CREATE]", {
    endpoint,

    partnerCode,

    requestType,

    amount,

    orderId,

    requestId,

    redirectUrl,

    ipnUrl,
  });

  // ========================================================
  // REQUEST MOMO
  // ========================================================

  let response;

  try {
    response = await axios.post(endpoint, body, {
      headers: {
        "Content-Type": "application/json",
      },

      timeout: MOMO_TIMEOUT_MS,
    });
  } catch (error) {
    const momoData = error?.response?.data || null;

    console.error(
      "[MOMO][CREATE][HTTP ERROR]",
      momoData || error?.message || error,
    );

    throw createMomoError(
      momoData?.message || error?.message || "Không thể kết nối đến MoMo",

      momoData?.resultCode ? `MOMO_${momoData.resultCode}` : "MOMO_HTTP_ERROR",

      momoData,
    );
  }

  const result = response?.data || {};

  // ========================================================
  // RESPONSE LOG
  // ========================================================

  console.log("[MOMO][CREATE][RESULT]", {
    resultCode: result.resultCode,

    message: result.message,

    orderId: result.orderId,

    requestId: result.requestId,

    hasPayUrl: Boolean(result.payUrl),
  });

  console.log("MOMO CREATE RESPONSE:", response.data);

  return response.data;
};

// ============================================================
// VERIFY CALLBACK / IPN SIGNATURE
// ============================================================

const verifyMomoSignature = (data = {}) => {
  try {
    const { accessKey, secretKey } = getMomoConfig();

    if (!accessKey || !secretKey) {
      return false;
    }

    if (!data.signature) {
      return false;
    }

    /*
     * Thứ tự theo response signature của MoMo.
     */
    const rawSignature =
      `accessKey=${accessKey}` +
      `&amount=${data.amount ?? ""}` +
      `&extraData=${data.extraData ?? ""}` +
      `&message=${data.message ?? ""}` +
      `&orderId=${data.orderId ?? ""}` +
      `&orderInfo=${data.orderInfo ?? ""}` +
      `&orderType=${data.orderType ?? ""}` +
      `&partnerCode=${data.partnerCode ?? ""}` +
      `&payType=${data.payType ?? ""}` +
      `&requestId=${data.requestId ?? ""}` +
      `&responseTime=${data.responseTime ?? ""}` +
      `&resultCode=${data.resultCode ?? ""}` +
      `&transId=${data.transId ?? ""}`;

    const expectedSignature = createSignature(rawSignature, secretKey);

    return safeCompareSignature(
      expectedSignature,

      data.signature,
    );
  } catch (error) {
    console.error("[MOMO][VERIFY SIGNATURE]", error?.message || error);

    return false;
  }
};

// ============================================================
// EXPORT
// ============================================================

module.exports = {
  createMomoPayment,

  verifyMomoSignature,
};
