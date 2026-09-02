const { pool } = require("../config/database");

class Post {
  // ============================================================
  // CLIENT - DANH SÁCH BÀI VIẾT
  // ============================================================

  static async getClientList({
    search = "",
    post_category_id = null,
    category_id = null,
    sort = "latest",
    page = 1,
    limit = 6,
  } = {}) {
    const pageNum = Math.max(1, Number.parseInt(page, 10) || 1);

    const limitNum = Math.max(
      1,
      Math.min(100, Number.parseInt(limit, 10) || 6),
    );

    /*
     * post_category_id là field chính.
     * category_id chỉ giữ compatibility tạm thời
     * nếu FE cũ còn gửi category_id.
     */
    const categoryFilter = post_category_id || category_id || null;

    let sql = `
      SELECT
        p.id,
        p.title,
        p.slug,
        p.content,
        p.excerpt,
        p.tags,
        p.thumbnail,

        p.meta_title,
        p.meta_description,
        p.meta_keywords,

        p.views,
        p.is_featured,

        p.created_at,
        p.updated_at,

        p.post_category_id,

        pc.name AS post_category_name,
        pc.slug AS post_category_slug,

        u.id AS author_id,
        u.full_name AS author_name,
        u.avatar AS author_avatar

      FROM posts p

      LEFT JOIN post_categories pc
        ON p.post_category_id = pc.id
        AND pc.deleted_at IS NULL

      LEFT JOIN users u
        ON p.user_id = u.id

      WHERE
        p.deleted_at IS NULL
        AND p.status = 1
    `;

    const params = [];

    // ==========================================================
    // SEARCH
    // ==========================================================

    if (search) {
      sql += `
        AND (
          p.title LIKE ?
          OR p.excerpt LIKE ?
          OR p.tags LIKE ?
          OR pc.name LIKE ?
        )
      `;

      const searchValue = `%${String(search).trim()}%`;

      params.push(searchValue, searchValue, searchValue, searchValue);
    }

    // ==========================================================
    // CATEGORY FILTER
    // ==========================================================

    if (categoryFilter && categoryFilter !== "all") {
      sql += `
        AND p.post_category_id = ?
      `;

      params.push(categoryFilter);
    }

    // ==========================================================
    // SORT
    // ==========================================================

    switch (sort) {
      case "oldest":
        sql += `
          ORDER BY
            p.created_at ASC,
            p.id ASC
        `;
        break;

      case "views":
        sql += `
          ORDER BY
            p.views DESC,
            p.created_at DESC,
            p.id DESC
        `;
        break;

      case "featured":
        sql += `
          ORDER BY
            p.is_featured DESC,
            p.created_at DESC,
            p.id DESC
        `;
        break;

      case "latest":
      default:
        sql += `
          ORDER BY
            p.created_at DESC,
            p.id DESC
        `;
        break;
    }

    // ==========================================================
    // PAGINATION
    // ==========================================================

    const offset = (pageNum - 1) * limitNum;

    sql += `
      LIMIT ? OFFSET ?
    `;

    params.push(limitNum, offset);

    const [rows] = await pool.query(sql, params);

    return rows;
  }

  // ============================================================
  // CLIENT - COUNT DANH SÁCH
  // ============================================================

  static async countClientList({
    search = "",
    post_category_id = null,
    category_id = null,
  } = {}) {
    const categoryFilter = post_category_id || category_id || null;

    let sql = `
      SELECT
        COUNT(*) AS total

      FROM posts p

      LEFT JOIN post_categories pc
        ON p.post_category_id = pc.id
        AND pc.deleted_at IS NULL

      WHERE
        p.deleted_at IS NULL
        AND p.status = 1
    `;

    const params = [];

    if (search) {
      sql += `
        AND (
          p.title LIKE ?
          OR p.excerpt LIKE ?
          OR p.tags LIKE ?
          OR pc.name LIKE ?
        )
      `;

      const searchValue = `%${String(search).trim()}%`;

      params.push(searchValue, searchValue, searchValue, searchValue);
    }

    if (categoryFilter && categoryFilter !== "all") {
      sql += `
        AND p.post_category_id = ?
      `;

      params.push(categoryFilter);
    }

    const [rows] = await pool.query(sql, params);

    return Number(rows[0]?.total || 0);
  }

  // ============================================================
  // CLIENT - CHI TIẾT THEO ID
  // ============================================================

  static async getClientDetail(id) {
    const sql = `
      SELECT
        p.id,
        p.title,
        p.slug,
        p.content,
        p.excerpt,
        p.tags,
        p.thumbnail,

        p.meta_title,
        p.meta_description,
        p.meta_keywords,

        p.views,
        p.is_featured,

        p.created_at,
        p.updated_at,

        p.post_category_id,

        pc.name AS post_category_name,
        pc.slug AS post_category_slug,

        u.id AS author_id,
        u.full_name AS author_name,
        u.avatar AS author_avatar

      FROM posts p

      LEFT JOIN post_categories pc
        ON p.post_category_id = pc.id
        AND pc.deleted_at IS NULL

      LEFT JOIN users u
        ON p.user_id = u.id

      WHERE
        p.id = ?
        AND p.deleted_at IS NULL
        AND p.status = 1

      LIMIT 1
    `;

    const [rows] = await pool.query(sql, [id]);

    return rows[0] || null;
  }

  // ============================================================
  // CLIENT - CHI TIẾT THEO SLUG
  // ============================================================

  static async getClientDetailBySlug(slug) {
    const sql = `
      SELECT
        p.id,
        p.title,
        p.slug,
        p.content,
        p.excerpt,
        p.tags,
        p.thumbnail,

        p.meta_title,
        p.meta_description,
        p.meta_keywords,

        p.views,
        p.is_featured,

        p.created_at,
        p.updated_at,

        p.post_category_id,

        pc.name AS post_category_name,
        pc.slug AS post_category_slug,

        u.id AS author_id,
        u.full_name AS author_name,
        u.avatar AS author_avatar

      FROM posts p

      LEFT JOIN post_categories pc
        ON p.post_category_id = pc.id
        AND pc.deleted_at IS NULL

      LEFT JOIN users u
        ON p.user_id = u.id

      WHERE
        p.slug = ?
        AND p.deleted_at IS NULL
        AND p.status = 1

      LIMIT 1
    `;

    const [rows] = await pool.query(sql, [slug]);

    return rows[0] || null;
  }

  // ============================================================
  // CLIENT - DANH MỤC BÀI VIẾT
  //
  // Dựa đúng schema thực tế:
  // id
  // name
  // slug
  // description
  // image
  // status
  // created_at
  // updated_at
  // deleted_at
  // ============================================================

  static async getClientCategories() {
    const sql = `
      SELECT
        pc.id,
        pc.name,
        pc.slug,
        pc.description,
        pc.image,
        pc.status,
        pc.created_at,
        pc.updated_at,

        COUNT(p.id) AS post_count

      FROM post_categories pc

      LEFT JOIN posts p
        ON p.post_category_id = pc.id
        AND p.deleted_at IS NULL
        AND p.status = 1

      WHERE
        pc.deleted_at IS NULL
        AND pc.status = 1

      GROUP BY
        pc.id,
        pc.name,
        pc.slug,
        pc.description,
        pc.image,
        pc.status,
        pc.created_at,
        pc.updated_at

      ORDER BY
        pc.name ASC
    `;

    const [rows] = await pool.query(sql);

    return rows.map((row) => ({
      ...row,

      post_count: Number(row.post_count || 0),
    }));
  }

  // ============================================================
  // CLIENT - TĂNG LƯỢT XEM
  // ============================================================

  static async incrementView(id) {
    const [result] = await pool.query(
      `
        UPDATE posts

        SET
          views = COALESCE(views, 0) + 1

        WHERE
          id = ?
          AND status = 1
          AND deleted_at IS NULL
        `,
      [id],
    );

    return result.affectedRows > 0;
  }

  // ============================================================
  // CHECK POST CATEGORY
  // ============================================================

  static async categoryExists(postCategoryId) {
    if (!postCategoryId) {
      return true;
    }

    const [rows] = await pool.query(
      `
        SELECT
          id

        FROM post_categories

        WHERE
          id = ?
          AND status = 1
          AND deleted_at IS NULL

        LIMIT 1
        `,
      [postCategoryId],
    );

    return rows.length > 0;
  }
}

module.exports = Post;
