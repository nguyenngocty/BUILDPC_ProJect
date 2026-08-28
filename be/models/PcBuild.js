const database = require("../config/database");

const pool =
  database.pool ||
  database.db ||
  database.connection ||
  database.conn ||
  database;

// ============================================================
// HELPERS
// ============================================================

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

const normalizeInt = (value, defaultValue = 0) => {
  const parsed = Number.parseInt(value, 10);

  return Number.isNaN(parsed) ? defaultValue : parsed;
};

const normalizeStatus = (value, defaultValue = 1) => {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  if (
    value === true ||
    value === 1 ||
    value === "1" ||
    String(value).toLowerCase() === "active"
  ) {
    return 1;
  }

  return 0;
};

const parsePowerValue = (value) => {
  if (value === undefined || value === null || value === "") {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const normalized = String(value).trim().toUpperCase().replace(",", ".");

  const match = normalized.match(/(\d+(?:\.\d+)?)/);

  if (!match) {
    return 0;
  }

  const parsed = Number(match[1]);

  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeCompatibilityList = (value) => {
  if (value === undefined || value === null || value === "") {
    return [];
  }

  const values = Array.isArray(value)
    ? value
    : String(value)
        .split(/[,;/|]+/)
        .map((item) => item.trim());

  return [
    ...new Set(
      values
        .map((item) =>
          String(item || "")
            .trim()
            .toUpperCase(),
        )
        .filter(Boolean),
    ),
  ];
};

const createBusinessError = (message, statusCode = 400, details = null) => {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.status = statusCode;

  if (details) {
    error.details = details;
  }

  return error;
};

const getEffectivePrice = ({
  product_price,
  product_sale_price,
  variant_price,
  variant_sale_price,
  variant_id,
}) => {
  const hasVariant = variant_id !== null && variant_id !== undefined;

  let basePrice = hasVariant
    ? Number(variant_price || 0)
    : Number(product_price || 0);

  let salePrice = hasVariant
    ? Number(variant_sale_price || 0)
    : Number(product_sale_price || 0);

  // Variant không có giá riêng thì fallback về Product
  if (hasVariant && basePrice <= 0) {
    basePrice = Number(product_price || 0);

    salePrice = Number(product_sale_price || 0);
  }

  if (salePrice > 0 && salePrice < basePrice) {
    return salePrice;
  }

  return basePrice;
};

const normalizeRequestedItem = (item = {}) => {
  const partId = normalizeInt(item.part_id ?? item.pc_part_id ?? item.id, 0);

  const rawQuantity =
    item.quantity === undefined ||
    item.quantity === null ||
    item.quantity === ""
      ? 1
      : normalizeInt(item.quantity, 0);

  return {
    part_id: partId,
    quantity: rawQuantity,
  };
};

// ============================================================
// MODEL
// ============================================================

class PcBuild {
  // ==========================================================
  // GET CURRENT ITEMS OF BUILD
  // ==========================================================

  static async getItemsByBuildId(buildId, connection = pool) {
    const [rows] = await connection.query(
      `
          SELECT
            pbi.id AS build_item_id,

            pbi.build_id,
            pbi.part_id,
            pbi.product_id,
            pbi.variant_id,

            pbi.quantity,
            pbi.price,
            pbi.total_price,

            pbi.deleted_at,
            pbi.replaced_at,

            pp.specifications,
            pp.is_visible,

            ppt.id AS type_id,
            ppt.type_code,
            ppt.type_name,

            p.name AS product_name,
            p.sku AS product_sku,
            p.price AS product_price,
            p.sale_price AS product_sale_price,
            p.quantity AS product_quantity,
            p.thumbnail AS product_thumbnail,
            p.socket AS product_socket,
            p.ram_type AS product_ram_type,

            pv.id AS variant_record_id,
            pv.sku AS variant_sku,
            pv.variant_name,
            pv.price AS variant_price,
            pv.sale_price AS variant_sale_price,
            pv.quantity AS variant_quantity,
            pv.thumbnail AS variant_thumbnail

          FROM pc_build_items pbi

          INNER JOIN pc_parts pp
            ON pp.id = pbi.part_id

          INNER JOIN pc_part_types ppt
            ON ppt.id = pp.type_id

          INNER JOIN products p
            ON p.id = pbi.product_id

          LEFT JOIN product_variants pv
            ON pv.id = pbi.variant_id
            AND pv.deleted_at IS NULL

          WHERE pbi.build_id = ?
            AND pbi.deleted_at IS NULL
            AND pbi.replaced_at IS NULL

          ORDER BY
            ppt.id ASC,
            pbi.id ASC
        `,
      [buildId],
    );

    return rows.map((row) => {
      const hasVariant =
        row.variant_id !== null && row.variant_id !== undefined;

      const currentPrice = getEffectivePrice(row);

      const stockQuantity = hasVariant
        ? Number(row.variant_quantity || 0)
        : Number(row.product_quantity || 0);

      const displayName =
        hasVariant && row.variant_name
          ? `${row.product_name} - ${row.variant_name}`
          : row.product_name;

      const displaySku = hasVariant
        ? row.variant_sku || row.product_sku
        : row.product_sku;

      const image = hasVariant
        ? row.variant_thumbnail || row.product_thumbnail
        : row.product_thumbnail;

      return {
        // Giữ tương thích FE cũ
        id: row.part_id,

        build_item_id: row.build_item_id,

        build_id: row.build_id,

        part_id: row.part_id,

        product_id: row.product_id,

        variant_id: row.variant_id,

        type_id: row.type_id,

        type_code: row.type_code,

        type_name: row.type_name,

        category: String(row.type_code || "").toLowerCase(),

        category_key: String(row.type_code || "").toLowerCase(),

        name: displayName,

        sku: displaySku,

        image,

        quantity: Number(row.quantity || 1),

        // Snapshot giá khi Build được lưu
        price: Number(row.price || 0),

        total_price: Number(row.total_price || 0),

        // Giá hiện tại của product / variant
        current_price: currentPrice,

        stock_quantity: stockQuantity,

        specifications: parseSpecifications(row.specifications),

        product_socket: row.product_socket,

        product_ram_type: row.product_ram_type,

        has_variant: hasVariant,
      };
    });
  }

  // ==========================================================
  // FIND ALL ACTIVE BUILDS
  // ==========================================================

  // ==========================================================
  // FIND ALL ACTIVE BUILDS
  // Search + Filter + Pagination + Sort
  // ==========================================================

  static async findAll({
    search = "",
    status = "",
    is_featured = "",
    build_type = "admin",
    page = 1,
    limit = 10,
    sort = "newest",
  } = {}) {
    // --------------------------------------------------------
    // PAGINATION
    // --------------------------------------------------------

    const pageNumber = Math.max(normalizeInt(page, 1), 1);

    const limitNumber = Math.min(Math.max(normalizeInt(limit, 10), 1), 100);

    const offset = (pageNumber - 1) * limitNumber;

    // --------------------------------------------------------
    // WHERE
    // --------------------------------------------------------

    const where = ["pc_builds.deleted_at IS NULL"];

    const params = [];

    // Admin Build PC mặc định chỉ quản lý build do Admin tạo.
    // Có thể truyền build_type=user hoặc build_type=all nếu cần.
    const normalizedBuildType = String(build_type || "admin")
      .trim()
      .toLowerCase();

    if (normalizedBuildType === "admin" || normalizedBuildType === "user") {
      where.push("pc_builds.build_type = ?");

      params.push(normalizedBuildType);
    }

    // --------------------------------------------------------
    // SEARCH
    // --------------------------------------------------------

    const normalizedSearch = String(search || "").trim();

    if (normalizedSearch) {
      where.push(`
      (
        pc_builds.name LIKE ?
        OR pc_builds.description LIKE ?
      )
    `);

      const keyword = `%${normalizedSearch}%`;

      params.push(keyword, keyword);
    }

    // --------------------------------------------------------
    // STATUS
    // --------------------------------------------------------

    if (status !== "" && status !== undefined && status !== null) {
      const normalizedStatusValue = Number(status);

      if (normalizedStatusValue === 0 || normalizedStatusValue === 1) {
        where.push("pc_builds.status = ?");

        params.push(normalizedStatusValue);
      }
    }

    // --------------------------------------------------------
    // FEATURED
    // --------------------------------------------------------

    if (
      is_featured !== "" &&
      is_featured !== undefined &&
      is_featured !== null
    ) {
      const normalizedFeatured = Number(is_featured);

      if (normalizedFeatured === 0 || normalizedFeatured === 1) {
        where.push("pc_builds.is_featured = ?");

        params.push(normalizedFeatured);
      }
    }

    const whereSql = `WHERE ${where.join(" AND ")}`;

    // --------------------------------------------------------
    // SORT
    // Không đưa trực tiếp query param vào SQL
    // --------------------------------------------------------

    const sortMap = {
      newest: "pc_builds.id DESC",

      oldest: "pc_builds.id ASC",

      price_asc: "pc_builds.total_price ASC, pc_builds.id DESC",

      price_desc: "pc_builds.total_price DESC, pc_builds.id DESC",

      name_asc: "pc_builds.name ASC, pc_builds.id DESC",

      name_desc: "pc_builds.name DESC, pc_builds.id DESC",

      updated: "pc_builds.updated_at DESC, pc_builds.id DESC",

      featured: "pc_builds.is_featured DESC, pc_builds.id DESC",
    };

    const normalizedSort = String(sort || "newest")
      .trim()
      .toLowerCase();

    const orderBy = sortMap[normalizedSort] || sortMap.newest;

    // --------------------------------------------------------
    // DATA
    // --------------------------------------------------------

    const [builds] = await pool.query(
      `
        SELECT
          pc_builds.*

        FROM pc_builds

        ${whereSql}

        ORDER BY ${orderBy}

        LIMIT ?
        OFFSET ?
      `,
      [...params, limitNumber, offset],
    );

    // --------------------------------------------------------
    // TOTAL
    // --------------------------------------------------------

    const [countRows] = await pool.query(
      `
        SELECT
          COUNT(*) AS total

        FROM pc_builds

        ${whereSql}
      `,
      params,
    );

    const total = Number(countRows[0]?.total || 0);

    // --------------------------------------------------------
    // LOAD CURRENT ITEMS
    // --------------------------------------------------------

    for (const build of builds) {
      build.total_price = Number(build.total_price || 0);

      build.status = Number(build.status || 0);

      build.is_featured = Number(build.is_featured || 0);

      build.items = await this.getItemsByBuildId(build.id);

      // Tiện cho FE Admin
      build.item_count = build.items.length;
    }

    return {
      data: builds,

      pagination: {
        page: pageNumber,

        limit: limitNumber,

        total,

        totalPages: total === 0 ? 0 : Math.ceil(total / limitNumber),

        hasNextPage: pageNumber * limitNumber < total,

        hasPrevPage: pageNumber > 1,
      },

      filters: {
        search: normalizedSearch,

        status: status === "" ? null : Number(status),

        is_featured: is_featured === "" ? null : Number(is_featured),

        build_type: normalizedBuildType,

        sort: normalizedSort,
      },
    };
  }
  // ==========================================================
  // FIND TRASH
  // ==========================================================

  // ==========================================================
  // FIND TRASH
  // Search + Pagination + Sort
  // ==========================================================

  static async findTrash({
    search = "",
    build_type = "admin",
    page = 1,
    limit = 10,
    sort = "deleted_desc",
  } = {}) {
    // --------------------------------------------------------
    // PAGINATION
    // --------------------------------------------------------

    const pageNumber = Math.max(normalizeInt(page, 1), 1);

    const limitNumber = Math.min(Math.max(normalizeInt(limit, 10), 1), 100);

    const offset = (pageNumber - 1) * limitNumber;

    // --------------------------------------------------------
    // WHERE
    // --------------------------------------------------------

    const where = ["pc_builds.deleted_at IS NOT NULL"];

    const params = [];

    const normalizedBuildType = String(build_type || "admin")
      .trim()
      .toLowerCase();

    if (normalizedBuildType === "admin" || normalizedBuildType === "user") {
      where.push("pc_builds.build_type = ?");

      params.push(normalizedBuildType);
    }

    // --------------------------------------------------------
    // SEARCH
    // --------------------------------------------------------

    const normalizedSearch = String(search || "").trim();

    if (normalizedSearch) {
      where.push(`
      (
        pc_builds.name LIKE ?
        OR pc_builds.description LIKE ?
      )
    `);

      const keyword = `%${normalizedSearch}%`;

      params.push(keyword, keyword);
    }

    const whereSql = `WHERE ${where.join(" AND ")}`;

    // --------------------------------------------------------
    // SORT
    // --------------------------------------------------------

    const sortMap = {
      deleted_desc: "pc_builds.deleted_at DESC, pc_builds.id DESC",

      deleted_asc: "pc_builds.deleted_at ASC, pc_builds.id ASC",

      newest: "pc_builds.id DESC",

      oldest: "pc_builds.id ASC",

      name_asc: "pc_builds.name ASC",

      name_desc: "pc_builds.name DESC",

      price_asc: "pc_builds.total_price ASC",

      price_desc: "pc_builds.total_price DESC",
    };

    const normalizedSort = String(sort || "deleted_desc")
      .trim()
      .toLowerCase();

    const orderBy = sortMap[normalizedSort] || sortMap.deleted_desc;

    // --------------------------------------------------------
    // DATA
    // --------------------------------------------------------

    const [builds] = await pool.query(
      `
        SELECT
          pc_builds.*

        FROM pc_builds

        ${whereSql}

        ORDER BY ${orderBy}

        LIMIT ?
        OFFSET ?
      `,
      [...params, limitNumber, offset],
    );

    // --------------------------------------------------------
    // COUNT
    // --------------------------------------------------------

    const [countRows] = await pool.query(
      `
        SELECT
          COUNT(*) AS total

        FROM pc_builds

        ${whereSql}
      `,
      params,
    );

    const total = Number(countRows[0]?.total || 0);

    const data = builds.map((build) => ({
      ...build,

      total_price: Number(build.total_price || 0),

      status: Number(build.status || 0),

      is_featured: Number(build.is_featured || 0),
    }));

    return {
      data,

      pagination: {
        page: pageNumber,

        limit: limitNumber,

        total,

        totalPages: total === 0 ? 0 : Math.ceil(total / limitNumber),

        hasNextPage: pageNumber * limitNumber < total,

        hasPrevPage: pageNumber > 1,
      },
    };
  }

  // ==========================================================
  // FIND BY ID
  // ==========================================================

  static async findById(id) {
    const [rows] = await pool.query(
      `
          SELECT *
          FROM pc_builds

          WHERE id = ?
            AND deleted_at IS NULL

          LIMIT 1
        `,
      [id],
    );

    const build = rows[0];

    if (!build) {
      return null;
    }

    build.total_price = Number(build.total_price || 0);

    build.items = await this.getItemsByBuildId(id);

    return build;
  }

  // ==========================================================
  // FIND BY ID INCLUDING DELETED
  // ==========================================================

  static async findByIdIncludeDeleted(id) {
    const [rows] = await pool.query(
      `
          SELECT *
          FROM pc_builds

          WHERE id = ?

          LIMIT 1
        `,
      [id],
    );

    return rows[0] || null;
  }

  // ==========================================================
  // LOAD ONE PC PART FOR BUILD
  // ==========================================================

  static async loadPartForBuild(connection, partId) {
    const [rows] = await connection.query(
      `
          SELECT
            pp.id AS part_id,
            pp.type_id,
            pp.product_id,
            pp.variant_id,
            pp.specifications,
            pp.is_visible,

            ppt.type_code,
            ppt.type_name,

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
            pv.product_id AS variant_product_id,
            pv.sku AS variant_sku,
            pv.variant_name,
            pv.price AS variant_price,
            pv.sale_price AS variant_sale_price,
            pv.quantity AS variant_quantity,
            pv.thumbnail AS variant_thumbnail,
            pv.status AS variant_status

          FROM pc_parts pp

          INNER JOIN pc_part_types ppt
            ON ppt.id = pp.type_id
            AND ppt.deleted_at IS NULL

          INNER JOIN products p
            ON p.id = pp.product_id
            AND p.deleted_at IS NULL

          LEFT JOIN product_variants pv
            ON pv.id = pp.variant_id
            AND pv.deleted_at IS NULL

          WHERE pp.id = ?
            AND pp.deleted_at IS NULL

          LIMIT 1
        `,
      [partId],
    );

    return rows[0] || null;
  }

  // ==========================================================
  // PREPARE + VALIDATE ITEMS
  // ==========================================================

  static async prepareItems(connection, requestedItems) {
    if (!Array.isArray(requestedItems)) {
      throw createBusinessError("Danh sách linh kiện không hợp lệ");
    }

    if (requestedItems.length === 0) {
      throw createBusinessError("Cấu hình phải có ít nhất một linh kiện");
    }

    const normalizedItems = requestedItems.map(normalizeRequestedItem);

    // --------------------------------------------------------
    // VALIDATE BASIC INPUT
    // --------------------------------------------------------

    for (const item of normalizedItems) {
      if (!Number.isInteger(item.part_id) || item.part_id <= 0) {
        throw createBusinessError("part_id không hợp lệ");
      }

      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw createBusinessError("Số lượng linh kiện phải lớn hơn 0");
      }
    }

    // --------------------------------------------------------
    // DUPLICATE PART ID
    // --------------------------------------------------------

    const seenPartIds = new Set();

    for (const item of normalizedItems) {
      if (seenPartIds.has(item.part_id)) {
        throw createBusinessError(
          `Linh kiện pc_part #${item.part_id} bị chọn trùng. Hãy tăng quantity thay vì gửi nhiều item giống nhau.`,
        );
      }

      seenPartIds.add(item.part_id);
    }

    const preparedItems = [];

    // --------------------------------------------------------
    // LOAD DATA FROM DATABASE
    // --------------------------------------------------------

    for (const requested of normalizedItems) {
      const part = await this.loadPartForBuild(connection, requested.part_id);

      if (!part) {
        throw createBusinessError(
          `Không tìm thấy linh kiện Build PC có ID ${requested.part_id}`,
        );
      }

      if (Number(part.is_visible) !== 1) {
        throw createBusinessError(
          `Linh kiện "${part.product_name}" hiện đang bị ẩn khỏi Build PC`,
        );
      }

      if (Number(part.product_status) !== 1) {
        throw createBusinessError(
          `Sản phẩm "${part.product_name}" hiện không hoạt động`,
        );
      }

      // ------------------------------------------------------
      // VARIANT VALIDATION
      // ------------------------------------------------------

      if (part.variant_id !== null && part.variant_id !== undefined) {
        if (!part.variant_record_id) {
          throw createBusinessError(
            `Variant của sản phẩm "${part.product_name}" không còn tồn tại`,
          );
        }

        if (Number(part.variant_product_id) !== Number(part.product_id)) {
          throw createBusinessError(
            `Variant không thuộc đúng sản phẩm "${part.product_name}"`,
          );
        }

        if (Number(part.variant_status) !== 1) {
          throw createBusinessError(
            `Variant "${part.variant_name || part.variant_sku}" hiện không hoạt động`,
          );
        }
      }

      // ------------------------------------------------------
      // PRICE
      // ------------------------------------------------------

      const effectivePrice = getEffectivePrice(part);

      if (!Number.isFinite(effectivePrice) || effectivePrice < 0) {
        throw createBusinessError(
          `Giá của linh kiện "${part.product_name}" không hợp lệ`,
        );
      }

      // ------------------------------------------------------
      // STOCK
      // ------------------------------------------------------

      const hasVariant =
        part.variant_id !== null && part.variant_id !== undefined;

      const stockQuantity = hasVariant
        ? Number(part.variant_quantity || 0)
        : Number(part.product_quantity || 0);

      const displayName =
        hasVariant && part.variant_name
          ? `${part.product_name} - ${part.variant_name}`
          : part.product_name;

      if (requested.quantity > stockQuantity) {
        throw createBusinessError(
          `"${displayName}" chỉ còn ${stockQuantity} sản phẩm, không đủ số lượng ${requested.quantity}`,
        );
      }

      preparedItems.push({
        part_id: Number(part.part_id),

        type_id: Number(part.type_id),

        type_code: String(part.type_code || "").toUpperCase(),

        type_name: part.type_name,

        product_id: Number(part.product_id),

        variant_id: hasVariant ? Number(part.variant_id) : null,

        quantity: requested.quantity,

        price: Number(effectivePrice),

        total_price: Number(effectivePrice) * requested.quantity,

        stock_quantity: stockQuantity,

        name: displayName,

        product_name: part.product_name,

        variant_name: part.variant_name,

        specifications: parseSpecifications(part.specifications),

        product_socket: part.product_socket,

        product_ram_type: part.product_ram_type,
      });
    }

    // ========================================================
    // SINGLE COMPONENT TYPES
    // ========================================================

    const SINGLE_PART_TYPES = new Set([
      "CPU",
      "MAINBOARD",
      "VGA",
      "PSU",
      "CASE",
      "COOLING",
    ]);

    const typeCounter = new Map();

    for (const item of preparedItems) {
      const typeCode = String(item.type_code || "")
        .trim()
        .toUpperCase();

      if (!SINGLE_PART_TYPES.has(typeCode)) {
        continue;
      }

      const currentCount = typeCounter.get(typeCode) || 0;

      typeCounter.set(typeCode, currentCount + 1);
    }

    for (const [typeCode, count] of typeCounter.entries()) {
      if (count > 1) {
        throw createBusinessError(
          `Cấu hình chỉ được chọn tối đa 1 linh kiện thuộc loại ${typeCode}`,
        );
      }
    }

    return preparedItems;
  }

  // ==========================================================
  // COMPATIBILITY
  // ==========================================================

  static validateCompatibility(items) {
    const errors = [];
    const warnings = [];
    const checks = [];

    const findPart = (code) =>
      items.find((item) => String(item.type_code || "").toUpperCase() === code);

    const cpu = findPart("CPU");

    const mainboard = findPart("MAINBOARD");

    const cooling = findPart("COOLING");

    const casePart = findPart("CASE");

    const vga = findPart("VGA");

    const psu = findPart("PSU");

    const ramItems = items.filter(
      (item) => String(item.type_code || "").toUpperCase() === "RAM",
    );

    // ========================================================
    // CPU ↔ MAINBOARD
    // ========================================================

    if (cpu && mainboard) {
      const cpuSocket =
        cpu.specifications?.socket || cpu.product_socket || null;

      const mainboardSocket =
        mainboard.specifications?.socket || mainboard.product_socket || null;

      if (cpuSocket && mainboardSocket) {
        const passed =
          String(cpuSocket).trim().toUpperCase() ===
          String(mainboardSocket).trim().toUpperCase();

        checks.push({
          rule: "CPU_MAINBOARD_SOCKET",

          passed,

          cpu_socket: cpuSocket,

          mainboard_socket: mainboardSocket,
        });

        if (!passed) {
          errors.push({
            code: "CPU_MAINBOARD_SOCKET_MISMATCH",

            message: `CPU sử dụng socket ${cpuSocket} nhưng Mainboard sử dụng socket ${mainboardSocket}.`,
          });
        }
      } else {
        warnings.push({
          code: "CPU_MAINBOARD_SOCKET_DATA_MISSING",

          message:
            "Thiếu thông tin socket của CPU hoặc Mainboard nên chưa thể kiểm tra tương thích socket.",
        });
      }
    }

    // ========================================================
    // CPU ↔ COOLING
    // Cooling có thể hỗ trợ nhiều socket:
    // Ví dụ: "LGA1700, AM4, AM5"
    // ========================================================

    if (cpu && cooling) {
      const cpuSocket =
        cpu.specifications?.socket || cpu.product_socket || null;

      const coolingSocketValue =
        cooling.specifications?.socket ||
        cooling.specifications?.sockets ||
        cooling.specifications?.supported_socket ||
        cooling.specifications?.supported_sockets ||
        null;

      const normalizedCpuSocket = String(cpuSocket || "")
        .trim()
        .toUpperCase();

      const coolingSockets = normalizeCompatibilityList(coolingSocketValue);

      if (normalizedCpuSocket && coolingSockets.length > 0) {
        const passed = coolingSockets.includes(normalizedCpuSocket);

        checks.push({
          rule: "CPU_COOLING_SOCKET",

          passed,

          cpu_socket: cpuSocket,

          cooling_sockets: coolingSockets,

          cooling_part_id: cooling.part_id,
        });

        if (!passed) {
          errors.push({
            code: "CPU_COOLING_SOCKET_MISMATCH",

            message:
              `CPU sử dụng socket ${cpuSocket} nhưng tản nhiệt ` +
              `"${cooling.name}" chỉ hỗ trợ socket ` +
              `${coolingSockets.join(", ")}.`,
          });
        }
      } else {
        warnings.push({
          code: "CPU_COOLING_SOCKET_DATA_MISSING",

          message:
            "Thiếu thông tin socket của CPU hoặc socket hỗ trợ của tản nhiệt nên chưa thể kiểm tra tương thích.",
        });
      }
    }

    // ========================================================
    // MAINBOARD ↔ RAM
    // ========================================================

    if (mainboard && ramItems.length) {
      const mainboardRamType =
        mainboard.specifications?.ram_type ||
        mainboard.product_ram_type ||
        null;

      for (const ram of ramItems) {
        const ramType =
          ram.specifications?.ram_type || ram.product_ram_type || null;

        if (mainboardRamType && ramType) {
          const passed =
            String(mainboardRamType).trim().toUpperCase() ===
            String(ramType).trim().toUpperCase();

          checks.push({
            rule: "MAINBOARD_RAM_TYPE",

            passed,

            mainboard_ram_type: mainboardRamType,

            ram_type: ramType,

            ram_part_id: ram.part_id,
          });

          if (!passed) {
            errors.push({
              code: "MAINBOARD_RAM_TYPE_MISMATCH",

              message: `Mainboard hỗ trợ ${mainboardRamType} nhưng RAM "${ram.name}" sử dụng ${ramType}.`,
            });
          }
        } else {
          warnings.push({
            code: "MAINBOARD_RAM_DATA_MISSING",

            message: `Thiếu thông tin loại RAM của Mainboard hoặc "${ram.name}".`,
          });
        }
      }
    }

    // ========================================================
    // MAINBOARD ↔ CASE
    //
    // Mainboard:
    //   form_factor = "Micro-ATX"
    //
    // Case:
    //   form_factor = "ATX, Micro-ATX"
    //
    // Mainboard chỉ cần thuộc một trong các chuẩn mà Case hỗ trợ.
    // ========================================================

    if (mainboard && casePart) {
      const mainboardFormFactor =
        mainboard.specifications?.form_factor ||
        mainboard.specifications?.formfactor ||
        mainboard.specifications?.board_form_factor ||
        null;

      const caseFormFactorValue =
        casePart.specifications?.form_factor ||
        casePart.specifications?.formfactor ||
        casePart.specifications?.supported_form_factor ||
        casePart.specifications?.supported_form_factors ||
        null;

      const normalizedMainboardFormFactor = String(mainboardFormFactor || "")
        .trim()
        .toUpperCase();

      const caseFormFactors = normalizeCompatibilityList(caseFormFactorValue);

      if (normalizedMainboardFormFactor && caseFormFactors.length > 0) {
        const passed = caseFormFactors.includes(normalizedMainboardFormFactor);

        checks.push({
          rule: "MAINBOARD_CASE_FORM_FACTOR",

          passed,

          mainboard_form_factor: mainboardFormFactor,

          case_form_factors: caseFormFactors,

          mainboard_part_id: mainboard.part_id,

          case_part_id: casePart.part_id,
        });

        if (!passed) {
          errors.push({
            code: "MAINBOARD_CASE_FORM_FACTOR_MISMATCH",

            message:
              `Mainboard "${mainboard.name}" sử dụng chuẩn ` +
              `${mainboardFormFactor} nhưng Case "${casePart.name}" ` +
              `chỉ hỗ trợ ${caseFormFactors.join(", ")}.`,
          });
        }
      } else {
        warnings.push({
          code: "MAINBOARD_CASE_FORM_FACTOR_DATA_MISSING",

          message:
            "Thiếu thông tin form factor của Mainboard hoặc Case nên chưa thể kiểm tra tương thích kích thước.",
        });
      }
    }

    // ========================================================
    // VGA ↔ PSU
    // ========================================================

    if (vga && psu) {
      const recommendedPsu = parsePowerValue(
        vga.specifications?.recommended_psu ??
          vga.specifications?.power_recommend ??
          vga.specifications?.recommended_psu_w ??
          0,
      );

      const psuWattage = parsePowerValue(
        psu.specifications?.wattage ??
          psu.specifications?.power ??
          psu.specifications?.capacity_w ??
          0,
      );

      if (recommendedPsu > 0 && psuWattage > 0) {
        const passed = psuWattage >= recommendedPsu;

        checks.push({
          rule: "VGA_PSU_POWER",

          passed,

          recommended_psu: recommendedPsu,

          psu_wattage: psuWattage,
        });

        if (!passed) {
          errors.push({
            code: "VGA_PSU_POWER_INSUFFICIENT",

            message: `VGA yêu cầu nguồn tối thiểu ${recommendedPsu}W nhưng PSU hiện tại chỉ có ${psuWattage}W.`,
          });
        }
      } else {
        warnings.push({
          code: "VGA_PSU_POWER_DATA_MISSING",

          message:
            "Thiếu thông tin công suất khuyến nghị của VGA hoặc công suất PSU.",
        });
      }
    }

    return {
      is_valid: errors.length === 0,

      errors,
      warnings,
      checks,
    };
  }

  // ==========================================================
  // INSERT CURRENT ITEMS
  // ==========================================================

  static async insertItems(connection, buildId, items) {
    if (!Array.isArray(items) || !items.length) {
      return;
    }

    const values = items.map((item) => [
      buildId,
      item.part_id,
      item.product_id,
      item.variant_id,
      item.quantity,
      item.price,
      item.total_price,
    ]);

    await connection.query(
      `
        INSERT INTO pc_build_items
        (
          build_id,
          part_id,
          product_id,
          variant_id,
          quantity,
          price,
          total_price
        )
        VALUES ?
      `,
      [values],
    );
  }

  // ==========================================================
  // CREATE BUILD
  // ==========================================================

  static async create(data) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const name = String(data.name || "").trim();

      if (!name) {
        throw createBusinessError("Vui lòng nhập tên cấu hình PC");
      }

      const items = await this.prepareItems(connection, data.items || []);

      const compatibility = this.validateCompatibility(items);

      if (!compatibility.is_valid) {
        throw createBusinessError(
          "Cấu hình PC không tương thích",
          400,
          compatibility,
        );
      }

      const totalPrice = items.reduce(
        (sum, item) => sum + Number(item.total_price || 0),
        0,
      );

      const status = normalizeStatus(data.status, 1);

      const description = data.description
        ? String(data.description).trim()
        : null;

      const image = data.image ? String(data.image) : null;

      const userId = data.user_id ? Number(data.user_id) : null;

      const buildType = data.build_type === "admin" ? "admin" : "user";

      const isFeatured = Number(data.is_featured) === 1 ? 1 : 0;

      const [buildResult] = await connection.query(
        `
            INSERT INTO pc_builds
            (
              user_id,
              build_type,
              name,
              description,
              image,
              total_price,
              status,
              is_featured
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `,
        [
          userId,
          buildType,
          name,
          description,
          image,
          totalPrice,
          status,
          isFeatured,
        ],
      );

      const buildId = buildResult.insertId;

      await this.insertItems(connection, buildId, items);

      await connection.commit();

      const build = await this.findById(buildId);

      return {
        ...build,
        compatibility,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // ==========================================================
  // UPDATE BUILD
  // ==========================================================

  static async update(id, data) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [buildRows] = await connection.query(
        `
            SELECT *
            FROM pc_builds

            WHERE id = ?
              AND deleted_at IS NULL

            LIMIT 1
          `,
        [id],
      );

      const currentBuild = buildRows[0];

      if (!currentBuild) {
        await connection.rollback();
        return null;
      }

      const name =
        data.name !== undefined
          ? String(data.name || "").trim()
          : currentBuild.name;

      if (!name) {
        throw createBusinessError("Tên cấu hình PC không hợp lệ");
      }

      const description =
        data.description !== undefined
          ? data.description
            ? String(data.description).trim()
            : null
          : currentBuild.description;

      const image =
        data.image !== undefined ? data.image || null : currentBuild.image;

      const status =
        data.status !== undefined
          ? normalizeStatus(data.status, currentBuild.status)
          : Number(currentBuild.status);

      const isFeatured =
        data.is_featured !== undefined
          ? Number(data.is_featured) === 1
            ? 1
            : 0
          : Number(currentBuild.is_featured || 0);

      let totalPrice = Number(currentBuild.total_price || 0);

      let compatibility = null;

      // ------------------------------------------------------
      // UPDATE ITEMS IF PROVIDED
      // ------------------------------------------------------

      if (Object.prototype.hasOwnProperty.call(data, "items")) {
        const items = await this.prepareItems(connection, data.items || []);

        compatibility = this.validateCompatibility(items);

        if (!compatibility.is_valid) {
          throw createBusinessError(
            "Cấu hình PC không tương thích",
            400,
            compatibility,
          );
        }

        totalPrice = items.reduce(
          (sum, item) => sum + Number(item.total_price || 0),
          0,
        );

        /*
         * QUAN TRỌNG:
         *
         * Những item hiện tại bị thay thế bởi lần UPDATE này
         * phải được đánh dấu:
         *
         * deleted_at  = thời điểm ngừng sử dụng
         * replaced_at = thời điểm bị thay thế
         *
         * Nhờ replaced_at, Restore Build sau này sẽ KHÔNG
         * phục hồi các item lịch sử này.
         */
        await connection.query(
          `
            UPDATE pc_build_items

            SET
              deleted_at = NOW(),
              replaced_at = NOW()

            WHERE build_id = ?
              AND deleted_at IS NULL
              AND replaced_at IS NULL
          `,
          [id],
        );

        // Tạo version item hiện tại mới
        await this.insertItems(connection, id, items);
      }

      // ------------------------------------------------------
      // UPDATE BUILD INFO
      // ------------------------------------------------------

      await connection.query(
        `
          UPDATE pc_builds

          SET
            name = ?,
            description = ?,
            image = ?,
            total_price = ?,
            status = ?,
            is_featured = ?

          WHERE id = ?
            AND deleted_at IS NULL
        `,
        [name, description, image, totalPrice, status, isFeatured, id],
      );

      await connection.commit();

      const updatedBuild = await this.findById(id);

      if (compatibility) {
        updatedBuild.compatibility = compatibility;
      }

      return updatedBuild;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // ==========================================================
  // UPDATE STATUS
  // ==========================================================

  static async updateStatus(id, status) {
    const normalizedStatus = normalizeStatus(status, 1);

    const [result] = await pool.query(
      `
          UPDATE pc_builds

          SET status = ?

          WHERE id = ?
            AND deleted_at IS NULL
        `,
      [normalizedStatus, id],
    );

    if (!result.affectedRows) {
      return null;
    }

    return this.findById(id);
  }

  // ==========================================================
  // UPDATE FEATURED
  // ==========================================================

  static async updateFeatured(id, isFeatured) {
    const normalizedFeatured =
      isFeatured === true || isFeatured === 1 || isFeatured === "1" ? 1 : 0;

    const [result] = await pool.query(
      `
      UPDATE pc_builds

      SET is_featured = ?

      WHERE id = ?
        AND deleted_at IS NULL
    `,
      [normalizedFeatured, id],
    );

    if (!result.affectedRows) {
      return null;
    }

    return this.findById(id);
  }

  // ==========================================================
  // SOFT DELETE BUILD
  // ==========================================================

  static async delete(id) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // ------------------------------------------------------
      // DELETE BUILD
      // ------------------------------------------------------

      const [result] = await connection.query(
        `
            UPDATE pc_builds

            SET
              deleted_at = NOW(),
              status = 0

            WHERE id = ?
              AND deleted_at IS NULL
          `,
        [id],
      );

      if (!result.affectedRows) {
        await connection.rollback();
        return false;
      }

      /*
       * Chỉ soft-delete VERSION HIỆN TẠI.
       *
       * replaced_at IS NULL
       * = item chưa từng bị thay thế.
       *
       * Các item history đã có replaced_at != NULL
       * tuyệt đối không được chỉnh lại.
       */
      await connection.query(
        `
          UPDATE pc_build_items

          SET deleted_at = NOW()

          WHERE build_id = ?
            AND deleted_at IS NULL
            AND replaced_at IS NULL
        `,
        [id],
      );

      await connection.commit();

      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // ==========================================================
  // RESTORE BUILD
  // ==========================================================

  static async restore(id) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // ------------------------------------------------------
      // FIND DELETED BUILD
      // ------------------------------------------------------

      const [buildRows] = await connection.query(
        `
            SELECT
              id,
              deleted_at

            FROM pc_builds

            WHERE id = ?
              AND deleted_at IS NOT NULL

            LIMIT 1
          `,
        [id],
      );

      const deletedBuild = buildRows[0];

      if (!deletedBuild) {
        await connection.rollback();
        return null;
      }

      /*
       * Chỉ restore item hiện tại của Build.
       *
       * replaced_at IS NULL:
       * item không phải lịch sử do UPDATE tạo ra.
       *
       * Các item:
       *
       * deleted_at != NULL
       * replaced_at != NULL
       *
       * là HISTORY và không bao giờ được restore.
       */
      await connection.query(
        `
          UPDATE pc_build_items

          SET deleted_at = NULL

          WHERE build_id = ?
            AND deleted_at IS NOT NULL
            AND replaced_at IS NULL
        `,
        [id],
      );

      // ------------------------------------------------------
      // RESTORE BUILD
      // ------------------------------------------------------

      const [result] = await connection.query(
        `
            UPDATE pc_builds

            SET
              deleted_at = NULL,
              status = 1

            WHERE id = ?
              AND deleted_at IS NOT NULL
          `,
        [id],
      );

      if (!result.affectedRows) {
        await connection.rollback();
        return null;
      }

      await connection.commit();

      return this.findById(id);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // ==========================================================
  // VALIDATE WITHOUT SAVING
  // ==========================================================

  static async validateItems(requestedItems) {
    const connection = await pool.getConnection();

    try {
      const items = await this.prepareItems(connection, requestedItems);

      const compatibility = this.validateCompatibility(items);

      const totalPrice = items.reduce(
        (sum, item) => sum + Number(item.total_price || 0),
        0,
      );

      return {
        ...compatibility,

        total_price: totalPrice,

        items,
      };
    } finally {
      connection.release();
    }
  }
}

module.exports = PcBuild;
