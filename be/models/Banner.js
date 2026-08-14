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

const normalizeKeyword = (value = "") => {
  return String(value).toLowerCase().replace(/\s+/g, "");
};

const emptyToNull = (value) => {
  if (value === undefined || value === null) return null;

  const text = String(value).trim();

  return text === "" ? null : text;
};

const normalizePosition = (value = "HOME") => {
  const position = String(value || "HOME").toUpperCase();

  if (["HOME", "BLOG"].includes(position)) {
    return position;
  }

  return "HOME";
};

const normalizeOpacity = (value) => {
  if (value === undefined || value === null || value === "") return 0.65;

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) return 0.65;
  if (numberValue < 0) return 0;
  if (numberValue > 1) return 1;

  return numberValue;
};

const Banner = {
  async getAll({
    keyword = "",
    status = "",
    active = "",
    position = "",
    page = 1,
    limit = 10,
  }) {
    const where = ["deleted_at IS NULL"];
    const params = [];

    const normalizedKeyword = normalizeKeyword(keyword);

    if (normalizedKeyword) {
      where.push(`(
        REPLACE(LOWER(title), ' ', '') LIKE ?
        OR REPLACE(LOWER(subtitle), ' ', '') LIKE ?
        OR REPLACE(LOWER(description), ' ', '') LIKE ?
        OR REPLACE(LOWER(badge_text), ' ', '') LIKE ?
        OR REPLACE(LOWER(link_url), ' ', '') LIKE ?
        OR REPLACE(LOWER(primary_button_text), ' ', '') LIKE ?
        OR REPLACE(LOWER(secondary_button_text), ' ', '') LIKE ?
      )`);

      const key = `%${normalizedKeyword}%`;
      params.push(key, key, key, key, key, key, key);
    }

    if (status !== "") {
      where.push("status = ?");
      params.push(Number(status));
    }

    if (position) {
      where.push("position = ?");
      params.push(normalizePosition(position));
    }

    if (active === "1" || active === "true") {
      where.push("status = 1");
      where.push("(start_at IS NULL OR start_at <= NOW())");
      where.push("(end_at IS NULL OR end_at >= NOW())");
    }

    const pageNumber = Math.max(normalizeInt(page, 1), 1);
    const limitNumber = Math.max(normalizeInt(limit, 10), 1);
    const offset = (pageNumber - 1) * limitNumber;

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const data = await query(
      `SELECT *
       FROM banners
       ${whereSql}
       ORDER BY display_order ASC, id DESC
       LIMIT ? OFFSET ?`,
      [...params, limitNumber, offset]
    );

    const countRows = await query(
      `SELECT COUNT(*) AS total
       FROM banners
       ${whereSql}`,
      params
    );

    const total = countRows[0]?.total || 0;

    return {
      data,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages: Math.ceil(total / limitNumber),
      },
    };
  },

  async getActive(position = "") {
    const where = [
      "deleted_at IS NULL",
      "status = 1",
      "(start_at IS NULL OR start_at <= NOW())",
      "(end_at IS NULL OR end_at >= NOW())",
    ];

    const params = [];

    if (position) {
      where.push("position = ?");
      params.push(normalizePosition(position));
    }

    return query(
      `SELECT *
       FROM banners
       WHERE ${where.join(" AND ")}
       ORDER BY display_order ASC, id DESC`,
      params
    );
  },

  async getById(id) {
    const rows = await query(
      `SELECT *
       FROM banners
       WHERE id = ?
         AND deleted_at IS NULL
       LIMIT 1`,
      [id]
    );

    return rows[0] || null;
  },

  async create(data) {
    const result = await query(
      `INSERT INTO banners
        (
          position,
          title,
          subtitle,
          description,
          badge_text,
          image_url,
          link_url,
          primary_button_text,
          secondary_button_text,
          text_color,
          highlight_color,
          overlay_opacity,
          display_order,
          start_at,
          end_at,
          status
        )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        normalizePosition(data.position),
        data.title,
        emptyToNull(data.subtitle),
        emptyToNull(data.description),
        emptyToNull(data.badge_text),
        data.image_url,
        emptyToNull(data.link_url),
        emptyToNull(data.primary_button_text),
        emptyToNull(data.secondary_button_text),
        emptyToNull(data.text_color) || "#ffffff",
        emptyToNull(data.highlight_color) || "#38bdf8",
        normalizeOpacity(data.overlay_opacity),
        normalizeInt(data.display_order, 0),
        emptyToNull(data.start_at),
        emptyToNull(data.end_at),
        data.status === undefined ? 1 : Number(data.status),
      ]
    );

    return this.getById(result.insertId);
  },

  async update(id, data) {
    const fields = [];
    const params = [];

    const allowFields = [
      "position",
      "title",
      "subtitle",
      "description",
      "badge_text",
      "image_url",
      "link_url",
      "primary_button_text",
      "secondary_button_text",
      "text_color",
      "highlight_color",
      "overlay_opacity",
      "display_order",
      "start_at",
      "end_at",
      "status",
    ];

    allowFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(data, field)) {
        fields.push(`${field} = ?`);

        if (field === "position") {
          params.push(normalizePosition(data[field]));
        } else if (field === "display_order") {
          params.push(normalizeInt(data[field], 0));
        } else if (field === "status") {
          params.push(Number(data[field]));
        } else if (field === "overlay_opacity") {
          params.push(normalizeOpacity(data[field]));
        } else {
          params.push(emptyToNull(data[field]));
        }
      }
    });

    if (!fields.length) {
      return this.getById(id);
    }

    params.push(id);

    await query(
      `UPDATE banners
       SET ${fields.join(", ")}
       WHERE id = ?
         AND deleted_at IS NULL`,
      params
    );

    return this.getById(id);
  },

  async remove(id) {
    return query(
      `UPDATE banners
       SET deleted_at = NOW()
       WHERE id = ?
         AND deleted_at IS NULL`,
      [id]
    );
  },

  async updateSortOrder(items = []) {
    for (const item of items) {
      await query(
        `UPDATE banners
         SET display_order = ?
         WHERE id = ?
           AND deleted_at IS NULL`,
        [normalizeInt(item.display_order, 0), item.id]
      );
    }

    return true;
  },
};

module.exports = Banner;