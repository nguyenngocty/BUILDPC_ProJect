const database = require("../config/database");

const db =
  database.pool ||
  database.db ||
  database.connection ||
  database.conn ||
  database;

// ============================================================
// QUERY HELPER
// ============================================================

const query = async (sql, params = [], connection = null) => {
  const executor = connection || db;

  if (typeof executor.query === "function") {
    const result = await executor.query(sql, params);
    return Array.isArray(result) ? result[0] : result;
  }

  if (typeof executor.execute === "function") {
    const result = await executor.execute(sql, params);
    return Array.isArray(result) ? result[0] : result;
  }

  throw new Error("Database connection không có hàm query hoặc execute");
};

// ============================================================
// NORMALIZE HELPERS
// ============================================================

const normalizeInt = (value, defaultValue = 0) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
};

const normalizePositiveIntFilter = (value) => {
  if (
    value === undefined ||
    value === null ||
    value === "" ||
    value === "null" ||
    value === "undefined"
  ) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};

const normalizeBooleanFilter = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (value === 1 || value === "1" || value === true || value === "true") {
    return 1;
  }

  if (value === 0 || value === "0" || value === false || value === "false") {
    return 0;
  }

  return null;
};

// ============================================================
// SPECIFICATIONS
// ============================================================

const normalizeSpecifications = (value) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  if (typeof value === "string") {
    JSON.parse(value);
    return value;
  }

  return JSON.stringify(value);
};

const parseSpecifications = (value) => {
  if (!value) {
    return {};
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return {};
  }
};

// ============================================================
// PRICE
// ============================================================

const getEffectivePrice = ({
  product_price,
  product_sale_price,
  variant_price,
  variant_sale_price,
  variant_id,
}) => {
  const hasVariant = Boolean(variant_id);

  let price = hasVariant
    ? Number(variant_price || 0)
    : Number(product_price || 0);

  let salePrice = hasVariant
    ? Number(variant_sale_price || 0)
    : Number(product_sale_price || 0);

  if (hasVariant && price <= 0) {
    price = Number(product_price || 0);
    salePrice = Number(product_sale_price || 0);
  }

  if (Number.isFinite(salePrice) && salePrice > 0 && salePrice < price) {
    return salePrice;
  }

  return Number.isFinite(price) ? price : 0;
};

// ============================================================
// NORMALIZE ROW
// ============================================================

const normalizePartRow = (row) => {
  if (!row) {
    return null;
  }

  const specifications = parseSpecifications(row.specifications);

  const hasVariant = row.variant_id !== null && row.variant_id !== undefined;

  const effectivePrice = getEffectivePrice(row);

  const stockQuantity = hasVariant
    ? Number(row.variant_quantity || 0)
    : Number(row.product_quantity || 0);

  const sku = hasVariant ? row.variant_sku || row.product_sku : row.product_sku;

  const displayName =
    hasVariant && row.variant_name
      ? `${row.product_name} - ${row.variant_name}`
      : row.product_name;

  const thumbnail = hasVariant
    ? row.variant_thumbnail || row.product_thumbnail
    : row.product_thumbnail;

  return {
    ...row,

    specifications,

    effective_price: effectivePrice,

    stock_quantity: Number.isFinite(stockQuantity) ? stockQuantity : 0,

    display_name: displayName,
    display_sku: sku,
    display_thumbnail: thumbnail,

    has_variant: hasVariant,
  };
};

// ============================================================
// BASE SELECT
// ============================================================

const BASE_SELECT = `
  SELECT
    pp.id,
    pp.type_id,
    pp.product_id,
    pp.variant_id,
    pp.specifications,
    pp.is_visible,
    pp.created_at,
    pp.updated_at,
    pp.deleted_at,

    ppt.type_code,
    ppt.type_name,
    ppt.description AS type_description,

    p.name AS product_name,
    p.sku AS product_sku,
    p.price AS product_price,
    p.sale_price AS product_sale_price,
    p.quantity AS product_quantity,
    p.thumbnail AS product_thumbnail,
    p.status AS product_status,
    p.socket AS product_socket,
    p.ram_type AS product_ram_type,

    pv.id AS variant_record_id,
    pv.sku AS variant_sku,
    pv.variant_name,
    pv.price AS variant_price,
    pv.sale_price AS variant_sale_price,
    pv.quantity AS variant_quantity,
    pv.thumbnail AS variant_thumbnail,
    pv.status AS variant_status,
    pv.is_default AS variant_is_default

  FROM pc_parts pp

  INNER JOIN pc_part_types ppt
    ON ppt.id = pp.type_id

  INNER JOIN products p
    ON p.id = pp.product_id

  LEFT JOIN product_variants pv
    ON pv.id = pp.variant_id
    AND pv.deleted_at IS NULL
`;

// ============================================================
// MODEL
// ============================================================

const PcPart = {
  // ==========================================================
  // GET ALL
  // ==========================================================

  async getAll({
    keyword = "",
    type_id = "",
    type_code = "",
    product_id = "",
    variant_id = "",
    is_visible = "",
    product_status = "",
    in_stock = "",
    page = 1,
    limit = 20,
  } = {}) {
    const where = [
      "pp.deleted_at IS NULL",
      "ppt.deleted_at IS NULL",
      "p.deleted_at IS NULL",
    ];

    const params = [];

    // --------------------------------------------------------
    // KEYWORD
    // --------------------------------------------------------

    if (String(keyword || "").trim()) {
      const keywordValue = `%${String(keyword).trim()}%`;

      where.push(`
        (
          p.name LIKE ?
          OR p.sku LIKE ?
          OR pv.sku LIKE ?
          OR pv.variant_name LIKE ?
          OR ppt.type_name LIKE ?
          OR ppt.type_code LIKE ?
        )
      `);

      params.push(
        keywordValue,
        keywordValue,
        keywordValue,
        keywordValue,
        keywordValue,
        keywordValue,
      );
    }

    // --------------------------------------------------------
    // TYPE ID
    // --------------------------------------------------------

    const normalizedTypeId = normalizePositiveIntFilter(type_id);

    if (normalizedTypeId !== null) {
      where.push("pp.type_id = ?");
      params.push(normalizedTypeId);
    }

    // --------------------------------------------------------
    // TYPE CODE
    // --------------------------------------------------------

    if (String(type_code || "").trim()) {
      where.push("UPPER(ppt.type_code) = UPPER(?)");

      params.push(String(type_code).trim());
    }

    // --------------------------------------------------------
    // PRODUCT ID
    // --------------------------------------------------------

    const normalizedProductId = normalizePositiveIntFilter(product_id);

    if (normalizedProductId !== null) {
      where.push("pp.product_id = ?");
      params.push(normalizedProductId);
    }

    // --------------------------------------------------------
    // VARIANT ID
    // --------------------------------------------------------

    const normalizedVariantId = normalizePositiveIntFilter(variant_id);

    if (normalizedVariantId !== null) {
      where.push("pp.variant_id = ?");
      params.push(normalizedVariantId);
    }

    // --------------------------------------------------------
    // VISIBILITY
    // --------------------------------------------------------

    const normalizedVisible = normalizeBooleanFilter(is_visible);

    if (normalizedVisible !== null) {
      where.push("pp.is_visible = ?");
      params.push(normalizedVisible);
    }

    // --------------------------------------------------------
    // PRODUCT STATUS
    // --------------------------------------------------------

    const normalizedProductStatus = normalizeBooleanFilter(product_status);

    if (normalizedProductStatus !== null) {
      where.push("p.status = ?");
      params.push(normalizedProductStatus);
    }

    // --------------------------------------------------------
    // STOCK
    // --------------------------------------------------------

    const normalizedInStock = normalizeBooleanFilter(in_stock);

    if (normalizedInStock === 1) {
      where.push(`
        (
          (
            pp.variant_id IS NULL
            AND p.quantity > 0
          )
          OR
          (
            pp.variant_id IS NOT NULL
            AND pv.id IS NOT NULL
            AND pv.quantity > 0
          )
        )
      `);
    }

    if (normalizedInStock === 0) {
      where.push(`
        (
          (
            pp.variant_id IS NULL
            AND p.quantity <= 0
          )
          OR
          (
            pp.variant_id IS NOT NULL
            AND (
              pv.id IS NULL
              OR pv.quantity <= 0
            )
          )
        )
      `);
    }

    // --------------------------------------------------------
    // PAGINATION
    // --------------------------------------------------------

    const pageNumber = Math.max(normalizeInt(page, 1), 1);

    const limitNumber = Math.min(Math.max(normalizeInt(limit, 20), 1), 100);

    const offset = (pageNumber - 1) * limitNumber;

    const whereSql = `WHERE ${where.join(" AND ")}`;

    const rows = await query(
      `
        ${BASE_SELECT}

        ${whereSql}

        ORDER BY
          ppt.id ASC,
          pp.id DESC

        LIMIT ? OFFSET ?
      `,
      [...params, limitNumber, offset],
    );

    const countRows = await query(
      `
        SELECT COUNT(*) AS total

        FROM pc_parts pp

        INNER JOIN pc_part_types ppt
          ON ppt.id = pp.type_id

        INNER JOIN products p
          ON p.id = pp.product_id

        LEFT JOIN product_variants pv
          ON pv.id = pp.variant_id
          AND pv.deleted_at IS NULL

        ${whereSql}
      `,
      params,
    );

    const total = Number(countRows[0]?.total || 0);

    return {
      data: rows.map(normalizePartRow),

      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages: Math.ceil(total / limitNumber),
      },
    };
  },

  // ==========================================================
  // GET VISIBLE BY TYPE
  // ==========================================================

  async getVisibleByType(typeId) {
    const normalizedTypeId = normalizePositiveIntFilter(typeId);

    if (normalizedTypeId === null) {
      return [];
    }

    const rows = await query(
      `
        ${BASE_SELECT}

        WHERE pp.deleted_at IS NULL
          AND ppt.deleted_at IS NULL
          AND p.deleted_at IS NULL
          AND pp.is_visible = 1
          AND pp.type_id = ?

        ORDER BY pp.id DESC
      `,
      [normalizedTypeId],
    );

    return rows.map(normalizePartRow);
  },

  // ==========================================================
  // GET VISIBLE BY TYPE CODE
  // ==========================================================

  async getVisibleByTypeCode(typeCode) {
    if (!String(typeCode || "").trim()) {
      return [];
    }

    const rows = await query(
      `
        ${BASE_SELECT}

        WHERE pp.deleted_at IS NULL
          AND ppt.deleted_at IS NULL
          AND p.deleted_at IS NULL
          AND pp.is_visible = 1
          AND UPPER(ppt.type_code) = UPPER(?)

        ORDER BY pp.id DESC
      `,
      [String(typeCode).trim()],
    );

    return rows.map(normalizePartRow);
  },

  // ==========================================================
  // GET BY ID
  // ==========================================================

  async getById(id) {
    const normalizedId = normalizePositiveIntFilter(id);

    if (normalizedId === null) {
      return null;
    }

    const rows = await query(
      `
        ${BASE_SELECT}

        WHERE pp.id = ?
          AND pp.deleted_at IS NULL

        LIMIT 1
      `,
      [normalizedId],
    );

    return normalizePartRow(rows[0] || null);
  },

  // ==========================================================
  // GET INCLUDING DELETED
  // ==========================================================

  async getByIdIncludeDeleted(id) {
    const normalizedId = normalizePositiveIntFilter(id);

    if (normalizedId === null) {
      return null;
    }

    const rows = await query(
      `
        ${BASE_SELECT}

        WHERE pp.id = ?

        LIMIT 1
      `,
      [normalizedId],
    );

    return normalizePartRow(rows[0] || null);
  },

  // ==========================================================
  // CREATE
  // ==========================================================

  async create(data) {
    const variantId =
      data.variant_id === undefined ||
      data.variant_id === null ||
      data.variant_id === ""
        ? null
        : normalizePositiveIntFilter(data.variant_id);

    const specifications = normalizeSpecifications(data.specifications);

    const result = await query(
      `
        INSERT INTO pc_parts
        (
          type_id,
          product_id,
          variant_id,
          specifications,
          is_visible
        )
        VALUES (?, ?, ?, ?, ?)
      `,
      [
        Number(data.type_id),
        Number(data.product_id),
        variantId,
        specifications ?? null,
        data.is_visible === undefined ? 1 : Number(data.is_visible),
      ],
    );

    return this.getById(result.insertId);
  },

  // ==========================================================
  // UPDATE
  // ==========================================================

  async update(id, data) {
    const fields = [];
    const params = [];

    if (Object.prototype.hasOwnProperty.call(data, "type_id")) {
      fields.push("type_id = ?");
      params.push(Number(data.type_id));
    }

    if (Object.prototype.hasOwnProperty.call(data, "product_id")) {
      fields.push("product_id = ?");
      params.push(Number(data.product_id));
    }

    if (Object.prototype.hasOwnProperty.call(data, "variant_id")) {
      fields.push("variant_id = ?");

      const variantId =
        data.variant_id === null || data.variant_id === ""
          ? null
          : normalizePositiveIntFilter(data.variant_id);

      params.push(variantId);
    }

    if (Object.prototype.hasOwnProperty.call(data, "specifications")) {
      fields.push("specifications = ?");

      params.push(normalizeSpecifications(data.specifications));
    }

    if (Object.prototype.hasOwnProperty.call(data, "is_visible")) {
      fields.push("is_visible = ?");
      params.push(Number(data.is_visible));
    }

    if (!fields.length) {
      return this.getById(id);
    }

    params.push(Number(id));

    await query(
      `
        UPDATE pc_parts

        SET ${fields.join(", ")}

        WHERE id = ?
          AND deleted_at IS NULL
      `,
      params,
    );

    return this.getById(id);
  },

  // ==========================================================
  // SET VISIBILITY
  // ==========================================================

  async setVisibility(id, isVisible) {
    const result = await query(
      `
        UPDATE pc_parts

        SET is_visible = ?

        WHERE id = ?
          AND deleted_at IS NULL
      `,
      [Number(isVisible), Number(id)],
    );

    if (!result.affectedRows) {
      return null;
    }

    return this.getById(id);
  },

  // ==========================================================
  // SOFT DELETE
  // ==========================================================

  async remove(id) {
    const result = await query(
      `
        UPDATE pc_parts

        SET
          deleted_at = NOW(),
          is_visible = 0

        WHERE id = ?
          AND deleted_at IS NULL
      `,
      [Number(id)],
    );

    return result.affectedRows > 0;
  },

  // ==========================================================
  // RESTORE
  // ==========================================================

  async restore(id) {
    const result = await query(
      `
        UPDATE pc_parts

        SET
          deleted_at = NULL,
          is_visible = 1

        WHERE id = ?
          AND deleted_at IS NOT NULL
      `,
      [Number(id)],
    );

    if (!result.affectedRows) {
      return null;
    }

    return this.getById(id);
  },

  // ==========================================================
  // EXISTS TYPE
  // ==========================================================

  async existsType(typeId) {
    const normalizedId = normalizePositiveIntFilter(typeId);

    if (normalizedId === null) {
      return false;
    }

    const rows = await query(
      `
        SELECT id
        FROM pc_part_types

        WHERE id = ?
          AND deleted_at IS NULL

        LIMIT 1
      `,
      [normalizedId],
    );

    return Boolean(rows[0]);
  },

  // ==========================================================
  // EXISTS PRODUCT
  // ==========================================================

  async existsProduct(productId) {
    const normalizedId = normalizePositiveIntFilter(productId);

    if (normalizedId === null) {
      return false;
    }

    const rows = await query(
      `
        SELECT id
        FROM products

        WHERE id = ?
          AND deleted_at IS NULL

        LIMIT 1
      `,
      [normalizedId],
    );

    return Boolean(rows[0]);
  },

  // ==========================================================
  // GET VARIANT
  // ==========================================================

  async getVariant(variantId) {
    const normalizedId = normalizePositiveIntFilter(variantId);

    if (normalizedId === null) {
      return null;
    }

    const rows = await query(
      `
        SELECT *
        FROM product_variants

        WHERE id = ?
          AND deleted_at IS NULL

        LIMIT 1
      `,
      [normalizedId],
    );

    return rows[0] || null;
  },

  // ==========================================================
  // VARIANT BELONGS TO PRODUCT
  // ==========================================================

  async variantBelongsToProduct(variantId, productId) {
    if (!variantId) {
      return true;
    }

    const normalizedVariantId = normalizePositiveIntFilter(variantId);

    const normalizedProductId = normalizePositiveIntFilter(productId);

    if (normalizedVariantId === null || normalizedProductId === null) {
      return false;
    }

    const rows = await query(
      `
        SELECT id
        FROM product_variants

        WHERE id = ?
          AND product_id = ?
          AND deleted_at IS NULL

        LIMIT 1
      `,
      [normalizedVariantId, normalizedProductId],
    );

    return Boolean(rows[0]);
  },

  // ==========================================================
  // DUPLICATE MAPPING
  // ==========================================================

  async findDuplicate({
    type_id,
    product_id,
    variant_id = null,
    exclude_id = null,
  }) {
    const normalizedTypeId = normalizePositiveIntFilter(type_id);

    const normalizedProductId = normalizePositiveIntFilter(product_id);

    if (normalizedTypeId === null || normalizedProductId === null) {
      return null;
    }

    const where = ["type_id = ?", "product_id = ?", "deleted_at IS NULL"];

    const params = [normalizedTypeId, normalizedProductId];

    const normalizedVariantId = normalizePositiveIntFilter(variant_id);

    if (normalizedVariantId === null) {
      where.push("variant_id IS NULL");
    } else {
      where.push("variant_id = ?");
      params.push(normalizedVariantId);
    }

    const normalizedExcludeId = normalizePositiveIntFilter(exclude_id);

    if (normalizedExcludeId !== null) {
      where.push("id <> ?");
      params.push(normalizedExcludeId);
    }

    const rows = await query(
      `
        SELECT id
        FROM pc_parts

        WHERE ${where.join(" AND ")}

        LIMIT 1
      `,
      params,
    );

    return rows[0] || null;
  },
};

PcPart.normalizeSpecifications = normalizeSpecifications;

PcPart.parseSpecifications = parseSpecifications;

PcPart.normalizePartRow = normalizePartRow;

module.exports = PcPart;
