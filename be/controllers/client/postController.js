const { pool } = require("../../config/database");

// =====================================
// LẤY DANH SÁCH BÀI VIẾT
// =====================================
exports.getPosts = async (req, res) => {
  try {
    const {
      search = "",
      category = "",
      sort = "latest",
    } = req.query;

    let sql = `
      SELECT
        p.id,
        p.title,
        p.slug,
        p.content,
        p.thumbnail,
        p.created_at,
        c.name AS category
      FROM posts p
      LEFT JOIN categories c
        ON c.id = p.category_id
      WHERE 1=1
    `;

    const params = [];

    // tìm kiếm
    if (search) {
      sql += " AND p.title LIKE ?";
      params.push(`%${search}%`);
    }

    // lọc danh mục
    if (category && category !== "Tất cả") {
      sql += " AND c.name = ?";
      params.push(category);
    }

    // sắp xếp
    switch (sort) {
      case "oldest":
        sql += " ORDER BY p.created_at ASC";
        break;

      default:
        sql += " ORDER BY p.created_at DESC";
        break;
    }

    const [rows] = await pool.query(sql, params);

    res.json({
      success: true,
      data: rows,
    });
  } catch (err) {
    console.log(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================
// CHI TIẾT BÀI VIẾT
// =====================================
exports.getPostById = async (req, res) => {
  try {
    const { id } = req.params;

    const sql = `
      SELECT
        p.id,
        p.title,
        p.slug,
        p.content,
        p.thumbnail,
        p.created_at,
        c.name AS category
      FROM posts p
      LEFT JOIN categories c
        ON c.id = p.category_id
      WHERE p.id = ?
      LIMIT 1
    `;

    const [rows] = await pool.query(sql, [id]);

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