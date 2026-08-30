const { pool } = require("../config/database");

class Category {
  // ==========================================================
  // EXISTS ACTIVE CATEGORY
  //
  // Giữ tương thích với các module khác đang dùng Category.exists()
  // Chỉ trả true khi category:
  // - chưa xóa
  // - status = 1
  // ==========================================================

  static async exists(id) {
    const [rows] = await pool.execute(
      `
        SELECT id
        FROM categories
        WHERE id = ?
          AND deleted_at IS NULL
          AND status = 1
        LIMIT 1
      `,
      [id],
    );

    return rows.length > 0;
  }

  // ==========================================================
  // GET ALL
  // ==========================================================

  static async getAll({
    page = 1,
    limit = 10,
    search = "",
    status = null,
    sort = "newest",
  } = {}) {
    const normalizedPage = Math.max(Number(page) || 1, 1);

    const normalizedLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);

    const offset = (normalizedPage - 1) * normalizedLimit;

    let where = `
      WHERE c.deleted_at IS NULL
    `;

    const params = [];

    if (search) {
      where += `
        AND (
          c.name LIKE ?
          OR c.slug LIKE ?
        )
      `;

      const keyword = `%${search}%`;

      params.push(keyword, keyword);
    }

    if (status !== null && status !== undefined && status !== "") {
      where += `
        AND c.status = ?
      `;

      params.push(Number(status));
    }

    let orderBy = `
      ORDER BY c.created_at DESC, c.id DESC
    `;

    switch (sort) {
      case "oldest":
        orderBy = `
          ORDER BY c.created_at ASC, c.id ASC
        `;
        break;

      case "name_asc":
        orderBy = `
          ORDER BY c.name ASC, c.id ASC
        `;
        break;

      case "name_desc":
        orderBy = `
          ORDER BY c.name DESC, c.id DESC
        `;
        break;

      default:
        break;
    }

    const [rows] = await pool.execute(
      `
        SELECT
          c.id,
          c.name,
          c.slug,
          c.description,
          c.image,
          c.status,
          c.created_at,
          c.updated_at,
          c.deleted_at,

          (
            SELECT COUNT(*)
            FROM products p
            WHERE p.category_id = c.id
              AND p.deleted_at IS NULL
          ) AS product_count

        FROM categories c

        ${where}

        ${orderBy}

        LIMIT ?
        OFFSET ?
      `,
      [...params, normalizedLimit, offset],
    );

    const [[count]] = await pool.execute(
      `
        SELECT COUNT(*) AS total

        FROM categories c

        ${where}
      `,
      params,
    );

    return {
      categories: rows.map((item) => ({
        ...item,

        id: Number(item.id),

        status: Number(item.status),

        product_count: Number(item.product_count || 0),
      })),

      pagination: {
        page: normalizedPage,

        limit: normalizedLimit,

        total: Number(count.total || 0),

        totalPages: Math.max(
          1,
          Math.ceil(Number(count.total || 0) / normalizedLimit),
        ),
      },
    };
  }

  // ==========================================================
  // GET ACTIVE / NON-DELETED CATEGORY BY ID
  // ==========================================================

  static async getById(id) {
    const [rows] = await pool.execute(
      `
        SELECT
          c.*,

          (
            SELECT COUNT(*)
            FROM products p
            WHERE p.category_id = c.id
              AND p.deleted_at IS NULL
          ) AS product_count

        FROM categories c

        WHERE c.id = ?
          AND c.deleted_at IS NULL

        LIMIT 1
      `,
      [id],
    );

    if (!rows[0]) {
      return null;
    }

    return {
      ...rows[0],

      id: Number(rows[0].id),

      status: Number(rows[0].status),

      product_count: Number(rows[0].product_count || 0),
    };
  }

  // ==========================================================
  // GET DELETED CATEGORY
  //
  // QUAN TRỌNG:
  // Chỉ trả category thực sự nằm trong Trash.
  // ==========================================================

  static async getDeletedById(id) {
    const [rows] = await pool.execute(
      `
        SELECT *
        FROM categories

        WHERE id = ?
          AND deleted_at IS NOT NULL

        LIMIT 1
      `,
      [id],
    );

    return rows[0] || null;
  }

  // ==========================================================
  // GET ANY CATEGORY
  // ==========================================================

  static async getAnyById(id) {
    const [rows] = await pool.execute(
      `
        SELECT *
        FROM categories

        WHERE id = ?

        LIMIT 1
      `,
      [id],
    );

    return rows[0] || null;
  }

  // ==========================================================
  // CREATE
  // ==========================================================

  static async create(connection, data) {
    const [result] = await connection.execute(
      `
        INSERT INTO categories
        (
          name,
          slug,
          description,
          image,
          status
        )

        VALUES (?, ?, ?, ?, ?)
      `,
      [
        data.name,
        data.slug,
        data.description || null,
        data.image || null,
        Number(data.status),
      ],
    );

    return result.insertId;
  }

  // ==========================================================
  // UPDATE
  // ==========================================================

  static async update(connection, id, data) {
    const [result] = await connection.execute(
      `
        UPDATE categories

        SET
          name = ?,
          slug = ?,
          description = ?,
          image = ?,
          status = ?

        WHERE id = ?
          AND deleted_at IS NULL
      `,
      [
        data.name,
        data.slug,
        data.description || null,
        data.image || null,
        Number(data.status),
        id,
      ],
    );

    return result.affectedRows > 0;
  }

  // ==========================================================
  // SOFT DELETE
  // ==========================================================

  static async softDelete(connection, id) {
    const [result] = await connection.execute(
      `
        UPDATE categories

        SET deleted_at = CURRENT_TIMESTAMP

        WHERE id = ?
          AND deleted_at IS NULL
      `,
      [id],
    );

    return result.affectedRows > 0;
  }

  // ==========================================================
  // RESTORE
  // ==========================================================

  static async restore(connection, id) {
    const [result] = await connection.execute(
      `
        UPDATE categories

        SET deleted_at = NULL

        WHERE id = ?
          AND deleted_at IS NOT NULL
      `,
      [id],
    );

    return result.affectedRows > 0;
  }

  // ==========================================================
  // FORCE DELETE
  // ==========================================================

  static async forceDelete(connection, id) {
    const [result] = await connection.execute(
      `
        DELETE FROM categories

        WHERE id = ?
          AND deleted_at IS NOT NULL
      `,
      [id],
    );

    return result.affectedRows > 0;
  }

  // ==========================================================
  // TOGGLE STATUS
  // ==========================================================

  static async toggleStatus(connection, id) {
    const [result] = await connection.execute(
      `
        UPDATE categories

        SET status =
          CASE
            WHEN status = 1 THEN 0
            ELSE 1
          END

        WHERE id = ?
          AND deleted_at IS NULL
      `,
      [id],
    );

    return result.affectedRows > 0;
  }

  // ==========================================================
  // STATISTICS
  //
  // total    = category chưa xóa
  // active   = category status = 1
  // inactive = category status = 0
  // trash    = category đã soft delete
  // ==========================================================

  static async getStatistics() {
    const [[row]] = await pool.execute(
      `
        SELECT

          SUM(
            CASE
              WHEN deleted_at IS NULL
              THEN 1
              ELSE 0
            END
          ) AS total,

          SUM(
            CASE
              WHEN deleted_at IS NULL
               AND status = 1
              THEN 1
              ELSE 0
            END
          ) AS active,

          SUM(
            CASE
              WHEN deleted_at IS NULL
               AND status = 0
              THEN 1
              ELSE 0
            END
          ) AS inactive,

          SUM(
            CASE
              WHEN deleted_at IS NOT NULL
              THEN 1
              ELSE 0
            END
          ) AS trash

        FROM categories
      `,
    );

    return {
      total: Number(row.total || 0),

      active: Number(row.active || 0),

      inactive: Number(row.inactive || 0),

      trash: Number(row.trash || 0),
    };
  }

  // ==========================================================
  // BULK DELETE
  // ==========================================================

  static async bulkDelete(connection, ids) {
    const placeholders = ids.map(() => "?").join(",");

    const [result] = await connection.execute(
      `
        UPDATE categories

        SET deleted_at = CURRENT_TIMESTAMP

        WHERE id IN (${placeholders})
          AND deleted_at IS NULL
      `,
      ids,
    );

    return result.affectedRows;
  }

  // ==========================================================
  // BULK RESTORE
  // ==========================================================

  static async bulkRestore(connection, ids) {
    const placeholders = ids.map(() => "?").join(",");

    const [result] = await connection.execute(
      `
        UPDATE categories

        SET deleted_at = NULL

        WHERE id IN (${placeholders})
          AND deleted_at IS NOT NULL
      `,
      ids,
    );

    return result.affectedRows;
  }

  // ==========================================================
  // GET TRASH
  // ==========================================================

  static async getTrash({
    page = 1,
    limit = 10,
    search = "",
    sort = "newest",
  } = {}) {
    const normalizedPage = Math.max(Number(page) || 1, 1);

    const normalizedLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);

    const offset = (normalizedPage - 1) * normalizedLimit;

    let where = `
      WHERE deleted_at IS NOT NULL
    `;

    const params = [];

    if (search) {
      where += `
        AND (
          name LIKE ?
          OR slug LIKE ?
        )
      `;

      const keyword = `%${search}%`;

      params.push(keyword, keyword);
    }

    let orderBy = `
      ORDER BY deleted_at DESC, id DESC
    `;

    switch (sort) {
      case "oldest":
        orderBy = `
          ORDER BY deleted_at ASC, id ASC
        `;
        break;

      case "name_asc":
        orderBy = `
          ORDER BY name ASC, id ASC
        `;
        break;

      case "name_desc":
        orderBy = `
          ORDER BY name DESC, id DESC
        `;
        break;

      default:
        break;
    }

    const [rows] = await pool.execute(
      `
        SELECT *
        FROM categories

        ${where}

        ${orderBy}

        LIMIT ?
        OFFSET ?
      `,
      [...params, normalizedLimit, offset],
    );

    const [[count]] = await pool.execute(
      `
        SELECT COUNT(*) AS total

        FROM categories

        ${where}
      `,
      params,
    );

    return {
      categories: rows.map((item) => ({
        ...item,

        id: Number(item.id),

        status: Number(item.status),
      })),

      pagination: {
        page: normalizedPage,

        limit: normalizedLimit,

        total: Number(count.total || 0),

        totalPages: Math.max(
          1,
          Math.ceil(Number(count.total || 0) / normalizedLimit),
        ),
      },
    };
  }

  // ==========================================================
  // HAS NON-DELETED PRODUCTS
  //
  // Dùng khi soft delete category.
  // ==========================================================

  static async hasProducts(id) {
    const [[row]] = await pool.execute(
      `
        SELECT COUNT(*) AS total

        FROM products

        WHERE category_id = ?
          AND deleted_at IS NULL
      `,
      [id],
    );

    return Number(row.total || 0) > 0;
  }

  // ==========================================================
  // HAS ANY PRODUCTS
  //
  // Dùng khi FORCE DELETE category.
  //
  // Kể cả product đã soft delete vẫn còn reference category_id.
  // Không được xóa vật lý category làm mất tính toàn vẹn dữ liệu.
  // ==========================================================

  static async hasAnyProducts(id) {
    const [[row]] = await pool.execute(
      `
        SELECT COUNT(*) AS total

        FROM products

        WHERE category_id = ?
      `,
      [id],
    );

    return Number(row.total || 0) > 0;
  }

  // ==========================================================
  // GET IMAGE
  // ==========================================================

  static async getImageForDelete(id) {
    const [rows] = await pool.execute(
      `
        SELECT image

        FROM categories

        WHERE id = ?

        LIMIT 1
      `,
      [id],
    );

    return rows[0] || null;
  }

  // ==========================================================
  // BULK TOGGLE STATUS
  // ==========================================================

  static async bulkToggleStatus(connection, ids) {
    const placeholders = ids.map(() => "?").join(",");

    const [result] = await connection.execute(
      `
        UPDATE categories

        SET status =
          CASE
            WHEN status = 1 THEN 0
            ELSE 1
          END

        WHERE id IN (${placeholders})
          AND deleted_at IS NULL
      `,
      ids,
    );

    return result.affectedRows;
  }

  // ==========================================================
  // CLIENT CATEGORIES
  // ==========================================================

  static async getClientCategories() {
    const [rows] = await pool.execute(
      `
        SELECT
          c.id,
          c.name,
          c.slug,
          c.description,
          c.image,

          COUNT(p.id) AS product_count

        FROM categories c

        LEFT JOIN products p
          ON p.category_id = c.id
          AND p.deleted_at IS NULL
          AND p.status = 1

        WHERE c.deleted_at IS NULL
          AND c.status = 1

        GROUP BY
          c.id,
          c.name,
          c.slug,
          c.description,
          c.image

        HAVING COUNT(p.id) > 0

        ORDER BY c.name ASC
      `,
    );

    return rows.map((category) => ({
      ...category,

      id: Number(category.id),

      product_count: Number(category.product_count || 0),
    }));
  }
}

module.exports = Category;
