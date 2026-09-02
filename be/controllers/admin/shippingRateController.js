const ShippingRate = require("../../models/ShippingRate");

// ============================================================
// HELPERS
// ============================================================

const hasOwn = (object, key) => {
  return Object.prototype.hasOwnProperty.call(object, key);
};

const normalizePositiveInt = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return null;
  }

  return parsed;
};

const normalizeProvinceCode = (value) => {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
};

const normalizeProvinceName = (value) => {
  return String(value || "")
    .trim()
    .slice(0, 150);
};

const normalizeMoney = (value, defaultValue = 0) => {
  if (value === null || value === undefined || value === "") {
    return defaultValue;
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : defaultValue;
};

const normalizeStatus = (value, defaultValue = 1) => {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  return Number(value);
};

// ============================================================
// NORMALIZE PAYLOAD
// ============================================================

const normalizeShippingRatePayload = (body = {}, { partial = false } = {}) => {
  const data = {};

  // ==========================================================
  // PROVINCE CODE
  // ==========================================================

  if (!partial || hasOwn(body, "province_code")) {
    data.province_code = normalizeProvinceCode(body.province_code);
  }

  // ==========================================================
  // PROVINCE NAME
  // ==========================================================

  if (!partial || hasOwn(body, "province_name")) {
    data.province_name = normalizeProvinceName(body.province_name);
  }

  // ==========================================================
  // GHN PROVINCE ID
  //
  // Cho phép:
  // - số nguyên dương
  // - null / "" để bỏ mapping
  // ==========================================================

  if (!partial || hasOwn(body, "ghn_province_id")) {
    data.ghn_province_id = normalizePositiveInt(body.ghn_province_id);
  }

  // ==========================================================
  // SHIPPING FEE
  // ==========================================================

  if (!partial || hasOwn(body, "shipping_fee")) {
    data.shipping_fee = normalizeMoney(body.shipping_fee, 0);
  }

  // ==========================================================
  // FREE SHIPPING MIN
  // ==========================================================

  if (!partial || hasOwn(body, "free_shipping_min")) {
    if (
      body.free_shipping_min === null ||
      body.free_shipping_min === undefined ||
      body.free_shipping_min === ""
    ) {
      data.free_shipping_min = null;
    } else {
      data.free_shipping_min = normalizeMoney(body.free_shipping_min, 0);
    }
  }

  // ==========================================================
  // STATUS
  // ==========================================================

  if (!partial || hasOwn(body, "status")) {
    data.status = normalizeStatus(body.status, 1);
  }

  return data;
};

// ============================================================
// VALIDATION
// ============================================================

const validateShippingRate = (data, { partial = false } = {}) => {
  const errors = [];

  // ==========================================================
  // PROVINCE CODE
  // ==========================================================

  if (!partial || hasOwn(data, "province_code")) {
    if (!data.province_code) {
      errors.push("Mã tỉnh/thành không được để trống");
    } else {
      const codeRegex = /^[A-Z0-9_]+$/;

      if (!codeRegex.test(data.province_code)) {
        errors.push(
          "Mã tỉnh/thành chỉ được chứa chữ in hoa, số và dấu gạch dưới",
        );
      }

      if (data.province_code.length > 50) {
        errors.push("Mã tỉnh/thành không được vượt quá 50 ký tự");
      }
    }
  }

  // ==========================================================
  // PROVINCE NAME
  // ==========================================================

  if (!partial || hasOwn(data, "province_name")) {
    if (!data.province_name) {
      errors.push("Tên tỉnh/thành không được để trống");
    } else if (data.province_name.length > 150) {
      errors.push("Tên tỉnh/thành không được vượt quá 150 ký tự");
    }
  }

  // ==========================================================
  // GHN PROVINCE ID
  // ==========================================================

  if (hasOwn(data, "ghn_province_id") && data.ghn_province_id !== null) {
    if (
      !Number.isInteger(Number(data.ghn_province_id)) ||
      Number(data.ghn_province_id) < 1
    ) {
      errors.push("GHN Province ID không hợp lệ");
    }
  }

  // ==========================================================
  // SHIPPING FEE
  // ==========================================================

  if (!partial || hasOwn(data, "shipping_fee")) {
    if (!Number.isFinite(Number(data.shipping_fee))) {
      errors.push("Phí vận chuyển không hợp lệ");
    } else if (Number(data.shipping_fee) < 0) {
      errors.push("Phí vận chuyển không được nhỏ hơn 0");
    }
  }

  // ==========================================================
  // FREE SHIPPING MIN
  // ==========================================================

  if (hasOwn(data, "free_shipping_min") && data.free_shipping_min !== null) {
    if (!Number.isFinite(Number(data.free_shipping_min))) {
      errors.push("Mức miễn phí vận chuyển không hợp lệ");
    } else if (Number(data.free_shipping_min) < 0) {
      errors.push("Mức miễn phí vận chuyển không được nhỏ hơn 0");
    }
  }

  // ==========================================================
  // STATUS
  // ==========================================================

  if (!partial || hasOwn(data, "status")) {
    if (![0, 1].includes(Number(data.status))) {
      errors.push("Trạng thái chỉ được là 0 hoặc 1");
    }
  }

  return errors;
};

// ============================================================
// CHECK GHN PROVINCE DUPLICATE
// ============================================================

const checkDuplicateGhnProvince = async (ghnProvinceId, excludeId = null) => {
  if (!ghnProvinceId) {
    return null;
  }

  const existing =
    await ShippingRate.getByGhnProvinceIdIncludingDeleted(ghnProvinceId);

  if (!existing) {
    return null;
  }

  if (excludeId && Number(existing.id) === Number(excludeId)) {
    return null;
  }

  return existing;
};

// ============================================================
// GET ALL
//
// GET /api/admin/shipping-rates
// ============================================================

exports.getAllShippingRates = async (req, res, next) => {
  try {
    const result = await ShippingRate.getAll({
      keyword: req.query.keyword || "",

      status: req.query.status ?? "",

      page: req.query.page || 1,

      limit: req.query.limit || 10,
    });

    return res.json({
      success: true,

      message: "Lấy danh sách phí vận chuyển thành công",

      data: result.data,

      pagination: result.pagination,
    });
  } catch (error) {
    return next(error);
  }
};

// ============================================================
// GET BY ID
//
// GET /api/admin/shipping-rates/:id
// ============================================================

exports.getShippingRateById = async (req, res, next) => {
  try {
    const id = normalizePositiveInt(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,

        message: "ID khu vực vận chuyển không hợp lệ",
      });
    }

    const shippingRate = await ShippingRate.getById(id);

    if (!shippingRate) {
      return res.status(404).json({
        success: false,

        message: "Không tìm thấy khu vực vận chuyển",
      });
    }

    return res.json({
      success: true,

      message: "Lấy chi tiết khu vực vận chuyển thành công",

      data: shippingRate,
    });
  } catch (error) {
    return next(error);
  }
};

// ============================================================
// CREATE
//
// POST /api/admin/shipping-rates
// ============================================================

exports.createShippingRate = async (req, res, next) => {
  try {
    const data = normalizeShippingRatePayload(req.body);

    // ======================================================
    // VALIDATE
    // ======================================================

    const errors = validateShippingRate(data);

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,

        message: errors[0],

        errors,
      });
    }

    // ======================================================
    // DUPLICATE PROVINCE CODE
    // ======================================================

    const existing = await ShippingRate.getByProvinceCodeIncludingDeleted(
      data.province_code,
    );

    if (existing) {
      // ====================================================
      // ACTIVE / NOT DELETED
      // ====================================================

      if (!existing.deleted_at) {
        return res.status(409).json({
          success: false,

          message: "Mã tỉnh/thành này đã tồn tại",
        });
      }

      // ====================================================
      // GHN DUPLICATE BEFORE RESTORE
      // ====================================================

      const duplicateGhn = await checkDuplicateGhnProvince(
        data.ghn_province_id,
        existing.id,
      );

      if (duplicateGhn) {
        return res.status(409).json({
          success: false,

          message: "Tỉnh/thành GHN này đã được ánh xạ cho khu vực khác",
        });
      }

      // ====================================================
      // RESTORE
      // ====================================================

      await ShippingRate.restore(existing.id, {
        status: data.status,
      });

      const restored = await ShippingRate.update(existing.id, data);

      return res.status(201).json({
        success: true,

        message: "Khôi phục và thêm lại khu vực vận chuyển thành công",

        data: restored,
      });
    }

    // ======================================================
    // GHN DUPLICATE
    // ======================================================

    const duplicateGhn = await checkDuplicateGhnProvince(data.ghn_province_id);

    if (duplicateGhn) {
      return res.status(409).json({
        success: false,

        message: "Tỉnh/thành GHN này đã được ánh xạ cho khu vực khác",
      });
    }

    // ======================================================
    // CREATE
    // ======================================================

    const created = await ShippingRate.create(data);

    return res.status(201).json({
      success: true,

      message: "Thêm khu vực vận chuyển thành công",

      data: created,
    });
  } catch (error) {
    if (error?.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,

        message: "Dữ liệu khu vực vận chuyển đã tồn tại",
      });
    }

    return next(error);
  }
};

// ============================================================
// UPDATE
//
// PATCH /api/admin/shipping-rates/:id
// ============================================================

exports.updateShippingRate = async (req, res, next) => {
  try {
    const id = normalizePositiveInt(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,

        message: "ID khu vực vận chuyển không hợp lệ",
      });
    }

    // ======================================================
    // CURRENT
    // ======================================================

    const current = await ShippingRate.getById(id);

    if (!current) {
      return res.status(404).json({
        success: false,

        message: "Không tìm thấy khu vực vận chuyển",
      });
    }

    // ======================================================
    // NORMALIZE
    // ======================================================

    const data = normalizeShippingRatePayload(req.body, {
      partial: true,
    });

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,

        message: "Không có dữ liệu để cập nhật",
      });
    }

    // ======================================================
    // VALIDATE
    // ======================================================

    const errors = validateShippingRate(data, {
      partial: true,
    });

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,

        message: errors[0],

        errors,
      });
    }

    // ======================================================
    // DUPLICATE PROVINCE CODE
    // ======================================================

    if (hasOwn(data, "province_code")) {
      const duplicate = await ShippingRate.getByProvinceCodeIncludingDeleted(
        data.province_code,
      );

      if (duplicate && Number(duplicate.id) !== Number(current.id)) {
        return res.status(409).json({
          success: false,

          message: "Mã tỉnh/thành này đã được sử dụng",
        });
      }
    }

    // ======================================================
    // DUPLICATE GHN MAPPING
    // ======================================================

    if (hasOwn(data, "ghn_province_id") && data.ghn_province_id) {
      const duplicateGhn = await checkDuplicateGhnProvince(
        data.ghn_province_id,
        current.id,
      );

      if (duplicateGhn) {
        return res.status(409).json({
          success: false,

          message: "Tỉnh/thành GHN này đã được ánh xạ cho khu vực khác",
        });
      }
    }

    // ======================================================
    // UPDATE
    // ======================================================

    const updated = await ShippingRate.update(id, data);

    return res.json({
      success: true,

      message: "Cập nhật phí vận chuyển thành công",

      data: updated,
    });
  } catch (error) {
    if (error?.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,

        message: "Dữ liệu khu vực vận chuyển đã tồn tại",
      });
    }

    return next(error);
  }
};

// ============================================================
// UPDATE STATUS
//
// PATCH /api/admin/shipping-rates/:id/status
// ============================================================

exports.updateShippingRateStatus = async (req, res, next) => {
  try {
    const id = normalizePositiveInt(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,

        message: "ID khu vực vận chuyển không hợp lệ",
      });
    }

    const current = await ShippingRate.getById(id);

    if (!current) {
      return res.status(404).json({
        success: false,

        message: "Không tìm thấy khu vực vận chuyển",
      });
    }

    const status = Number(req.body?.status);

    if (![0, 1].includes(status)) {
      return res.status(400).json({
        success: false,

        message: "Trạng thái chỉ được là 0 hoặc 1",
      });
    }

    const updated = await ShippingRate.updateStatus(id, status);

    return res.json({
      success: true,

      message:
        status === 1
          ? "Đã bật khu vực vận chuyển"
          : "Đã tắt khu vực vận chuyển",

      data: updated,
    });
  } catch (error) {
    return next(error);
  }
};

// ============================================================
// DELETE
//
// DELETE /api/admin/shipping-rates/:id
// ============================================================

exports.deleteShippingRate = async (req, res, next) => {
  try {
    const id = normalizePositiveInt(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,

        message: "ID khu vực vận chuyển không hợp lệ",
      });
    }

    const current = await ShippingRate.getById(id);

    if (!current) {
      return res.status(404).json({
        success: false,

        message: "Không tìm thấy khu vực vận chuyển",
      });
    }

    const removed = await ShippingRate.remove(id);

    if (!removed) {
      return res.status(400).json({
        success: false,

        message: "Không thể xóa khu vực vận chuyển",
      });
    }

    return res.json({
      success: true,

      message: "Xóa khu vực vận chuyển thành công",
    });
  } catch (error) {
    return next(error);
  }
};
