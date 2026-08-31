const AdminOrder = require("../../models/AdminOrder");

const { sendOrderStatusUpdateMail } = require("../../utils/mailer");

// ============================================================
// NORMALIZE
// ============================================================

const normalizePositiveInt = (value) => {
  const parsed = Number.parseInt(value, 10);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

// ============================================================
// SEND STATUS MAIL SAFELY
// ============================================================

const sendStatusMailSafely = async (order) => {
  const customerEmail = String(order?.shipping_email || "").trim();

  if (!customerEmail) {
    return {
      sent: false,

      email: null,

      message: "Đơn hàng không có email nhận thông báo",
    };
  }

  try {
    const sent = await sendOrderStatusUpdateMail(customerEmail, order);

    return {
      sent: Boolean(sent),

      email: customerEmail,

      message: sent
        ? `Đã gửi email thông báo đến ${customerEmail}`
        : "Không thể gửi email thông báo",
    };
  } catch (error) {
    console.error("[ADMIN ORDER] Lỗi gửi email cập nhật trạng thái:", error);

    return {
      sent: false,

      email: customerEmail,

      message: "Cập nhật trạng thái thành công nhưng gửi email thất bại",
    };
  }
};

// ============================================================
// GET ORDERS
//
// GET /api/admin/orders
// ============================================================

exports.getOrders = async (req, res, next) => {
  try {
    const result = await AdminOrder.getAll(req.query);

    return res.json({
      success: true,

      message: "Lấy danh sách đơn hàng thành công",

      ...result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,

      message: error.message || "Không thể lấy danh sách đơn hàng",
    });
  }
};

// ============================================================
// GET ORDER DETAIL
//
// GET /api/admin/orders/:id
// ============================================================

exports.getOrderById = async (req, res, next) => {
  try {
    const orderId = normalizePositiveInt(req.params.id);

    if (!orderId) {
      return res.status(400).json({
        success: false,

        message: "ID đơn hàng không hợp lệ.",
      });
    }

    const order = await AdminOrder.getById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,

        message: "Không tìm thấy đơn hàng",
      });
    }

    return res.json({
      success: true,

      message: "Lấy chi tiết đơn hàng thành công",

      data: order,
    });
  } catch (error) {
    return next(error);
  }
};

// ============================================================
// UPDATE ORDER STATUS
//
// PATCH /api/admin/orders/:id/status
//
// BODY:
//
// {
//   "status": "PROCESSING"
// }
// ============================================================

exports.updateOrderStatus = async (req, res, next) => {
  try {
    const orderId = normalizePositiveInt(req.params.id);

    if (!orderId) {
      return res.status(400).json({
        success: false,

        message: "ID đơn hàng không hợp lệ.",
      });
    }

    const status = String(req.body?.status || "")
      .trim()
      .toUpperCase();

    if (!status) {
      return res.status(400).json({
        success: false,

        message: "Vui lòng chọn trạng thái cần cập nhật",
      });
    }

    const updatedOrder = await AdminOrder.updateStatus(orderId, status);

    if (!updatedOrder) {
      return res.status(404).json({
        success: false,

        message: "Không tìm thấy đơn hàng",
      });
    }

    /*
     * Lấy lại full Admin Order.
     *
     * Khi CANCELLED, Order core trả cấu trúc Client,
     * nên ta luôn lấy AdminOrder lần cuối.
     */
    const order = await AdminOrder.getById(orderId);

    const mail = await sendStatusMailSafely(order || updatedOrder);

    return res.json({
      success: true,

      message: "Cập nhật trạng thái đơn hàng thành công",

      data: order || updatedOrder,

      mail,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,

      message: error.message || "Lỗi cập nhật trạng thái đơn hàng",
    });
  }
};

// ============================================================
// UPDATE PAYMENT STATUS
//
// PATCH /api/admin/orders/:id/payment-status
//
// BODY:
//
// {
//   "payment_status": 1,
//   "transaction_code": "BANK-123"
// }
//
// Chủ yếu dùng cho BANK.
// ============================================================

exports.updatePaymentStatus = async (req, res, next) => {
  try {
    const orderId = normalizePositiveInt(req.params.id);

    if (!orderId) {
      return res.status(400).json({
        success: false,

        message: "ID đơn hàng không hợp lệ.",
      });
    }

    if (
      req.body?.payment_status === undefined ||
      req.body?.payment_status === null ||
      req.body?.payment_status === ""
    ) {
      return res.status(400).json({
        success: false,

        message: "Thiếu trạng thái thanh toán.",
      });
    }

    const paymentStatus = Number(req.body.payment_status);

    if (paymentStatus !== 0 && paymentStatus !== 1) {
      return res.status(400).json({
        success: false,

        message: "Trạng thái thanh toán không hợp lệ.",
      });
    }

    const transactionCode =
      req.body?.transaction_code === undefined ||
      req.body?.transaction_code === null
        ? null
        : String(req.body.transaction_code).trim().slice(0, 255);

    const order = await AdminOrder.updatePaymentStatus(orderId, {
      payment_status: paymentStatus,

      transaction_code: transactionCode,
    });

    if (!order) {
      return res.status(404).json({
        success: false,

        message: "Không tìm thấy đơn hàng",
      });
    }

    return res.json({
      success: true,

      message:
        paymentStatus === 1
          ? "Xác nhận thanh toán thành công"
          : "Cập nhật trạng thái thanh toán thành công",

      data: order,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,

      message: error.message || "Không thể cập nhật trạng thái thanh toán",
    });
  }
};

// ============================================================
// GET INVOICE
//
// GET /api/admin/orders/:id/invoice
// ============================================================

exports.getInvoice = async (req, res, next) => {
  try {
    const orderId = normalizePositiveInt(req.params.id);

    if (!orderId) {
      return res.status(400).json({
        success: false,

        message: "ID đơn hàng không hợp lệ.",
      });
    }

    const invoice = await AdminOrder.getInvoice(orderId);

    if (!invoice) {
      return res.status(404).json({
        success: false,

        message: "Không tìm thấy đơn hàng",
      });
    }

    return res.json({
      success: true,

      message: "Lấy dữ liệu hóa đơn thành công",

      data: invoice,
    });
  } catch (error) {
    return next(error);
  }
};
