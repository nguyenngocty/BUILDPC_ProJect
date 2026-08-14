const AdminOrder = require("../../models/AdminOrder");

const {
  sendOrderStatusUpdateMail,
} = require("../../utils/mailer");

// ======================================================
// GET ORDERS
// ======================================================

exports.getOrders = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await AdminOrder.getAll(
        req.query
      );

    res.json({
      success: true,

      message:
        "Lấy danh sách đơn hàng thành công",

      ...result,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// GET ORDER BY ID
// ======================================================

exports.getOrderById = async (
  req,
  res,
  next
) => {
  try {
    const order =
      await AdminOrder.getById(
        req.params.id
      );

    if (!order) {
      return res.status(404).json({
        success: false,

        message:
          "Không tìm thấy đơn hàng",
      });
    }

    res.json({
      success: true,

      message:
        "Lấy chi tiết đơn hàng thành công",

      data: order,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// UPDATE ORDER STATUS
// ======================================================

exports.updateOrderStatus = async (
  req,
  res,
  next
) => {
  try {
    const { status } = req.body;

    // ==================================================
    // VALIDATE STATUS
    // ==================================================

    if (!status) {
      return res.status(400).json({
        success: false,

        message:
          "Vui lòng chọn trạng thái cần cập nhật",
      });
    }

    // ==================================================
    // UPDATE DATABASE
    // ==================================================

    const updatedOrder =
      await AdminOrder.updateStatus(
        req.params.id,
        status
      );

    if (!updatedOrder) {
      return res.status(404).json({
        success: false,

        message:
          "Không tìm thấy đơn hàng",
      });
    }

    // ==================================================
    // GET FULL ORDER
    //
    // Lấy lại chi tiết để có:
    // - shipping_email
    // - shipping_name
    // - shipping_address
    // - total_amount
    // - payment_method
    // - status mới
    // ==================================================

    let order =
      await AdminOrder.getById(
        req.params.id
      );

    // Nếu vì lý do nào đó getById không trả dữ liệu,
    // vẫn dùng dữ liệu từ updateStatus.
    if (!order) {
      order = updatedOrder;
    }

    // ==================================================
    // SEND STATUS EMAIL
    //
    // Mail lỗi KHÔNG được làm rollback trạng thái đơn.
    // ==================================================

    let mailSent = false;

    let mailMessage =
      "Không gửi email";

    const customerEmail =
      String(
        order?.shipping_email || ""
      ).trim();

    if (customerEmail) {
      try {
        mailSent =
          await sendOrderStatusUpdateMail(
            customerEmail,
            order
          );

        mailMessage = mailSent
          ? `Đã gửi email thông báo đến ${customerEmail}`
          : "Không thể gửi email thông báo";
      } catch (mailError) {
        console.error(
          "Lỗi gửi email cập nhật trạng thái đơn hàng:",
          mailError
        );

        mailSent = false;

        mailMessage =
          "Cập nhật trạng thái thành công nhưng gửi email thất bại";
      }
    } else {
      console.warn(
        `Đơn hàng ${order?.order_code ||
        req.params.id
        } không có shipping_email, bỏ qua gửi mail.`
      );

      mailMessage =
        "Đơn hàng không có email nhận thông báo";
    }

    // ==================================================
    // RESPONSE
    // ==================================================

    return res.json({
      success: true,

      message:
        "Cập nhật trạng thái đơn hàng thành công",

      data: order,

      mail: {
        sent: mailSent,

        email:
          customerEmail || null,

        message:
          mailMessage,
      },
    });
  } catch (error) {
    return res.status(400).json({
      success: false,

      message:
        error.message ||
        "Lỗi cập nhật trạng thái đơn hàng",
    });
  }
};

// ======================================================
// GET INVOICE
// ======================================================

exports.getInvoice = async (
  req,
  res,
  next
) => {
  try {
    const invoice =
      await AdminOrder.getInvoice(
        req.params.id
      );

    if (!invoice) {
      return res.status(404).json({
        success: false,

        message:
          "Không tìm thấy đơn hàng",
      });
    }

    res.json({
      success: true,

      message:
        "Xuất hóa đơn thành công",

      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};