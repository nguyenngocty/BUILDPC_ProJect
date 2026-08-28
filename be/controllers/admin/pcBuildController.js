const PcBuild = require("../../models/PcBuild");
const PcPart = require("../../models/PcPart");
const PcPartType = require("../../models/PcPartType");

// ============================================================
// ERROR RESPONSE
// ============================================================

const handleBusinessError = (error, res, next) => {
  const statusCode = error.statusCode || error.status || 500;

  if (statusCode >= 400 && statusCode < 500) {
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Dữ liệu không hợp lệ",
      ...(error.details
        ? {
            details: error.details,
          }
        : {}),
    });
  }

  return next(error);
};

// ============================================================
// GET PART TYPES FOR BUILD FORM
// ============================================================

exports.getBuildCategories = async (req, res, next) => {
  try {
    const partTypes = await PcPartType.getActive();

    const data = partTypes.map((item) => ({
      id: item.id,

      key: String(item.type_code || "").toLowerCase(),

      code: String(item.type_code || "").toUpperCase(),

      label: item.type_name,

      description: item.description,
    }));

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách nhóm linh kiện Build PC thành công",
      data,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET COMPONENTS
// ============================================================

exports.getAllComponents = async (req, res, next) => {
  try {
    const {
      category = "",
      type_code = "",
      type_id = "",
      search = "",
      keyword = "",
      is_visible = "1",
      page = 1,
      limit = 100,
    } = req.query;

    const normalizedTypeCode = type_code || category || "";

    const result = await PcPart.getAll({
      keyword: keyword || search || "",

      type_id,

      type_code: normalizedTypeCode,

      is_visible,

      product_status: 1,

      page,

      limit,
    });

    const data = result.data.map((part) => ({
      // FE cũ dùng id = pc_part.id
      id: part.id,

      part_id: part.id,

      type_id: part.type_id,

      type_code: part.type_code,

      category_key: String(part.type_code || "").toLowerCase(),

      category: part.type_name,

      product_id: part.product_id,

      variant_id: part.variant_id,

      has_variant: part.has_variant,

      name: part.display_name,

      sku: part.display_sku,

      image: part.display_thumbnail,

      price: Number(part.effective_price || 0),

      stock_quantity: Number(part.stock_quantity || 0),

      is_visible: Number(part.is_visible || 0),

      product_status: Number(part.product_status || 0),

      variant_status:
        part.variant_id === null || part.variant_id === undefined
          ? null
          : Number(part.variant_status),

      specifications: part.specifications || {},

      // Compatibility fallback cho FE hiện tại
      socket: part.specifications?.socket || part.product_socket || null,

      ram_type: part.specifications?.ram_type || part.product_ram_type || null,

      power_recommend:
        part.specifications?.power_recommend ??
        part.specifications?.recommended_psu ??
        null,

      wattage: part.specifications?.wattage ?? null,
    }));

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách linh kiện Build PC thành công",
      data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET ALL BUILDS
// ============================================================

// ============================================================
// GET ALL BUILDS
// Search + Filter + Pagination + Sort
// ============================================================

exports.getAllBuilds = async (req, res, next) => {
  try {
    const result = await PcBuild.findAll({
      search: req.query.search || req.query.keyword || "",

      status: req.query.status ?? "",

      is_featured: req.query.is_featured ?? "",

      build_type: req.query.build_type || "admin",

      page: req.query.page || 1,

      limit: req.query.limit || 10,

      sort: req.query.sort || "newest",
    });

    return res.status(200).json({
      success: true,

      message: "Lấy danh sách cấu hình PC thành công",

      data: result.data,

      pagination: result.pagination,

      filters: result.filters,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET TRASH BUILDS
// ============================================================

// ============================================================
// GET TRASH BUILDS
// Search + Pagination + Sort
// ============================================================

exports.getTrashBuilds = async (req, res, next) => {
  try {
    const result = await PcBuild.findTrash({
      search: req.query.search || req.query.keyword || "",

      build_type: req.query.build_type || "admin",

      page: req.query.page || 1,

      limit: req.query.limit || 10,

      sort: req.query.sort || "deleted_desc",
    });

    return res.status(200).json({
      success: true,

      message: "Lấy danh sách cấu hình PC đã xóa thành công",

      data: result.data,

      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET BUILD BY ID
// ============================================================

exports.getBuildById = async (req, res, next) => {
  try {
    const build = await PcBuild.findById(req.params.id);

    if (!build) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy cấu hình PC",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Lấy chi tiết cấu hình PC thành công",
      data: build,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// VALIDATE BUILD WITHOUT SAVING
// ============================================================

exports.validateBuild = async (req, res, next) => {
  try {
    const items = req.body.items;

    if (!Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: "items phải là một mảng",
      });
    }

    const result = await PcBuild.validateItems(items);

    return res.status(200).json({
      success: true,
      message: result.is_valid
        ? "Cấu hình PC tương thích"
        : "Cấu hình PC chưa tương thích",
      data: result,
    });
  } catch (error) {
    return handleBusinessError(error, res, next);
  }
};

// ============================================================
// CREATE
// ============================================================

exports.createBuild = async (req, res, next) => {
  try {
    const { name, description, image, status, items } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập tên cấu hình PC",
      });
    }

    if (!Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: "Danh sách items không hợp lệ",
      });
    }

    const buildData = {
      name,
      description,
      image,
      status,

      user_id: null,
      build_type: "admin",
      is_featured:
        req.body.is_featured === 1 ||
        req.body.is_featured === "1" ||
        req.body.is_featured === true
          ? 1
          : 0,

      items,
    };

    const result = await PcBuild.create(buildData);

    return res.status(201).json({
      success: true,
      message: "Tạo cấu hình PC thành công",
      data: result,
    });
  } catch (error) {
    return handleBusinessError(error, res, next);
  }
};

// ============================================================
// UPDATE
// ============================================================

exports.updateBuild = async (req, res, next) => {
  try {
    const { id } = req.params;

    const current = await PcBuild.findById(id);

    if (!current) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy cấu hình PC",
      });
    }

    const result = await PcBuild.update(id, req.body);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy cấu hình PC",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Cập nhật cấu hình PC thành công",
      data: result,
    });
  } catch (error) {
    return handleBusinessError(error, res, next);
  }
};

// ============================================================
// UPDATE STATUS
// ============================================================

exports.updateBuildStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (status === undefined || status === null) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng truyền status",
      });
    }

    const result = await PcBuild.updateStatus(req.params.id, status);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy cấu hình PC",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Cập nhật trạng thái cấu hình PC thành công",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// DELETE
// ============================================================

exports.deleteBuild = async (req, res, next) => {
  try {
    const success = await PcBuild.delete(req.params.id);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy cấu hình để xóa",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Xóa cấu hình PC thành công",
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// RESTORE
// ============================================================

exports.restoreBuild = async (req, res, next) => {
  try {
    const current = await PcBuild.findByIdIncludeDeleted(req.params.id);

    if (!current) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy cấu hình PC",
      });
    }

    if (!current.deleted_at) {
      return res.status(400).json({
        success: false,
        message: "Cấu hình này chưa bị xóa",
      });
    }

    const result = await PcBuild.restore(req.params.id);

    if (!result) {
      return res.status(400).json({
        success: false,
        message: "Không thể khôi phục cấu hình PC",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Khôi phục cấu hình PC thành công",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// UPDATE FEATURED
// ============================================================

exports.updateBuildFeatured = async (req, res, next) => {
  try {
    const { is_featured } = req.body;

    if (is_featured === undefined || is_featured === null) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng truyền is_featured",
      });
    }

    const result = await PcBuild.updateFeatured(req.params.id, is_featured);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy cấu hình PC",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        Number(result.is_featured) === 1
          ? "Đã bật cấu hình nổi bật"
          : "Đã tắt cấu hình nổi bật",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
