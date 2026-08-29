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
// GET /api/client/products/top-sellers
// ======================================================

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
// GET /api/client/products/comments/:id
// ======================================================

exports.getProductComments = async (req, res, next) => {
  try {
    const productId = Number(req.params.id);

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({
        success: false,

        message: "ID sản phẩm không hợp lệ.",
      });
    }

    const sql = `
      SELECT
        c.id,
        c.content,
        c.rating,
        c.created_at,

        u.full_name,
        u.avatar

      FROM comments c

      LEFT JOIN users u
        ON c.user_id = u.id

      WHERE
        c.product_id = ?
        AND c.deleted_at IS NULL
        AND c.is_approved = 1

      ORDER BY
        c.created_at DESC,
        c.id DESC
    `;

    const [rows] = await pool.query(sql, [productId]);

    return res.status(200).json({
      success: true,

      data: rows.map((item) => ({
        ...item,

        id: Number(item.id),

        rating: Number(item.rating || 0),
      })),
    });
  } catch (error) {
    return next(error);
  }
};

// ======================================================
// POST /api/client/products/comments
// Khách hàng gửi đánh giá mới
// ======================================================

exports.createProductComment = async (req, res, next) => {
  try {
    const productId = Number(req.body.product_id);

    const rating = Number(req.body.rating);

    const content = String(req.body.content || "").trim();

    // ====================================================
    // VALIDATE
    // ====================================================

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({
        success: false,

        message: "Sản phẩm không hợp lệ.",
      });
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,

        message: "Điểm đánh giá phải từ 1 đến 5 sao.",
      });
    }

    if (!content) {
      return res.status(400).json({
        success: false,

        message: "Vui lòng nhập nội dung đánh giá.",
      });
    }

    // ====================================================
    // AUTH
    // ====================================================

    const userId = Number(req.user?.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({
        success: false,

        message: "Vui lòng đăng nhập để gửi đánh giá.",
      });
    }

    // ====================================================
    // PRODUCT EXISTS
    // ====================================================

    const [productRows] = await pool.query(
      `
          SELECT
            p.id

          FROM products p

          INNER JOIN categories c
            ON c.id = p.category_id

          WHERE
            p.id = ?

            AND p.deleted_at IS NULL
            AND p.status = 1

            AND c.deleted_at IS NULL
            AND c.status = 1

          LIMIT 1
        `,
      [productId],
    );

    if (productRows.length === 0) {
      return res.status(404).json({
        success: false,

        message: "Sản phẩm không tồn tại hoặc hiện không được bán.",
      });
    }

    // ====================================================
    // CREATE COMMENT
    // ====================================================

    const sql = `
      INSERT INTO comments
      (
        user_id,
        product_id,
        content,
        rating,
        is_approved,
        created_at,
        updated_at
      )
      VALUES
      (
        ?, ?, ?, ?, 0, NOW(), NOW()
      )
    `;

    await pool.query(sql, [userId, productId, content, rating]);

    return res.status(201).json({
      success: true,

      message:
        "Cảm ơn bạn đã gửi đánh giá. Đánh giá sẽ được duyệt trước khi hiển thị.",
    });
  } catch (error) {
    console.error("Lỗi tạo bình luận:", error);

    return next(error);
  }
};
