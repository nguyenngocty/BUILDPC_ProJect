const { pool } = require("../../config/database");
const Product = require("../../models/Product");

// ======================================================
// GET /api/client/products
// ======================================================

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

// ======================================================
// GET /api/client/products/search-suggestions?q=...
// ======================================================

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

// ======================================================
// GET /api/client/products/:slug
// ======================================================

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
// ======================================================
// GET /api/client/products/best-sellers
// ======================================================

exports.getTopSellingProducts = async (req, res, next) => {
  try {
    const limit = Number(req.query.limit) || 10;
    const products = await Product.getTopSelling(limit);

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách sản phẩm bán chạy thành công.",
      data: products,
    });
  } catch (error) {
    return next(error);
  }
};
// ======================================================
// GET /api/client/products/:id/comments
// ======================================================
exports.getProductComments = async (req, res, next) => {
  try {
    const productId = req.params.id;
    const sql = `
      SELECT 
        c.id, c.content, c.rating, c.created_at,
        u.full_name, u.avatar
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.product_id = ? AND c.is_approved = 1
      ORDER BY c.created_at DESC
    `;
    const [rows] = await pool.query(sql, [productId]);
    res.json({ success: true, data: rows });
  } catch (err) {
    return next(err);
  }
};
// =========================================================
// POST: Khách hàng gửi đánh giá mới
// =========================================================
exports.createProductComment = async (req, res, next) => {
  try {
    const { product_id, rating, content } = req.body;

    // Validate
    if (!product_id || !rating || !content || content.trim() === "") {
      return res
        .status(400)
        .json({ success: false, message: "Vui lòng điền đầy đủ thông tin." });
    }
    if (rating < 1 || rating > 5) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Điểm đánh giá phải từ 1 đến 5 sao.",
        });
    }

    // Lấy user_id (nếu chưa có auth thì mặc định 1 để test)
    const user_id = req.user.id;

    const sql = `
      INSERT INTO comments (user_id, product_id, content, rating, is_approved, created_at, updated_at)
      VALUES (?, ?, ?, ?, 0, NOW(), NOW())
    `;
    await pool.query(sql, [user_id, product_id, content, rating]);

    res.status(201).json({
      success: true,
      message:
        "Cảm ơn bạn đã gửi đánh giá. Đánh giá sẽ được duyệt trước khi hiển thị.",
    });
  } catch (err) {
    console.error("Lỗi tạo bình luận:", err);
    return next(err);
  }
};
