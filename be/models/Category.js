const { pool } = require("../config/database");

class Category {
  static async exists(id) {
    const [rows] = await pool.execute(
      `
            SELECT id
            FROM categories
            WHERE
                id=?
                AND deleted_at IS NULL
                AND status=1
            LIMIT 1
        `,
      [id],
    );

    return rows.length > 0;
  }

  static async getAll({
    page = 1,
    limit = 10,
    search = "",
    status = "",
    sort = "newest",
  }) {
    const offset = (page - 1) * limit;

    let where = "WHERE deleted_at IS NULL";

    const params = [];

    if (search) {
      where += " AND name LIKE ?";
      params.push(`%${search}%`);
    }

    if (status !== "") {
      where += " AND status = ?";
      params.push(status);
    }

    let orderBy = "ORDER BY id DESC";

    switch (sort) {
      case "oldest":
        orderBy = "ORDER BY id ASC";
        break;

      case "name_asc":
        orderBy = "ORDER BY name ASC";
        break;

      case "name_desc":
        orderBy = "ORDER BY name DESC";
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
      [...params, Number(limit), Number(offset)],
    );

    const [[count]] = await pool.execute(
      `
        SELECT COUNT(*) total
        FROM categories
        ${where}
`,
      params,
    );

    return {
      categories: rows,

      pagination: {
        page,

        limit,

        total: count.total,

        totalPages: Math.ceil(count.total / limit),
      },
    };
  }

  static async getById(id) {
    const [rows] = await pool.execute(
      `
        SELECT *
        FROM categories
        WHERE id=?
        AND deleted_at IS NULL
`,
      [id],
    );

    return rows[0];
  }

  static async getDeletedById(id) {
    const [rows] = await pool.execute(
      `
        SELECT *
        FROM categories
        WHERE id=?
`,
      [id],
    );

    return rows[0];
  }

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
        VALUES
        (
            ?,?,?,?,?
        )
`,
      [data.name, data.slug, data.description, data.image, data.status],
    );

    return result.insertId;
  }

  static async update(connection, id, data) {
    await connection.execute(
      `
        UPDATE categories
        SET

            name=?,

            slug=?,

            description=?,

            image=?,

            status=?

        WHERE id=?
`,
      [data.name, data.slug, data.description, data.image, data.status, id],
    );
  }
  static async softDelete(connection, id) {
    await connection.execute(
      `
        UPDATE categories

        SET deleted_at=NOW()

        WHERE id=?
`,
      [id],
    );
  }
  static async restore(connection, id) {
    await connection.execute(
      `
        UPDATE categories

        SET deleted_at=NULL

        WHERE id=?
`,
      [id],
    );
  }
  static async forceDelete(connection, id) {
    await connection.execute(
      `
        DELETE FROM categories

        WHERE id=?
`,
      [id],
    );
  }
  static async toggleStatus(connection, id) {
    await connection.execute(
      `
        UPDATE categories

        SET status =
            CASE
                WHEN status=1 THEN 0
                ELSE 1
            END

        WHERE id=?
`,
      [id],
    );
  }
  static async getStatistics() {
    const [[rows]] = await pool.execute(`
            SELECT

            COUNT(*) total,

            SUM(
            CASE
            WHEN deleted_at IS NULL THEN 1
            ELSE 0
            END
            ) active,

            SUM(
            CASE
            WHEN deleted_at IS NOT NULL THEN 1
            ELSE 0
            END
            ) trash

            FROM categories
            `);
    return {
      total: Number(rows.total),

      active: Number(rows.active),

      trash: Number(rows.trash),
    };
  }

  static async bulkDelete(connection, ids) {
    const placeholders = ids.map(() => "?").join(",");

    await connection.execute(
      `
        UPDATE categories
        SET deleted_at=NOW()
        WHERE id IN (${placeholders})
`,
      ids,
    );
  }

  static async bulkRestore(connection, ids) {
    const placeholders = ids.map(() => "?").join(",");

    await connection.execute(
      `
UPDATE categories
SET deleted_at=NULL
WHERE id IN (${placeholders})
`,
      ids,
    );
  }

  static async getTrash({
    page = 1,
    limit = 10,
    search = "",
    sort = "newest",
  }) {
    const offset = (page - 1) * limit;

    let where = "WHERE deleted_at IS NOT NULL";

    const params = [];

    if (search) {
      where += " AND name LIKE ?";
      params.push(`%${search}%`);
    }

    let orderBy = "ORDER BY deleted_at DESC";

    switch (sort) {
      case "oldest":
        orderBy = "ORDER BY deleted_at ASC";
        break;

      case "name_asc":
        orderBy = "ORDER BY name ASC";
        break;

      case "name_desc":
        orderBy = "ORDER BY name DESC";
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
      [...params, Number(limit), Number(offset)],
    );

    const [[count]] = await pool.execute(
      `
    SELECT COUNT(*) total
    FROM categories
    ${where}
    `,
      params,
    );

    return {
      categories: rows,

      pagination: {
        page,
        limit,
        total: Number(count.total),
        totalPages: Math.ceil(count.total / limit),
      },
    };
  }

  // Có sản phẩm
  static async hasProducts(id) {
    const [[row]] = await pool.execute(
      `
    SELECT COUNT(*) AS total
    FROM products
    WHERE
      category_id = ?
      AND deleted_at IS NULL
    `,
      [id],
    );

    return row.total > 0;
  }

  // lấy hình ảnh
  static async getImageForDelete(id) {
    const [rows] = await pool.execute(
      `
    SELECT image
    FROM categories
    WHERE id = ?
    `,
      [id],
    );

    return rows[0];
  }

  // Chuyển đổi trạng thái hàng loạt
  static async bulkToggleStatus(connection, ids) {
    const placeholders = ids.map(() => "?").join(",");

    await connection.execute(
      `
    UPDATE categories
    SET status =
      CASE
        WHEN status = 1 THEN 0
        ELSE 1
      END
    WHERE id IN (${placeholders})
    `,
      ids,
    );
  }

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

      WHERE
        c.deleted_at IS NULL
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
