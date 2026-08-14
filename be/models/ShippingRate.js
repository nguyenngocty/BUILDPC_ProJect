const database = require("../config/database");

const db =
  database.pool ||
  database.db ||
  database.connection ||
  database.conn ||
  database;

// ======================================================
// DATABASE QUERY
// ======================================================
const query = async (sql, params = []) => {
  if (typeof db.query === "function") {
    const result = await db.query(sql, params);

    return Array.isArray(result)
      ? result[0]
      : result;
  }

  if (typeof db.execute === "function") {
    const result = await db.execute(sql, params);

    return Array.isArray(result)
      ? result[0]
      : result;
  }

  throw new Error(
    "Database connection không có hàm query hoặc execute",
  );
};

// ======================================================
// NORMALIZE
// ======================================================
const normalizeInt = (
  value,
  defaultValue = 0,
) => {
  const parsed = Number.parseInt(value, 10);

  return Number.isNaN(parsed)
    ? defaultValue
    : parsed;
};

const normalizeMoney = (
  value,
  defaultValue = 0,
) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return defaultValue;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : defaultValue;
};

const normalizeProvinceCode = (value) => {
  return String(value || "")
    .trim()
    .toUpperCase();
};

// ======================================================
// SHIPPING RATE MODEL
// ======================================================
const ShippingRate = {
  // ====================================================
  // ADMIN - DANH SÁCH
  // ====================================================
  async getAll({
    keyword = "",
    status = "",
    page = 1,
    limit = 10,
  } = {}) {
    const where = [
      "deleted_at IS NULL",
    ];

    const params = [];

    // -----------------------------
    // SEARCH
    // -----------------------------
    if (keyword) {
      where.push(
        "(province_name LIKE ? OR province_code LIKE ?)",
      );

      params.push(
        `%${keyword}%`,
        `%${keyword}%`,
      );
    }

    // -----------------------------
    // STATUS
    // -----------------------------
    if (status !== "") {
      where.push("status = ?");

      params.push(Number(status));
    }

    // -----------------------------
    // PAGINATION
    // -----------------------------
    const pageNumber = Math.max(
      normalizeInt(page, 1),
      1,
    );

    const limitNumber = Math.max(
      normalizeInt(limit, 10),
      1,
    );

    const offset =
      (pageNumber - 1) * limitNumber;

    const whereSql = `WHERE ${where.join(
      " AND ",
    )}`;

    // -----------------------------
    // DATA
    // -----------------------------
    const data = await query(
      `
        SELECT
          id,
          province_code,
          province_name,
          shipping_fee,
          free_shipping_min,
          status,
          created_at,
          updated_at
        FROM shipping_rates

        ${whereSql}

        ORDER BY province_name ASC

        LIMIT ? OFFSET ?
      `,
      [
        ...params,
        limitNumber,
        offset,
      ],
    );

    // -----------------------------
    // COUNT
    // -----------------------------
    const countRows = await query(
      `
        SELECT COUNT(*) AS total

        FROM shipping_rates

        ${whereSql}
      `,
      params,
    );

    const total = Number(
      countRows[0]?.total || 0,
    );

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

  // ====================================================
  // GET BY ID
  // ====================================================
  async getById(id) {
    const rows = await query(
      `
        SELECT
          id,
          province_code,
          province_name,
          shipping_fee,
          free_shipping_min,
          status,
          created_at,
          updated_at

        FROM shipping_rates

        WHERE id = ?
          AND deleted_at IS NULL

        LIMIT 1
      `,
      [id],
    );

    return rows[0] || null;
  },

  // ====================================================
  // GET BY PROVINCE CODE
  // Dùng cho Client / Checkout
  // ====================================================
  async getByProvinceCode(
    provinceCode,
  ) {
    const code =
      normalizeProvinceCode(
        provinceCode,
      );

    if (!code) {
      return null;
    }

    const rows = await query(
      `
        SELECT
          id,
          province_code,
          province_name,
          shipping_fee,
          free_shipping_min,
          status,
          created_at,
          updated_at

        FROM shipping_rates

        WHERE province_code = ?
          AND deleted_at IS NULL

        LIMIT 1
      `,
      [code],
    );

    return rows[0] || null;
  },

  // ====================================================
  // GET ACTIVE BY PROVINCE CODE
  // Đây là hàm Checkout sẽ dùng về sau
  // ====================================================
  async getActiveByProvinceCode(
    provinceCode,
  ) {
    const code =
      normalizeProvinceCode(
        provinceCode,
      );

    if (!code) {
      return null;
    }

    const rows = await query(
      `
        SELECT
          id,
          province_code,
          province_name,
          shipping_fee,
          free_shipping_min,
          status,
          created_at,
          updated_at

        FROM shipping_rates

        WHERE province_code = ?
          AND status = 1
          AND deleted_at IS NULL

        LIMIT 1
      `,
      [code],
    );

    return rows[0] || null;
  },

  // ====================================================
  // KIỂM TRA CODE KỂ CẢ ĐÃ XÓA
  // Hữu ích vì province_code có UNIQUE
  // ====================================================
  async getByProvinceCodeIncludingDeleted(
    provinceCode,
  ) {
    const code =
      normalizeProvinceCode(
        provinceCode,
      );

    if (!code) {
      return null;
    }

    const rows = await query(
      `
        SELECT *

        FROM shipping_rates

        WHERE province_code = ?

        LIMIT 1
      `,
      [code],
    );

    return rows[0] || null;
  },

  // ====================================================
  // CREATE
  // ====================================================
  async create(data) {
    const provinceCode =
      normalizeProvinceCode(
        data.province_code,
      );

    const provinceName = String(
      data.province_name || "",
    ).trim();

    const shippingFee =
      normalizeMoney(
        data.shipping_fee,
        0,
      );

    const freeShippingMin =
      data.free_shipping_min === null ||
      data.free_shipping_min === undefined ||
      data.free_shipping_min === ""
        ? null
        : normalizeMoney(
            data.free_shipping_min,
            0,
          );

    const status =
      data.status === undefined
        ? 1
        : Number(data.status);

    const result = await query(
      `
        INSERT INTO shipping_rates
        (
          province_code,
          province_name,
          shipping_fee,
          free_shipping_min,
          status
        )

        VALUES (?, ?, ?, ?, ?)
      `,
      [
        provinceCode,
        provinceName,
        shippingFee,
        freeShippingMin,
        status,
      ],
    );

    return this.getById(
      result.insertId,
    );
  },

  // ====================================================
  // UPDATE
  // ====================================================
  async update(id, data) {
    const fields = [];
    const params = [];

    // -----------------------------
    // PROVINCE CODE
    // -----------------------------
    if (
      Object.prototype.hasOwnProperty.call(
        data,
        "province_code",
      )
    ) {
      fields.push(
        "province_code = ?",
      );

      params.push(
        normalizeProvinceCode(
          data.province_code,
        ),
      );
    }

    // -----------------------------
    // PROVINCE NAME
    // -----------------------------
    if (
      Object.prototype.hasOwnProperty.call(
        data,
        "province_name",
      )
    ) {
      fields.push(
        "province_name = ?",
      );

      params.push(
        String(
          data.province_name || "",
        ).trim(),
      );
    }

    // -----------------------------
    // SHIPPING FEE
    // -----------------------------
    if (
      Object.prototype.hasOwnProperty.call(
        data,
        "shipping_fee",
      )
    ) {
      fields.push(
        "shipping_fee = ?",
      );

      params.push(
        normalizeMoney(
          data.shipping_fee,
          0,
        ),
      );
    }

    // -----------------------------
    // FREE SHIPPING MIN
    // -----------------------------
    if (
      Object.prototype.hasOwnProperty.call(
        data,
        "free_shipping_min",
      )
    ) {
      fields.push(
        "free_shipping_min = ?",
      );

      if (
        data.free_shipping_min === null ||
        data.free_shipping_min === undefined ||
        data.free_shipping_min === ""
      ) {
        params.push(null);
      } else {
        params.push(
          normalizeMoney(
            data.free_shipping_min,
            0,
          ),
        );
      }
    }

    // -----------------------------
    // STATUS
    // -----------------------------
    if (
      Object.prototype.hasOwnProperty.call(
        data,
        "status",
      )
    ) {
      fields.push("status = ?");

      params.push(
        Number(data.status),
      );
    }

    // Không có field nào cần update
    if (!fields.length) {
      return this.getById(id);
    }

    params.push(id);

    await query(
      `
        UPDATE shipping_rates

        SET ${fields.join(", ")}

        WHERE id = ?
          AND deleted_at IS NULL
      `,
      params,
    );

    return this.getById(id);
  },

  // ====================================================
  // UPDATE STATUS
  // ====================================================
  async updateStatus(
    id,
    status,
  ) {
    await query(
      `
        UPDATE shipping_rates

        SET status = ?

        WHERE id = ?
          AND deleted_at IS NULL
      `,
      [
        Number(status),
        id,
      ],
    );

    return this.getById(id);
  },

  // ====================================================
  // SOFT DELETE
  // ====================================================
  async remove(id) {
    return query(
      `
        UPDATE shipping_rates

        SET
          deleted_at = CURRENT_TIMESTAMP,
          status = 0

        WHERE id = ?
          AND deleted_at IS NULL
      `,
      [id],
    );
  },

  // ====================================================
  // RESTORE
  // Có sẵn để sau này cần thì dùng
  // ====================================================
  async restore(id) {
    await query(
      `
        UPDATE shipping_rates

        SET
          deleted_at = NULL,
          status = 1

        WHERE id = ?
      `,
      [id],
    );

    return this.getById(id);
  },

  // ====================================================
  // ACTIVE LIST
  // Client có thể dùng để hiển thị danh sách tỉnh
  // ====================================================
  async getActiveList() {
    return query(
      `
        SELECT
          id,
          province_code,
          province_name,
          shipping_fee,
          free_shipping_min

        FROM shipping_rates

        WHERE status = 1
          AND deleted_at IS NULL

        ORDER BY province_name ASC
      `,
    );
  },
};

module.exports = ShippingRate;