const { pool } = require("../config/database");

class ProductVariant {
  // ============================================================
  // HELPERS
  // ============================================================

  static normalizeCode(value = "") {
    return String(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  static normalizeNullable(value) {
    if (value === undefined || value === null || value === "") {
      return null;
    }

    return value;
  }

  static toBooleanNumber(value, defaultValue = 0) {
    if (value === undefined || value === null || value === "") {
      return defaultValue;
    }

    if (
      value === true ||
      value === 1 ||
      value === "1" ||
      String(value).toLowerCase() === "true"
    ) {
      return 1;
    }

    return 0;
  }

  // ============================================================
  // PRODUCT
  // ============================================================

  static async productExists(productId, connection = pool) {
    const [rows] = await connection.execute(
      `
        SELECT id
        FROM products
        WHERE id = ?
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [productId],
    );

    return rows.length > 0;
  }

  // ============================================================
  // OPTION
  // ============================================================

  static async getOptionById(optionId, connection = pool) {
    const [rows] = await connection.execute(
      `
        SELECT
          id,
          name,
          code,
          display_type,
          sort_order,
          status,
          created_at,
          updated_at
        FROM product_options
        WHERE id = ?
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [optionId],
    );

    return rows[0] || null;
  }

  static async getOptionByCode(code, connection = pool) {
    const normalizedCode = ProductVariant.normalizeCode(code);

    if (!normalizedCode) {
      return null;
    }

    const [rows] = await connection.execute(
      `
        SELECT
          id,
          name,
          code,
          display_type,
          sort_order,
          status,
          created_at,
          updated_at
        FROM product_options
        WHERE code = ?
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [normalizedCode],
    );

    return rows[0] || null;
  }

  static async createOption(connection, data) {
    const code =
      ProductVariant.normalizeCode(data.code) ||
      ProductVariant.normalizeCode(data.name);

    const displayType = ["button", "select", "color"].includes(
      String(data.display_type || "").toLowerCase(),
    )
      ? String(data.display_type).toLowerCase()
      : "button";

    const [result] = await connection.execute(
      `
        INSERT INTO product_options
        (
          name,
          code,
          display_type,
          sort_order,
          status
        )
        VALUES (?, ?, ?, ?, ?)
      `,
      [
        String(data.name || "").trim(),
        code,
        displayType,
        Number(data.sort_order || 0),
        ProductVariant.toBooleanNumber(data.status, 1),
      ],
    );

    return result.insertId;
  }

  static async resolveOption(connection, data) {
    const name = String(data.name || "").trim();

    const code =
      ProductVariant.normalizeCode(data.code) ||
      ProductVariant.normalizeCode(name);

    if (!name) {
      throw new Error("Tên thuộc tính biến thể không được để trống.");
    }

    if (!code) {
      throw new Error("Mã thuộc tính biến thể không hợp lệ.");
    }

    const existing = await ProductVariant.getOptionByCode(code, connection);

    if (existing) {
      return existing.id;
    }

    return ProductVariant.createOption(connection, {
      ...data,
      name,
      code,
    });
  }

  // ============================================================
  // OPTION VALUE
  // ============================================================

  static async getOptionValueById(optionValueId, connection = pool) {
    const [rows] = await connection.execute(
      `
        SELECT
          pov.id,
          pov.option_id,
          pov.value,
          pov.label,
          pov.color_code,
          pov.sort_order,
          pov.status,
          po.name AS option_name,
          po.code AS option_code,
          po.display_type
        FROM product_option_values pov
        INNER JOIN product_options po
          ON po.id = pov.option_id
        WHERE pov.id = ?
          AND pov.deleted_at IS NULL
          AND po.deleted_at IS NULL
        LIMIT 1
      `,
      [optionValueId],
    );

    return rows[0] || null;
  }

  static async getOptionValue(optionId, value, connection = pool) {
    const normalizedValue = String(value || "").trim();

    if (!normalizedValue) {
      return null;
    }

    const [rows] = await connection.execute(
      `
        SELECT
          id,
          option_id,
          value,
          label,
          color_code,
          sort_order,
          status
        FROM product_option_values
        WHERE option_id = ?
          AND value = ?
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [optionId, normalizedValue],
    );

    return rows[0] || null;
  }

  static async createOptionValue(connection, optionId, data) {
    const value = String(data.value || "").trim();

    if (!value) {
      throw new Error("Giá trị thuộc tính không được để trống.");
    }

    const label = String(data.label || value).trim();

    const colorCode = ProductVariant.normalizeNullable(data.color_code);

    const [result] = await connection.execute(
      `
        INSERT INTO product_option_values
        (
          option_id,
          value,
          label,
          color_code,
          sort_order,
          status
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        optionId,
        value,
        label,
        colorCode,
        Number(data.sort_order || 0),
        ProductVariant.toBooleanNumber(data.status, 1),
      ],
    );

    return result.insertId;
  }

  static async resolveOptionValue(connection, optionId, data) {
    const value = String(data.value || "").trim();

    if (!value) {
      throw new Error("Giá trị thuộc tính không được để trống.");
    }

    const existing = await ProductVariant.getOptionValue(
      optionId,
      value,
      connection,
    );

    if (existing) {
      return existing.id;
    }

    return ProductVariant.createOptionValue(connection, optionId, data);
  }

  // ============================================================
  // SKU
  // ============================================================

  static async isVariantSkuExists(
    sku,
    excludeVariantId = null,
    connection = pool,
  ) {
    const normalizedSku = String(sku || "").trim();

    if (!normalizedSku) {
      return false;
    }

    /*
     * QUAN TRỌNG:
     *
     * Database đang có UNIQUE KEY:
     * uk_product_variants_sku
     *
     * UNIQUE này áp dụng cả variant đã soft delete.
     *
     * Vì vậy tuyệt đối KHÔNG lọc:
     *
     *   deleted_at IS NULL
     *
     * Nếu không Model sẽ nghĩ SKU còn trống,
     * nhưng MySQL lại từ chối bằng ER_DUP_ENTRY.
     */
    let sql = `
    SELECT
      id,
      product_id,
      sku,
      deleted_at
    FROM product_variants
    WHERE sku = ?
  `;

    const params = [normalizedSku];

    if (excludeVariantId) {
      sql += `
      AND id <> ?
    `;

      params.push(Number(excludeVariantId));
    }

    sql += `
    LIMIT 1
  `;

    const [rows] = await connection.execute(sql, params);

    return rows.length > 0;
  }

  static async isSkuUsedAnywhere(
    sku,
    { excludeProductId = null, excludeVariantId = null } = {},
    connection = pool,
  ) {
    const normalizedSku = String(sku || "").trim();

    if (!normalizedSku) {
      return false;
    }

    let productSql = `
      SELECT id
      FROM products
      WHERE sku = ?
        AND deleted_at IS NULL
    `;

    const productParams = [normalizedSku];

    if (excludeProductId) {
      productSql += `
        AND id <> ?
      `;

      productParams.push(excludeProductId);
    }

    productSql += `
      LIMIT 1
    `;

    const [productRows] = await connection.execute(productSql, productParams);

    if (productRows.length > 0) {
      return true;
    }

    return ProductVariant.isVariantSkuExists(
      normalizedSku,
      excludeVariantId,
      connection,
    );
  }

  // ============================================================
  // CREATE VARIANT
  // ============================================================

  static async createVariant(connection, productId, data) {
    const sku = String(data.sku || "").trim();

    if (!sku) {
      throw new Error("SKU biến thể không được để trống.");
    }

    const variantName = String(data.variant_name || "").trim() || "Mặc định";

    const price = Number(data.price);

    const salePrice =
      data.sale_price === "" ||
      data.sale_price === null ||
      data.sale_price === undefined
        ? null
        : Number(data.sale_price);

    const quantity = Number(data.quantity || 0);

    if (!Number.isFinite(price) || price <= 0) {
      throw new Error(`Giá của biến thể "${variantName}" không hợp lệ.`);
    }

    if (!Number.isInteger(quantity) || quantity < 0) {
      throw new Error(`Số lượng của biến thể "${variantName}" không hợp lệ.`);
    }

    if (
      salePrice !== null &&
      (!Number.isFinite(salePrice) || salePrice < 0 || salePrice >= price)
    ) {
      throw new Error(
        `Giá khuyến mãi của biến thể "${variantName}" phải nhỏ hơn giá bán.`,
      );
    }

    const exists = await ProductVariant.isSkuUsedAnywhere(
      sku,
      {
        excludeProductId: productId,
      },
      connection,
    );

    if (exists) {
      throw new Error(`SKU biến thể "${sku}" đã tồn tại.`);
    }

    const [result] = await connection.execute(
      `
        INSERT INTO product_variants
        (
          product_id,
          sku,
          variant_name,
          price,
          sale_price,
          quantity,
          thumbnail,
          status,
          is_default,
          sort_order
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        productId,
        sku,
        variantName,
        price,
        salePrice,
        quantity,
        ProductVariant.normalizeNullable(data.thumbnail),
        ProductVariant.toBooleanNumber(data.status, 1),
        ProductVariant.toBooleanNumber(data.is_default, 0),
        Number(data.sort_order || 0),
      ],
    );

    return result.insertId;
  }

  // ============================================================
  // VARIANT VALUES
  // ============================================================

  static async attachVariantValue(
    connection,
    variantId,
    optionId,
    optionValueId,
  ) {
    const optionValue = await ProductVariant.getOptionValueById(
      optionValueId,
      connection,
    );

    if (!optionValue) {
      throw new Error(`Không tìm thấy giá trị thuộc tính ID ${optionValueId}.`);
    }

    if (Number(optionValue.option_id) !== Number(optionId)) {
      throw new Error("Giá trị thuộc tính không thuộc thuộc tính đã chọn.");
    }

    await connection.execute(
      `
        INSERT INTO product_variant_values
        (
          variant_id,
          option_id,
          option_value_id
        )
        VALUES (?, ?, ?)
      `,
      [variantId, optionId, optionValueId],
    );
  }

  static async deleteVariantValues(connection, variantId) {
    await connection.execute(
      `
        DELETE FROM product_variant_values
        WHERE variant_id = ?
      `,
      [variantId],
    );
  }

  // ============================================================
  // VARIANT IMAGES
  // ============================================================

  static async addVariantImages(connection, variantId, images = []) {
    if (!Array.isArray(images) || images.length === 0) {
      return;
    }

    let primaryAssigned = false;

    for (let index = 0; index < images.length; index++) {
      const image = images[index];

      const imageUrl =
        typeof image === "string"
          ? image
          : image.image_url || image.url || null;

      if (!imageUrl) {
        continue;
      }

      let isPrimary =
        typeof image === "object"
          ? ProductVariant.toBooleanNumber(image.is_primary, 0)
          : 0;

      if (isPrimary && primaryAssigned) {
        isPrimary = 0;
      }

      if (isPrimary) {
        primaryAssigned = true;
      }

      await connection.execute(
        `
          INSERT INTO product_variant_images
          (
            variant_id,
            image_url,
            sort_order,
            is_primary
          )
          VALUES (?, ?, ?, ?)
        `,
        [
          variantId,
          imageUrl,
          Number(
            typeof image === "object"
              ? image.sort_order || index + 1
              : index + 1,
          ),
          isPrimary,
        ],
      );
    }
  }

  static async deleteVariantImages(connection, variantId) {
    await connection.execute(
      `
        DELETE FROM product_variant_images
        WHERE variant_id = ?
      `,
      [variantId],
    );
  }

  // ============================================================
  // CREATE OPTIONS FROM PRODUCT PAYLOAD
  // ============================================================

  static async resolveProductOptions(connection, options = []) {
    if (!Array.isArray(options)) {
      throw new Error("Danh sách thuộc tính biến thể không hợp lệ.");
    }

    const optionMap = {};

    const seenCodes = new Set();

    for (let optionIndex = 0; optionIndex < options.length; optionIndex++) {
      const option = options[optionIndex];

      const name = String(option.name || "").trim();

      const code =
        ProductVariant.normalizeCode(option.code) ||
        ProductVariant.normalizeCode(name);

      if (!name || !code) {
        throw new Error(
          `Thuộc tính biến thể thứ ${optionIndex + 1} không hợp lệ.`,
        );
      }

      if (seenCodes.has(code)) {
        throw new Error(
          `Thuộc tính "${code}" bị khai báo trùng trong sản phẩm.`,
        );
      }

      seenCodes.add(code);

      const optionId = await ProductVariant.resolveOption(connection, {
        ...option,
        name,
        code,
        sort_order:
          option.sort_order !== undefined ? option.sort_order : optionIndex + 1,
      });

      const values = Array.isArray(option.values) ? option.values : [];

      if (values.length === 0) {
        throw new Error(`Thuộc tính "${name}" phải có ít nhất một giá trị.`);
      }

      const valueMap = {};

      const seenValues = new Set();

      for (let valueIndex = 0; valueIndex < values.length; valueIndex++) {
        const valueData = values[valueIndex];

        const value = String(
          typeof valueData === "string" ? valueData : valueData.value || "",
        ).trim();

        if (!value) {
          throw new Error(
            `Giá trị thứ ${valueIndex + 1} của "${name}" không hợp lệ.`,
          );
        }

        const normalizedValueKey = value.toLowerCase();

        if (seenValues.has(normalizedValueKey)) {
          throw new Error(`Giá trị "${value}" của "${name}" bị trùng.`);
        }

        seenValues.add(normalizedValueKey);

        const normalizedData =
          typeof valueData === "string"
            ? {
                value,
                label: value,
              }
            : {
                ...valueData,
                value,
                label: valueData.label || value,
                sort_order:
                  valueData.sort_order !== undefined
                    ? valueData.sort_order
                    : valueIndex + 1,
              };

        const optionValueId = await ProductVariant.resolveOptionValue(
          connection,
          optionId,
          normalizedData,
        );

        valueMap[normalizedValueKey] = {
          id: optionValueId,
          value,
        };
      }

      optionMap[code] = {
        id: optionId,
        code,
        name,
        values: valueMap,
      };
    }

    return optionMap;
  }

  // ============================================================
  // CREATE PRODUCT VARIANTS
  // ============================================================

  static async createProductVariants(
    connection,
    productId,
    { options = [], variants = [], fallback = {} } = {},
  ) {
    const normalizedVariants = Array.isArray(variants) ? variants : [];

    /*
     * Không khai báo variants:
     * tạo một default variant từ dữ liệu products.
     */
    if (normalizedVariants.length === 0) {
      const variantId = await ProductVariant.createVariant(
        connection,
        productId,
        {
          sku: fallback.sku,
          variant_name: "Mặc định",
          price: fallback.price,
          sale_price: fallback.sale_price,
          quantity: Number(fallback.quantity || 0),
          thumbnail: fallback.thumbnail || null,
          status: fallback.status ?? 1,
          is_default: 1,
          sort_order: 1,
        },
      );

      return [variantId];
    }

    const optionMap =
      options.length > 0
        ? await ProductVariant.resolveProductOptions(connection, options)
        : {};

    const optionCodes = Object.keys(optionMap);

    const seenSkus = new Set();
    const seenCombinations = new Set();

    let defaultCount = 0;

    const createdVariantIds = [];

    for (
      let variantIndex = 0;
      variantIndex < normalizedVariants.length;
      variantIndex++
    ) {
      const variant = normalizedVariants[variantIndex];

      const sku = String(variant.sku || "").trim();

      if (!sku) {
        throw new Error(
          `SKU của biến thể thứ ${variantIndex + 1} không được để trống.`,
        );
      }

      const normalizedSku = sku.toLowerCase();

      if (seenSkus.has(normalizedSku)) {
        throw new Error(`SKU "${sku}" bị trùng trong danh sách biến thể.`);
      }

      seenSkus.add(normalizedSku);

      const isDefault = ProductVariant.toBooleanNumber(variant.is_default, 0);

      if (isDefault) {
        defaultCount++;
      }

      let values = variant.values || {};

      /*
       * Cho phép FE/Postman gửi:
       *
       * values: {
       *   capacity: "16GB",
       *   bus: "5600MHz"
       * }
       *
       * hoặc:
       *
       * values: [
       *   { option_code: "capacity", value: "16GB" }
       * ]
       */
      if (Array.isArray(values)) {
        const objectValues = {};

        for (const item of values) {
          const code = ProductVariant.normalizeCode(
            item.option_code || item.code,
          );

          if (code) {
            objectValues[code] = item.value ?? item.option_value ?? "";
          }
        }

        values = objectValues;
      }

      const combinationParts = [];

      if (optionCodes.length > 0) {
        for (const optionCode of optionCodes) {
          const option = optionMap[optionCode];

          const selectedValue = String(values[optionCode] ?? "").trim();

          if (!selectedValue) {
            throw new Error(
              `Biến thể "${sku}" chưa chọn giá trị cho "${option.name}".`,
            );
          }

          const valueInfo = option.values[selectedValue.toLowerCase()];

          if (!valueInfo) {
            throw new Error(
              `Giá trị "${selectedValue}" không thuộc "${option.name}".`,
            );
          }

          combinationParts.push(
            `${optionCode}:${String(valueInfo.value).toLowerCase()}`,
          );
        }

        /*
         * Không cho variant chứa option không tồn tại.
         */
        for (const receivedCode of Object.keys(values)) {
          const normalizedCode = ProductVariant.normalizeCode(receivedCode);

          if (!optionMap[normalizedCode]) {
            throw new Error(
              `Thuộc tính "${receivedCode}" của biến thể "${sku}" không tồn tại.`,
            );
          }
        }

        const combinationKey = combinationParts.sort().join("|");

        if (seenCombinations.has(combinationKey)) {
          throw new Error(`Tổ hợp thuộc tính của biến thể "${sku}" bị trùng.`);
        }

        seenCombinations.add(combinationKey);
      } else if (Object.keys(values).length > 0) {
        throw new Error(
          `Biến thể "${sku}" có values nhưng sản phẩm không khai báo options.`,
        );
      }

      const variantId = await ProductVariant.createVariant(
        connection,
        productId,
        {
          ...variant,
          sku,
          is_default: isDefault,
          sort_order:
            variant.sort_order !== undefined
              ? variant.sort_order
              : variantIndex + 1,
        },
      );

      if (optionCodes.length > 0) {
        for (const optionCode of optionCodes) {
          const option = optionMap[optionCode];

          const selectedValue = String(values[optionCode]).trim();

          const valueInfo = option.values[selectedValue.toLowerCase()];

          await ProductVariant.attachVariantValue(
            connection,
            variantId,
            option.id,
            valueInfo.id,
          );
        }
      }

      if (Array.isArray(variant.images) && variant.images.length > 0) {
        await ProductVariant.addVariantImages(
          connection,
          variantId,
          variant.images,
        );
      }

      createdVariantIds.push(variantId);
    }

    if (defaultCount > 1) {
      throw new Error("Mỗi sản phẩm chỉ được có một biến thể mặc định.");
    }

    /*
     * Nếu FE không đánh dấu default:
     * variant đầu tiên trở thành default.
     */
    if (defaultCount === 0 && createdVariantIds.length > 0) {
      await connection.execute(
        `
          UPDATE product_variants
          SET is_default = 1
          WHERE id = ?
        `,
        [createdVariantIds[0]],
      );
    }

    return createdVariantIds;
  }

  // ============================================================
  // GET VARIANTS
  // ============================================================

  static async getVariantsByProductId(
    productId,
    { includeDeleted = false } = {},
    connection = pool,
  ) {
    const deletedCondition = includeDeleted ? "" : "AND pv.deleted_at IS NULL";

    const [variants] = await connection.execute(
      `
        SELECT
          pv.id,
          pv.product_id,
          pv.sku,
          pv.variant_name,
          pv.price,
          pv.sale_price,
          pv.quantity,
          pv.thumbnail,
          pv.status,
          pv.is_default,
          pv.sort_order,
          pv.created_at,
          pv.updated_at,
          pv.deleted_at
        FROM product_variants pv
        WHERE pv.product_id = ?
          ${deletedCondition}
        ORDER BY
          pv.is_default DESC,
          pv.sort_order ASC,
          pv.id ASC
      `,
      [productId],
    );

    for (const variant of variants) {
      const [values] = await connection.execute(
        `
          SELECT
            pvv.id,
            pvv.option_id,
            pvv.option_value_id,

            po.name AS option_name,
            po.code AS option_code,
            po.display_type,

            pov.value,
            pov.label,
            pov.color_code

          FROM product_variant_values pvv

          INNER JOIN product_options po
            ON po.id = pvv.option_id

          INNER JOIN product_option_values pov
            ON pov.id = pvv.option_value_id

          WHERE pvv.variant_id = ?
            AND po.deleted_at IS NULL
            AND pov.deleted_at IS NULL

          ORDER BY
            po.sort_order ASC,
            po.id ASC
        `,
        [variant.id],
      );

      const [images] = await connection.execute(
        `
          SELECT
            id,
            image_url,
            sort_order,
            is_primary
          FROM product_variant_images
          WHERE variant_id = ?
            AND deleted_at IS NULL
          ORDER BY
            is_primary DESC,
            sort_order ASC,
            id ASC
        `,
        [variant.id],
      );

      variant.id = Number(variant.id);
      variant.product_id = Number(variant.product_id);
      variant.price = Number(variant.price || 0);

      variant.sale_price =
        variant.sale_price !== null ? Number(variant.sale_price) : null;

      variant.quantity = Number(variant.quantity || 0);
      variant.status = Number(variant.status);
      variant.is_default = Number(variant.is_default);
      variant.sort_order = Number(variant.sort_order || 0);

      variant.values = values.map((item) => ({
        ...item,
        id: Number(item.id),
        option_id: Number(item.option_id),
        option_value_id: Number(item.option_value_id),
      }));

      variant.images = images.map((item) => ({
        ...item,
        id: Number(item.id),
        sort_order: Number(item.sort_order || 0),
        is_primary: Number(item.is_primary),
      }));
    }

    return variants;
  }

  // ============================================================
  // GET PRODUCT OPTIONS
  // ============================================================

  static async getOptionsByProductId(productId, connection = pool) {
    const [rows] = await connection.execute(
      `
        SELECT DISTINCT
          po.id AS option_id,
          po.name AS option_name,
          po.code AS option_code,
          po.display_type,
          po.sort_order AS option_sort_order,

          pov.id AS option_value_id,
          pov.value,
          pov.label,
          pov.color_code,
          pov.sort_order AS value_sort_order

        FROM product_variants pv

        INNER JOIN product_variant_values pvv
          ON pvv.variant_id = pv.id

        INNER JOIN product_options po
          ON po.id = pvv.option_id

        INNER JOIN product_option_values pov
          ON pov.id = pvv.option_value_id

        WHERE
          pv.product_id = ?
          AND pv.deleted_at IS NULL

          AND po.deleted_at IS NULL
          AND po.status = 1

          AND pov.deleted_at IS NULL
          AND pov.status = 1

        ORDER BY
          po.sort_order ASC,
          po.id ASC,
          pov.sort_order ASC,
          pov.id ASC
      `,
      [productId],
    );

    const map = new Map();

    for (const row of rows) {
      const optionId = Number(row.option_id);

      if (!map.has(optionId)) {
        map.set(optionId, {
          id: optionId,
          name: row.option_name,
          code: row.option_code,
          display_type: row.display_type,
          sort_order: Number(row.option_sort_order || 0),
          values: [],
        });
      }

      const option = map.get(optionId);

      const valueId = Number(row.option_value_id);

      if (!option.values.some((item) => item.id === valueId)) {
        option.values.push({
          id: valueId,
          value: row.value,
          label: row.label,
          color_code: row.color_code,
          sort_order: Number(row.value_sort_order || 0),
        });
      }
    }

    return Array.from(map.values());
  }

  // ============================================================
  // DETAIL
  // ============================================================

  static async getProductVariantData(productId, connection = pool) {
    const [options, variants] = await Promise.all([
      ProductVariant.getOptionsByProductId(productId, connection),

      ProductVariant.getVariantsByProductId(productId, {}, connection),
    ]);

    return {
      options,
      variants,
      has_variants: variants.length > 1 || options.length > 0,
    };
  }

  // ============================================================
  // DEFAULT VARIANT
  // ============================================================

  static async getDefaultVariant(productId, connection = pool) {
    const [rows] = await connection.execute(
      `
        SELECT
          id,
          product_id,
          sku,
          variant_name,
          price,
          sale_price,
          quantity,
          thumbnail,
          status,
          is_default,
          sort_order
        FROM product_variants
        WHERE product_id = ?
          AND deleted_at IS NULL
          AND is_default = 1
        ORDER BY id ASC
        LIMIT 1
      `,
      [productId],
    );

    return rows[0] || null;
  }

  static async setDefaultVariant(connection, productId, variantId) {
    const [rows] = await connection.execute(
      `
        SELECT id
        FROM product_variants
        WHERE id = ?
          AND product_id = ?
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [variantId, productId],
    );

    if (rows.length === 0) {
      throw new Error("Biến thể không tồn tại hoặc không thuộc sản phẩm này.");
    }

    await connection.execute(
      `
        UPDATE product_variants
        SET
          is_default = 0,
          updated_at = NOW()
        WHERE product_id = ?
          AND deleted_at IS NULL
      `,
      [productId],
    );

    await connection.execute(
      `
        UPDATE product_variants
        SET
          is_default = 1,
          updated_at = NOW()
        WHERE id = ?
          AND product_id = ?
          AND deleted_at IS NULL
      `,
      [variantId, productId],
    );

    await ProductVariant.syncProductAggregate(connection, productId);
  }

  // ============================================================
  // SYNCHRONIZE PRODUCTS TABLE
  // ============================================================

  static async syncProductAggregate(connection, productId) {
    /*
     * QUY ƯỚC:
     *
     * products.quantity
     * = tổng tồn kho vật lý của tất cả variant chưa bị xóa.
     *
     * Không phụ thuộc variant.status.
     *
     * status chỉ quyết định variant có đang được bán hay không,
     * không làm tồn kho vật lý biến mất.
     *
     * products.sku
     * products.price
     * products.sale_price
     * products.thumbnail
     *
     * = dữ liệu của default variant.
     */

    const [variantRows] = await connection.execute(
      `
      SELECT
        id,
        product_id,
        sku,
        variant_name,
        price,
        sale_price,
        quantity,
        thumbnail,
        status,
        is_default,
        sort_order

      FROM product_variants

      WHERE
        product_id = ?
        AND deleted_at IS NULL

      ORDER BY
        is_default DESC,
        sort_order ASC,
        id ASC
    `,
      [productId],
    );

    // ==========================================================
    // KHÔNG CÓ VARIANT
    // ==========================================================

    if (variantRows.length === 0) {
      return;
    }

    // ==========================================================
    // DEFAULT VARIANT
    // ==========================================================

    let defaultVariant =
      variantRows.find((item) => Number(item.is_default) === 1) ||
      variantRows[0];

    /*
     * Dữ liệu legacy có thể không có default.
     * Khi đó tự chọn variant đầu tiên.
     */
    const hasDefault = variantRows.some(
      (item) => Number(item.is_default) === 1,
    );

    if (!hasDefault) {
      await connection.execute(
        `
        UPDATE product_variants

        SET
          is_default = CASE
            WHEN id = ? THEN 1
            ELSE 0
          END,
          updated_at = NOW()

        WHERE
          product_id = ?
          AND deleted_at IS NULL
      `,
        [defaultVariant.id, productId],
      );

      defaultVariant = {
        ...defaultVariant,
        is_default: 1,
      };
    }

    // ==========================================================
    // TOTAL PHYSICAL STOCK
    // ==========================================================

    const totalQuantity = variantRows.reduce((total, item) => {
      const quantity = Number(item.quantity || 0);

      return total + Math.max(Number.isFinite(quantity) ? quantity : 0, 0);
    }, 0);

    // ==========================================================
    // SYNC PRODUCT AGGREGATE
    // ==========================================================

    if (defaultVariant.thumbnail) {
      await connection.execute(
        `
        UPDATE products

        SET
          sku = ?,
          price = ?,
          sale_price = ?,
          quantity = ?,
          thumbnail = ?,
          updated_at = NOW()

        WHERE
          id = ?
          AND deleted_at IS NULL
      `,
        [
          defaultVariant.sku,
          defaultVariant.price,
          defaultVariant.sale_price,
          totalQuantity,
          defaultVariant.thumbnail,
          productId,
        ],
      );
    } else {
      /*
       * Variant không có thumbnail riêng:
       * giữ thumbnail chung hiện tại của Product.
       */
      await connection.execute(
        `
        UPDATE products

        SET
          sku = ?,
          price = ?,
          sale_price = ?,
          quantity = ?,
          updated_at = NOW()

        WHERE
          id = ?
          AND deleted_at IS NULL
      `,
        [
          defaultVariant.sku,
          defaultVariant.price,
          defaultVariant.sale_price,
          totalQuantity,
          productId,
        ],
      );
    }
  }

  // ============================================================
  // SOFT DELETE
  // ============================================================

  static async softDeleteByProduct(connection, productId) {
    await connection.execute(
      `
        UPDATE product_variants
        SET
          deleted_at = NOW(),
          updated_at = NOW()
        WHERE product_id = ?
          AND deleted_at IS NULL
      `,
      [productId],
    );
  }

  static async restoreByProduct(connection, productId) {
    await connection.execute(
      `
        UPDATE product_variants
        SET
          deleted_at = NULL,
          updated_at = NOW()
        WHERE product_id = ?
          AND deleted_at IS NOT NULL
      `,
      [productId],
    );
  }

  // ============================================================
  // FORCE DELETE
  // ============================================================

  static async forceDeleteByProduct(connection, productId) {
    const normalizedProductId = Number(productId);

    if (!Number.isInteger(normalizedProductId) || normalizedProductId <= 0) {
      throw new Error("ID sản phẩm không hợp lệ.");
    }

    // ==========================================================
    // GET ALL VARIANTS OF PRODUCT
    // ==========================================================

    const [variants] = await connection.execute(
      `
      SELECT
        id,
        product_id,
        sku,
        variant_name

      FROM product_variants

      WHERE product_id = ?

      ORDER BY id ASC
    `,
      [normalizedProductId],
    );

    const variantIds = variants.map((variant) => Number(variant.id));

    // ==========================================================
    // CART ITEMS
    //
    // Cart chỉ là dữ liệu tạm.
    // Khi Product bị force-delete thì cart item không còn giá trị
    // nghiệp vụ, vì vậy được phép xóa.
    //
    // Phải xóa TRƯỚC product_variants vì:
    //
    // cart_items.variant_id
    // -> product_variants.id
    // ==========================================================

    await connection.execute(
      `
      DELETE FROM cart_items

      WHERE product_id = ?
    `,
      [normalizedProductId],
    );

    // ==========================================================
    // PC PARTS
    //
    // Không xóa PcPart ngay tại đây.
    //
    // Product.forceDelete() sẽ xử lý vì pc_parts còn có thể
    // được pc_build_items tham chiếu.
    //
    // Tuy nhiên cần bỏ variant_id trước để Variant có thể xóa.
    // ==========================================================

    await connection.execute(
      `
      UPDATE pc_parts

      SET
        variant_id = NULL,
        updated_at = NOW()

      WHERE
        product_id = ?
        AND variant_id IS NOT NULL
    `,
      [normalizedProductId],
    );

    // ==========================================================
    // VARIANT IMAGES
    // ==========================================================

    if (variantIds.length > 0) {
      const placeholders = variantIds.map(() => "?").join(",");

      await connection.execute(
        `
        DELETE FROM product_variant_images

        WHERE variant_id IN (${placeholders})
      `,
        variantIds,
      );

      // ========================================================
      // VARIANT VALUES
      // ========================================================

      await connection.execute(
        `
        DELETE FROM product_variant_values

        WHERE variant_id IN (${placeholders})
      `,
        variantIds,
      );
    }

    // ==========================================================
    // VARIANTS
    // ==========================================================

    await connection.execute(
      `
      DELETE FROM product_variants

      WHERE product_id = ?
    `,
      [normalizedProductId],
    );
  }

  // ============================================================
  // UPDATE SUPPORT
  // ============================================================

  static async getVariantById(variantId, productId = null, connection = pool) {
    let sql = `
      SELECT
        id,
        product_id,
        sku,
        variant_name,
        price,
        sale_price,
        quantity,
        thumbnail,
        status,
        is_default,
        sort_order,
        created_at,
        updated_at,
        deleted_at

      FROM product_variants

      WHERE id = ?
    `;

    const params = [variantId];

    if (productId) {
      sql += `
        AND product_id = ?
      `;

      params.push(productId);
    }

    sql += `
      LIMIT 1
    `;

    const [rows] = await connection.execute(sql, params);

    return rows[0] || null;
  }

  static async updateVariant(connection, productId, variantId, data) {
    const current = await ProductVariant.getVariantById(
      variantId,
      productId,
      connection,
    );

    if (!current) {
      throw new Error(`Không tìm thấy biến thể ID ${variantId} của sản phẩm.`);
    }

    const sku = String(data.sku || "").trim();

    if (!sku) {
      throw new Error("SKU biến thể không được để trống.");
    }

    const variantName = String(data.variant_name || "").trim() || "Mặc định";

    const price = Number(data.price);

    const salePrice =
      data.sale_price === "" ||
      data.sale_price === null ||
      data.sale_price === undefined
        ? null
        : Number(data.sale_price);

    const quantity = Number(data.quantity ?? 0);

    if (!Number.isFinite(price) || price <= 0) {
      throw new Error(`Giá của biến thể "${variantName}" không hợp lệ.`);
    }

    if (!Number.isInteger(quantity) || quantity < 0) {
      throw new Error(`Số lượng của biến thể "${variantName}" không hợp lệ.`);
    }

    if (
      salePrice !== null &&
      (!Number.isFinite(salePrice) || salePrice < 0 || salePrice >= price)
    ) {
      throw new Error(
        `Giá khuyến mãi của biến thể "${variantName}" phải nhỏ hơn giá bán.`,
      );
    }

    const skuExists = await ProductVariant.isSkuUsedAnywhere(
      sku,
      {
        excludeProductId: productId,
        excludeVariantId: variantId,
      },
      connection,
    );

    if (skuExists) {
      throw new Error(`SKU biến thể "${sku}" đã tồn tại.`);
    }

    const thumbnail =
      data.thumbnail !== undefined
        ? ProductVariant.normalizeNullable(data.thumbnail)
        : current.thumbnail;

    const [result] = await connection.execute(
      `
        UPDATE product_variants

        SET
          sku = ?,
          variant_name = ?,
          price = ?,
          sale_price = ?,
          quantity = ?,
          thumbnail = ?,
          status = ?,
          is_default = ?,
          sort_order = ?,
          deleted_at = NULL,
          updated_at = NOW()

        WHERE
          id = ?
          AND product_id = ?
      `,
      [
        sku,
        variantName,
        price,
        salePrice,
        quantity,
        thumbnail,
        ProductVariant.toBooleanNumber(data.status, 1),
        ProductVariant.toBooleanNumber(data.is_default, 0),
        Number(data.sort_order || 0),
        variantId,
        productId,
      ],
    );

    return result.affectedRows;
  }

  // ============================================================
  // SOFT DELETE SINGLE VARIANT
  // ============================================================

  // ============================================================
  // VARIANT DELETE / RESTORE HELPERS
  // ============================================================

  static async getProductVariantsForUpdate(connection, productId) {
    const [rows] = await connection.execute(
      `
        SELECT
          id,
          product_id,
          sku,
          variant_name,
          price,
          sale_price,
          quantity,
          thumbnail,
          status,
          is_default,
          sort_order,
          created_at,
          updated_at,
          deleted_at

        FROM product_variants

        WHERE product_id = ?

        ORDER BY
          is_default DESC,
          sort_order ASC,
          id ASC

        FOR UPDATE
      `,
      [productId],
    );

    return rows.map((row) => ({
      ...row,

      id: Number(row.id),

      product_id: Number(row.product_id),

      price: Number(row.price || 0),

      sale_price:
        row.sale_price !== null && row.sale_price !== undefined
          ? Number(row.sale_price)
          : null,

      quantity: Number(row.quantity || 0),

      status: Number(row.status),

      is_default: Number(row.is_default),

      sort_order: Number(row.sort_order || 0),
    }));
  }

  // ============================================================
  // GET VARIANT COMBINATION
  //
  // Ví dụ:
  // capacity=16GB + bus=5200MHz
  //
  // được biểu diễn bằng:
  // option_id:option_value_id|option_id:option_value_id
  //
  // Dùng ID thay vì text để tránh lỗi chữ hoa/thường.
  // ============================================================

  static async getVariantCombinationKey(variantId, connection = pool) {
    const [rows] = await connection.execute(
      `
        SELECT
          option_id,
          option_value_id

        FROM product_variant_values

        WHERE variant_id = ?

        ORDER BY
          option_id ASC,
          option_value_id ASC
      `,
      [variantId],
    );

    if (rows.length === 0) {
      return "";
    }

    return rows
      .map((row) => `${Number(row.option_id)}:${Number(row.option_value_id)}`)
      .sort()
      .join("|");
  }

  // ============================================================
  // CHECK COMBINATION CONFLICT
  // ============================================================

  static async findVariantCombinationConflict(
    connection,
    productId,
    variantId,
  ) {
    const targetKey = await ProductVariant.getVariantCombinationKey(
      variantId,
      connection,
    );

    /*
     * Variant không có option/value thì không cần kiểm tra
     * combination.
     */
    if (!targetKey) {
      return null;
    }

    const [variants] = await connection.execute(
      `
        SELECT
          id,
          sku,
          variant_name

        FROM product_variants

        WHERE
          product_id = ?
          AND id <> ?
          AND deleted_at IS NULL
      `,
      [productId, variantId],
    );

    for (const variant of variants) {
      const otherKey = await ProductVariant.getVariantCombinationKey(
        variant.id,
        connection,
      );

      if (otherKey && otherKey === targetKey) {
        return {
          id: Number(variant.id),

          sku: variant.sku,

          variant_name: variant.variant_name,
        };
      }
    }

    return null;
  }

  // ============================================================
  // SOFT DELETE SINGLE VARIANT - LOW LEVEL
  // ============================================================

  static async softDeleteVariant(connection, productId, variantId) {
    const [result] = await connection.execute(
      `
        UPDATE product_variants

        SET
          deleted_at = NOW(),
          is_default = 0,
          updated_at = NOW()

        WHERE
          id = ?
          AND product_id = ?
          AND deleted_at IS NULL
      `,
      [variantId, productId],
    );

    return result.affectedRows;
  }

  // ============================================================
  // SAFE DELETE VARIANT
  //
  // RULES:
  //
  // 1. Variant phải thuộc Product.
  // 2. Không được xóa variant cuối cùng.
  // 3. Nếu xóa default:
  //    phải tìm variant khác status = 1 để thay default.
  // 4. Xóa xong phải sync products.quantity,
  //    sku, price, sale_price.
  // ============================================================

  static async deleteVariantSafely(connection, productId, variantId) {
    const variants = await ProductVariant.getProductVariantsForUpdate(
      connection,
      productId,
    );

    const activeVariants = variants.filter((item) => !item.deleted_at);

    const target = activeVariants.find(
      (item) => Number(item.id) === Number(variantId),
    );

    if (!target) {
      throw new Error(
        "Không tìm thấy biến thể hoặc biến thể không thuộc sản phẩm này.",
      );
    }

    // ========================================================
    // KHÔNG CHO XÓA VARIANT CUỐI CÙNG
    // ========================================================

    if (activeVariants.length <= 1) {
      throw new Error("Không thể xóa biến thể cuối cùng của sản phẩm.");
    }

    // ========================================================
    // NẾU TARGET LÀ DEFAULT
    // ========================================================

    let replacementDefault = null;

    if (Number(target.is_default) === 1) {
      replacementDefault =
        activeVariants
          .filter(
            (item) =>
              Number(item.id) !== Number(target.id) &&
              Number(item.status) === 1,
          )
          .sort((a, b) => {
            if (Number(a.sort_order) !== Number(b.sort_order)) {
              return Number(a.sort_order) - Number(b.sort_order);
            }

            return Number(a.id) - Number(b.id);
          })[0] || null;

      /*
       * Không tự bật một variant đang ẩn.
       *
       * Admin phải chủ động bật hoặc đặt default khác trước.
       */
      if (!replacementDefault) {
        throw new Error(
          "Không thể xóa biến thể mặc định vì không còn biến thể đang hiển thị để thay thế.",
        );
      }
    }

    // ========================================================
    // SOFT DELETE
    // ========================================================

    const affectedRows = await ProductVariant.softDeleteVariant(
      connection,
      productId,
      variantId,
    );

    if (affectedRows === 0) {
      throw new Error("Không thể xóa biến thể.");
    }

    // ========================================================
    // GÁN DEFAULT MỚI
    // ========================================================

    if (replacementDefault) {
      await connection.execute(
        `
          UPDATE product_variants

          SET
            is_default = 0,
            updated_at = NOW()

          WHERE
            product_id = ?
            AND deleted_at IS NULL
        `,
        [productId],
      );

      await connection.execute(
        `
          UPDATE product_variants

          SET
            is_default = 1,
            updated_at = NOW()

          WHERE
            id = ?
            AND product_id = ?
            AND deleted_at IS NULL
        `,
        [replacementDefault.id, productId],
      );
    }

    // ========================================================
    // SYNC PRODUCT
    // ========================================================

    await ProductVariant.syncProductAggregate(connection, productId);

    return {
      deleted_variant: {
        id: Number(target.id),

        sku: target.sku,

        variant_name: target.variant_name,

        quantity: Number(target.quantity || 0),

        was_default: Number(target.is_default) === 1,
      },

      replacement_default: replacementDefault
        ? {
            id: Number(replacementDefault.id),

            sku: replacementDefault.sku,

            variant_name: replacementDefault.variant_name,
          }
        : null,
    };
  }

  // ============================================================
  // RESTORE SINGLE VARIANT - LOW LEVEL
  // ============================================================

  static async restoreVariant(connection, productId, variantId) {
    const [result] = await connection.execute(
      `
        UPDATE product_variants

        SET
          deleted_at = NULL,
          is_default = 0,
          updated_at = NOW()

        WHERE
          id = ?
          AND product_id = ?
          AND deleted_at IS NOT NULL
      `,
      [variantId, productId],
    );

    return result.affectedRows;
  }

  // ============================================================
  // SAFE RESTORE VARIANT
  //
  // RULES:
  //
  // 1. Variant phải đang bị soft-delete.
  // 2. SKU không được conflict.
  // 3. Combination không được conflict.
  // 4. Restore không tự chiếm default nếu Product đã có default.
  // 5. products.quantity phải cộng lại stock variant vừa restore.
  // ============================================================

  static async restoreVariantSafely(connection, productId, variantId) {
    const variants = await ProductVariant.getProductVariantsForUpdate(
      connection,
      productId,
    );

    const target = variants.find(
      (item) => Number(item.id) === Number(variantId),
    );

    if (!target) {
      throw new Error(
        "Không tìm thấy biến thể hoặc biến thể không thuộc sản phẩm này.",
      );
    }

    if (!target.deleted_at) {
      throw new Error("Biến thể chưa bị xóa.");
    }

    // ========================================================
    // SKU CONFLICT
    // ========================================================

    const skuExists = await ProductVariant.isSkuUsedAnywhere(
      target.sku,
      {
        excludeProductId: productId,

        excludeVariantId: variantId,
      },
      connection,
    );

    if (skuExists) {
      throw new Error(
        `Không thể khôi phục vì SKU biến thể "${target.sku}" đã được sử dụng.`,
      );
    }

    // ========================================================
    // COMBINATION CONFLICT
    //
    // product_variant_values vẫn được giữ khi soft delete,
    // vì vậy ta có thể kiểm tra tổ hợp trước khi restore.
    // ========================================================

    const combinationConflict =
      await ProductVariant.findVariantCombinationConflict(
        connection,
        productId,
        variantId,
      );

    if (combinationConflict) {
      throw new Error(
        `Không thể khôi phục vì tổ hợp thuộc tính đã được sử dụng bởi biến thể "${combinationConflict.variant_name}".`,
      );
    }

    // ========================================================
    // RESTORE
    // ========================================================

    const affectedRows = await ProductVariant.restoreVariant(
      connection,
      productId,
      variantId,
    );

    if (affectedRows === 0) {
      throw new Error("Không thể khôi phục biến thể.");
    }

    // ========================================================
    // CHECK DEFAULT
    // ========================================================

    const [defaultRows] = await connection.execute(
      `
        SELECT
          id

        FROM product_variants

        WHERE
          product_id = ?
          AND deleted_at IS NULL
          AND is_default = 1

        LIMIT 1
      `,
      [productId],
    );

    /*
     * Trường hợp dữ liệu legacy / lỗi cũ khiến Product không có default.
     *
     * Chỉ được lấy một variant status = 1 làm default.
     */
    if (defaultRows.length === 0) {
      const [visibleRows] = await connection.execute(
        `
          SELECT
            id

          FROM product_variants

          WHERE
            product_id = ?
            AND deleted_at IS NULL
            AND status = 1

          ORDER BY
            CASE
              WHEN id = ? THEN 0
              ELSE 1
            END,
            sort_order ASC,
            id ASC

          LIMIT 1
        `,
        [productId, variantId],
      );

      if (visibleRows.length === 0) {
        throw new Error(
          "Không thể khôi phục vì sản phẩm không có biến thể đang hiển thị để làm mặc định.",
        );
      }

      await connection.execute(
        `
          UPDATE product_variants

          SET
            is_default = CASE
              WHEN id = ? THEN 1
              ELSE 0
            END,
            updated_at = NOW()

          WHERE
            product_id = ?
            AND deleted_at IS NULL
        `,
        [visibleRows[0].id, productId],
      );
    }

    // ========================================================
    // SYNC PRODUCT
    // ========================================================

    await ProductVariant.syncProductAggregate(connection, productId);

    const restoredVariant = await ProductVariant.getVariantById(
      variantId,
      productId,
      connection,
    );

    return {
      restored_variant: restoredVariant,
    };
  }

  // ============================================================
  // DELETE ALL ACTIVE VARIANT VALUES
  // ============================================================

  static async replaceVariantValues(
    connection,
    variantId,
    optionMap,
    values = {},
  ) {
    await ProductVariant.deleteVariantValues(connection, variantId);

    const optionCodes = Object.keys(optionMap || {});

    if (optionCodes.length === 0) {
      return;
    }

    let normalizedValues = values || {};

    if (Array.isArray(normalizedValues)) {
      const mapped = {};

      for (const item of normalizedValues) {
        const code = ProductVariant.normalizeCode(
          item.option_code || item.code,
        );

        if (code) {
          mapped[code] = item.value ?? item.option_value ?? "";
        }
      }

      normalizedValues = mapped;
    }

    for (const optionCode of optionCodes) {
      const option = optionMap[optionCode];

      const selectedValue = String(normalizedValues[optionCode] ?? "").trim();

      if (!selectedValue) {
        throw new Error(`Biến thể chưa chọn giá trị cho "${option.name}".`);
      }

      const valueInfo = option.values[selectedValue.toLowerCase()];

      if (!valueInfo) {
        throw new Error(
          `Giá trị "${selectedValue}" không thuộc "${option.name}".`,
        );
      }

      await ProductVariant.attachVariantValue(
        connection,
        variantId,
        option.id,
        valueInfo.id,
      );
    }
  }

  // ============================================================
  // SYNC PRODUCT VARIANTS ON UPDATE
  // ============================================================

  static async syncProductVariants(
    connection,
    productId,
    { options = [], variants = [], fallback = {} } = {},
  ) {
    const existingVariants = await ProductVariant.getVariantsByProductId(
      productId,
      {
        includeDeleted: true,
      },
      connection,
    );

    const normalizedVariants = Array.isArray(variants) ? variants : [];

    // ==========================================================
    // Sản phẩm không gửi variants:
    // giữ/tạo 1 biến thể mặc định.
    // ==========================================================

    if (normalizedVariants.length === 0) {
      let defaultVariant =
        existingVariants.find(
          (item) => Number(item.is_default) === 1 && !item.deleted_at,
        ) ||
        existingVariants.find((item) => !item.deleted_at) ||
        null;

      if (defaultVariant) {
        await ProductVariant.updateVariant(
          connection,
          productId,
          defaultVariant.id,
          {
            sku: fallback.sku,
            variant_name: "Mặc định",
            price: fallback.price,
            sale_price: fallback.sale_price,
            quantity: Number(fallback.quantity || 0),
            thumbnail: fallback.thumbnail ?? defaultVariant.thumbnail ?? null,
            status: fallback.status ?? 1,
            is_default: 1,
            sort_order: 1,
          },
        );

        await ProductVariant.deleteVariantValues(connection, defaultVariant.id);

        for (const variant of existingVariants) {
          if (
            Number(variant.id) !== Number(defaultVariant.id) &&
            !variant.deleted_at
          ) {
            await ProductVariant.softDeleteVariant(
              connection,
              productId,
              variant.id,
            );
          }
        }
      } else {
        await ProductVariant.createVariant(connection, productId, {
          sku: fallback.sku,
          variant_name: "Mặc định",
          price: fallback.price,
          sale_price: fallback.sale_price,
          quantity: Number(fallback.quantity || 0),
          thumbnail: fallback.thumbnail || null,
          status: fallback.status ?? 1,
          is_default: 1,
          sort_order: 1,
        });
      }

      await ProductVariant.syncProductAggregate(connection, productId);

      return;
    }

    // ==========================================================
    // Product có variants thật
    // ==========================================================

    const optionMap =
      options.length > 0
        ? await ProductVariant.resolveProductOptions(connection, options)
        : {};

    const optionCodes = Object.keys(optionMap);

    const retainedVariantIds = new Set();

    const seenSkus = new Set();

    const seenCombinations = new Set();

    let defaultVariantId = null;

    for (let index = 0; index < normalizedVariants.length; index++) {
      const variant = normalizedVariants[index];

      const sku = String(variant.sku || "").trim();

      if (!sku) {
        throw new Error(`SKU biến thể thứ ${index + 1} không được để trống.`);
      }

      const skuKey = sku.toLowerCase();

      if (seenSkus.has(skuKey)) {
        throw new Error(`SKU "${sku}" bị trùng trong danh sách biến thể.`);
      }

      seenSkus.add(skuKey);

      let values = variant.values || {};

      if (Array.isArray(values)) {
        const mapped = {};

        for (const item of values) {
          const code = ProductVariant.normalizeCode(
            item.option_code || item.code,
          );

          if (code) {
            mapped[code] = item.value ?? item.option_value ?? "";
          }
        }

        values = mapped;
      }

      const combinationParts = [];

      if (optionCodes.length > 0) {
        for (const optionCode of optionCodes) {
          const option = optionMap[optionCode];

          const selectedValue = String(values[optionCode] ?? "").trim();

          if (!selectedValue) {
            throw new Error(
              `Biến thể "${sku}" chưa chọn giá trị cho "${option.name}".`,
            );
          }

          const valueInfo = option.values[selectedValue.toLowerCase()];

          if (!valueInfo) {
            throw new Error(
              `Giá trị "${selectedValue}" không thuộc "${option.name}".`,
            );
          }

          combinationParts.push(
            `${optionCode}:${String(valueInfo.value).toLowerCase()}`,
          );
        }

        const combinationKey = combinationParts.sort().join("|");

        if (seenCombinations.has(combinationKey)) {
          throw new Error(`Tổ hợp thuộc tính của biến thể "${sku}" bị trùng.`);
        }

        seenCombinations.add(combinationKey);
      } else if (Object.keys(values).length > 0) {
        throw new Error(
          `Biến thể "${sku}" có values nhưng sản phẩm không khai báo options.`,
        );
      }

      const isDefault = ProductVariant.toBooleanNumber(variant.is_default, 0);

      let variantId = variant.id ? Number(variant.id) : null;

      if (variantId) {
        const existing = await ProductVariant.getVariantById(
          variantId,
          productId,
          connection,
        );

        if (!existing) {
          throw new Error(`Biến thể ID ${variantId} không thuộc sản phẩm này.`);
        }

        await ProductVariant.updateVariant(connection, productId, variantId, {
          ...variant,
          sku,
          is_default: isDefault,
          sort_order:
            variant.sort_order !== undefined ? variant.sort_order : index + 1,
        });
      } else {
        variantId = await ProductVariant.createVariant(connection, productId, {
          ...variant,
          sku,
          is_default: isDefault,
          sort_order:
            variant.sort_order !== undefined ? variant.sort_order : index + 1,
        });
      }

      retainedVariantIds.add(Number(variantId));

      if (isDefault) {
        if (defaultVariantId !== null) {
          throw new Error("Mỗi sản phẩm chỉ được có một biến thể mặc định.");
        }

        defaultVariantId = Number(variantId);
      }

      await ProductVariant.replaceVariantValues(
        connection,
        variantId,
        optionMap,
        values,
      );
    }

    // ==========================================================
    // Những variant cũ không còn trong payload → soft delete.
    // ==========================================================

    for (const existing of existingVariants) {
      if (
        !existing.deleted_at &&
        !retainedVariantIds.has(Number(existing.id))
      ) {
        await ProductVariant.softDeleteVariant(
          connection,
          productId,
          existing.id,
        );
      }
    }

    // ==========================================================
    // Không chỉ định default → lấy variant đầu tiên.
    // ==========================================================

    if (defaultVariantId === null && retainedVariantIds.size > 0) {
      defaultVariantId = Array.from(retainedVariantIds)[0];
    }

    if (defaultVariantId !== null) {
      await connection.execute(
        `
          UPDATE product_variants

          SET
            is_default = 0,
            updated_at = NOW()

          WHERE
            product_id = ?
            AND deleted_at IS NULL
        `,
        [productId],
      );

      await connection.execute(
        `
          UPDATE product_variants

          SET
            is_default = 1,
            updated_at = NOW()

          WHERE
            id = ?
            AND product_id = ?
            AND deleted_at IS NULL
        `,
        [defaultVariantId, productId],
      );
    }

    await ProductVariant.syncProductAggregate(connection, productId);
  }
  // ============================================================
  // VARIANT STOCK MANAGEMENT
  // ============================================================

  static async getVariantForUpdate(connection, productId, variantId) {
    const [rows] = await connection.execute(
      `
        SELECT
          id,
          product_id,
          sku,
          variant_name,
          price,
          sale_price,
          quantity,
          thumbnail,
          status,
          is_default,
          sort_order,
          created_at,
          updated_at,
          deleted_at

        FROM product_variants

        WHERE
          id = ?
          AND product_id = ?
          AND deleted_at IS NULL

        LIMIT 1

        FOR UPDATE
      `,
      [variantId, productId],
    );

    if (rows.length === 0) {
      return null;
    }

    const variant = rows[0];

    return {
      ...variant,

      id: Number(variant.id),

      product_id: Number(variant.product_id),

      price: Number(variant.price || 0),

      sale_price:
        variant.sale_price !== null ? Number(variant.sale_price) : null,

      quantity: Number(variant.quantity || 0),

      status: Number(variant.status),

      is_default: Number(variant.is_default),

      sort_order: Number(variant.sort_order || 0),
    };
  }

  static async updateVariantQuantity(
    connection,
    productId,
    variantId,
    quantity,
  ) {
    const normalizedQuantity = Number(quantity);

    if (!Number.isInteger(normalizedQuantity) || normalizedQuantity < 0) {
      throw new Error("Số lượng biến thể không hợp lệ.");
    }

    const [result] = await connection.execute(
      `
          UPDATE product_variants

          SET
            quantity = ?,
            updated_at = NOW()

          WHERE
            id = ?
            AND product_id = ?
            AND deleted_at IS NULL
        `,
      [normalizedQuantity, variantId, productId],
    );

    return result.affectedRows;
  }

  static async getProductQuantityForUpdate(connection, productId) {
    const [rows] = await connection.execute(
      `
          SELECT
            id,
            quantity

          FROM products

          WHERE
            id = ?
            AND deleted_at IS NULL

          LIMIT 1

          FOR UPDATE
        `,
      [productId],
    );

    if (rows.length === 0) {
      return null;
    }

    return {
      id: Number(rows[0].id),

      quantity: Number(rows[0].quantity || 0),
    };
  }

  // ============================================================
  // CREATE SINGLE VARIANT SAFELY
  //
  // Dùng cho:
  // POST /api/admin/products/:productId/variants
  //
  // RULES:
  // 1. Product phải tồn tại.
  // 2. SKU không được trùng Product / Variant.
  // 3. Product có options thì Variant phải chọn đủ values.
  // 4. Không cho gửi option không thuộc Product.
  // 5. Không cho trùng tổ hợp thuộc tính với Variant đang hoạt động.
  // 6. Nếu is_default = 1 thì bỏ default cũ.
  // 7. Nếu Product chưa có default thì Variant mới tự làm default.
  // 8. Sau khi tạo phải sync Product aggregate.
  // ============================================================

  static async createSingleVariantSafely(connection, productId, data = {}) {
    const normalizedProductId = Number(productId);

    if (!Number.isInteger(normalizedProductId) || normalizedProductId <= 0) {
      throw new Error("ID sản phẩm không hợp lệ.");
    }

    // ==========================================================
    // LOCK PRODUCT
    // ==========================================================

    const [productRows] = await connection.execute(
      `
        SELECT
          id,
          sku,
          price,
          sale_price,
          quantity,
          thumbnail,
          status

        FROM products

        WHERE
          id = ?
          AND deleted_at IS NULL

        LIMIT 1

        FOR UPDATE
      `,
      [normalizedProductId],
    );

    if (productRows.length === 0) {
      throw new Error("Sản phẩm không tồn tại.");
    }

    // ==========================================================
    // LOCK VARIANTS
    // ==========================================================

    const existingVariants = await ProductVariant.getProductVariantsForUpdate(
      connection,
      normalizedProductId,
    );

    const activeVariants = existingVariants.filter((item) => !item.deleted_at);

    // ==========================================================
    // NORMALIZE SKU
    // ==========================================================

    const sku = String(data.sku || "").trim();

    if (!sku) {
      throw new Error("SKU biến thể không được để trống.");
    }

    const skuExists = await ProductVariant.isSkuUsedAnywhere(
      sku,
      {
        excludeProductId: normalizedProductId,
      },
      connection,
    );

    if (skuExists) {
      throw new Error(`SKU biến thể "${sku}" đã tồn tại.`);
    }

    // ==========================================================
    // GET OPTIONS CỦA PRODUCT
    //
    // Không tạo option/value mới ở API single variant.
    // Variant mới chỉ được sử dụng những option/value đã tồn tại
    // trên Product.
    // ==========================================================

    const productOptions = await ProductVariant.getOptionsByProductId(
      normalizedProductId,
      connection,
    );

    const optionMap = {};

    for (const option of productOptions) {
      const code = ProductVariant.normalizeCode(option.code);

      optionMap[code] = {
        id: Number(option.id),
        name: option.name,
        code,
        display_type: option.display_type,

        values: (option.values || []).reduce((map, value) => {
          map[String(value.value).trim().toLowerCase()] = {
            id: Number(value.id),
            value: value.value,
            label: value.label,
          };

          return map;
        }, {}),
      };
    }

    const optionCodes = Object.keys(optionMap);

    // ==========================================================
    // NORMALIZE VALUES
    //
    // Hỗ trợ:
    //
    // values: {
    //   capacity: "64GB",
    //   bus: "5200MHz"
    // }
    //
    // hoặc:
    //
    // values: [
    //   {
    //     option_code: "capacity",
    //     value: "64GB"
    //   }
    // ]
    // ==========================================================

    let values = data.values || {};

    if (Array.isArray(values)) {
      const mapped = {};

      for (const item of values) {
        const code = ProductVariant.normalizeCode(
          item.option_code || item.code,
        );

        if (code) {
          mapped[code] = item.value ?? item.option_value ?? "";
        }
      }

      values = mapped;
    }

    if (!values || typeof values !== "object" || Array.isArray(values)) {
      throw new Error("Danh sách giá trị biến thể không hợp lệ.");
    }

    /*
     * Chuẩn hóa key.
     *
     * Ví dụ:
     *
     * "Bus RAM"
     *
     * sẽ thành:
     *
     * bus_ram
     */
    const normalizedValues = {};

    for (const [receivedCode, receivedValue] of Object.entries(values)) {
      const normalizedCode = ProductVariant.normalizeCode(receivedCode);

      if (!normalizedCode) {
        continue;
      }

      normalizedValues[normalizedCode] = receivedValue;
    }

    // ==========================================================
    // PRODUCT CÓ OPTIONS
    // ==========================================================

    const selectedValues = [];

    if (optionCodes.length > 0) {
      // --------------------------------------------------------
      // Không cho option lạ
      // --------------------------------------------------------

      for (const receivedCode of Object.keys(normalizedValues)) {
        if (!optionMap[receivedCode]) {
          throw new Error(
            `Thuộc tính "${receivedCode}" không tồn tại trong sản phẩm.`,
          );
        }
      }

      // --------------------------------------------------------
      // Phải chọn đủ tất cả options
      // --------------------------------------------------------

      for (const optionCode of optionCodes) {
        const option = optionMap[optionCode];

        const selectedValue = String(normalizedValues[optionCode] ?? "").trim();

        if (!selectedValue) {
          throw new Error(`Biến thể chưa chọn giá trị cho "${option.name}".`);
        }

        const valueInfo = option.values[selectedValue.toLowerCase()];

        if (!valueInfo) {
          throw new Error(
            `Giá trị "${selectedValue}" không thuộc "${option.name}".`,
          );
        }

        selectedValues.push({
          option_id: Number(option.id),

          option_value_id: Number(valueInfo.id),

          option_code: optionCode,

          option_name: option.name,

          value: valueInfo.value,
        });
      }
    } else if (Object.keys(normalizedValues).length > 0) {
      throw new Error(
        "Sản phẩm không có thuộc tính biến thể nhưng request lại gửi values.",
      );
    }

    // ==========================================================
    // CHECK DUPLICATE COMBINATION
    // ==========================================================

    if (selectedValues.length > 0) {
      const targetCombinationKey = selectedValues
        .map(
          (item) => `${Number(item.option_id)}:${Number(item.option_value_id)}`,
        )
        .sort()
        .join("|");

      for (const variant of activeVariants) {
        const existingCombinationKey =
          await ProductVariant.getVariantCombinationKey(variant.id, connection);

        if (
          existingCombinationKey &&
          existingCombinationKey === targetCombinationKey
        ) {
          throw new Error(
            `Tổ hợp thuộc tính này đã được sử dụng bởi biến thể "${variant.variant_name}".`,
          );
        }
      }
    }

    // ==========================================================
    // DEFAULT
    // ==========================================================

    let isDefault = ProductVariant.toBooleanNumber(data.is_default, 0);

    const currentDefault = activeVariants.find(
      (item) => Number(item.is_default) === 1,
    );

    /*
     * Product chưa có variant active/default:
     * variant đầu tiên tự động trở thành default.
     */
    if (activeVariants.length === 0 || !currentDefault) {
      isDefault = 1;
    }

    /*
     * Không cho variant ẩn trở thành default.
     */
    const status = ProductVariant.toBooleanNumber(data.status, 1);

    if (isDefault === 1 && status !== 1) {
      throw new Error("Biến thể mặc định phải ở trạng thái đang hiển thị.");
    }

    // ==========================================================
    // CREATE VARIANT
    // ==========================================================

    const variantId = await ProductVariant.createVariant(
      connection,
      normalizedProductId,
      {
        ...data,

        sku,

        status,

        is_default: isDefault,

        sort_order:
          data.sort_order !== undefined
            ? Number(data.sort_order)
            : activeVariants.length + 1,
      },
    );

    // ==========================================================
    // ATTACH VALUES
    // ==========================================================

    for (const selected of selectedValues) {
      await ProductVariant.attachVariantValue(
        connection,
        variantId,
        selected.option_id,
        selected.option_value_id,
      );
    }

    // ==========================================================
    // DEFAULT MỚI
    // ==========================================================

    if (isDefault === 1) {
      await connection.execute(
        `
          UPDATE product_variants

          SET
            is_default = CASE
              WHEN id = ? THEN 1
              ELSE 0
            END,
            updated_at = NOW()

          WHERE
            product_id = ?
            AND deleted_at IS NULL
        `,
        [variantId, normalizedProductId],
      );
    }

    // ==========================================================
    // SYNC PRODUCT
    // ==========================================================

    await ProductVariant.syncProductAggregate(connection, normalizedProductId);

    // ==========================================================
    // RETURN FULL VARIANT
    // ==========================================================

    const variants = await ProductVariant.getVariantsByProductId(
      normalizedProductId,
      {},
      connection,
    );

    const createdVariant =
      variants.find((item) => Number(item.id) === Number(variantId)) || null;

    return createdVariant;
  }

  // ============================================================
  // CLIENT - NORMALIZE VARIANT
  // ============================================================

  static normalizeClientVariant(variant) {
    if (!variant) {
      return null;
    }

    const price = Number(variant.price || 0);

    const salePrice =
      variant.sale_price !== null && variant.sale_price !== undefined
        ? Number(variant.sale_price)
        : null;

    const finalPrice =
      salePrice !== null && salePrice > 0 && price > 0 && salePrice < price
        ? salePrice
        : price;

    const quantity = Math.max(Number(variant.quantity || 0), 0);

    return {
      ...variant,

      id: Number(variant.id),

      product_id: Number(variant.product_id),

      price,

      sale_price: salePrice,

      final_price: finalPrice,

      quantity,

      status: Number(variant.status),

      is_default: Number(variant.is_default),

      sort_order: Number(variant.sort_order || 0),

      is_sale:
        salePrice !== null && salePrice > 0 && price > 0 && salePrice < price,

      discount_percent:
        salePrice !== null && salePrice > 0 && price > 0 && salePrice < price
          ? Math.round(((price - salePrice) / price) * 100)
          : 0,

      in_stock: quantity > 0,

      stock_status:
        quantity <= 0
          ? "out_of_stock"
          : quantity <= 5
            ? "low_stock"
            : "in_stock",
    };
  }

  // ============================================================
  // CLIENT - GET VISIBLE VARIANTS
  //
  // Chỉ trả variant:
  // - chưa bị xóa
  // - status = 1
  //
  // Không dùng getVariantsByProductId() của Admin vì Admin cần
  // nhìn thấy cả những variant đang ẩn.
  // ============================================================

  static async getClientVariantsByProductId(productId, connection = pool) {
    const [variants] = await connection.execute(
      `
        SELECT
          pv.id,
          pv.product_id,
          pv.sku,
          pv.variant_name,

          pv.price,
          pv.sale_price,
          pv.quantity,

          pv.thumbnail,

          pv.status,
          pv.is_default,
          pv.sort_order,

          pv.created_at,
          pv.updated_at

        FROM product_variants pv

        WHERE
          pv.product_id = ?
          AND pv.deleted_at IS NULL
          AND pv.status = 1

        ORDER BY
          pv.is_default DESC,
          pv.sort_order ASC,
          pv.id ASC
      `,
      [productId],
    );

    for (const variant of variants) {
      const [values] = await connection.execute(
        `
          SELECT
            pvv.id,
            pvv.option_id,
            pvv.option_value_id,

            po.name AS option_name,
            po.code AS option_code,
            po.display_type,
            po.sort_order AS option_sort_order,

            pov.value,
            pov.label,
            pov.color_code,
            pov.sort_order AS value_sort_order

          FROM product_variant_values pvv

          INNER JOIN product_options po
            ON po.id = pvv.option_id

          INNER JOIN product_option_values pov
            ON pov.id = pvv.option_value_id

          WHERE
            pvv.variant_id = ?

            AND po.deleted_at IS NULL
            AND po.status = 1

            AND pov.deleted_at IS NULL
            AND pov.status = 1

          ORDER BY
            po.sort_order ASC,
            po.id ASC,
            pov.sort_order ASC,
            pov.id ASC
        `,
        [variant.id],
      );

      const [images] = await connection.execute(
        `
          SELECT
            id,
            image_url,
            sort_order,
            is_primary

          FROM product_variant_images

          WHERE
            variant_id = ?
            AND deleted_at IS NULL

          ORDER BY
            is_primary DESC,
            sort_order ASC,
            id ASC
        `,
        [variant.id],
      );

      const normalized = ProductVariant.normalizeClientVariant(variant);

      Object.assign(variant, normalized);

      variant.values = values.map((item) => ({
        ...item,

        id: Number(item.id),

        option_id: Number(item.option_id),

        option_value_id: Number(item.option_value_id),

        option_sort_order: Number(item.option_sort_order || 0),

        value_sort_order: Number(item.value_sort_order || 0),
      }));

      variant.images = images.map((item) => ({
        ...item,

        id: Number(item.id),

        sort_order: Number(item.sort_order || 0),

        is_primary: Number(item.is_primary),
      }));
    }

    return variants;
  }

  // ============================================================
  // CLIENT - GET OPTIONS
  //
  // Chỉ hiển thị option/value thực sự tồn tại trên ít nhất
  // một variant đang được bán.
  //
  // Ví dụ:
  //
  // capacity:
  // - 16GB
  // - 32GB
  // - 64GB
  //
  // Nếu 16GB chỉ còn nằm trên variant status = 0 thì Client
  // không hiển thị 16GB nữa.
  // ============================================================

  static async getClientOptionsByProductId(productId, connection = pool) {
    const [rows] = await connection.execute(
      `
        SELECT DISTINCT
          po.id AS option_id,
          po.name AS option_name,
          po.code AS option_code,
          po.display_type,
          po.sort_order AS option_sort_order,

          pov.id AS option_value_id,
          pov.value,
          pov.label,
          pov.color_code,
          pov.sort_order AS value_sort_order

        FROM product_variants pv

        INNER JOIN product_variant_values pvv
          ON pvv.variant_id = pv.id

        INNER JOIN product_options po
          ON po.id = pvv.option_id

        INNER JOIN product_option_values pov
          ON pov.id = pvv.option_value_id

        WHERE
          pv.product_id = ?
          AND pv.deleted_at IS NULL
          AND pv.status = 1

          AND po.deleted_at IS NULL
          AND po.status = 1

          AND pov.deleted_at IS NULL
          AND pov.status = 1

        ORDER BY
          po.sort_order ASC,
          po.id ASC,
          pov.sort_order ASC,
          pov.id ASC
      `,
      [productId],
    );

    const optionMap = new Map();

    for (const row of rows) {
      const optionId = Number(row.option_id);

      if (!optionMap.has(optionId)) {
        optionMap.set(optionId, {
          id: optionId,

          name: row.option_name,

          code: row.option_code,

          display_type: row.display_type,

          sort_order: Number(row.option_sort_order || 0),

          values: [],
        });
      }

      const option = optionMap.get(optionId);

      const valueId = Number(row.option_value_id);

      if (!option.values.some((item) => item.id === valueId)) {
        option.values.push({
          id: valueId,

          value: row.value,

          label: row.label,

          color_code: row.color_code,

          sort_order: Number(row.value_sort_order || 0),
        });
      }
    }

    return Array.from(optionMap.values());
  }

  // ============================================================
  // CLIENT - DEFAULT VARIANT
  //
  // Default phải:
  // - chưa xóa
  // - đang hiển thị
  //
  // Nếu dữ liệu cũ bị lỗi không có default visible:
  // lấy visible variant đầu tiên.
  // ============================================================

  static async getClientDefaultVariant(productId, connection = pool) {
    const variants = await ProductVariant.getClientVariantsByProductId(
      productId,
      connection,
    );

    if (variants.length === 0) {
      return null;
    }

    return (
      variants.find((variant) => Number(variant.is_default) === 1) ||
      variants[0]
    );
  }

  // ============================================================
  // CLIENT - VARIANT DATA
  // ============================================================

  static async getClientProductVariantData(productId, connection = pool) {
    const [options, variants] = await Promise.all([
      ProductVariant.getClientOptionsByProductId(productId, connection),

      ProductVariant.getClientVariantsByProductId(productId, connection),
    ]);

    const defaultVariant =
      variants.find((variant) => Number(variant.is_default) === 1) ||
      variants[0] ||
      null;

    const availableQuantity = variants.reduce(
      (total, variant) => total + Math.max(Number(variant.quantity || 0), 0),
      0,
    );

    return {
      options,

      variants,

      default_variant: defaultVariant,

      has_variants: variants.length > 1 || options.length > 0,

      available_quantity: availableQuantity,

      available_variant_count: variants.length,
    };
  }

  // ============================================================
  // CLIENT - FIND VARIANT BY SELECTED VALUES
  //
  // Phục vụ Cart / API kiểm tra variant sau này.
  //
  // Ví dụ:
  //
  // {
  //   capacity: "64GB",
  //   bus: "5200MHz"
  // }
  //
  // => variant 81
  // ============================================================

  static async findClientVariantByValues(
    productId,
    selectedValues = {},
    connection = pool,
  ) {
    const variants = await ProductVariant.getClientVariantsByProductId(
      productId,
      connection,
    );

    if (variants.length === 0) {
      return null;
    }

    const normalizedSelected = {};

    for (const [key, value] of Object.entries(selectedValues || {})) {
      const code = ProductVariant.normalizeCode(key);

      if (!code) {
        continue;
      }

      normalizedSelected[code] = String(value || "")
        .trim()
        .toLowerCase();
    }

    const selectedCodes = Object.keys(normalizedSelected);

    if (selectedCodes.length === 0) {
      return (
        variants.find((variant) => Number(variant.is_default) === 1) ||
        variants[0] ||
        null
      );
    }

    for (const variant of variants) {
      const variantValues = {};

      for (const item of variant.values || []) {
        const optionCode = ProductVariant.normalizeCode(item.option_code);

        if (!optionCode) {
          continue;
        }

        variantValues[optionCode] = String(item.value || "")
          .trim()
          .toLowerCase();
      }

      const matches = selectedCodes.every(
        (code) => variantValues[code] === normalizedSelected[code],
      );

      if (
        matches &&
        Object.keys(variantValues).length === selectedCodes.length
      ) {
        return variant;
      }
    }

    return null;
  }
}

module.exports = ProductVariant;
