const Order = require("../../models/Order");
const { verifyMomoSignature } = require("../../utils/momo");
const { sendOrderConfirmationMail } = require("../../utils/mailer");

const getFrontendUrl = () => {
  return process.env.CLIENT_URL || "http://localhost:3000";
};

const updateMomoPayment = async (data) => {
  const orderCode = data.orderId;
  const resultCode = String(data.resultCode);
  const transactionCode = data.transId ? String(data.transId) : null;

  const isSuccess = resultCode === "0";

  const order = await Order.updatePaymentStatusByOrderCode({
    order_code: orderCode,
    payment_status: isSuccess ? 1 : 0,
    transaction_code: transactionCode,
  });

  return {
    order,
    isSuccess,
  };
};

exports.momoReturn = async (req, res, next) => {
  try {
    const frontendUrl = getFrontendUrl();

    const isValidSignature = verifyMomoSignature(req.query);

    if (!isValidSignature) {
      return res.redirect(
        `${frontendUrl}/order-success?payment=momo&status=invalid-signature`,
      );
    }

    const { order, isSuccess } = await updateMomoPayment(req.query);

    if (!order) {
      return res.redirect(
        `${frontendUrl}/order-success?payment=momo&status=not-found`,
      );
    }

    if (isSuccess) {
      try {
        await sendOrderConfirmationMail(order.shipping_email, order);
      } catch (mailError) {
        console.error(
          "Lỗi gửi mail xác nhận thanh toán MoMo:",
          mailError.message,
        );
      }
    }

    return res.redirect(
      `${frontendUrl}/order-success?order_id=${order.id}&payment=momo&status=${
        isSuccess ? "success" : "failed"
      }`,
    );
  } catch (error) {
    console.error("Lỗi momoReturn:", error);

    const frontendUrl = getFrontendUrl();

    return res.redirect(
      `${frontendUrl}/order-success?payment=momo&status=error`,
    );
  }
};

exports.momoIpn = async (req, res, next) => {
  try {
    const isValidSignature = verifyMomoSignature(req.body);

    if (!isValidSignature) {
      return res.status(400).json({
        resultCode: 1,
        message: "Invalid signature",
      });
    }

    const { order } = await updateMomoPayment(req.body);

    if (!order) {
      return res.status(404).json({
        resultCode: 1,
        message: "Order not found",
      });
    }

    return res.status(200).json({
      resultCode: 0,
      message: "IPN received",
    });
  } catch (error) {
    console.error("Lỗi momoIpn:", error);

    return res.status(500).json({
      resultCode: 1,
      message: error.message || "IPN error",
    });
  }
};
