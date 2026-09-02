const Order = require("../../models/Order");

const {
  verifyMomoSignature,
} = require("../../utils/momo");

const {
  queryZaloPayOrder,
  verifyZaloPayRedirect,
  verifyZaloPayCallback,
  getOrderCodeFromAppTransId,
} = require("../../utils/zalopay");

const {
  sendOrderConfirmationMail,
} = require("../../utils/mailer");

const getFrontendUrl = () =>
  process.env.CLIENT_URL ||
  "http://localhost:3000";

/* =========================
   MOMO
========================= */

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
  const orderCode = data.orderId;

  const resultCode = String(
    data.resultCode,
  );

  const transactionCode =
    data.transId
      ? String(data.transId)
      : null;

  const isSuccess =
    resultCode === "0";

  const order =
    await Order.updatePaymentStatusByOrderCode(
      {
        order_code: orderCode,

        payment_status:
          isSuccess ? 1 : 0,

        transaction_code:
          transactionCode,
      },
    );

  return {
    order,

    isSuccess,

    resultCode,

    message: data?.message || null,
  };
};

exports.momoReturn = async (
  req,
  res,
  next,
) => {
  try {
    console.log(
      "MOMO RETURN:",
      req.query,
    );

    const frontendUrl =
      getFrontendUrl();

    const isValidSignature =
      verifyMomoSignature(
        req.query,
      );

    console.log("[MOMO][RETURN][SIGNATURE]", {
      valid: isValidSignature,
    });

    if (!isValidSignature) {
      return res.redirect(
        `${frontendUrl}/order-success?payment=momo&status=invalid-signature`,
      );
    }

    const {
      order,
      isSuccess,
    } =
      await updateMomoPayment(
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
        await sendOrderConfirmationMail(
          order.shipping_email,
          order,
        );
      } catch (mailError) {
        console.error(
          "MOMO MAIL ERROR:",
          mailError.message,
        );
      }
    }

    return res.redirect(
      `${frontendUrl}/order-success?order_id=${order.id}&payment=momo&status=${isSuccess
        ? "success"
        : "failed"
      }`,
    );
  } catch (error) {
    console.error(
      "MOMO RETURN ERROR:",
      error,
    );

    next(error);
  }
};

exports.momoIpn = async (
  req,
  res,
  next,
) => {
  try {
    console.log(
      "MOMO IPN:",
      req.body,
    );

    const isValidSignature =
      verifyMomoSignature(
        req.body,
      );

    console.log("[MOMO][IPN][SIGNATURE]", {
      valid: isValidSignature,
    });

    if (!isValidSignature) {
      return res
        .status(400)
        .json({
          resultCode: 1,
          message:
            "Invalid signature",
        });
    }

    const { order } =
      await updateMomoPayment(
        req.body,
      );

    if (!order) {
      return res
        .status(404)
        .json({
          resultCode: 1,
          message:
            "Order not found",
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
    console.error(
      "MOMO IPN ERROR:",
      error,
    );

    next(error);
  }
};

/* =========================
   ZALOPAY
========================= */

const updateZaloPayPayment =
  async ({
    appTransId,
    isSuccess,
    transactionCode = null,
  }) => {
    const orderCode =
      getOrderCodeFromAppTransId(
        appTransId,
      );

    if (!orderCode) {
      return null;
    }

    const order =
      await Order.updatePaymentStatusByOrderCode(
        {
          order_code: orderCode,

          payment_status:
            isSuccess ? 1 : 0,

          transaction_code:
            transactionCode,
        },
      );

    return order;
  };

/*
  Browser được ZaloPay
  redirect về route này.

  Vì localhost không nhận được
  callback server-to-server,
  ta verify redirect rồi query
  ZaloPay để lấy trạng thái thật.
*/
exports.zalopayReturn = async (
  req,
  res,
  next,
) => {
  try {
    console.log(
      "ZALOPAY RETURN:",
      req.query,
    );

    const frontendUrl =
      getFrontendUrl();

    const isValidRedirect =
      verifyZaloPayRedirect(
        req.query,
      );

    if (!isValidRedirect) {
      return res.redirect(
        `${frontendUrl}/order-success?payment=zalopay&status=invalid-signature`,
      );
    }

    const appTransId =
      String(
        req.query.apptransid ||
        "",
      ).trim();

    if (!appTransId) {
      return res.redirect(
        `${frontendUrl}/order-success?payment=zalopay&status=invalid`,
      );
    }

    /*
      Không tin trực tiếp status
      trên URL redirect.

      Backend query trực tiếp
      ZaloPay để xác nhận.
    */
    const queryResult =
      await queryZaloPayOrder(
        appTransId,
      );

    console.log(
      "ZALOPAY FINAL STATUS:",
      queryResult,
    );

    const returnCode =
      Number(
        queryResult?.return_code,
      );

    /*
      ZaloPay:
      1 = SUCCESS
      2 = FAIL
      3 = PROCESSING
    */
    if (returnCode === 3) {
      const order =
        await updateZaloPayPayment(
          {
            appTransId,

            isSuccess: false,

            transactionCode:
              queryResult?.zp_trans_id
                ? String(
                  queryResult.zp_trans_id,
                )
                : null,
          },
        );

      return res.redirect(
        `${frontendUrl}/order-success?${order?.id
          ? `order_id=${order.id}&`
          : ""
        }payment=zalopay&status=pending`,
      );
    }

    const isSuccess =
      returnCode === 1;

    const transactionCode =
      queryResult?.zp_trans_id
        ? String(
          queryResult.zp_trans_id,
        )
        : null;

    const order =
      await updateZaloPayPayment(
        {
          appTransId,
          isSuccess,
          transactionCode,
        },
      );

    if (!order) {
      return res.redirect(
        `${frontendUrl}/order-success?payment=zalopay&status=not-found`,
      );
    }

    if (isSuccess) {
      try {
        await sendOrderConfirmationMail(
          order.shipping_email,
          order,
        );
      } catch (mailError) {
        console.error(
          "ZALOPAY MAIL ERROR:",
          mailError.message,
        );
      }
    }

    return res.redirect(
      `${frontendUrl}/order-success?order_id=${order.id}&payment=zalopay&status=${isSuccess
        ? "success"
        : "failed"
      }`,
    );
  } catch (error) {
    console.error(
      "ZALOPAY RETURN ERROR:",
      error,
    );

    const frontendUrl =
      getFrontendUrl();

    return res.redirect(
      `${frontendUrl}/order-success?payment=zalopay&status=error`,
    );
  }
};

/*
  Callback server-to-server.

  Localhost hiện chưa dùng được,
  nhưng mình vẫn làm sẵn để sau
  này deploy/ngrok dùng luôn.
*/
exports.zalopayCallback =
  async (req, res) => {
    try {
      console.log(
        "ZALOPAY CALLBACK:",
        req.body,
      );

      const result =
        verifyZaloPayCallback(
          req.body,
        );

      if (
        !result.valid ||
        !result.data
      ) {
        return res.json({
          return_code: -1,
          return_message:
            "Invalid MAC",
        });
      }

      const callbackData =
        result.data;

      const appTransId =
        callbackData.app_trans_id;

      const transactionCode =
        callbackData.zp_trans_id
          ? String(
            callbackData.zp_trans_id,
          )
          : null;

      /*
        ZaloPay chỉ callback
        order payment khi đã
        thu tiền thành công.
      */
      const order =
        await updateZaloPayPayment(
          {
            appTransId,

            isSuccess: true,

            transactionCode,
          },
        );

      if (!order) {
        return res.json({
          return_code: 0,
          return_message:
            "Order not found",
        });
      }

      return res.json({
        return_code: 1,
        return_message:
          "Success",
      });
    } catch (error) {
      console.error(
        "ZALOPAY CALLBACK ERROR:",
        error,
      );

      return res.json({
        return_code: 0,
        return_message:
          "Internal error",
      });
    }
  };