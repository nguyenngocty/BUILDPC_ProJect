const PcBuild = require("../../models/PcBuild");

const BuildRecommender = require("../../models/BuildRecommender");

const ClientBuild = require("../../models/ClientBuild");

const BuildCart = require("../../models/BuildCart");

// ============================================================
// BUSINESS ERROR
// ============================================================

const createBusinessError = (message, statusCode = 400, details = null) => {
  const error = new Error(message);

  error.statusCode = statusCode;

  error.status = statusCode;

  if (details) {
    error.details = details;
  }

  return error;
};

// ============================================================
// AUTH USER ID
// ============================================================

const getAuthenticatedUserId = (req) => {
  const userId = Number(req.auth?.userId ?? req.user?.id ?? 0);

  if (!Number.isInteger(userId) || userId <= 0) {
    throw createBusinessError("Không xác định được người dùng đăng nhập", 401);
  }

  return userId;
};

// ============================================================
// BUILD ID
// ============================================================

const getBuildId = (value) => {
  const id = Number.parseInt(value, 10);

  if (!Number.isInteger(id) || id <= 0) {
    throw createBusinessError("ID cấu hình không hợp lệ", 400);
  }

  return id;
};

// ============================================================
// GET AUTO BUILD OPTIONS
//
// GET /api/client/builds/auto-build/options
// ============================================================

exports.getAutoBuildOptions = async (req, res, next) => {
  try {
    const usages = BuildRecommender.getSupportedUsages();

    return res.status(200).json({
      success: true,

      message: "Lấy tùy chọn Build PC tự động thành công",

      data: {
        usages,

        budget: {
          minimum_input: 3000000,

          currency: "VND",
        },
      },
    });
  } catch (error) {
    return next(error);
  }
};

// ============================================================
// AUTO BUILD
//
// POST /api/client/builds/auto-build
//
// PUBLIC
// ============================================================

exports.autoBuild = async (req, res, next) => {
  try {
    const { usage, budget } = req.body || {};

    if (usage === undefined || usage === null || String(usage).trim() === "") {
      throw createBusinessError("Vui lòng chọn nhu cầu sử dụng", 400);
    }

    if (budget === undefined || budget === null || budget === "") {
      throw createBusinessError("Vui lòng nhập ngân sách", 400);
    }

    const result = await BuildRecommender.recommend({
      usage,
      budget,
    });

    return res.status(200).json({
      success: true,

      message: "Đã tạo cấu hình PC gợi ý phù hợp",

      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

// ============================================================
// VALIDATE BUILD
//
// POST /api/client/builds/validate
//
// PUBLIC
// ============================================================

exports.validateBuild = async (req, res, next) => {
  try {
    const { items } = req.body || {};

    if (!Array.isArray(items)) {
      throw createBusinessError("Danh sách linh kiện phải là một mảng", 400);
    }

    if (!items.length) {
      throw createBusinessError("Vui lòng chọn ít nhất một linh kiện", 400);
    }

    const validation = await PcBuild.validateItems(items);

    return res.status(200).json({
      success: true,

      message: validation.is_valid
        ? "Cấu hình PC hợp lệ"
        : "Cấu hình PC có linh kiện không tương thích",

      data: validation,
    });
  } catch (error) {
    return next(error);
  }
};

// ============================================================
// CREATE MY BUILD
//
// POST /api/client/builds/my-builds
// ============================================================

exports.saveBuild = async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);

    const build = await ClientBuild.createForUser(userId, req.body || {});

    return res.status(201).json({
      success: true,

      message: "Lưu cấu hình PC thành công",

      data: build,
    });
  } catch (error) {
    return next(error);
  }
};

// ============================================================
// GET MY BUILDS
//
// GET /api/client/builds/my-builds
// ============================================================

exports.getMyBuilds = async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);

    const result = await ClientBuild.findByUser(userId, {
      search: req.query.search || "",

      page: req.query.page || 1,

      limit: req.query.limit || 10,

      sort: req.query.sort || "newest",
    });

    return res.status(200).json({
      success: true,

      message: "Lấy danh sách cấu hình của bạn thành công",

      data: result.data,

      pagination: result.pagination,

      filters: result.filters,
    });
  } catch (error) {
    return next(error);
  }
};

// ============================================================
// GET MY BUILD DETAIL
//
// GET /api/client/builds/my-builds/:id
// ============================================================

exports.getMyBuildById = async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);

    const buildId = getBuildId(req.params.id);

    const build = await ClientBuild.findOwnedById(userId, buildId);

    if (!build) {
      throw createBusinessError("Không tìm thấy cấu hình PC", 404);
    }

    return res.status(200).json({
      success: true,

      message: "Lấy chi tiết cấu hình PC thành công",

      data: build,
    });
  } catch (error) {
    return next(error);
  }
};

// ============================================================
// UPDATE MY BUILD
//
// PUT /api/client/builds/my-builds/:id
// ============================================================

exports.updateMyBuild = async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);

    const buildId = getBuildId(req.params.id);

    const build = await ClientBuild.updateForUser(
      userId,
      buildId,
      req.body || {},
    );

    if (!build) {
      throw createBusinessError("Không tìm thấy cấu hình PC", 404);
    }

    return res.status(200).json({
      success: true,

      message: "Cập nhật cấu hình PC thành công",

      data: build,
    });
  } catch (error) {
    return next(error);
  }
};

// ============================================================
// DELETE MY BUILD
//
// DELETE /api/client/builds/my-builds/:id
// ============================================================

exports.deleteMyBuild = async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);

    const buildId = getBuildId(req.params.id);

    const deleted = await ClientBuild.deleteForUser(userId, buildId);

    if (!deleted) {
      throw createBusinessError("Không tìm thấy cấu hình PC", 404);
    }

    return res.status(200).json({
      success: true,

      message: "Xóa cấu hình PC thành công",
    });
  } catch (error) {
    return next(error);
  }
};

// ============================================================
// ADD TEMPORARY BUILD TO CART
//
// POST /api/client/builds/cart
//
// AUTH REQUIRED
//
// Body:
//
// {
//   "items": [
//     {
//       "part_id": 3,
//       "quantity": 1
//     }
//   ]
// }
//
// FE không gửi:
// product_id
// variant_id
// price
// total_price
// ============================================================

exports.addBuildToCart = async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);

    const { items } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      throw createBusinessError(
        "Vui lòng chọn linh kiện trước khi thêm cấu hình vào giỏ hàng",
        400,
      );
    }

    const result = await BuildCart.addItems({
      user_id: userId,

      items,
    });

    return res.status(201).json({
      success: true,

      message: "Đã thêm toàn bộ cấu hình PC vào giỏ hàng",

      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

// ============================================================
// ADD SAVED BUILD TO CART
//
// POST /api/client/builds/my-builds/:id/cart
//
// AUTH REQUIRED
//
// SECURITY:
//
// 1. Check build ownership.
// 2. Chỉ lấy build_type=user.
// 3. Lấy current build items.
// 4. Revalidate toàn bộ.
// 5. Recheck current Product/Variant/Stock/Price.
// 6. Một item lỗi => rollback toàn bộ.
// ============================================================

exports.addMyBuildToCart = async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);

    const buildId = getBuildId(req.params.id);

    // ======================================================
    // OWNERSHIP
    // ======================================================

    const build = await ClientBuild.findOwnedById(userId, buildId);

    if (!build) {
      throw createBusinessError("Không tìm thấy cấu hình PC", 404);
    }

    // ======================================================
    // CURRENT BUILD ITEMS
    // ======================================================

    const currentItems = Array.isArray(build.items) ? build.items : [];

    if (!currentItems.length) {
      throw createBusinessError("Cấu hình đã lưu không có linh kiện", 400);
    }

    const items = currentItems
      .filter((item) => !item.deleted_at && !item.replaced_at)
      .map((item) => ({
        part_id: Number(item.part_id || 0),

        quantity: Number(item.quantity || 1),
      }))
      .filter(
        (item) =>
          Number.isInteger(item.part_id) &&
          item.part_id > 0 &&
          Number.isInteger(item.quantity) &&
          item.quantity > 0,
      );

    if (!items.length) {
      throw createBusinessError(
        "Không tìm thấy linh kiện hiện hành của cấu hình",
        400,
      );
    }

    // ======================================================
    // REVALIDATE + TRANSACTION ADD CART
    // ======================================================

    const result = await BuildCart.addItems({
      user_id: userId,

      items,
    });

    return res.status(201).json({
      success: true,

      message: "Đã thêm cấu hình đã lưu vào giỏ hàng",

      data: {
        build: {
          id: Number(build.id),

          name: build.name,

          saved_total_price: Number(build.total_price || 0),
        },

        ...result,
      },
    });
  } catch (error) {
    return next(error);
  }
};
