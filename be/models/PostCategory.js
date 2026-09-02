const { pool } = require("../config/database");

class PostCategory {
  // ============================================================
  // GET ALL
  // ============================================================

  static async getAll({
    keyword = "",
    status = "",
    page = 1,
    limit = 10,
  } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);

    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));

    const offset = (pageNum - 1) * limitNum;

    let whereSql = `
      WHERE pc.deleted_at IS NULL
    `;

    const params = [];

    if (keyword) {
      whereSql += `
        AND (
          pc.name LIKE ?
          OR pc.slug LIKE ?
          OR pc.description LIKE ?
        )
      `;

      const search = `%${keyword}%`;

      params.push(search, search, search);
    }

    if (status !== "" && status !== undefined && status !== null) {
      whereSql += `
        AND pc.status = ?
      `;

      params.push(Number(status) === 1 ? 1 : 0);
    }

    const sql = `
      SELECT
        pc.*,

        (
          SELECT COUNT(*)
          FROM posts p
          WHERE
            p.post_category_id = pc.id
            AND p.deleted_at IS NULL
        ) AS post_count

      FROM post_categories pc

      ${whereSql}

      ORDER BY
        pc.created_at DESC,
        pc.id DESC

      LIMIT ? OFFSET ?
    `;

    const [rows] = await pool.query(sql, [...params, limitNum, offset]);

    const countSql = `
      SELECT
        COUNT(*) AS total

      FROM post_categories pc

      ${whereSql}
    `;

    const [countRows] = await pool.query(countSql, params);

    const total = Number(countRows[0]?.total || 0);

    return {
      data: rows,

      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  // ============================================================
  // GET ACTIVE
  // Dùng cho dropdown khi tạo/sửa Post
  // ============================================================

  static async getActive() {
    const [rows] = await pool.query(`
      SELECT
        id,
        name,
        slug,
        description,
        image,
        status
      FROM post_categories
      WHERE
        deleted_at IS NULL
        AND status = 1
      ORDER BY name ASC
    `);

    return rows;
  }

  // ============================================================
  // GET BY ID
  // ============================================================

  static async getById(id) {
    const [rows] = await pool.query(
      `
      SELECT
        pc.*,

        (
          SELECT COUNT(*)
          FROM posts p
          WHERE
            p.post_category_id = pc.id
            AND p.deleted_at IS NULL
        ) AS post_count

      FROM post_categories pc

      WHERE
        pc.id = ?
        AND pc.deleted_at IS NULL

      LIMIT 1
      `,
      [id],
    );

    return rows[0] || null;
  }

  // ============================================================
  // GET INCLUDING DELETED
  // ============================================================

  static async getByIdIncludeDeleted(id) {
    const [rows] = await pool.query(
      `
      SELECT *
      FROM post_categories
      WHERE id = ?
      LIMIT 1
      `,
      [id],
    );

    return rows[0] || null;
  }

  // ============================================================
  // GET BY SLUG
  // ============================================================

  static async getBySlug(slug) {
    const [rows] = await pool.query(
      `
      SELECT *
      FROM post_categories
      WHERE
        slug = ?
        AND deleted_at IS NULL
      LIMIT 1
      `,
      [slug],
    );

    return rows[0] || null;
  }

  // ============================================================
  // CHECK SLUG
  // ============================================================

  static async slugExists(slug, excludeId = null) {
    let sql = `
      SELECT id
      FROM post_categories
      WHERE slug = ?
    `;

    const params = [slug];

    if (excludeId) {
      sql += `
        AND id != ?
      `;

      params.push(excludeId);
    }

    sql += ` LIMIT 1`;

    const [rows] = await pool.query(sql, params);

    return rows.length > 0;
  }

  // ============================================================
  // CREATE
  // ============================================================

  static async create({
    name,
    slug,
    description = null,
    image = null,
    status = 1,
  }) {
    const [result] = await pool.query(
      `
      INSERT INTO post_categories (
        name,
        slug,
        description,
        image,
        status,
        created_at,
        updated_at
      )
      VALUES (
        ?,
        ?,
        ?,
        ?,
        ?,
        NOW(),
        NOW()
      )
      `,
      [name, slug, description, image, status],
    );

    return result.insertId;
  }

  // ============================================================
  // UPDATE
  // ============================================================

  static async update(
    id,
    { name, slug, description = null, image = null, status = 1 },
  ) {
    const [result] = await pool.query(
      `
      UPDATE post_categories
      SET
        name = ?,
        slug = ?,
        description = ?,
        image = ?,
        status = ?,
        updated_at = NOW()
      WHERE
        id = ?
        AND deleted_at IS NULL
      `,
      [name, slug, description, image, status, id],
    );

    return result.affectedRows > 0;
  }

  // ============================================================
  // TOGGLE STATUS
  // ============================================================

  static async toggleStatus(id) {
    const [result] = await pool.query(
      `
      UPDATE post_categories
      SET
        status = IF(status = 1, 0, 1),
        updated_at = NOW()
      WHERE
        id = ?
        AND deleted_at IS NULL
      `,
      [id],
    );

    return result.affectedRows > 0;
  }

  // ============================================================
  // SOFT DELETE
  // ============================================================

  static async remove(id) {
    const [result] = await pool.query(
      `
      UPDATE post_categories
      SET
        deleted_at = NOW(),
        updated_at = NOW()
      WHERE
        id = ?
        AND deleted_at IS NULL
      `,
      [id],
    );

    return result.affectedRows > 0;
  }

  // ============================================================
  // RESTORE
  // ============================================================

  static async restore(id) {
    const [result] = await pool.query(
      `
      UPDATE post_categories
      SET
        deleted_at = NULL,
        updated_at = NOW()
      WHERE
        id = ?
        AND deleted_at IS NOT NULL
      `,
      [id],
    );

    return result.affectedRows > 0;
  }

  // ============================================================
  // CHECK POST USAGE
  // ============================================================

  static async countPosts(id) {
    const [rows] = await pool.query(
      `
      SELECT
        COUNT(*) AS total
      FROM posts
      WHERE
        post_category_id = ?
        AND deleted_at IS NULL
      `,
      [id],
    );

    return Number(rows[0]?.total || 0);
  }
}

module.exports = PostCategory;
