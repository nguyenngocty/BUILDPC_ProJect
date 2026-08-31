const Order = require("../../models/Order");

const { createMomoPayment } = require("../../utils/momo");

const { sendOrderConfirmationMail } = require("../../utils/mailer");

// ============================================================
// CONSTANTS
// ============================================================

const ORDER_STATUSES = [
  "PENDING",
  "PROCESSING",
  "SHIPPING",
  "COMPLETED",
  "CANCELLED",
];

const PAYMENT_METHODS = ["cod", "bank", "momo"];

// ============================================================
// HELPERS
// ============================================================

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

const normalizeProvinceCode = (value) => {
  return String(value || "")
    .trim()
    .toUpperCase();
};

const normalizeCouponCode = (value) => {
  return String(value || "")
    .trim()
    .toUpperCase();
};

const normalizePaymentMethod = (value) => {
  return String(value || "")
    .trim()
    .toLowerCase();
};

// ============================================================
// VALIDATE ORDER DATA
// ============================================================

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

  if (!data.province_code) {
    return "Vui lòng chọn tỉnh / thành phố nhận hàng";
  }

  if (!data.payment_method) {
    return "Vui lòng chọn phương thức thanh toán";
  }

  if (!PAYMENT_METHODS.includes(data.payment_method)) {
    return "Phương thức thanh toán không hợp lệ";
  }

  return null;
};

// ============================================================
// BANK INFO
// ============================================================

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

// ============================================================
// SEND CONFIRMATION MAIL SAFELY
//
// Mail lỗi không được làm lỗi Order.
// ============================================================

const sendConfirmationMailSafely = async (
  order,
  logPrefix = "Lỗi gửi mail xác nhận đơn hàng",
) => {
  const email = String(order?.shipping_email || "").trim();

  if (!email) {
    return false;
  }

  try {
    await sendOrderConfirmationMail(email, order);

    return true;
  } catch (mailError) {
    console.error(`${logPrefix}:`, mailError?.message || mailError);

    return false;
  }
};

// ============================================================
// CANCEL ORDER AFTER MOMO INITIALIZATION FAILURE
//
// Order đã:
// - tạo trong DB
// - trừ stock
// - tăng coupon used_count
//
// Nếu createMomoPayment() fail thì phải:
// - CANCELLED
// - restore stock
// - restore coupon
//
// Không để Order PENDING giữ tồn kho vô thời hạn.
// ============================================================

const rollbackMomoInitializedOrder = async (
  order,
  reason = "Không thể khởi tạo thanh toán MoMo",
) => {
  if (!order?.id) {
    return null;
  }

  try {
    return await Order.cancelAndRestoreStock({
      orderId: order.id,

      reason,

      allowedStatuses: ["PENDING"],
    });
  } catch (cancelError) {
    /*
     * Đây là tình huống nghiêm trọng:
     *
     * MoMo init fail nhưng Order không tự cancel được.
     *
     * Không nuốt lỗi hoàn toàn.
     * Ghi rõ server log để Admin kiểm tra.
     */
    console.error(
      `[ORDER][MOMO] Không thể rollback đơn ${order.order_code || order.id}:`,
      cancelError,
    );

    return null;
  }
};

// ============================================================
// CREATE ORDER
//
// POST /api/client/orders
//
// SECURITY:
//
// KHÔNG tin:
// - req.body.shipping_fee
// - req.body.discount_amount
//
// Backend tự tính từ:
// - Cart/Product/Variant
// - province_code
// - coupon_code
// ============================================================

exports.createOrder = async (req, res, next) => {
  let createdOrder = null;

  try {
    const data = {
      // ======================================================
      // USER
      //
      // Không nhận user_id từ Client.
      // ======================================================

      user_id: req.auth?.userId,

      // ======================================================
      // SHIPPING SNAPSHOT INPUT
      // ======================================================

      shipping_name: emptyToNull(req.body.shipping_name),

      shipping_phone: emptyToNull(req.body.shipping_phone),

      shipping_email: emptyToNull(req.body.shipping_email),

      shipping_address: emptyToNull(req.body.shipping_address),

      province_code: normalizeProvinceCode(req.body.province_code),

      // ======================================================
      // COUPON
      //
      // Chỉ nhận CODE.
      //
      // discount_amount do Model tự tính.
      // ======================================================

      coupon_code: normalizeCouponCode(req.body.coupon_code),

      // ======================================================
      // PAYMENT
      // ======================================================

      payment_method: normalizePaymentMethod(req.body.payment_method || "cod"),

      // ======================================================
      // NOTE
      // ======================================================

      note: emptyToNull(req.body.note),
    };

    // ========================================================
    // VALIDATE
    // ========================================================

    const errorMessage = validateOrderData(data);

    if (errorMessage) {
      return res.status(400).json({
        success: false,

        message: errorMessage,
      });
    }

    // ========================================================
    // CREATE
    //
    // Order.createFromCart tự:
    //
    // - lock cart
    // - re-read Product/Variant
    // - tính giá hiện tại
    // - subtotal
    // - validate coupon
    // - discount
    // - shipping
    // - total
    // - stock
    // - stock log
    // - payment
    // ========================================================

    createdOrder = await Order.createFromCart(data);

    if (!createdOrder) {
      throw new Error("Không tạo được đơn hàng");
    }

    // ========================================================
    // MOMO
    // ========================================================

    if (data.payment_method === "momo") {
      let momoResult;

      try {
        momoResult = await createMomoPayment({
          order: createdOrder,
        });
      } catch (momoError) {
        console.error(
          "[ORDER][MOMO] Lỗi khởi tạo MoMo:",
          momoError?.response?.data || momoError,
        );

        const cancelledOrder = await rollbackMomoInitializedOrder(
          createdOrder,
          "Khởi tạo thanh toán MoMo thất bại",
        );

        return res.status(400).json({
          success: false,

          message:
            momoError?.response?.data?.message ||
            momoError?.message ||
            "Không thể khởi tạo thanh toán MoMo",

          data: {
            order: cancelledOrder || createdOrder,

            payment_url: null,
          },
        });
      }

      // ======================================================
      // MOMO RESPONSE INVALID
      // ======================================================

      if (Number(momoResult?.resultCode) !== 0 || !momoResult?.payUrl) {
        const reason = momoResult?.message || "Không tạo được thanh toán MoMo";

        const cancelledOrder = await rollbackMomoInitializedOrder(
          createdOrder,
          reason,
        );

        return res.status(400).json({
          success: false,

          message: reason,

          data: {
            order: cancelledOrder || createdOrder,

            payment_url: null,

            momo: momoResult || null,
          },
        });
      }

      // ======================================================
      // MOMO SUCCESS INIT
      //
      // Chưa gửi email xác nhận ở đây.
      // Email được gửi khi callback xác nhận payment success.
      // ======================================================

      return res.status(201).json({
        success: true,

        message: "Tạo đơn hàng và khởi tạo thanh toán MoMo thành công",

        data: {
          order: createdOrder,

          payment_url: momoResult.payUrl,

          momo: momoResult,
        },
      });
    }

    // ========================================================
    // NON-MOMO CONFIRMATION MAIL
    // ========================================================

    const mailSent = await sendConfirmationMailSafely(createdOrder);

    // ========================================================
    // BANK
    // ========================================================

    if (data.payment_method === "bank") {
      const bankInfo = await getBankInfo(createdOrder.id);

      return res.status(201).json({
        success: true,

        message: "Đặt hàng thành công, vui lòng chuyển khoản ngân hàng",

        data: {
          order: createdOrder,

          bank_info: bankInfo,
        },

        mail: {
          sent: mailSent,
        },
      });
    }

    // ========================================================
    // COD
    // ========================================================

    return res.status(201).json({
      success: true,

      message: "Đặt hàng thành công",

      data: {
        order: createdOrder,
      },

      mail: {
        sent: mailSent,
      },
    });
  } catch (error) {
    console.error("Lỗi tạo đơn:", error?.response?.data || error);

    return res.status(400).json({
      success: false,

      message:
        error?.response?.data?.message || error?.message || "Đặt hàng thất bại",

      data: error?.response?.data || null,
    });
  }
};

// ============================================================
// GET USER ORDERS
//
// GET /api/client/orders
// ============================================================

exports.getOrders = async (req, res, next) => {
  try {
    const userId = Number.parseInt(req.auth?.userId || req.user?.id, 10);

    if (!Number.isInteger(userId) || userId < 1) {
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

    // ========================================================
    // STATUS FILTER
    // ========================================================

    if (status && !ORDER_STATUSES.includes(status)) {
      return res.status(422).json({
        success: false,

        message: "Trạng thái đơn hàng không hợp lệ.",
      });
    }

    // ========================================================
    // COUNT
    // ========================================================

    const totalItems = await Order.countUserOrders({
      userId,

      status,

      search,
    });

    const totalPages = totalItems > 0 ? Math.ceil(totalItems / limit) : 0;

    const page = totalPages > 0 ? Math.min(requestedPage, totalPages) : 1;

    // ========================================================
    // DATA
    // ========================================================

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

// ============================================================
// GET ORDER DETAIL
//
// GET /api/client/orders/:id
// ============================================================

exports.getOrderById = async (req, res, next) => {
  try {
    const userId = Number.parseInt(req.auth?.userId || req.user?.id, 10);

    const orderId = Number.parseInt(req.params.id, 10);

    if (!Number.isInteger(userId) || userId < 1) {
      return res.status(401).json({
        success: false,

        message: "Bạn cần đăng nhập để xem đơn hàng.",
      });
    }

    if (!Number.isInteger(orderId) || orderId < 1) {
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

// ============================================================
// CANCEL ORDER
//
// PATCH /api/client/orders/:id/cancel
// ============================================================

exports.cancelOrder = async (req, res, next) => {
  try {
    const userId = Number.parseInt(req.auth?.userId || req.user?.id, 10);

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
    const message = error?.message || "Không thể hủy đơn hàng.";

    const statusCode = message === "Không tìm thấy đơn hàng" ? 404 : 400;

    return res.status(statusCode).json({
      success: false,

      message,
    });
  }
};

// ============================================================
// REORDER PREVIEW
//
// GET /api/client/orders/:id/reorder-checkout
// ============================================================

exports.getReorderCheckout = async (req, res, next) => {
  try {
    const userId = Number.parseInt(req.auth?.userId || req.user?.id, 10);

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

      message: error?.message || "Không thể tải thông tin mua lại.",
    });
  }
};

// ============================================================
// CREATE REORDER
//
// POST /api/client/orders/:id/reorder-checkout
//
// Tương tự createOrder:
//
// Không nhận:
// - shipping_fee
// - discount_amount
//
// Backend tự tính lại.
// ============================================================

exports.createReorderCheckout = async (req, res, next) => {
  let createdOrder = null;

  try {
    const userId = Number.parseInt(req.auth?.userId || req.user?.id, 10);

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

    // ======================================================
    // REQUEST
    // ======================================================

    const data = {
      user_id: userId,

      source_order_id: sourceOrderId,

      shipping_name: emptyToNull(req.body.shipping_name),

      shipping_phone: emptyToNull(req.body.shipping_phone),

      shipping_email: emptyToNull(req.body.shipping_email),

      shipping_address: emptyToNull(req.body.shipping_address),

      province_code: normalizeProvinceCode(req.body.province_code),

      coupon_code: normalizeCouponCode(req.body.coupon_code),

      note: emptyToNull(req.body.note),

      payment_method: normalizePaymentMethod(req.body.payment_method || "cod"),
    };

    // ======================================================
    // VALIDATE
    // ======================================================

    const errorMessage = validateOrderData(data);

    if (errorMessage) {
      return res.status(400).json({
        success: false,

        message: errorMessage,
      });
    }

    // ======================================================
    // CREATE
    // ======================================================

    createdOrder = await Order.createFromReorder(data);

    if (!createdOrder) {
      throw new Error("Không tạo được đơn mua lại");
    }

    // ======================================================
    // MOMO
    // ======================================================

    if (data.payment_method === "momo") {
      let momoResult;

      try {
        momoResult = await createMomoPayment({
          order: createdOrder,
        });
      } catch (momoError) {
        console.error(
          "[REORDER][MOMO] Lỗi khởi tạo MoMo:",
          momoError?.response?.data || momoError,
        );

        const cancelledOrder = await rollbackMomoInitializedOrder(
          createdOrder,
          "Khởi tạo thanh toán MoMo cho đơn mua lại thất bại",
        );

        return res.status(400).json({
          success: false,

          message:
            momoError?.response?.data?.message ||
            momoError?.message ||
            "Không thể khởi tạo thanh toán MoMo",

          data: {
            order: cancelledOrder || createdOrder,

            payment_url: null,
          },
        });
      }

      if (Number(momoResult?.resultCode) !== 0 || !momoResult?.payUrl) {
        const reason = momoResult?.message || "Không tạo được thanh toán MoMo";

        const cancelledOrder = await rollbackMomoInitializedOrder(
          createdOrder,
          reason,
        );

        return res.status(400).json({
          success: false,

          message: reason,

          data: {
            order: cancelledOrder || createdOrder,

            payment_url: null,

            momo: momoResult || null,
          },
        });
      }

      return res.status(201).json({
        success: true,

        message: "Tạo đơn mua lại và khởi tạo thanh toán MoMo thành công",

        data: {
          order: createdOrder,

          payment_url: momoResult.payUrl,

          momo: momoResult,
        },
      });
    }

    // ======================================================
    // NON-MOMO EMAIL
    // ======================================================

    const mailSent = await sendConfirmationMailSafely(
      createdOrder,
      "Lỗi gửi mail xác nhận đơn mua lại",
    );

    // ======================================================
    // BANK
    // ======================================================

    if (data.payment_method === "bank") {
      const bankInfo = await getBankInfo(createdOrder.id);

      return res.status(201).json({
        success: true,

        message: "Đặt lại đơn hàng thành công, vui lòng chuyển khoản ngân hàng",

        data: {
          order: createdOrder,

          bank_info: bankInfo,
        },

        mail: {
          sent: mailSent,
        },
      });
    }

    // ======================================================
    // COD
    // ======================================================

    return res.status(201).json({
      success: true,

      message: "Đặt lại đơn hàng thành công",

      data: {
        order: createdOrder,
      },

      mail: {
        sent: mailSent,
      },
    });
  } catch (error) {
    console.error("Lỗi tạo đơn mua lại:", error?.response?.data || error);

    return res.status(400).json({
      success: false,

      message:
        error?.response?.data?.message ||
        error?.message ||
        "Đặt lại đơn hàng thất bại",

      data: error?.response?.data || null,
    });
  }
};
