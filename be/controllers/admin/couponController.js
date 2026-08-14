const Coupon = require("../../models/Coupon");

const normalizeCouponPayload = (body) => {
  const data = { ...body };

  if (Object.prototype.hasOwnProperty.call(data, "code") && data.code != null) {
    data.code = String(data.code).trim().toUpperCase();
  }

  if (Object.prototype.hasOwnProperty.call(data, "type") && data.type != null) {
    data.type = String(data.type).trim().toLowerCase();
  }

  ["value", "min_order", "quantity", "used_count", "status"].forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(data, field) && data[field] !== "") {
      data[field] = Number(data[field]);
    }
  });

  ["start_date", "end_date"].forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(data, field) && data[field] === "") {
      data[field] = null;
    }
  });

  return data;
};

const isInvalidDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return false;
  return new Date(startDate).getTime() > new Date(endDate).getTime();
};

const validateCoupon = (data, isUpdate = false) => {
  if (!isUpdate || Object.prototype.hasOwnProperty.call(data, "code")) {
    if (!data.code || !String(data.code).trim()) {
      return "Vui lòng nhập mã coupon";
    }
  }

  if (!isUpdate || Object.prototype.hasOwnProperty.call(data, "type")) {
    if (!["percent", "fixed"].includes(data.type)) {
      return "Loại coupon phải là percent hoặc fixed";
    }
  }

  if (!isUpdate || Object.prototype.hasOwnProperty.call(data, "value")) {
    if (Number.isNaN(data.value) || data.value < 0) {
      return "Giá trị coupon không hợp lệ";
    }
  }

  if (!isUpdate || Object.prototype.hasOwnProperty.call(data, "min_order")) {
    if (Number.isNaN(data.min_order) || data.min_order < 0) {
      return "Đơn tối thiểu không hợp lệ";
    }
  }

  if (!isUpdate || Object.prototype.hasOwnProperty.call(data, "quantity")) {
    if (Number.isNaN(data.quantity) || data.quantity < 0) {
      return "Số lượng coupon không hợp lệ";
    }
  }

  if (!isUpdate || Object.prototype.hasOwnProperty.call(data, "used_count")) {
    if (Number.isNaN(data.used_count) || data.used_count < 0) {
      return "Số lượt đã dùng không hợp lệ";
    }
  }

  if (!isUpdate || Object.prototype.hasOwnProperty.call(data, "status")) {
    if (![0, 1].includes(Number(data.status))) {
      return "Trạng thái coupon phải là 0 hoặc 1";
    }
  }

  const startDate = Object.prototype.hasOwnProperty.call(data, "start_date") ? data.start_date : null;
  const endDate = Object.prototype.hasOwnProperty.call(data, "end_date") ? data.end_date : null;

  if (isInvalidDateRange(startDate, endDate)) {
    return "Ngày bắt đầu không được lớn hơn ngày kết thúc";
  }

  return null;
};

exports.getAllCoupons = async (req, res, next) => {
  try {
    const result = await Coupon.getAll(req.query);

    res.json({
      success: true,
      message: "Lấy danh sách coupon thành công",
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

exports.getCouponById = async (req, res, next) => {
  try {
    const coupon = await Coupon.getById(req.params.id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy coupon",
      });
    }

    res.json({
      success: true,
      message: "Lấy chi tiết coupon thành công",
      data: coupon,
    });
  } catch (error) {
    next(error);
  }
};

exports.createCoupon = async (req, res, next) => {
  try {
    const data = normalizeCouponPayload(req.body);
    const validationMessage = validateCoupon(data);

    if (validationMessage) {
      return res.status(400).json({
        success: false,
        message: validationMessage,
      });
    }

    const existingCoupon = await Coupon.getByCode(data.code);
    if (existingCoupon) {
      return res.status(409).json({
        success: false,
        message: "Mã coupon đã tồn tại",
      });
    }

    const coupon = await Coupon.create({
      code: data.code,
      type: data.type,
      value: data.value,
      min_order: data.min_order || 0,
      start_date: data.start_date || null,
      end_date: data.end_date || null,
      quantity: data.quantity || 0,
      used_count: data.used_count || 0,
      status: data.status === undefined ? 1 : Number(data.status),
    });

    res.status(201).json({
      success: true,
      message: "Thêm coupon thành công",
      data: coupon,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateCoupon = async (req, res, next) => {
  try {
    const currentCoupon = await Coupon.getById(req.params.id);

    if (!currentCoupon) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy coupon",
      });
    }

    const data = normalizeCouponPayload(req.body);
    const validationMessage = validateCoupon(data, true);

    if (validationMessage) {
      return res.status(400).json({
        success: false,
        message: validationMessage,
      });
    }

    if (data.code) {
      const existingCoupon = await Coupon.getByCode(data.code);
      if (existingCoupon && String(existingCoupon.id) !== String(req.params.id)) {
        return res.status(409).json({
          success: false,
          message: "Mã coupon đã tồn tại",
        });
      }
    }

    const coupon = await Coupon.update(req.params.id, data);

    res.json({
      success: true,
      message: "Cập nhật coupon thành công",
      data: coupon,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.getById(req.params.id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy coupon",
      });
    }

    await Coupon.remove(req.params.id);

    res.json({
      success: true,
      message: "Xóa coupon thành công",
    });
  } catch (error) {
    next(error);
  }
};