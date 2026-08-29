const PcPart = require("../../models/PcPart");

// ============================================================
// HELPERS
// ============================================================

const normalizePositiveInt = (value, defaultValue = null) => {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return defaultValue;
  }

  return parsed;
};

const createBusinessError = (message, statusCode = 400) => {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.status = statusCode;

  return error;
};

// ============================================================
// GET PC PARTS
//
// GET /api/client/builds/parts
//
// Query:
// ?search=ryzen
// ?keyword=ryzen
// ?type_id=1
// ?type_code=CPU
// ?product_id=10
// ?variant_id=83
// ?in_stock=1
// ?page=1
// ?limit=20
//
// Client:
// - Chỉ lấy PcPart đang visible
// - Chỉ lấy Product đang active
// ============================================================

exports.getPcParts = async (req, res, next) => {
  try {
    const {
      search = "",
      keyword = "",
      type_id = "",
      type_code = "",
      product_id = "",
      variant_id = "",
      in_stock = "",
      page = 1,
      limit = 20,
    } = req.query;

    const result = await PcPart.getAll({
      keyword: String(search || keyword || "").trim(),

      type_id,

      type_code,

      product_id,

      variant_id,

      // Client không được tự ý xem linh kiện Admin đã ẩn.
      is_visible: 1,

      // Client chỉ được lấy Product đang hoạt động.
      product_status: 1,

      in_stock,

      page,

      limit,
    });

    return res.status(200).json({
      success: true,

      message: "Lấy danh sách linh kiện Build PC thành công",

      data: result.data,

      pagination: result.pagination,

      filters: {
        search: String(search || keyword || "").trim(),

        type_id: type_id !== "" ? normalizePositiveInt(type_id) : null,

        type_code:
          String(type_code || "")
            .trim()
            .toUpperCase() || null,

        product_id: product_id !== "" ? normalizePositiveInt(product_id) : null,

        variant_id: variant_id !== "" ? normalizePositiveInt(variant_id) : null,

        in_stock:
          in_stock === ""
            ? null
            : Number(in_stock) === 1
              ? 1
              : Number(in_stock) === 0
                ? 0
                : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET PC PARTS BY TYPE
//
// GET /api/client/builds/parts/type/:typeId
//
// Ví dụ:
// GET /api/client/builds/parts/type/1
//
// Client:
// - visible = 1
// - product_status = 1
// - hỗ trợ search
// - hỗ trợ stock
// - hỗ trợ pagination
// ============================================================

exports.getPcPartsByType = async (req, res, next) => {
  try {
    const typeId = normalizePositiveInt(req.params.typeId);

    if (!typeId) {
      throw createBusinessError("ID nhóm linh kiện không hợp lệ", 400);
    }

    const typeExists = await PcPart.existsType(typeId);

    if (!typeExists) {
      throw createBusinessError("Không tìm thấy nhóm linh kiện Build PC", 404);
    }

    const {
      search = "",
      keyword = "",
      in_stock = "",
      page = 1,
      limit = 20,
    } = req.query;

    const result = await PcPart.getAll({
      keyword: String(search || keyword || "").trim(),

      type_id: typeId,

      is_visible: 1,

      product_status: 1,

      in_stock,

      page,

      limit,
    });

    return res.status(200).json({
      success: true,

      message: "Lấy linh kiện theo nhóm thành công",

      data: result.data,

      pagination: result.pagination,

      filters: {
        type_id: typeId,

        search: String(search || keyword || "").trim(),

        in_stock:
          in_stock === ""
            ? null
            : Number(in_stock) === 1
              ? 1
              : Number(in_stock) === 0
                ? 0
                : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET PC PART DETAIL
//
// GET /api/client/builds/parts/:id
//
// :id ở đây là pc_parts.id
// KHÔNG PHẢI products.id
// ============================================================

exports.getPcPartById = async (req, res, next) => {
  try {
    const partId = normalizePositiveInt(req.params.id);

    if (!partId) {
      throw createBusinessError("ID linh kiện Build PC không hợp lệ", 400);
    }

    const part = await PcPart.getById(partId);

    if (!part) {
      throw createBusinessError("Không tìm thấy linh kiện Build PC", 404);
    }

    // ========================================================
    // CLIENT VISIBILITY
    // ========================================================

    if (Number(part.is_visible) !== 1) {
      throw createBusinessError(
        "Linh kiện này hiện không khả dụng trong Build PC",
        404,
      );
    }

    // ========================================================
    // PRODUCT STATUS
    // ========================================================

    if (Number(part.product_status) !== 1) {
      throw createBusinessError("Sản phẩm này hiện không hoạt động", 404);
    }

    // ========================================================
    // VARIANT STATUS
    // ========================================================

    if (part.variant_id !== null && part.variant_id !== undefined) {
      if (!part.variant_record_id) {
        throw createBusinessError(
          "Phiên bản sản phẩm này không còn tồn tại",
          404,
        );
      }

      if (Number(part.variant_status) !== 1) {
        throw createBusinessError(
          "Phiên bản sản phẩm này hiện không hoạt động",
          404,
        );
      }
    }

    return res.status(200).json({
      success: true,

      message: "Lấy chi tiết linh kiện Build PC thành công",

      data: part,
    });
  } catch (error) {
    next(error);
  }
};
