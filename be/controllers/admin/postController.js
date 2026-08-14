const { pool } = require("../../config/database");
const path = require("path");
// ============================
// LẤY DANH SÁCH BÀI VIẾT
// ============================
exports.getAllPosts = async (req, res) => {
  try {
    const { keyword = "", status = "", category_id = "" } = req.query;

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
      sql += " AND p.title LIKE ?";
      params.push(`%${keyword}%`);
    }

    if (status !== "") {
      sql += " AND p.status = ?";
      params.push(status);
    }

    if (category_id) {
      sql += " AND p.category_id = ?";
      params.push(category_id);
    }

    sql += " ORDER BY p.created_at DESC";

    const [posts] = await pool.query(sql, params);

    res.json({
      success: true,
      total: posts.length,
      data: posts,
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
      LEFT JOIN users u ON p.user_id=u.id
      LEFT JOIN categories c ON p.category_id=c.id
      WHERE p.id=?
      LIMIT 1
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
// THÊM BÀI VIẾT
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
      status,
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: "Thiếu tiêu đề hoặc nội dung",
      });
    }

    const [result] = await pool.query(
      `
      INSERT INTO posts
      (
      user_id,
      category_id,
      title,
      slug,
      thumbnail,
      content,
      status,
      created_at,
      updated_at
      )
      VALUES
      (
      ?,?,?,?,?,?,?,NOW(),NOW()
      )
      `,
      [
        user_id,
        category_id,
        title,
        slug,
        thumbnail,
        content,
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
// CẬP NHẬT
// ============================
exports.updatePost = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      category_id,
      title,
      slug,
      thumbnail,
      content,
      status,
    } = req.body;

    const [result] = await pool.query(
      `
      UPDATE posts
      SET
      category_id=?,
      title=?,
      slug=?,
      thumbnail=?,
      content=?,
      status=?,
      updated_at=NOW()
      WHERE id=?
      `,
      [
        category_id,
        title,
        slug,
        thumbnail,
        content,
        status,
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
      `
      UPDATE posts
      SET deleted_at = NOW()
      WHERE id = ?
      `,
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
// UPLOAD ẢNH
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