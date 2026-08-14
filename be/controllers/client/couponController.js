const Coupon = require("../../models/Coupon");

const normalizeMoney = (value) => {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return 0;
  }

  return Math.max(numberValue, 0);
};

const normalizeDateOnly = (value) => {
  if (!value) return null;

  // Nếu database trả DATE dạng string: 2026-08-15
  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  // Nếu mysql driver trả về Date object
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(date);
};

const getVietnamToday = () => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(new Date());
};

exports.validateCoupon = async (req, res, next) => {
  try {
    const code = String(req.body?.code || "")
      .trim()
      .toUpperCase();

    const subtotal = normalizeMoney(req.body?.subtotal);

    // =========================
    // 1. KIỂM TRA MÃ RỖNG
    // =========================
    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập mã giảm giá",
      });
    }

    // =========================
    // 2. KIỂM TRA GIỎ HÀNG
    // =========================
    if (subtotal <= 0) {
      return res.status(400).json({
        success: false,
        message: "Giỏ hàng không hợp lệ để áp dụng mã giảm giá",
      });
    }

    // =========================
    // 3. TÌM COUPON
    // =========================
    const coupon = await Coupon.getByCode(code);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Mã giảm giá không tồn tại",
      });
    }

    // =========================
    // 4. KIỂM TRA TRẠNG THÁI
    // =========================
    if (Number(coupon.status) !== 1) {
      return res.status(400).json({
        success: false,
        message: "Mã giảm giá hiện đang tạm tắt",
      });
    }

    // =========================
    // 5. KIỂM TRA THỜI GIAN
    // =========================
    const today = getVietnamToday();

    const startDate = normalizeDateOnly(coupon.start_date);
    const endDate = normalizeDateOnly(coupon.end_date);

    if (startDate && today < startDate) {
      return res.status(400).json({
        success: false,
        message: `Mã giảm giá chưa có hiệu lực. Bắt đầu từ ${startDate}`,
      });
    }

    if (endDate && today > endDate) {
      return res.status(400).json({
        success: false,
        message: "Mã giảm giá đã hết hạn",
      });
    }

    // =========================
    // 6. KIỂM TRA SỐ LƯỢNG
    // =========================
    const quantity = Number(coupon.quantity || 0);
    const usedCount = Number(coupon.used_count || 0);

    if (quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Mã giảm giá đã hết lượt sử dụng",
      });
    }

    if (usedCount >= quantity) {
      return res.status(400).json({
        success: false,
        message: "Mã giảm giá đã hết lượt sử dụng",
      });
    }

    // =========================
    // 7. KIỂM TRA ĐƠN TỐI THIỂU
    // =========================
    const minOrder = normalizeMoney(coupon.min_order);

    if (subtotal < minOrder) {
      return res.status(400).json({
        success: false,
        message: `Đơn hàng tối thiểu để dùng mã này là ${Math.round(
          minOrder,
        ).toLocaleString("vi-VN")}đ`,
      });
    }

    // =========================
    // 8. TÍNH GIẢM GIÁ
    // =========================
    const value = normalizeMoney(coupon.value);

    let discountAmount = 0;

    if (coupon.type === "percent") {
      discountAmount = Math.round((subtotal * value) / 100);
    } else if (coupon.type === "fixed") {
      discountAmount = value;
    } else {
      return res.status(400).json({
        success: false,
        message: "Loại mã giảm giá không hợp lệ",
      });
    }

    // Không cho tiền giảm vượt quá tiền hàng
    discountAmount = Math.min(discountAmount, subtotal);

    const totalAfterDiscount = Math.max(
      subtotal - discountAmount,
      0,
    );

    // =========================
    // 9. TRẢ KẾT QUẢ
    // =========================
    return res.json({
      success: true,
      message: "Áp dụng mã giảm giá thành công",

      data: {
        id: coupon.id,

        code: coupon.code,

        type: coupon.type,

        value,

        min_order: minOrder,

        start_date: startDate,

        end_date: endDate,

        quantity,

        used_count: usedCount,

        remaining: Math.max(quantity - usedCount, 0),

        subtotal,

        discount_amount: discountAmount,

        total_after_discount: totalAfterDiscount,
      },
    });
  } catch (error) {
    next(error);
  }
};