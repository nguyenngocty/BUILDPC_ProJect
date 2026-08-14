const database = require("../config/database");

const db =
  database.pool ||
  database.db ||
  database.connection ||
  database.conn ||
  database;

const query = async (sql, params = []) => {
  if (typeof db.query === "function") {
    const result = await db.query(sql, params);
    return Array.isArray(result) ? result[0] : result;
  }

  if (typeof db.execute === "function") {
    const result = await db.execute(sql, params);
    return Array.isArray(result) ? result[0] : result;
  }

  throw new Error(
    "Database connection không có hàm query hoặc execute"
  );
};

const normalizeInt = (value, defaultValue = 0) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
};

const normalizeSpecifications = (value) => {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;

  if (typeof value === "string") {
    JSON.parse(value);
    return value;
  }

  return JSON.stringify(value);
};

const parseSpecifications = (value) => {
  if (!value) return {};

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return {};
  }
};

const PcPart = {
  async getAll({
    keyword = "",
    type_id = "",
    product_id = "",
    is_visible = "",
    page = 1,
    limit = 20,
  } = {}) {
    const where = ["pc_parts.deleted_at IS NULL"];
    const params = [];

    if (keyword) {
      where.push(
        "(products.name LIKE ? OR pc_part_types.type_name LIKE ? OR pc_part_types.type_code LIKE ?)"
      );

      params.push(
        `%${keyword}%`,
        `%${keyword}%`,
        `%${keyword}%`
      );
    }

    if (type_id !== "") {
      where.push("pc_parts.type_id = ?");
      params.push(Number(type_id));
    }

    if (product_id !== "") {
      where.push("pc_parts.product_id = ?");
      params.push(Number(product_id));
    }

    if (is_visible !== "") {
      where.push("pc_parts.is_visible = ?");
      params.push(Number(is_visible));
    }

    const pageNumber = Math.max(
      normalizeInt(page, 1),
      1
    );

    const limitNumber = Math.max(
      normalizeInt(limit, 20),
      1
    );

    const offset =
      (pageNumber - 1) * limitNumber;

    const whereSql =
      `WHERE ${where.join(" AND ")}`;

    const data = await query(
      `SELECT
         pc_parts.*,
         pc_part_types.type_code,
         pc_part_types.type_name,
         pc_part_types.description AS type_description,
         products.name AS product_name,
         products.sku AS product_sku,
         products.price AS product_price,
         products.sale_price AS product_sale_price,
         products.thumbnail AS product_thumbnail,
         products.status AS product_status
       FROM pc_parts
       INNER JOIN pc_part_types
         ON pc_part_types.id = pc_parts.type_id
         AND pc_part_types.deleted_at IS NULL
       INNER JOIN products
         ON products.id = pc_parts.product_id
         AND products.deleted_at IS NULL
       ${whereSql}
       ORDER BY pc_parts.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limitNumber, offset]
    );

    const countRows = await query(
      `SELECT COUNT(*) AS total
       FROM pc_parts
       INNER JOIN pc_part_types
         ON pc_part_types.id = pc_parts.type_id
         AND pc_part_types.deleted_at IS NULL
       INNER JOIN products
         ON products.id = pc_parts.product_id
         AND products.deleted_at IS NULL
       ${whereSql}`,
      params
    );

    const total =
      Number(countRows[0]?.total) || 0;

    return {
      data,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages: Math.ceil(
          total / limitNumber
        ),
      },
    };
  },

  async getVisibleByType(typeId) {
    const rows = await query(
      `SELECT
         pc_parts.*,
         pc_part_types.type_code,
         pc_part_types.type_name,
         pc_part_types.description AS type_description,
         products.name AS product_name,
         products.sku AS product_sku,
         products.price AS product_price,
         products.sale_price AS product_sale_price,
         products.quantity AS product_quantity,
         products.thumbnail AS product_thumbnail,
         products.status AS product_status
       FROM pc_parts
       INNER JOIN pc_part_types
         ON pc_part_types.id = pc_parts.type_id
         AND pc_part_types.deleted_at IS NULL
       INNER JOIN products
         ON products.id = pc_parts.product_id
         AND products.deleted_at IS NULL
       WHERE pc_parts.deleted_at IS NULL
         AND pc_parts.is_visible = 1
         AND pc_parts.type_id = ?
         AND products.status = 1
       ORDER BY pc_parts.id DESC`,
      [typeId]
    );

    return rows.map((row) => ({
      ...row,
      specifications: parseSpecifications(
        row.specifications
      ),
    }));
  },

  async getById(id) {
    const rows = await query(
      `SELECT
         pc_parts.*,
         pc_part_types.type_code,
         pc_part_types.type_name,
         pc_part_types.description AS type_description,
         products.name AS product_name,
         products.sku AS product_sku,
         products.price AS product_price,
         products.sale_price AS product_sale_price,
         products.thumbnail AS product_thumbnail,
         products.status AS product_status
       FROM pc_parts
       INNER JOIN pc_part_types
         ON pc_part_types.id = pc_parts.type_id
       INNER JOIN products
         ON products.id = pc_parts.product_id
       WHERE pc_parts.id = ?
         AND pc_parts.deleted_at IS NULL
       LIMIT 1`,
      [id]
    );

    return rows[0] || null;
  },

  async create(data) {
    const result = await query(
      `INSERT INTO pc_parts
       (
         type_id,
         product_id,
         specifications,
         is_visible
       )
       VALUES (?, ?, ?, ?)`,
      [
        data.type_id,
        data.product_id,
        data.specifications ?? null,
        data.is_visible === undefined
          ? 1
          : Number(data.is_visible),
      ]
    );

    return this.getById(
      result.insertId
    );
  },

  async update(id, data) {
    const fields = [];
    const params = [];

    [
      "type_id",
      "product_id",
      "specifications",
      "is_visible",
    ].forEach((field) => {
      if (
        Object.prototype.hasOwnProperty.call(
          data,
          field
        )
      ) {
        fields.push(`${field} = ?`);

        if (
          [
            "type_id",
            "product_id",
            "is_visible",
          ].includes(field)
        ) {
          params.push(
            normalizeInt(
              data[field],
              0
            )
          );
        } else {
          params.push(data[field]);
        }
      }
    });

    if (!fields.length) {
      return this.getById(id);
    }

    params.push(id);

    await query(
      `UPDATE pc_parts
       SET ${fields.join(", ")}
       WHERE id = ?
         AND deleted_at IS NULL`,
      params
    );

    return this.getById(id);
  },

  async remove(id) {
    return query(
      `UPDATE pc_parts
       SET deleted_at = NOW()
       WHERE id = ?
         AND deleted_at IS NULL`,
      [id]
    );
  },

  async existsType(typeId) {
    const rows = await query(
      `SELECT id
       FROM pc_part_types
       WHERE id = ?
         AND deleted_at IS NULL
       LIMIT 1`,
      [typeId]
    );

    return Boolean(rows[0]);
  },

  async existsProduct(productId) {
    const rows = await query(
      `SELECT id
       FROM products
       WHERE id = ?
         AND deleted_at IS NULL
       LIMIT 1`,
      [productId]
    );

    return Boolean(rows[0]);
  },
};

PcPart.normalizeSpecifications =
  normalizeSpecifications;

module.exports = PcPart;