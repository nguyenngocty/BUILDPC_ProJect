const crypto = require("crypto");
const axios = require("axios");

const getMomoConfig = () => {
  return {
    partnerCode: String(process.env.MOMO_PARTNER_CODE || "").trim(),
    accessKey: String(process.env.MOMO_ACCESS_KEY || "").trim(),
    secretKey: String(process.env.MOMO_SECRET_KEY || "").trim(),
    endpoint: String(
      process.env.MOMO_ENDPOINT ||
        "https://test-payment.momo.vn/v2/gateway/api/create"
    ).trim(),
    redirectUrl: String(process.env.MOMO_REDIRECT_URL || "").trim(),
    ipnUrl: String(process.env.MOMO_IPN_URL || "").trim(),
  };
};

const createSignature = (rawSignature, secretKey) => {
  return crypto
    .createHmac("sha256", secretKey)
    .update(rawSignature)
    .digest("hex");
};

const createMomoPayment = async ({ order }) => {
  const {
    partnerCode,
    accessKey,
    secretKey,
    endpoint,
    redirectUrl,
    ipnUrl,
  } = getMomoConfig();

  if (
    !partnerCode ||
    !accessKey ||
    !secretKey ||
    !endpoint ||
    !redirectUrl ||
    !ipnUrl
  ) {
    throw new Error("Thiếu cấu hình MoMo trong file .env");
  }

  const amount = String(Math.round(Number(order.total_amount || 0)));
  const requestId = `${order.order_code}_${Date.now()}`;
  const orderId = order.order_code;
  const orderInfo = `Thanh toan don hang ${order.order_code}`;

  // Không dùng quét QR ví MoMo nữa.
  // payWithATM sẽ chuyển qua trang nhập thẻ ATM/Napas trên web.
  const requestType = "payWithATM";

  const extraData = Buffer.from(
    JSON.stringify({
      order_id: order.id,
      order_code: order.order_code,
    })
  ).toString("base64");

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

  const signature = createSignature(rawSignature, secretKey);

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

  console.log("MOMO CREATE PAYMENT:", {
    partnerCode,
    endpoint,
    requestType,
    amount,
    orderId,
    redirectUrl,
    ipnUrl,
  });

  const response = await axios.post(endpoint, body, {
    headers: {
      "Content-Type": "application/json",
    },
    timeout: 30000,
  });

  return response.data;
};

const verifyMomoSignature = (data = {}) => {
  const { accessKey, secretKey } = getMomoConfig();

  const rawSignature =
    `accessKey=${accessKey}` +
    `&amount=${data.amount || ""}` +
    `&extraData=${data.extraData || ""}` +
    `&message=${data.message || ""}` +
    `&orderId=${data.orderId || ""}` +
    `&orderInfo=${data.orderInfo || ""}` +
    `&orderType=${data.orderType || ""}` +
    `&partnerCode=${data.partnerCode || ""}` +
    `&payType=${data.payType || ""}` +
    `&requestId=${data.requestId || ""}` +
    `&responseTime=${data.responseTime || ""}` +
    `&resultCode=${data.resultCode ?? ""}` +
    `&transId=${data.transId || ""}`;

  const signature = createSignature(rawSignature, secretKey);

  return signature === data.signature;
};

module.exports = {
  createMomoPayment,
  verifyMomoSignature,
};