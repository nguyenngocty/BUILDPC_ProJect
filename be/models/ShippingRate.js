const database = require("../config/database");

const db =
  database.pool ||
  database.db ||
  database.connection ||
  database.conn ||
  database;

// ============================================================
// DATABASE QUERY
// ============================================================

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

// ============================================================
// NORMALIZE
// ============================================================

const normalizeInt = (value, defaultValue = 0) => {
  const parsed = Number.parseInt(value, 10);

  return Number.isNaN(parsed) ? defaultValue : parsed;
};

const normalizeNullablePositiveInt = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return null;
  }

  return parsed;
};

const normalizeMoney = (value, defaultValue = 0) => {
  if (value === null || value === undefined || value === "") {
    return defaultValue;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? Math.max(parsed, 0) : defaultValue;
};

const normalizeProvinceCode = (value) => {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
};

const normalizeProvinceName = (value) => {
  return String(value || "")
    .trim()
    .slice(0, 150);
};

const normalizeStatus = (value, defaultValue = 1) => {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  return Number(value) === 1 ? 1 : 0;
};

// ============================================================
// NORMALIZE ROW
// ============================================================

const normalizeShippingRateRow = (row) => {
  if (!row) {
    return null;
  }

  return {
    ...row,

    id: Number(row.id),

    ghn_province_id:
      row.ghn_province_id !== null && row.ghn_province_id !== undefined
        ? Number(row.ghn_province_id)
        : null,

    shipping_fee: Number(row.shipping_fee || 0),

    free_shipping_min:
      row.free_shipping_min !== null && row.free_shipping_min !== undefined
        ? Number(row.free_shipping_min)
        : null,

    status: Number(row.status),
  };
};

// ============================================================
// SHIPPING RATE MODEL
// ============================================================

const ShippingRate = {
  // ==========================================================
  // ADMIN - GET ALL
  // ==========================================================

  async getAll({ keyword = "", status = "", page = 1, limit = 10 } = {}) {
    const where = ["sr.deleted_at IS NULL"];

    const params = [];

    // ========================================================
    // KEYWORD
    // ========================================================

    const normalizedKeyword = String(keyword || "").trim();

    if (normalizedKeyword) {
      where.push(`
        (
          sr.province_name LIKE ?
          OR sr.province_code LIKE ?
          OR CAST(
            sr.ghn_province_id AS CHAR
          ) LIKE ?
        )
      `);

      const key = `%${normalizedKeyword}%`;

      params.push(key, key, key);
    }

    // ========================================================
    // STATUS
    // ========================================================

    if (status !== "" && status !== null && status !== undefined) {
      const normalizedStatus = Number(status);

      if ([0, 1].includes(normalizedStatus)) {
        where.push("sr.status = ?");

        params.push(normalizedStatus);
      }
    }

    // ========================================================
    // PAGINATION
    // ========================================================

    const pageNumber = Math.max(normalizeInt(page, 1), 1);

    const limitNumber = Math.min(Math.max(normalizeInt(limit, 10), 1), 100);

    const offset = (pageNumber - 1) * limitNumber;

    const whereSql = `WHERE ${where.join(" AND ")}`;

    // ========================================================
    // DATA
    // ========================================================

    const rows = await query(
      `
        SELECT
          sr.id,

          sr.province_code,
          sr.province_name,

          sr.ghn_province_id,

          sr.shipping_fee,
          sr.free_shipping_min,

          sr.status,

          sr.created_at,
          sr.updated_at

        FROM shipping_rates sr

        ${whereSql}

        ORDER BY
          sr.province_name ASC,
          sr.id ASC

        LIMIT ?
        OFFSET ?
      `,
      [...params, limitNumber, offset],
    );

    // ========================================================
    // COUNT
    // ========================================================

    const countRows = await query(
      `
        SELECT
          COUNT(*) AS total

        FROM shipping_rates sr

        ${whereSql}
      `,
      params,
    );

    const total = Number(countRows[0]?.total || 0);

    const totalPages = total > 0 ? Math.ceil(total / limitNumber) : 0;

    return {
      data: rows.map(normalizeShippingRateRow),

      pagination: {
        page: pageNumber,

        limit: limitNumber,

        total,

        totalPages,

        hasPreviousPage: pageNumber > 1,

        hasNextPage: totalPages > 0 && pageNumber < totalPages,
      },
    };
  },

  // ==========================================================
  // GET BY ID
  // ==========================================================

  async getById(id) {
    const normalizedId = normalizeInt(id);

    if (normalizedId < 1) {
      return null;
    }

    const rows = await query(
      `
        SELECT
          id,

          province_code,
          province_name,

          ghn_province_id,

          shipping_fee,
          free_shipping_min,

          status,

          created_at,
          updated_at

        FROM shipping_rates

        WHERE
          id = ?
          AND deleted_at IS NULL

        LIMIT 1
      `,
      [normalizedId],
    );

    return normalizeShippingRateRow(rows[0] || null);
  },

  // ==========================================================
  // GET INCLUDING DELETED BY ID
  // ==========================================================

  async getByIdIncludingDeleted(id) {
    const normalizedId = normalizeInt(id);

    if (normalizedId < 1) {
      return null;
    }

    const rows = await query(
      `
        SELECT
          *

        FROM shipping_rates

        WHERE id = ?

        LIMIT 1
      `,
      [normalizedId],
    );

    if (!rows[0]) {
      return null;
    }

    return {
      ...normalizeShippingRateRow(rows[0]),

      deleted_at: rows[0].deleted_at,
    };
  },

  // ==========================================================
  // GET BY PROVINCE CODE
  // ==========================================================

  async getByProvinceCode(provinceCode) {
    const code = normalizeProvinceCode(provinceCode);

    if (!code) {
      return null;
    }

    const rows = await query(
      `
        SELECT
          id,

          province_code,
          province_name,

          ghn_province_id,

          shipping_fee,
          free_shipping_min,

          status,

          created_at,
          updated_at

        FROM shipping_rates

        WHERE
          province_code = ?
          AND deleted_at IS NULL

        LIMIT 1
      `,
      [code],
    );

    return normalizeShippingRateRow(rows[0] || null);
  },

  // ==========================================================
  // GET BY PROVINCE CODE INCLUDING DELETED
  // ==========================================================

  async getByProvinceCodeIncludingDeleted(provinceCode) {
    const code = normalizeProvinceCode(provinceCode);

    if (!code) {
      return null;
    }

    const rows = await query(
      `
        SELECT
          *

        FROM shipping_rates

        WHERE province_code = ?

        LIMIT 1
      `,
      [code],
    );

    if (!rows[0]) {
      return null;
    }

    return {
      ...normalizeShippingRateRow(rows[0]),

      deleted_at: rows[0].deleted_at,
    };
  },

  // ==========================================================
  // GET BY GHN PROVINCE ID
  // ==========================================================

  async getByGhnProvinceId(ghnProvinceId) {
    const normalizedId = normalizeNullablePositiveInt(ghnProvinceId);

    if (!normalizedId) {
      return null;
    }

    const rows = await query(
      `
        SELECT
          id,

          province_code,
          province_name,

          ghn_province_id,

          shipping_fee,
          free_shipping_min,

          status,

          created_at,
          updated_at

        FROM shipping_rates

        WHERE
          ghn_province_id = ?
          AND deleted_at IS NULL

        LIMIT 1
      `,
      [normalizedId],
    );

    return normalizeShippingRateRow(rows[0] || null);
  },

  // ==========================================================
  // GET BY GHN PROVINCE ID INCLUDING DELETED
  // ==========================================================

  async getByGhnProvinceIdIncludingDeleted(ghnProvinceId) {
    const normalizedId = normalizeNullablePositiveInt(ghnProvinceId);

    if (!normalizedId) {
      return null;
    }

    const rows = await query(
      `
        SELECT
          *

        FROM shipping_rates

        WHERE ghn_province_id = ?

        LIMIT 1
      `,
      [normalizedId],
    );

    if (!rows[0]) {
      return null;
    }

    return {
      ...normalizeShippingRateRow(rows[0]),

      deleted_at: rows[0].deleted_at,
    };
  },

  // ==========================================================
  // GET ACTIVE BY PROVINCE CODE
  // ==========================================================

  async getActiveByProvinceCode(provinceCode) {
    const code = normalizeProvinceCode(provinceCode);

    if (!code) {
      return null;
    }

    const rows = await query(
      `
        SELECT
          id,

          province_code,
          province_name,

          ghn_province_id,

          shipping_fee,
          free_shipping_min,

          status,

          created_at,
          updated_at

        FROM shipping_rates

        WHERE
          province_code = ?

          AND status = 1
          AND deleted_at IS NULL

        LIMIT 1
      `,
      [code],
    );

    return normalizeShippingRateRow(rows[0] || null);
  },

  // ==========================================================
  // GET ACTIVE BY GHN PROVINCE ID
  // ==========================================================

  async getActiveByGhnProvinceId(ghnProvinceId) {
    const normalizedId = normalizeNullablePositiveInt(ghnProvinceId);

    if (!normalizedId) {
      return null;
    }

    const rows = await query(
      `
        SELECT
          id,

          province_code,
          province_name,

          ghn_province_id,

          shipping_fee,
          free_shipping_min,

          status,

          created_at,
          updated_at

        FROM shipping_rates

        WHERE
          ghn_province_id = ?

          AND status = 1
          AND deleted_at IS NULL

        LIMIT 1
      `,
      [normalizedId],
    );

    return normalizeShippingRateRow(rows[0] || null);
  },

  // ==========================================================
  // CREATE
  // ==========================================================

  async create(data) {
    const provinceCode = normalizeProvinceCode(data.province_code);

    const provinceName = normalizeProvinceName(data.province_name);

    const ghnProvinceId = normalizeNullablePositiveInt(data.ghn_province_id);

    const shippingFee = normalizeMoney(data.shipping_fee, 0);

    const freeShippingMin =
      data.free_shipping_min === null ||
      data.free_shipping_min === undefined ||
      data.free_shipping_min === ""
        ? null
        : normalizeMoney(data.free_shipping_min, 0);

    const status = normalizeStatus(data.status, 1);

    const result = await query(
      `
          INSERT INTO shipping_rates
          (
            province_code,

            province_name,

            ghn_province_id,

            shipping_fee,

            free_shipping_min,

            status,

            created_at,

            updated_at
          )

          VALUES
          (
            ?,

            ?,

            ?,

            ?,

            ?,

            ?,

            NOW(),

            NOW()
          )
        `,
      [
        provinceCode,

        provinceName,

        ghnProvinceId,

        shippingFee,

        freeShippingMin,

        status,
      ],
    );

    return this.getById(result.insertId);
  },

  // ==========================================================
  // UPDATE
  // ==========================================================

  async update(id, data) {
    const normalizedId = normalizeInt(id);

    if (normalizedId < 1) {
      return null;
    }

    const fields = [];

    const params = [];

    // ========================================================
    // PROVINCE CODE
    // ========================================================

    if (Object.prototype.hasOwnProperty.call(data, "province_code")) {
      fields.push("province_code = ?");

      params.push(normalizeProvinceCode(data.province_code));
    }

    // ========================================================
    // PROVINCE NAME
    // ========================================================

    if (Object.prototype.hasOwnProperty.call(data, "province_name")) {
      fields.push("province_name = ?");

      params.push(normalizeProvinceName(data.province_name));
    }

    // ========================================================
    // GHN PROVINCE ID
    // ========================================================

    if (Object.prototype.hasOwnProperty.call(data, "ghn_province_id")) {
      fields.push("ghn_province_id = ?");

      params.push(normalizeNullablePositiveInt(data.ghn_province_id));
    }

    // ========================================================
    // SHIPPING FEE
    // ========================================================

    if (Object.prototype.hasOwnProperty.call(data, "shipping_fee")) {
      fields.push("shipping_fee = ?");

      params.push(normalizeMoney(data.shipping_fee, 0));
    }

    // ========================================================
    // FREE SHIPPING MIN
    // ========================================================

    if (Object.prototype.hasOwnProperty.call(data, "free_shipping_min")) {
      fields.push("free_shipping_min = ?");

      if (
        data.free_shipping_min === null ||
        data.free_shipping_min === undefined ||
        data.free_shipping_min === ""
      ) {
        params.push(null);
      } else {
        params.push(normalizeMoney(data.free_shipping_min, 0));
      }
    }

    // ========================================================
    // STATUS
    // ========================================================

    if (Object.prototype.hasOwnProperty.call(data, "status")) {
      fields.push("status = ?");

      params.push(normalizeStatus(data.status, 1));
    }

    // ========================================================
    // NOTHING TO UPDATE
    // ========================================================

    if (fields.length === 0) {
      return this.getById(normalizedId);
    }

    fields.push("updated_at = NOW()");

    params.push(normalizedId);

    const result = await query(
      `
          UPDATE shipping_rates

          SET
            ${fields.join(", ")}

          WHERE
            id = ?
            AND deleted_at IS NULL
        `,
      params,
    );

    if (Number(result.affectedRows || 0) === 0) {
      return this.getById(normalizedId);
    }

    return this.getById(normalizedId);
  },

  // ==========================================================
  // UPDATE STATUS
  // ==========================================================

  async updateStatus(id, status) {
    const normalizedId = normalizeInt(id);

    if (normalizedId < 1) {
      return null;
    }

    const normalizedStatus = normalizeStatus(status, 0);

    const result = await query(
      `
          UPDATE shipping_rates

          SET
            status = ?,

            updated_at = NOW()

          WHERE
            id = ?
            AND deleted_at IS NULL
        `,
      [normalizedStatus, normalizedId],
    );

    if (Number(result.affectedRows || 0) === 0) {
      return null;
    }

    return this.getById(normalizedId);
  },

  // ==========================================================
  // SOFT DELETE
  // ==========================================================

  async remove(id) {
    const normalizedId = normalizeInt(id);

    if (normalizedId < 1) {
      return false;
    }

    const result = await query(
      `
          UPDATE shipping_rates

          SET
            status = 0,

            deleted_at = NOW(),

            updated_at = NOW()

          WHERE
            id = ?
            AND deleted_at IS NULL
        `,
      [normalizedId],
    );

    return Number(result.affectedRows || 0) === 1;
  },

  // ==========================================================
  // RESTORE
  // ==========================================================

  async restore(id, { status = 1 } = {}) {
    const normalizedId = normalizeInt(id);

    if (normalizedId < 1) {
      return null;
    }

    await query(
      `
        UPDATE shipping_rates

        SET
          deleted_at = NULL,

          status = ?,

          updated_at = NOW()

        WHERE id = ?
      `,
      [normalizeStatus(status, 1), normalizedId],
    );

    return this.getById(normalizedId);
  },

  // ==========================================================
  // ACTIVE LIST
  //
  // Client Checkout dùng.
  // ==========================================================

  async getActiveList() {
    const rows = await query(
      `
          SELECT
            id,

            province_code,

            province_name,

            ghn_province_id,

            shipping_fee,

            free_shipping_min,

            status

          FROM shipping_rates

          WHERE
            status = 1
            AND deleted_at IS NULL

          ORDER BY
            province_name ASC,
            id ASC
        `,
    );

    return rows.map(normalizeShippingRateRow);
  },

  // ==========================================================
  // ACTIVE GHN MAPPED LIST
  //
  // Chỉ những tỉnh đã mapping GHN.
  // ==========================================================

  async getActiveGhnMappedList() {
    const rows = await query(
      `
          SELECT
            id,

            province_code,

            province_name,

            ghn_province_id,

            shipping_fee,

            free_shipping_min,

            status

          FROM shipping_rates

          WHERE
            status = 1

            AND deleted_at IS NULL

            AND ghn_province_id IS NOT NULL

          ORDER BY
            province_name ASC,
            id ASC
        `,
    );

    return rows.map(normalizeShippingRateRow);
  },

  // ==========================================================
  // COUNT GHN MAPPING
  //
  // Hữu ích cho Admin dashboard / validation.
  // ==========================================================

  async countMappingStatus() {
    const rows = await query(
      `
          SELECT
            COUNT(*) AS total,

            SUM(
              CASE
                WHEN ghn_province_id
                  IS NOT NULL
                THEN 1
                ELSE 0
              END
            ) AS mapped,

            SUM(
              CASE
                WHEN ghn_province_id
                  IS NULL
                THEN 1
                ELSE 0
              END
            ) AS unmapped,

            SUM(
              CASE
                WHEN
                  status = 1
                  AND ghn_province_id
                    IS NOT NULL
                THEN 1
                ELSE 0
              END
            ) AS active_mapped

          FROM shipping_rates

          WHERE deleted_at IS NULL
        `,
    );

    return {
      total: Number(rows[0]?.total || 0),

      mapped: Number(rows[0]?.mapped || 0),

      unmapped: Number(rows[0]?.unmapped || 0),

      active_mapped: Number(rows[0]?.active_mapped || 0),
    };
  },
};

module.exports = ShippingRate;
