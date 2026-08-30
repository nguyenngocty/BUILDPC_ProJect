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
    "Database connection không có hàm query hoặc execute",
  );
};

const normalizeInt = (
  value,
  defaultValue = 0,
) => {
  const parsed = Number.parseInt(value, 10);

  return Number.isNaN(parsed)
    ? defaultValue
    : parsed;
};

const Coupon = {
  async getAll({
    keyword = "",
    type = "",
    status = "",
    page = 1,
    limit = 10,
  }) {
    const where = ["1 = 1"];
    const params = [];

    if (keyword) {
      where.push("code LIKE ?");
      params.push(`%${keyword}%`);
    }

    if (type) {
      where.push("type = ?");
      params.push(type);
    }

    if (status !== "") {
      where.push("status = ?");
      params.push(Number(status));
    }

    const pageNumber = Math.max(
      normalizeInt(page, 1),
      1,
    );

    const limitNumber = Math.max(
      normalizeInt(limit, 10),
      1,
    );

    const offset =
      (pageNumber - 1) *
      limitNumber;

    const whereSql =
      `WHERE ${where.join(" AND ")}`;

    const data = await query(
      `SELECT *
       FROM coupons
       ${whereSql}
       ORDER BY id DESC
       LIMIT ? OFFSET ?`,
      [
        ...params,
        limitNumber,
        offset,
      ],
    );

    const countRows = await query(
      `SELECT COUNT(*) AS total
       FROM coupons
       ${whereSql}`,
      params,
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
          total / limitNumber,
        ),
      },
    };
  },

  async getAvailableCandidates() {
    return query(
      `SELECT *
       FROM coupons
       WHERE status = 1
         AND quantity > 0
         AND used_count < quantity
       ORDER BY
         min_order ASC,
         id DESC`,
    );
  },

  async getById(id) {
    const rows = await query(
      `SELECT *
       FROM coupons
       WHERE id = ?
       LIMIT 1`,
      [id],
    );

    return rows[0] || null;
  },

  async getByCode(code) {
    const rows = await query(
      `SELECT *
       FROM coupons
       WHERE code = ?
       LIMIT 1`,
      [code],
    );

    return rows[0] || null;
  },

  async create(data) {
    const result = await query(
      `INSERT INTO coupons
        (
          code,
          type,
          value,
          min_order,
          start_date,
          end_date,
          quantity,
          used_count,
          status
        )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.code,
        data.type,
        data.value,
        normalizeInt(
          data.min_order,
          0,
        ),
        data.start_date || null,
        data.end_date || null,
        normalizeInt(
          data.quantity,
          0,
        ),
        normalizeInt(
          data.used_count,
          0,
        ),
        data.status === undefined
          ? 1
          : Number(data.status),
      ],
    );

    return this.getById(
      result.insertId,
    );
  },

  async update(id, data) {
    const fields = [];
    const params = [];

    const allowFields = [
      "code",
      "type",
      "value",
      "min_order",
      "start_date",
      "end_date",
      "quantity",
      "used_count",
      "status",
    ];

    allowFields.forEach((field) => {
      if (
        Object.prototype.hasOwnProperty.call(
          data,
          field,
        )
      ) {
        fields.push(
          `${field} = ?`,
        );

        if (
          [
            "value",
            "min_order",
            "quantity",
            "used_count",
          ].includes(field)
        ) {
          params.push(
            normalizeInt(
              data[field],
              0,
            ),
          );
        } else if (
          [
            "start_date",
            "end_date",
          ].includes(field)
        ) {
          params.push(
            data[field] || null,
          );
        } else if (
          field === "status"
        ) {
          params.push(
            Number(data[field]),
          );
        } else {
          params.push(
            data[field],
          );
        }
      }
    });

    if (!fields.length) {
      return this.getById(id);
    }

    params.push(id);

    await query(
      `UPDATE coupons
       SET ${fields.join(", ")}
       WHERE id = ?`,
      params,
    );

    return this.getById(id);
  },

  async remove(id) {
    return query(
      `DELETE FROM coupons
       WHERE id = ?`,
      [id],
    );
  },
};

module.exports = Coupon;