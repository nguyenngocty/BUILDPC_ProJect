const Order = require("../../models/Order");
const { createMomoPayment } = require("../../utils/momo");
const { sendOrderConfirmationMail } = require("../../utils/mailer");

const ORDER_STATUSES = [
  "PENDING",
  "PROCESSING",
  "SHIPPING",
  "COMPLETED",
  "CANCELLED",
];

const emptyToNull = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  const text = String(value).trim();

  return text === "" ? null : text;
};

const normalizePositiveInt = (
  value,
  defaultValue,
  maximum = Number.MAX_SAFE_INTEGER,
) => {
  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed) || parsed < 1) {
    return defaultValue;
  }

  return Math.min(parsed, maximum);
};

const validateOrderData = (data) => {
  if (!data.user_id) {
    return "Thiếu user_id";
  }

  if (!data.shipping_name) {
    return "Vui lòng nhập họ tên người nhận";
  }

  if (!data.shipping_phone) {
    return "Vui lòng nhập số điện thoại";
  }

  if (!data.shipping_email) {
    return "Vui lòng nhập email nhận thông báo đơn hàng";
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(data.shipping_email)) {
    return "Email không hợp lệ";
  }

  if (!data.shipping_address) {
    return "Vui lòng nhập địa chỉ nhận hàng";
  }

  if (!data.payment_method) {
    return "Vui lòng chọn phương thức thanh toán";
  }

  if (!["cod", "bank", "momo"].includes(data.payment_method)) {
    return "Phương thức thanh toán không hợp lệ";
  }

  return null;
};

const getBankInfo = async (orderId) => {
  if (typeof Order.getBankInfo === "function") {
    const result = await Order.getBankInfo(orderId);

    return result?.bank || null;
  }

  return {
    bank_name: process.env.BANK_NAME || "MB Bank",

    account_number: process.env.BANK_ACCOUNT_NUMBER || "0123456789",

    account_name: process.env.BANK_ACCOUNT_NAME || "BUILDPC",

    branch: process.env.BANK_BRANCH || "Can Tho",
  };
};

exports.createOrder = async (req, res, next) => {
  try {
    const data = {
      user_id: req.auth?.userId,

      shipping_name: emptyToNull(req.body.shipping_name),

      shipping_phone: emptyToNull(req.body.shipping_phone),

      shipping_email: emptyToNull(req.body.shipping_email),

      shipping_address: emptyToNull(req.body.shipping_address),

      note: emptyToNull(req.body.note),

      payment_method: emptyToNull(req.body.payment_method) || "cod",

      shipping_fee: Number(req.body.shipping_fee || 0),

      discount_amount: Number(req.body.discount_amount || 0),
    };

    const errorMessage = validateOrderData(data);

    if (errorMessage) {
      return res.status(400).json({
        success: false,
        message: errorMessage,
      });
    }

    const order = await Order.createFromCart(data);

    if (data.payment_method !== "momo") {
      try {
        await sendOrderConfirmationMail(order.shipping_email, order);
      } catch (mailError) {
        console.error("Lỗi gửi mail xác nhận đơn hàng:", mailError.message);
      }
    }

    if (data.payment_method === "momo") {
      const momoResult = await createMomoPayment({
        order,
      });

      if (Number(momoResult.resultCode) !== 0 || !momoResult.payUrl) {
        return res.status(400).json({
          success: false,
          message: momoResult.message || "Không tạo được thanh toán MoMo",
          data: momoResult,
        });
      }

      return res.status(201).json({
        success: true,
        message: "Tạo đơn hàng và thanh toán MoMo thành công",

        data: {
          order,
          payment_url: momoResult.payUrl,
          momo: momoResult,
        },
      });
    }

    if (data.payment_method === "bank") {
      const bankInfo = await getBankInfo(order.id);

      return res.status(201).json({
        success: true,
        message: "Đặt hàng thành công, vui lòng chuyển khoản ngân hàng",

        data: {
          order,
          bank_info: bankInfo,
        },
      });
    }

    return res.status(201).json({
      success: true,
      message: "Đặt hàng thành công",

      data: {
        order,
      },
    });
  } catch (error) {
    console.error("Lỗi tạo đơn:", error.response?.data || error.message);

    return res.status(400).json({
      success: false,

      message:
        error.response?.data?.message || error.message || "Đặt hàng thất bại",

      data: error.response?.data || null,
    });
  }
};

exports.getOrders = async (req, res, next) => {
  try {
    const userId = Number.parseInt(req.user?.id, 10);

    if (Number.isNaN(userId) || userId < 1) {
      return res.status(401).json({
        success: false,
        message: "Bạn cần đăng nhập để xem đơn hàng.",
      });
    }

    const requestedPage = normalizePositiveInt(req.query.page, 1);

    const limit = normalizePositiveInt(req.query.limit, 10, 50);

    const status = String(req.query.status || "")
      .trim()
      .toUpperCase();

    const search = String(req.query.search || "")
      .trim()
      .slice(0, 100);

    if (status && !ORDER_STATUSES.includes(status)) {
      return res.status(422).json({
        success: false,
        message: "Trạng thái đơn hàng không hợp lệ.",
      });
    }

    const totalItems = await Order.countUserOrders({
      userId,
      status,
      search,
    });

    const totalPages = totalItems > 0 ? Math.ceil(totalItems / limit) : 0;

    const page = totalPages > 0 ? Math.min(requestedPage, totalPages) : 1;

    const orders = await Order.getUserOrders({
      userId,
      page,
      limit,
      status,
      search,
    });

    return res.json({
      success: true,
      message: "Lấy danh sách đơn hàng thành công",

      data: {
        orders,

        pagination: {
          page,
          limit,
          totalItems,
          totalPages,

          hasPreviousPage: page > 1,

          hasNextPage: totalPages > 0 && page < totalPages,
        },

        filters: {
          status,
          search,
        },

        statuses: ORDER_STATUSES,
      },
    });
  } catch (error) {
    return next(error);
  }
};

exports.getOrderById = async (req, res, next) => {
  try {
    const userId = Number.parseInt(req.user?.id, 10);

    const orderId = Number.parseInt(req.params.id, 10);

    if (Number.isNaN(userId) || userId < 1) {
      return res.status(401).json({
        success: false,
        message: "Bạn cần đăng nhập để xem đơn hàng.",
      });
    }

    if (Number.isNaN(orderId) || orderId < 1) {
      return res.status(400).json({
        success: false,
        message: "Mã đơn hàng không hợp lệ.",
      });
    }

    const order = await Order.getUserOrderById({
      userId,
      orderId,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng.",
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

exports.cancelOrder = async (req, res, next) => {
  try {
    const userId = Number.parseInt(req.user?.id, 10);

    const orderId = Number.parseInt(req.params.id, 10);

    const reason = String(req.body.reason || "")
      .trim()
      .slice(0, 500);

    if (!Number.isInteger(userId) || userId < 1) {
      return res.status(401).json({
        success: false,
        message: "Bạn cần đăng nhập để hủy đơn hàng.",
      });
    }

    if (!Number.isInteger(orderId) || orderId < 1) {
      return res.status(400).json({
        success: false,
        message: "Mã đơn hàng không hợp lệ.",
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn lý do hủy đơn hàng.",
      });
    }

    const order = await Order.cancelByUser({
      userId,
      orderId,
      reason,
    });

    return res.json({
      success: true,
      message: "Hủy đơn hàng thành công.",
      data: order,
    });
  } catch (error) {
    const message = error.message || "Không thể hủy đơn hàng.";

    const statusCode = message === "Không tìm thấy đơn hàng" ? 404 : 400;

    return res.status(statusCode).json({
      success: false,
      message,
    });
  }
};

exports.getReorderCheckout = async (req, res, next) => {
  try {
    const userId = Number.parseInt(req.user?.id, 10);

    const orderId = Number.parseInt(req.params.id, 10);

    if (!Number.isInteger(userId) || userId < 1) {
      return res.status(401).json({
        success: false,
        message: "Bạn cần đăng nhập để mua lại đơn hàng.",
      });
    }

    if (!Number.isInteger(orderId) || orderId < 1) {
      return res.status(400).json({
        success: false,
        message: "Mã đơn hàng không hợp lệ.",
      });
    }

    const preview = await Order.getReorderCheckoutPreview({
      userId,
      orderId,
    });

    if (!preview) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng.",
      });
    }

    if (!Array.isArray(preview.items) || preview.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Không có sản phẩm nào còn khả dụng để mua lại.",
        data: preview,
      });
    }

    return res.json({
      success: true,
      message: "Lấy thông tin checkout mua lại thành công.",
      data: preview,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Không thể tải thông tin mua lại.",
    });
  }
};

exports.createReorderCheckout = async (req, res, next) => {
  try {
    const userId = Number.parseInt(req.user?.id, 10);

    const sourceOrderId = Number.parseInt(req.params.id, 10);

    if (!Number.isInteger(userId) || userId < 1) {
      return res.status(401).json({
        success: false,
        message: "Bạn cần đăng nhập để mua lại đơn hàng.",
      });
    }

    if (!Number.isInteger(sourceOrderId) || sourceOrderId < 1) {
      return res.status(400).json({
        success: false,
        message: "Mã đơn hàng không hợp lệ.",
      });
    }

    const data = {
      user_id: userId,

      source_order_id: sourceOrderId,

      shipping_name: emptyToNull(req.body.shipping_name),

      shipping_phone: emptyToNull(req.body.shipping_phone),

      shipping_email: emptyToNull(req.body.shipping_email),

      shipping_address: emptyToNull(req.body.shipping_address),

      note: emptyToNull(req.body.note),

      payment_method: emptyToNull(req.body.payment_method) || "cod",

      shipping_fee: Number(req.body.shipping_fee || 0),

      discount_amount: Number(req.body.discount_amount || 0),
    };

    const errorMessage = validateOrderData(data);

    if (errorMessage) {
      return res.status(400).json({
        success: false,
        message: errorMessage,
      });
    }

    const order = await Order.createFromReorder(data);

    if (data.payment_method !== "momo") {
      try {
        await sendOrderConfirmationMail(order.shipping_email, order);
      } catch (mailError) {
        console.error("Lỗi gửi mail xác nhận đơn mua lại:", mailError.message);
      }
    }

    if (data.payment_method === "momo") {
      const momoResult = await createMomoPayment({
        order,
      });

      if (Number(momoResult.resultCode) !== 0 || !momoResult.payUrl) {
        return res.status(400).json({
          success: false,
          message: momoResult.message || "Không tạo được thanh toán MoMo",
          data: momoResult,
        });
      }

      return res.status(201).json({
        success: true,
        message: "Tạo đơn mua lại và thanh toán MoMo thành công",

        data: {
          order,

          payment_url: momoResult.payUrl,

          momo: momoResult,
        },
      });
    }

    if (data.payment_method === "bank") {
      const bankInfo = await getBankInfo(order.id);

      return res.status(201).json({
        success: true,
        message: "Đặt lại đơn hàng thành công, vui lòng chuyển khoản ngân hàng",

        data: {
          order,

          bank_info: bankInfo,
        },
      });
    }

    return res.status(201).json({
      success: true,
      message: "Đặt lại đơn hàng thành công",

      data: {
        order,
      },
    });
  } catch (error) {
    console.error(
      "Lỗi tạo đơn mua lại:",
      error.response?.data || error.message,
    );

    return res.status(400).json({
      success: false,

      message:
        error.response?.data?.message ||
        error.message ||
        "Đặt lại đơn hàng thất bại",

      data: error.response?.data || null,
    });
  }
};
