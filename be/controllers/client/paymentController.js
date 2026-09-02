const Order = require("../../models/Order");

const { verifyMomoSignature } = require("../../utils/momo");

const { sendOrderConfirmationMail } = require("../../utils/mailer");

// ============================================================
// FRONTEND URL
// ============================================================

const getFrontendUrl = () => {
  return (
    process.env.CLIENT_URL ||
    process.env.FRONTEND_URL ||
    "http://localhost:3000"
  );
};

// ============================================================
// SAFE VALUE
// ============================================================

const safeValue = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  return String(value);
};

// ============================================================
// LOG MOMO RESULT
// ============================================================

const logMomoResult = (source, data = {}) => {
  console.log(`[MOMO][${source}]`, {
    partnerCode: safeValue(data.partnerCode),

    orderId: safeValue(data.orderId),

    requestId: safeValue(data.requestId),

    amount: safeValue(data.amount),

    resultCode: safeValue(data.resultCode),

    message: safeValue(data.message),

    transId: safeValue(data.transId),

    payType: safeValue(data.payType),

    orderType: safeValue(data.orderType),

    responseTime: safeValue(data.responseTime),

    hasSignature: Boolean(data.signature),
  });
};

// ============================================================
// UPDATE MOMO PAYMENT
// ============================================================

const updateMomoPayment = async (data) => {
  const orderCode = String(data?.orderId || "").trim();

  if (!orderCode) {
    throw new Error("MoMo không trả về orderId");
  }

  const resultCode = String(data?.resultCode ?? "");

  const transactionCode = data?.transId ? String(data.transId) : null;

  const isSuccess = resultCode === "0";

  console.log("[MOMO][PAYMENT STATUS]", {
    orderCode,

    resultCode,

    isSuccess,

    transactionCode,

    message: data?.message || null,
  });

  const order = await Order.updatePaymentStatusByOrderCode({
    order_code: orderCode,

    payment_status: isSuccess ? 1 : 0,

    transaction_code: transactionCode,
  });

  return {
    order,

    isSuccess,

    resultCode,

    message: data?.message || null,
  };
};

// ============================================================
// MOMO RETURN
//
// Browser:
// MoMo / Napas
//      ↓
// GET /api/client/payments/momo-return
//      ↓
// Frontend OrderSuccess
// ============================================================

exports.momoReturn = async (req, res, next) => {
  const frontendUrl = getFrontendUrl();

  try {
    // ========================================================
    // LOG RESPONSE
    // ========================================================

    logMomoResult("RETURN", req.query);

    // ========================================================
    // SIGNATURE
    // ========================================================

    const isValidSignature = verifyMomoSignature(req.query);

    console.log("[MOMO][RETURN][SIGNATURE]", {
      valid: isValidSignature,
    });

    if (!isValidSignature) {
      return res.redirect(
        `${frontendUrl}/order-success?payment=momo&status=invalid-signature`,
      );
    }

    // ========================================================
    // UPDATE PAYMENT
    // ========================================================

    const { order, isSuccess, resultCode, message } = await updateMomoPayment(
      req.query,
    );

    if (!order) {
      return res.redirect(
        `${frontendUrl}/order-success?payment=momo&status=not-found`,
      );
    }

    // ========================================================
    // SUCCESS MAIL
    // ========================================================

    if (isSuccess && order.shipping_email) {
      try {
        await sendOrderConfirmationMail(order.shipping_email, order);
      } catch (mailError) {
        console.error("[MOMO][RETURN][MAIL]", mailError?.message || mailError);
      }
    }

    // ========================================================
    // SUCCESS
    // ========================================================

    if (isSuccess) {
      return res.redirect(
        `${frontendUrl}/order-success?order_id=${order.id}&payment=momo&status=success`,
      );
    }

    // ========================================================
    // FAILED
    // ========================================================

    const params = new URLSearchParams({
      order_id: String(order.id),

      payment: "momo",

      status: "failed",

      result_code: resultCode || "unknown",

      message: message || "Thanh toán thất bại",
    });

    return res.redirect(`${frontendUrl}/order-success?${params.toString()}`);
  } catch (error) {
    console.error("[MOMO][RETURN][ERROR]", error);

    return res.redirect(
      `${frontendUrl}/order-success?payment=momo&status=error`,
    );
  }
};

// ============================================================
// MOMO IPN
//
// MoMo Server
//      ↓
// POST /api/client/payments/momo-ipn
//
// Đây mới là server-to-server callback.
// ============================================================

exports.momoIpn = async (req, res, next) => {
  try {
    // ========================================================
    // LOG
    // ========================================================

    logMomoResult("IPN", req.body);

    // ========================================================
    // SIGNATURE
    // ========================================================

    const isValidSignature = verifyMomoSignature(req.body);

    console.log("[MOMO][IPN][SIGNATURE]", {
      valid: isValidSignature,
    });

    if (!isValidSignature) {
      return res.status(400).json({
        resultCode: 1,

        message: "Invalid signature",
      });
    }

    // ========================================================
    // UPDATE PAYMENT
    // ========================================================

    const { order, isSuccess, resultCode, message } = await updateMomoPayment(
      req.body,
    );

    if (!order) {
      return res.status(404).json({
        resultCode: 1,

        message: "Order not found",
      });
    }

    console.log("[MOMO][IPN][PROCESSED]", {
      orderId: order.id,

      orderCode: order.order_code,

      isSuccess,

      resultCode,

      message,

      paymentStatus: order.payment_status,

      orderStatus: order.status,
    });

    // ========================================================
    // MOMO ACK
    // ========================================================

    return res.status(200).json({
      resultCode: 0,

      message: "IPN received",
    });
  } catch (error) {
    console.error("[MOMO][IPN][ERROR]", error);

    return res.status(500).json({
      resultCode: 1,

      message: error?.message || "IPN error",
    });
  }
};
