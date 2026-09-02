const Product = require("../../models/Product");

// ============================================================
// GET /api/client/products
// ============================================================

exports.getAllProducts = async (req, res, next) => {
  try {
    const data = await Product.getClientProducts(req.query);

    return res.status(200).json({
      success: true,

      message: "Lấy danh sách sản phẩm thành công.",

      data: data.products,

      pagination: data.pagination,

      filters: data.filters,

      appliedFilters: data.appliedFilters,
    });
  } catch (error) {
    return next(error);
  }
};

// ============================================================
// GET /api/client/products/search-suggestions?q=...
// ============================================================

exports.getSearchSuggestions = async (req, res, next) => {
  try {
    const keyword = String(req.query.q || "").trim();

    if (!keyword) {
      return res.status(200).json({
        success: true,

        data: [],
      });
    }

    const suggestions = await Product.getClientSearchSuggestions(
      keyword,
      req.query.limit,
    );

    return res.status(200).json({
      success: true,

      data: suggestions,
    });
  } catch (error) {
    return next(error);
  }
};

// ============================================================
// GET /api/client/products/top-sellers
// ============================================================

exports.getTopSellingProducts = async (req, res, next) => {
  try {
    const products = await Product.getClientTopSellingProducts(req.query.limit);

    return res.status(200).json({
      success: true,

      message: "Lấy danh sách sản phẩm bán chạy thành công.",

      data: products,
    });
  } catch (error) {
    return next(error);
  }
};

// ============================================================
// GET /api/client/products/:slug
// ============================================================

exports.getProductBySlug = async (req, res, next) => {
  try {
    const slug = String(req.params.slug || "").trim();

    if (!slug) {
      return res.status(400).json({
        success: false,

        message: "Slug sản phẩm không hợp lệ.",
      });
    }

    const data = await Product.getClientProductBySlug(slug);

    if (!data) {
      return res.status(404).json({
        success: false,

        message: "Không tìm thấy sản phẩm.",
      });
    }

    return res.status(200).json({
      success: true,

      message: "Lấy chi tiết sản phẩm thành công.",

      data,
    });
  } catch (error) {
    return next(error);
  }
};
