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

  throw new Error("Database connection không có hàm query hoặc execute");
};

const normalizeInt = (value, defaultValue = 0) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
};

const PcPartType = {
  async getAll({ keyword = "", page = 1, limit = 20 } = {}) {
    const where = ["deleted_at IS NULL"];
    const params = [];

    if (keyword) {
      where.push("(type_code LIKE ? OR type_name LIKE ? OR description LIKE ?)");
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    const pageNumber = Math.max(normalizeInt(page, 1), 1);
    const limitNumber = Math.max(normalizeInt(limit, 20), 1);
    const offset = (pageNumber - 1) * limitNumber;
    const whereSql = `WHERE ${where.join(" AND ")}`;

    const data = await query(
      `SELECT * FROM pc_part_types
       ${whereSql}
       ORDER BY id DESC
       LIMIT ? OFFSET ?`,
      [...params, limitNumber, offset]
    );

    const countRows = await query(
      `SELECT COUNT(*) AS total FROM pc_part_types ${whereSql}`,
      params
    );

    return {
      data,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total: countRows[0]?.total || 0,
        totalPages: Math.ceil((countRows[0]?.total || 0) / limitNumber),
      },
    };
  },

  async getActive() {
    return query(
      `SELECT * FROM pc_part_types
       WHERE deleted_at IS NULL
       ORDER BY id DESC`
    );
  },

  async getById(id) {
    const rows = await query(
      `SELECT * FROM pc_part_types WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  async getByCode(typeCode) {
    const rows = await query(
      `SELECT * FROM pc_part_types WHERE type_code = ? AND deleted_at IS NULL LIMIT 1`,
      [typeCode]
    );
    return rows[0] || null;
  },

  async create(data) {
    const result = await query(
      `INSERT INTO pc_part_types (type_code, type_name, description)
       VALUES (?, ?, ?)`,
      [data.type_code, data.type_name, data.description || null]
    );

    return this.getById(result.insertId);
  },

  async update(id, data) {
    const fields = [];
    const params = [];

    ["type_code", "type_name", "description"].forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(data, field)) {
        fields.push(`${field} = ?`);
        params.push(data[field] || null);
      }
    });

    if (!fields.length) return this.getById(id);

    params.push(id);

    await query(
      `UPDATE pc_part_types SET ${fields.join(", ")} WHERE id = ? AND deleted_at IS NULL`,
      params
    );

    return this.getById(id);
  },

  async remove(id) {
    return query(
      `UPDATE pc_part_types SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL`,
      [id]
    );
  },
};

module.exports = PcPartType;