const PcPart = require("../../models/PcPart");

// ============================================================
// NORMALIZE
// ============================================================

const normalizePayload = (body = {}) => {
  const data = { ...body };

  ["type_id", "product_id", "variant_id", "is_visible"].forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(data, field)) {
      if (data[field] === "" || data[field] === null) {
        data[field] = field === "variant_id" ? null : data[field];
      } else {
        data[field] = Number(data[field]);
      }
    }
  });

  if (Object.prototype.hasOwnProperty.call(data, "specifications")) {
    data.specifications = PcPart.normalizeSpecifications(data.specifications);
  }

  return data;
};

// ============================================================
// VALIDATE
// ============================================================

const validatePayload = async (
  data,
  { isUpdate = false, current = null, currentId = null } = {},
) => {
  const finalTypeId = Object.prototype.hasOwnProperty.call(data, "type_id")
    ? data.type_id
    : current?.type_id;

  const finalProductId = Object.prototype.hasOwnProperty.call(
    data,
    "product_id",
  )
    ? data.product_id
    : current?.product_id;

  const finalVariantId = Object.prototype.hasOwnProperty.call(
    data,
    "variant_id",
  )
    ? data.variant_id
    : (current?.variant_id ?? null);

  // ----------------------------------------------------------
  // TYPE
  // ----------------------------------------------------------

  if (!isUpdate || data.type_id !== undefined) {
    if (!Number.isInteger(Number(finalTypeId)) || Number(finalTypeId) <= 0) {
      return "type_id không hợp lệ";
    }

    if (!(await PcPart.existsType(finalTypeId))) {
      return "Loại linh kiện không tồn tại";
    }
  }

  // ----------------------------------------------------------
  // PRODUCT
  // ----------------------------------------------------------

  if (!isUpdate || data.product_id !== undefined) {
    if (
      !Number.isInteger(Number(finalProductId)) ||
      Number(finalProductId) <= 0
    ) {
      return "product_id không hợp lệ";
    }

    if (!(await PcPart.existsProduct(finalProductId))) {
      return "Sản phẩm không tồn tại";
    }
  }

  // ----------------------------------------------------------
  // VARIANT
  // ----------------------------------------------------------

  if (
    finalVariantId !== null &&
    finalVariantId !== undefined &&
    finalVariantId !== ""
  ) {
    if (
      !Number.isInteger(Number(finalVariantId)) ||
      Number(finalVariantId) <= 0
    ) {
      return "variant_id không hợp lệ";
    }

    const variant = await PcPart.getVariant(finalVariantId);

    if (!variant) {
      return "Biến thể sản phẩm không tồn tại";
    }

    const belongs = await PcPart.variantBelongsToProduct(
      finalVariantId,
      finalProductId,
    );

    if (!belongs) {
      return "Biến thể không thuộc sản phẩm đã chọn";
    }
  }

  // ----------------------------------------------------------
  // VISIBILITY
  // ----------------------------------------------------------

  if (Object.prototype.hasOwnProperty.call(data, "is_visible")) {
    if (![0, 1].includes(Number(data.is_visible))) {
      return "is_visible phải là 0 hoặc 1";
    }
  }

  // ----------------------------------------------------------
  // SPECIFICATIONS
  // ----------------------------------------------------------

  if (
    Object.prototype.hasOwnProperty.call(data, "specifications") &&
    data.specifications !== null
  ) {
    if (typeof data.specifications === "string") {
      try {
        JSON.parse(data.specifications);
      } catch (error) {
        return "specifications phải là JSON hợp lệ";
      }
    }
  }

  // ----------------------------------------------------------
  // DUPLICATE MAPPING
  // ----------------------------------------------------------

  if (finalTypeId && finalProductId) {
    const duplicate = await PcPart.findDuplicate({
      type_id: finalTypeId,
      product_id: finalProductId,
      variant_id: finalVariantId ?? null,
      exclude_id: currentId,
    });

    if (duplicate) {
      return "Sản phẩm/biến thể này đã được gán vào loại linh kiện Build PC";
    }
  }

  return null;
};

// ============================================================
// GET ALL
// ============================================================

exports.getAllPcParts = async (req, res, next) => {
  try {
    const result = await PcPart.getAll(req.query);

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách linh kiện thành công",
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET BY ID
// ============================================================

exports.getPcPartById = async (req, res, next) => {
  try {
    const item = await PcPart.getById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy linh kiện",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Lấy chi tiết linh kiện thành công",
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// CREATE
// ============================================================

exports.createPcPart = async (req, res, next) => {
  try {
    const data = normalizePayload(req.body);

    const validationMessage = await validatePayload(data);

    if (validationMessage) {
      return res.status(400).json({
        success: false,
        message: validationMessage,
      });
    }

    const item = await PcPart.create({
      type_id: data.type_id,
      product_id: data.product_id,
      variant_id: data.variant_id ?? null,
      specifications: data.specifications ?? null,
      is_visible: data.is_visible === undefined ? 1 : Number(data.is_visible),
    });

    return res.status(201).json({
      success: true,
      message: "Thêm linh kiện thành công",
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// UPDATE
// ============================================================

exports.updatePcPart = async (req, res, next) => {
  try {
    const current = await PcPart.getById(req.params.id);

    if (!current) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy linh kiện",
      });
    }

    const data = normalizePayload(req.body);

    const validationMessage = await validatePayload(data, {
      isUpdate: true,
      current,
      currentId: req.params.id,
    });

    if (validationMessage) {
      return res.status(400).json({
        success: false,
        message: validationMessage,
      });
    }

    const item = await PcPart.update(req.params.id, data);

    return res.status(200).json({
      success: true,
      message: "Cập nhật linh kiện thành công",
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// VISIBILITY
// ============================================================

exports.updateVisibility = async (req, res, next) => {
  try {
    const current = await PcPart.getById(req.params.id);

    if (!current) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy linh kiện",
      });
    }

    const isVisible = Number(req.body.is_visible);

    if (![0, 1].includes(isVisible)) {
      return res.status(400).json({
        success: false,
        message: "is_visible phải là 0 hoặc 1",
      });
    }

    const item = await PcPart.setVisibility(req.params.id, isVisible);

    return res.status(200).json({
      success: true,
      message:
        isVisible === 1
          ? "Đã hiển thị linh kiện trong Build PC"
          : "Đã ẩn linh kiện khỏi Build PC",
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// DELETE
// ============================================================

exports.deletePcPart = async (req, res, next) => {
  try {
    const current = await PcPart.getById(req.params.id);

    if (!current) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy linh kiện",
      });
    }

    const success = await PcPart.remove(req.params.id);

    if (!success) {
      return res.status(400).json({
        success: false,
        message: "Không thể xóa linh kiện",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Xóa linh kiện thành công",
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// RESTORE
// ============================================================

exports.restorePcPart = async (req, res, next) => {
  try {
    const current = await PcPart.getByIdIncludeDeleted(req.params.id);

    if (!current) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy linh kiện",
      });
    }

    if (!current.deleted_at) {
      return res.status(400).json({
        success: false,
        message: "Linh kiện này chưa bị xóa",
      });
    }

    const item = await PcPart.restore(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Khôi phục linh kiện thành công",
      data: item,
    });
  } catch (error) {
    next(error);
  }
};
