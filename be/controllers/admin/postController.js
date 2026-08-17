const { pool } = require("../../config/database");
const path = require("path");

// ============================
// LẤY DANH SÁCH BÀI VIẾT (có filter và sắp xếp)
// ============================
exports.getAllPosts = async (req, res) => {
  try {
    const { 
      keyword = "", 
      status = "", 
      category_id = "", 
      is_featured = "", 
      sortBy = "created_at", 
      order = "DESC",
      page = 1,
      limit = 10
    } = req.query;

    // Ép kiểu số an toàn
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const offset = (pageNum - 1) * limitNum;

    // 1. Câu lệnh lấy dữ liệu (có LIMIT và OFFSET)
    let sql = `
      SELECT
        p.*,
        u.full_name AS author,
        c.name AS category_name
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.deleted_at IS NULL
    `;
    const params = [];

    if (keyword) {
      sql += " AND (p.title LIKE ? OR p.excerpt LIKE ? OR p.tags LIKE ?)";
      const search = `%${keyword}%`;
      params.push(search, search, search);
    }

    if (status !== "") {
      sql += " AND p.status = ?";
      params.push(status);
    }

    if (category_id) {
      sql += " AND p.category_id = ?";
      params.push(category_id);
    }

    if (is_featured !== "") {
      sql += " AND p.is_featured = ?";
      params.push(is_featured);
    }

    const allowedSort = ["created_at", "views", "title"];
    const sortColumn = allowedSort.includes(sortBy) ? sortBy : "created_at";
    const sortOrder = order.toUpperCase() === "ASC" ? "ASC" : "DESC";
    sql += ` ORDER BY p.${sortColumn} ${sortOrder}`;
    
    // 👉 Thêm giới hạn phân trang
    sql += " LIMIT ? OFFSET ?";
    params.push(limitNum, offset);

    const [posts] = await pool.query(sql, params);

    // 2. Câu lệnh riêng để đếm tổng số bài viết (không bị LIMIT ảnh hưởng)
    let countSql = `
      SELECT COUNT(*) as total
      FROM posts p
      WHERE p.deleted_at IS NULL
    `;
    const countParams = [];

    if (keyword) {
      countSql += " AND (p.title LIKE ? OR p.excerpt LIKE ? OR p.tags LIKE ?)";
      const search = `%${keyword}%`;
      countParams.push(search, search, search);
    }
    if (status !== "") { countSql += " AND p.status = ?"; countParams.push(status); }
    if (category_id) { countSql += " AND p.category_id = ?"; countParams.push(category_id); }
    if (is_featured !== "") { countSql += " AND p.is_featured = ?"; countParams.push(is_featured); }

    const [countResult] = await pool.query(countSql, countParams);
    const total = countResult[0].total;

    res.json({
      success: true,
      total: total,
      data: posts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ============================
// LẤY CHI TIẾT
// ============================
exports.getPostById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `
      SELECT
        p.*,
        u.full_name AS author,
        c.name AS category_name
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ? LIMIT 1
      `,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bài viết",
      });
    }

    res.json({
      success: true,
      data: rows[0],
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ============================
// THÊM BÀI VIẾT (Đã sửa lỗi trùng slug)
// ============================
exports.createPost = async (req, res) => {
  try {
    const {
      user_id,
      category_id,
      title,
      slug,
      thumbnail,
      content,
      excerpt,
      meta_title,
      meta_description,
      meta_keywords,
      tags,
      is_featured,
      status,
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: "Thiếu tiêu đề hoặc nội dung",
      });
    }

    // 👇 Xử lý slug: Nếu không có slug, tự sinh từ title
    let finalSlug = slug;
    if (!finalSlug || finalSlug.trim() === '') {
      finalSlug = title
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '');
    }

    // 👇 Kiểm tra trùng lặp slug
    let counter = 1;
    let tempSlug = finalSlug;
    while (true) {
      // Kiểm tra xem slug đã tồn tại chưa
      const [existing] = await pool.query("SELECT id FROM posts WHERE slug = ?", [tempSlug]);
      if (existing.length === 0) {
        // Không trùng, dùng slug này
        finalSlug = tempSlug;
        break;
      }
      // Nếu trùng, thêm đuôi số và thử lại
      tempSlug = `${finalSlug}-${counter}`;
      counter++;
    }

    // 👇 Tiến hành INSERT với slug đã được đảm bảo duy nhất
    const [result] = await pool.query(
      `
      INSERT INTO posts (
        user_id, category_id, title, slug, thumbnail, content,
        excerpt, meta_title, meta_description, meta_keywords,
        tags, is_featured, status, views, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW())
      `,
      [
        user_id,
        category_id,
        title,
        finalSlug, // Dùng finalSlug đã xử lý
        thumbnail,
        content,
        excerpt || null,
        meta_title || null,
        meta_description || null,
        meta_keywords || null,
        tags || null,
        is_featured ?? 0,
        status ?? 1,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Thêm bài viết thành công",
      id: result.insertId,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ============================
// CẬP NHẬT (Đã sửa lỗi thiếu user_id)
// ============================
exports.updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      user_id, // 👈 QUAN TRỌNG: Đã thêm dòng này để nhận user_id từ FE
      category_id,
      title,
      slug,
      thumbnail,
      content,
      excerpt,
      meta_title,
      meta_description,
      meta_keywords,
      tags,
      is_featured,
      status,
    } = req.body;

    const [result] = await pool.query(
      `
      UPDATE posts SET
        user_id = ?,        -- 👈 Thêm cột này vào câu lệnh UPDATE
        category_id = ?,
        title = ?,
        slug = ?,
        thumbnail = ?,
        content = ?,
        excerpt = ?,
        meta_title = ?,
        meta_description = ?,
        meta_keywords = ?,
        tags = ?,
        is_featured = ?,
        status = ?,
        updated_at = NOW()
      WHERE id = ?
      `,
      [
        user_id,             // 👈 Thêm biến này vào mảng tham số
        category_id,
        title,
        slug,
        thumbnail,
        content,
        excerpt || null,
        meta_title || null,
        meta_description || null,
        meta_keywords || null,
        tags || null,
        is_featured ?? 0,
        status ?? 1,
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bài viết",
      });
    }

    res.json({
      success: true,
      message: "Cập nhật thành công",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ============================
// XÓA MỀM
// ============================
exports.deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query(
      `UPDATE posts SET deleted_at = NOW() WHERE id = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bài viết",
      });
    }

    res.json({
      success: true,
      message: "Đã xóa bài viết",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ============================
// UPLOAD ẢNH THUMBNAIL
// ============================
exports.uploadThumbnail = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Chưa chọn ảnh",
      });
    }

    res.json({
      success: true,
      thumbnail: "/uploads/posts/" + req.file.filename,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ============================
// UPLOAD ẢNH CHO CKEDITOR
// ============================
exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Chưa chọn ảnh",
      });
    }

    const location = "/uploads/posts/" + req.file.filename;
    const fullUrl = process.env.BASE_URL || "http://localhost:5000";

    res.json({
      success: true,
      location: fullUrl + location,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};