const { pool } = require("../../config/database");

// ============================================================
// HELPERS
// ============================================================

const normalizePositiveInt = (value, fallback = null) => {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
};

const normalizePagination = ({ page, limit }) => {
  const safePage = Math.max(normalizePositiveInt(page, 1), 1);

  const safeLimit = Math.min(Math.max(normalizePositiveInt(limit, 10), 1), 100);

  return {
    page: safePage,

    limit: safeLimit,

    offset: (safePage - 1) * safeLimit,
  };
};

// ============================================================
// GET ALL ACTIVE COMMENTS
//
// GET /api/admin/comments
//
// QUAN TRỌNG:
// Review đã bị user/admin soft-delete sẽ KHÔNG xuất hiện.
// ============================================================

exports.getAllComments = async (req, res) => {
  try {
    const {
      keyword = "",

      product_id = "",

      user_id = "",

      status = "all",

      sort = "newest",

      page = 1,

      limit = 10,
    } = req.query;

    const pagination = normalizePagination({
      page,
      limit,
    });

    const conditions = ["c.deleted_at IS NULL"];

    const params = [];

    // ========================================================
    // KEYWORD
    // ========================================================

    const normalizedKeyword = String(keyword || "").trim();

    if (normalizedKeyword) {
      const searchValue = `%${normalizedKeyword}%`;

      conditions.push(`
        (
          c.content LIKE ?
          OR u.full_name LIKE ?
          OR COALESCE(u.email, '') LIKE ?
          OR p.name LIKE ?
        )
      `);

      params.push(searchValue, searchValue, searchValue, searchValue);
    }

    // ========================================================
    // PRODUCT
    // ========================================================

    const productId = normalizePositiveInt(product_id);

    if (productId) {
      conditions.push("c.product_id = ?");

      params.push(productId);
    }

    // ========================================================
    // USER
    // ========================================================

    const userId = normalizePositiveInt(user_id);

    if (userId) {
      conditions.push("c.user_id = ?");

      params.push(userId);
    }

    // ========================================================
    // APPROVAL
    // ========================================================

    if (String(status) === "0" || String(status) === "1") {
      conditions.push("c.is_approved = ?");

      params.push(Number(status));
    }

    const whereSql = `WHERE ${conditions.join("\n AND ")}`;

    // ========================================================
    // COUNT
    // ========================================================

    const [[countRow]] = await pool.query(
      `
          SELECT
            COUNT(*) AS total

          FROM comments c

          INNER JOIN users u
            ON u.id = c.user_id

          INNER JOIN products p
            ON p.id = c.product_id

          ${whereSql}
        `,
      params,
    );

    const total = Number(countRow?.total || 0);

    // ========================================================
    // SORT
    // ========================================================

    let orderBy = `
      ORDER BY
        c.created_at DESC,
        c.id DESC
    `;

    if (String(sort).toLowerCase() === "oldest") {
      orderBy = `
        ORDER BY
          c.created_at ASC,
          c.id ASC
      `;
    }

    // ========================================================
    // DATA
    // ========================================================

    const [rows] = await pool.query(
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

            u.avatar,

            p.id AS product_id,

            p.name AS product_name,

            p.slug AS product_slug

          FROM comments c

          INNER JOIN users u
            ON u.id = c.user_id

          INNER JOIN products p
            ON p.id = c.product_id

          ${whereSql}

          ${orderBy}

          LIMIT ?
          OFFSET ?
        `,
      [...params, pagination.limit, pagination.offset],
    );

    return res.status(200).json({
      success: true,

      data: rows.map((item) => ({
        ...item,

        id: Number(item.id),

        user_id: Number(item.user_id),

        product_id: Number(item.product_id),

        rating: Number(item.rating || 0),

        is_approved: Number(item.is_approved || 0),
      })),

      pagination: {
        page: pagination.page,

        limit: pagination.limit,

        total,

        totalPages: total > 0 ? Math.ceil(total / pagination.limit) : 0,
      },
    });
  } catch (error) {
    console.error("Admin get comments:", error);

    return res.status(500).json({
      success: false,

      message: error?.message || "Không thể tải danh sách đánh giá.",
    });
  }
};

// ============================================================
// STATISTICS
//
// Chỉ tính review ACTIVE.
// ============================================================

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

        WHERE
          deleted_at IS NULL
      `);

    return res.status(200).json({
      success: true,

      data: {
        total: Number(row?.total || 0),

        approved: Number(row?.approved || 0),

        pending: Number(row?.pending || 0),
      },
    });
  } catch (error) {
    console.error("Admin comment statistics:", error);

    return res.status(500).json({
      success: false,

      message: error?.message || "Không thể lấy thống kê đánh giá.",
    });
  }
};

// ============================================================
// APPROVE
// ============================================================

exports.approveComment = async (req, res) => {
  try {
    const id = normalizePositiveInt(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,

        message: "Đánh giá không hợp lệ.",
      });
    }

    const [result] = await pool.query(
      `
          UPDATE comments

          SET
            is_approved = 1,

            updated_at = NOW()

          WHERE
            id = ?
            AND deleted_at IS NULL
        `,
      [id],
    );

    if (Number(result.affectedRows || 0) === 0) {
      return res.status(404).json({
        success: false,

        message: "Không tìm thấy đánh giá.",
      });
    }

    return res.status(200).json({
      success: true,

      message: "Đã duyệt đánh giá.",
    });
  } catch (error) {
    console.error("Admin approve comment:", error);

    return res.status(500).json({
      success: false,

      message: error?.message || "Không thể duyệt đánh giá.",
    });
  }
};

// ============================================================
// REJECT / HIDE
//
// Không xóa review.
// Chỉ ẩn khỏi Client vì Client chỉ lấy is_approved = 1.
// ============================================================

exports.rejectComment = async (req, res) => {
  try {
    const id = normalizePositiveInt(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,

        message: "Đánh giá không hợp lệ.",
      });
    }

    const [result] = await pool.query(
      `
          UPDATE comments

          SET
            is_approved = 0,

            updated_at = NOW()

          WHERE
            id = ?
            AND deleted_at IS NULL
        `,
      [id],
    );

    if (Number(result.affectedRows || 0) === 0) {
      return res.status(404).json({
        success: false,

        message: "Không tìm thấy đánh giá.",
      });
    }

    return res.status(200).json({
      success: true,

      message: "Đã ẩn đánh giá khỏi website.",
    });
  } catch (error) {
    console.error("Admin reject comment:", error);

    return res.status(500).json({
      success: false,

      message: error?.message || "Không thể cập nhật đánh giá.",
    });
  }
};

// ============================================================
// SOFT DELETE ONE
//
// Không DELETE vật lý.
// ============================================================

exports.deleteComment = async (req, res) => {
  try {
    const id = normalizePositiveInt(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,

        message: "Đánh giá không hợp lệ.",
      });
    }

    const [result] = await pool.query(
      `
          UPDATE comments

          SET
            deleted_at = NOW(),

            updated_at = NOW()

          WHERE
            id = ?
            AND deleted_at IS NULL
        `,
      [id],
    );

    if (Number(result.affectedRows || 0) === 0) {
      return res.status(404).json({
        success: false,

        message: "Không tìm thấy đánh giá.",
      });
    }

    return res.status(200).json({
      success: true,

      message: "Đã xóa đánh giá.",
    });
  } catch (error) {
    console.error("Admin delete comment:", error);

    return res.status(500).json({
      success: false,

      message: error?.message || "Không thể xóa đánh giá.",
    });
  }
};

// ============================================================
// SOFT DELETE MANY
// ============================================================

exports.deleteManyComments = async (req, res) => {
  try {
    const sourceIds = Array.isArray(req.body?.ids) ? req.body.ids : [];

    const ids = [
      ...new Set(
        sourceIds.map((id) => normalizePositiveInt(id)).filter(Boolean),
      ),
    ];

    if (ids.length === 0) {
      return res.status(400).json({
        success: false,

        message: "Danh sách đánh giá không hợp lệ.",
      });
    }

    const [result] = await pool.query(
      `
          UPDATE comments

          SET
            deleted_at = NOW(),

            updated_at = NOW()

          WHERE
            id IN (?)
            AND deleted_at IS NULL
        `,
      [ids],
    );

    const deleted = Number(result.affectedRows || 0);

    return res.status(200).json({
      success: true,

      message: `Đã xóa ${deleted} đánh giá.`,

      deleted,
    });
  } catch (error) {
    console.error("Admin delete many comments:", error);

    return res.status(500).json({
      success: false,

      message: error?.message || "Không thể xóa các đánh giá.",
    });
  }
};

// ============================================================
// PRODUCTS FILTER
// ============================================================

exports.getProducts = async (req, res) => {
  try {
    const [rows] = await pool.query(`
        SELECT
          id,
          name

        FROM products

        WHERE
          deleted_at IS NULL

        ORDER BY
          name ASC
      `);

    return res.status(200).json({
      success: true,

      data: rows,
    });
  } catch (error) {
    console.error("Admin comment products:", error);

    return res.status(500).json({
      success: false,

      message: error?.message || "Không thể tải danh sách sản phẩm.",
    });
  }
};

// ============================================================
// USERS FILTER
// ============================================================

exports.getUsers = async (req, res) => {
  try {
    const [rows] = await pool.query(`
        SELECT
          id,

          full_name,

          email,

          avatar

        FROM users

        WHERE
          deleted_at IS NULL

        ORDER BY
          full_name ASC
      `);

    return res.status(200).json({
      success: true,

      data: rows,
    });
  } catch (error) {
    console.error("Admin comment users:", error);

    return res.status(500).json({
      success: false,

      message: error?.message || "Không thể tải danh sách người dùng.",
    });
  }
};

// ============================================================
// DETAIL ACTIVE REVIEW
// ============================================================

exports.getCommentById = async (req, res) => {
  try {
    const id = normalizePositiveInt(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,

        message: "Đánh giá không hợp lệ.",
      });
    }

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

            u.avatar,

            p.id AS product_id,

            p.name AS product_name,

            p.slug AS product_slug

          FROM comments c

          INNER JOIN users u
            ON u.id = c.user_id

          INNER JOIN products p
            ON p.id = c.product_id

          WHERE
            c.id = ?
            AND c.deleted_at IS NULL

          LIMIT 1
        `,
      [id],
    );

    if (!row) {
      return res.status(404).json({
        success: false,

        message: "Không tìm thấy đánh giá.",
      });
    }

    return res.status(200).json({
      success: true,

      data: {
        ...row,

        id: Number(row.id),

        user_id: Number(row.user_id),

        product_id: Number(row.product_id),

        rating: Number(row.rating || 0),

        is_approved: Number(row.is_approved || 0),
      },
    });
  } catch (error) {
    console.error("Admin comment detail:", error);

    return res.status(500).json({
      success: false,

      message: error?.message || "Không thể tải chi tiết đánh giá.",
    });
  }
};
