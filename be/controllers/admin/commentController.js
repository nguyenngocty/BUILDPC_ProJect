const { pool } = require("../../config/database");
const ExcelJS = require("exceljs");
// ======================================
// LẤY DANH SÁCH BÌNH LUẬN
// ======================================
exports.getAllComments = async (req, res) => {
  try {
    const {
      keyword,
      product_id,
      user_id,
      status,
      sort = "newest",
      page = 1,
      limit = 10,
    } = req.query;

    let where = " WHERE 1=1 ";
    const params = [];

    // Tìm kiếm
    if (keyword) {
      where += `
        AND (
          c.content LIKE ?
          OR u.full_name LIKE ?
          OR p.name LIKE ?
        )
      `;

      params.push(
        `%${keyword}%`,
        `%${keyword}%`,
        `%${keyword}%`
      );
    }

    // Lọc sản phẩm
    if (product_id) {
      where += " AND c.product_id = ?";
      params.push(product_id);
    }

    // Lọc người dùng
    if (user_id) {
      where += " AND c.user_id = ?";
      params.push(user_id);
    }

    // Lọc trạng thái
    if (
      status !== undefined &&
      status !== "" &&
      status !== "all"
    ) {
      where += " AND c.is_approved = ?";
      params.push(status);
    }

    // Đếm tổng số bản ghi
    const [countRows] = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM comments c
      INNER JOIN users u
        ON c.user_id = u.id
      INNER JOIN products p
        ON c.product_id = p.id
      ${where}
      `,
      params
    );

    const total = countRows[0].total;

    // Sắp xếp
    let orderBy = "ORDER BY c.created_at DESC";

    switch (sort) {
      case "oldest":
        orderBy = "ORDER BY c.created_at ASC";
        break;
      default:
        orderBy = "ORDER BY c.created_at DESC";
        break;
    }

    // Phân trang
    const currentPage = Number(page);
    const perPage = Number(limit);
    const offset = (currentPage - 1) * perPage;

    // Lấy dữ liệu
    const [rows] = await pool.query(
      `
      SELECT
        c.id,
        c.content,
        c.rating,
        c.is_approved,
        c.created_at,
        c.updated_at,
        c.deleted_at,

        u.id AS user_id,
        u.full_name,

        p.id AS product_id,
        p.name AS product_name

      FROM comments c

      INNER JOIN users u
        ON c.user_id = u.id

      INNER JOIN products p
        ON c.product_id = p.id

      ${where}

      ${orderBy}

      LIMIT ?
      OFFSET ?
      `,
      [...params, perPage, offset]
    );

    res.json({
      success: true,
      data: rows,
      pagination: {
        page: currentPage,
        limit: perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ======================================
// THỐNG KÊ BÌNH LUẬN
// ======================================
exports.getCommentStatistics = async (req, res) => {
  try {
    const [[row]] = await pool.query(`
      SELECT

        COUNT(*) AS total,

        SUM(
          CASE
            WHEN is_approved = 1
            THEN 1
            ELSE 0
          END
        ) AS approved,

        SUM(
          CASE
            WHEN is_approved = 0
            THEN 1
            ELSE 0
          END
        ) AS pending

      FROM comments
    `);

    res.json({
      success: true,
      data: row,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ======================================
// DUYỆT BÌNH LUẬN
// ======================================
exports.approveComment = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      `
      UPDATE comments
      SET
        is_approved = 1,
        updated_at = NOW()
      WHERE id = ?
      `,
      [id]
    );

    res.json({
      success: true,
      message: "Đã duyệt bình luận.",
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ======================================
// TỪ CHỐI BÌNH LUẬN
// ======================================
exports.rejectComment = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      `
      UPDATE comments
      SET
        is_approved = 0,
        updated_at = NOW()
      WHERE id = ?
      `,
      [id]
    );

    res.json({
      success: true,
      message: "Đã từ chối bình luận.",
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
  // ======================================
// XÓA BÌNH LUẬN
// ======================================
exports.deleteComment = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query(
      `
      DELETE FROM comments
      WHERE id = ?
      `,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bình luận.",
      });
    }

    res.json({
      success: true,
      message: "Đã xóa bình luận thành công.",
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ======================================
// DANH SÁCH SẢN PHẨM
// ======================================
exports.getProducts = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        id,
        name
      FROM products
      WHERE deleted_at IS NULL
      ORDER BY name ASC
    `);

    res.json({
      success: true,
      data: rows,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ======================================
// DANH SÁCH NGƯỜI DÙNG
// ======================================
exports.getUsers = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        id,
        full_name
      FROM users
      ORDER BY full_name ASC
    `);

    res.json({
      success: true,
      data: rows,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ======================================
// CHI TIẾT BÌNH LUẬN
// ======================================
exports.getCommentById = async (req, res) => {
  try {
    const { id } = req.params;

    const [[row]] = await pool.query(
      `
      SELECT
        c.id,
        c.content,
        c.rating,
        c.is_approved,
        c.created_at,
        c.updated_at,

        u.id AS user_id,
        u.full_name,
        u.email,

        p.id AS product_id,
        p.name AS product_name

      FROM comments c

      INNER JOIN users u
        ON c.user_id = u.id

      INNER JOIN products p
        ON c.product_id = p.id

      WHERE c.id = ?
      `,
      [id]
    );

    if (!row) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bình luận.",
      });
    }

    res.json({
      success: true,
      data: row,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
}; 
 // ======================================
// XÓA NHIỀU BÌNH LUẬN
// ======================================
exports.deleteManyComments = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Danh sách bình luận không hợp lệ.",
      });
    }

    const validIds = ids.filter((id) => !isNaN(Number(id)));

    if (validIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Không có ID hợp lệ.",
      });
    }

    const [result] = await pool.query(
      `
      DELETE FROM comments
      WHERE id IN (?)
      `,
      [validIds]
    );

    res.json({
      success: true,
      message: `Đã xóa ${result.affectedRows} bình luận.`,
      deleted: result.affectedRows,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
