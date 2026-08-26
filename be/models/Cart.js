const database = require("../config/database");

const db =
  database.pool ||
  database.db ||
  database.connection ||
  database.conn ||
  database;

const pool = database.pool || db;

// ============================================================
// DATABASE HELPERS
// ============================================================

const runQuery = async (executor, sql, params = []) => {
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

const query = async (sql, params = []) => {
  return runQuery(db, sql, params);
};

const getTransactionConnection = async () => {
  if (!pool || typeof pool.getConnection !== "function") {
    throw new Error("Database pool không hỗ trợ transaction");
  }

  return pool.getConnection();
};

// ============================================================
// NORMALIZE HELPERS
// ============================================================

const normalizeInt = (value, defaultValue = 0) => {
  const parsed = Number.parseInt(value, 10);

  return Number.isNaN(parsed) ? defaultValue : parsed;
};

const normalizeNullableInt = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed) || parsed < 1) {
    return null;
  }

  return parsed;
};

const normalizeMoney = (value) => {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
};

// ============================================================
// PRICE
// ============================================================

const getFinalPrice = (item) => {
  const regularPrice = normalizeMoney(item?.price);

  const salePrice =
    item?.sale_price !== null && item?.sale_price !== undefined
      ? normalizeMoney(item.sale_price)
      : null;

  if (salePrice !== null && salePrice > 0 && salePrice < regularPrice) {
    return salePrice;
  }

  return regularPrice;
};

// ============================================================
// VARIANT OPTIONS
// ============================================================

const getVariantOptions = async (executor, variantId) => {
  if (!variantId) {
    return [];
  }

  const rows = await runQuery(
    executor,
    `
      SELECT
        po.id AS option_id,
        po.name AS option_name,
        po.code AS option_code,
        po.display_type,

        pov.id AS option_value_id,
        pov.value,
        pov.label,
        pov.color_code

      FROM product_variant_values pvv

      INNER JOIN product_options po
        ON po.id = pvv.option_id

      INNER JOIN product_option_values pov
        ON pov.id = pvv.option_value_id

      WHERE
        pvv.variant_id = ?

        AND po.deleted_at IS NULL
        AND pov.deleted_at IS NULL

      ORDER BY
        po.sort_order ASC,
        po.id ASC,
        pov.sort_order ASC,
        pov.id ASC
    `,
    [variantId],
  );

  return rows.map((item) => ({
    option_id: normalizeInt(item.option_id),

    option_name: item.option_name,

    option_code: item.option_code,

    display_type: item.display_type,

    option_value_id: normalizeInt(item.option_value_id),

    value: item.value,

    label: item.label,

    color_code: item.color_code,
  }));
};

// ============================================================
// CART SUMMARY
// ============================================================

const recalculateCartSummary = async (executor, cartId) => {
  const rows = await runQuery(
    executor,
    `
      SELECT
        COALESCE(
          SUM(quantity),
          0
        ) AS total_quantity,

        COALESCE(
          SUM(total_price),
          0
        ) AS total_amount

      FROM cart_items

      WHERE
        cart_id = ?
        AND deleted_at IS NULL
    `,
    [cartId],
  );

  const totalQuantity = Number(rows[0]?.total_quantity || 0);

  const totalAmount = Number(rows[0]?.total_amount || 0);

  await runQuery(
    executor,
    `
      UPDATE carts

      SET
        quantity = ?,
        total_price = ?,
        updated_at = NOW()

      WHERE
        id = ?
        AND deleted_at IS NULL
    `,
    [totalQuantity, totalAmount, cartId],
  );

  return {
    total_quantity: totalQuantity,

    total_amount: totalAmount,
  };
};

// ============================================================
// CART MODEL
// ============================================================

const Cart = {
  // ==========================================================
  // GET / CREATE CART
  // ==========================================================

  async getOrCreateCart(userId) {
    const normalizedUserId = normalizeInt(userId);

    if (normalizedUserId < 1) {
      throw new Error("Người dùng không hợp lệ");
    }

    const rows = await query(
      `
        SELECT *

        FROM carts

        WHERE
          user_id = ?
          AND deleted_at IS NULL

        ORDER BY id ASC

        LIMIT 1
      `,
      [normalizedUserId],
    );

    if (rows[0]) {
      return rows[0];
    }

    const result = await query(
      `
        INSERT INTO carts
        (
          user_id,
          quantity,
          total_price,
          created_at,
          updated_at
        )

        VALUES
        (
          ?,
          0,
          0,
          NOW(),
          NOW()
        )
      `,
      [normalizedUserId],
    );

    const newRows = await query(
      `
        SELECT *

        FROM carts

        WHERE id = ?

        LIMIT 1
      `,
      [result.insertId],
    );

    return newRows[0] || null;
  },

  // ==========================================================
  // GET CART
  // ==========================================================

  async getCart(userId) {
    const cart = await this.getOrCreateCart(userId);

    const items = await query(
      `
        SELECT
          ci.id,
          ci.cart_id,
          ci.product_id,
          ci.variant_id,

          ci.quantity,

          ci.price AS cart_price,
          ci.total_price,

          p.name AS product_name,

          p.slug AS product_slug,

          p.thumbnail
            AS product_image,

          p.sku
            AS product_sku,

          p.price
            AS product_price,

          p.sale_price
            AS product_sale_price,

          p.quantity
            AS product_total_stock,

          p.status
            AS product_status,

          pv.sku
            AS variant_sku,

          pv.variant_name,

          pv.price
            AS variant_price,

          pv.sale_price
            AS variant_sale_price,

          pv.quantity
            AS variant_stock,

          pv.thumbnail
            AS variant_thumbnail,

          pv.status
            AS variant_status,

          pv.is_default
            AS variant_is_default,

          pv.deleted_at
            AS variant_deleted_at,

          CASE
            WHEN ci.variant_id IS NOT NULL
              THEN pv.price

            ELSE p.price
          END AS current_regular_price,

          CASE
            WHEN ci.variant_id IS NOT NULL
              THEN pv.sale_price

            ELSE p.sale_price
          END AS current_sale_price,

          CASE
            WHEN ci.variant_id IS NOT NULL
              THEN pv.quantity

            ELSE p.quantity
          END AS available_stock,

          CASE
            WHEN
              ci.variant_id IS NOT NULL
              AND pv.thumbnail IS NOT NULL
              AND pv.thumbnail <> ''

            THEN pv.thumbnail

            ELSE p.thumbnail
          END AS display_image

        FROM cart_items ci

        INNER JOIN products p
          ON p.id = ci.product_id

        LEFT JOIN product_variants pv
          ON pv.id = ci.variant_id
          AND pv.product_id = ci.product_id

        WHERE
          ci.cart_id = ?

          AND ci.deleted_at IS NULL

          AND p.deleted_at IS NULL

        ORDER BY
          ci.id DESC
      `,
      [cart.id],
    );

    const normalizedItems = [];

    for (const item of items) {
      const variantId =
        item.variant_id !== null ? Number(item.variant_id) : null;

      const regularPrice = normalizeMoney(item.current_regular_price);

      const salePrice =
        item.current_sale_price !== null &&
        item.current_sale_price !== undefined
          ? normalizeMoney(item.current_sale_price)
          : null;

      const finalPrice =
        salePrice !== null && salePrice > 0 && salePrice < regularPrice
          ? salePrice
          : regularPrice;

      const availableStock = Math.max(normalizeInt(item.available_stock, 0), 0);

      const quantity = Math.max(normalizeInt(item.quantity, 0), 0);

      const variantOptions = variantId
        ? await getVariantOptions(db, variantId)
        : [];

      let isAvailable = Number(item.product_status) === 1;

      let unavailableReason = null;

      if (Number(item.product_status) !== 1) {
        isAvailable = false;

        unavailableReason = "Sản phẩm hiện không khả dụng.";
      }

      if (variantId && item.variant_deleted_at) {
        isAvailable = false;

        unavailableReason = "Biến thể này đã bị xóa.";
      }

      if (variantId && Number(item.variant_status) !== 1) {
        isAvailable = false;

        unavailableReason = "Biến thể này hiện đang bị ẩn.";
      }

      if (availableStock <= 0) {
        isAvailable = false;

        unavailableReason = variantId
          ? "Biến thể này đã hết hàng."
          : "Sản phẩm đã hết hàng.";
      }

      if (quantity > availableStock) {
        isAvailable = false;

        unavailableReason = `Tồn kho hiện tại chỉ còn ${availableStock} sản phẩm.`;
      }

      normalizedItems.push({
        id: Number(item.id),

        cart_id: Number(item.cart_id),

        product_id: Number(item.product_id),

        variant_id: variantId,

        quantity,

        price: Number(item.cart_price || finalPrice || 0),

        total_price: Number(item.total_price || 0),

        product_name: item.product_name,

        product_slug: item.product_slug,

        product_sku: item.product_sku,

        product_image: item.product_image,

        product_status: Number(item.product_status),

        product_total_stock: Number(item.product_total_stock || 0),

        variant_name: variantId ? item.variant_name : null,

        variant_sku: variantId ? item.variant_sku : null,

        variant_thumbnail: variantId ? item.variant_thumbnail : null,

        variant_status: variantId ? Number(item.variant_status) : null,

        variant_is_default: variantId ? Number(item.variant_is_default) : null,

        variant_stock: variantId ? Number(item.variant_stock || 0) : null,

        variant_options: variantOptions,

        regular_price: regularPrice,

        sale_price: salePrice,

        final_price: finalPrice,

        available_stock: availableStock,

        display_image: item.display_image || item.product_image,

        in_stock: availableStock > 0,

        stock_status:
          availableStock <= 0
            ? "out_of_stock"
            : availableStock <= 5
              ? "low_stock"
              : "in_stock",

        is_available: isAvailable,

        unavailable_reason: unavailableReason,

        has_variant: Boolean(variantId),
      });
    }

    const totalQuantity = normalizedItems.reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0,
    );

    const totalAmount = normalizedItems.reduce(
      (sum, item) => sum + Number(item.total_price || 0),
      0,
    );

    return {
      cart: {
        ...cart,

        id: Number(cart.id),

        user_id: Number(cart.user_id),

        quantity: totalQuantity,

        total_price: totalAmount,
      },

      items: normalizedItems,

      total_quantity: totalQuantity,

      total_amount: totalAmount,
    };
  },

  // ==========================================================
  // GET PRODUCT
  // ==========================================================

  async getProductById(productId, executor = db) {
    const rows = await runQuery(
      executor,
      `
        SELECT
          id,
          name,
          slug,
          sku,

          price,
          sale_price,
          quantity,

          thumbnail,
          status,
          deleted_at

        FROM products

        WHERE
          id = ?
          AND deleted_at IS NULL

        LIMIT 1
      `,
      [productId],
    );

    return rows[0] || null;
  },

  // ==========================================================
  // GET VARIANT
  // ==========================================================

  async getVariantById(productId, variantId, executor = db) {
    const rows = await runQuery(
      executor,
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

          deleted_at

        FROM product_variants

        WHERE
          id = ?
          AND product_id = ?
          AND deleted_at IS NULL

        LIMIT 1
      `,
      [variantId, productId],
    );

    if (!rows[0]) {
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
  },

  // ==========================================================
  // CHECK PRODUCT HAS REAL VARIANTS
  // ==========================================================

  async productHasVariants(productId, executor = db) {
    const rows = await runQuery(
      executor,
      `
        SELECT
          COUNT(*) AS total,

          SUM(
            CASE
              WHEN pvv.variant_id
                IS NOT NULL
              THEN 1
              ELSE 0
            END
          ) AS option_rows

        FROM product_variants pv

        LEFT JOIN product_variant_values pvv
          ON pvv.variant_id = pv.id

        WHERE
          pv.product_id = ?
          AND pv.deleted_at IS NULL
      `,
      [productId],
    );

    const totalVariants = Number(rows[0]?.total || 0);

    const optionRows = Number(rows[0]?.option_rows || 0);

    return totalVariants > 1 || optionRows > 0;
  },

  // ==========================================================
  // DEFAULT VARIANT
  // ==========================================================

  async getDefaultVariant(productId, executor = db) {
    const rows = await runQuery(
      executor,
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
          AND is_default = 1

        ORDER BY id ASC

        LIMIT 1
      `,
      [productId],
    );

    if (!rows[0]) {
      return null;
    }

    return {
      ...rows[0],

      id: Number(rows[0].id),

      product_id: Number(rows[0].product_id),

      price: Number(rows[0].price || 0),

      sale_price:
        rows[0].sale_price !== null ? Number(rows[0].sale_price) : null,

      quantity: Number(rows[0].quantity || 0),

      status: Number(rows[0].status),

      is_default: Number(rows[0].is_default),
    };
  },

  // ==========================================================
  // RESOLVE SELLABLE ITEM
  //
  // Đây là hàm quan trọng nhất.
  //
  // Nếu Product có variant thật:
  // => bắt buộc variant_id.
  //
  // Nếu Product legacy / không variant:
  // => dùng Product.
  // ==========================================================

  async resolveSellableItem({ productId, variantId = null, executor = db }) {
    const product = await this.getProductById(productId, executor);

    if (!product) {
      throw new Error("Không tìm thấy sản phẩm");
    }

    if (Number(product.status) !== 1) {
      throw new Error("Sản phẩm đang tắt hoặc không khả dụng");
    }

    const hasVariants = await this.productHasVariants(productId, executor);

    let normalizedVariantId = normalizeNullableInt(variantId);

    // ========================================================
    // PRODUCT CÓ VARIANT
    // ========================================================

    if (hasVariants) {
      /*
       * Client bắt buộc chọn variant.
       *
       * Không tự lấy default ở Add Cart vì nếu FE quên gửi
       * variant_id thì khách có thể chọn 64GB nhưng lại thêm
       * default 32GB.
       */
      if (!normalizedVariantId) {
        throw new Error(
          "Vui lòng chọn biến thể sản phẩm trước khi thêm vào giỏ hàng.",
        );
      }

      const variant = await this.getVariantById(
        productId,
        normalizedVariantId,
        executor,
      );

      if (!variant) {
        throw new Error(
          "Biến thể không tồn tại hoặc không thuộc sản phẩm này.",
        );
      }

      if (Number(variant.status) !== 1) {
        throw new Error("Biến thể sản phẩm hiện không khả dụng.");
      }

      const stock = Math.max(Number(variant.quantity || 0), 0);

      if (stock <= 0) {
        throw new Error("Biến thể sản phẩm đã hết hàng.");
      }

      const finalPrice = getFinalPrice(variant);

      const options = await getVariantOptions(executor, variant.id);

      return {
        product,

        variant,

        product_id: Number(product.id),

        variant_id: Number(variant.id),

        sku: variant.sku,

        variant_name: variant.variant_name,

        options,

        price: finalPrice,

        regular_price: Number(variant.price || 0),

        sale_price:
          variant.sale_price !== null ? Number(variant.sale_price) : null,

        stock,

        image: variant.thumbnail || product.thumbnail || null,

        has_variant: true,
      };
    }

    // ========================================================
    // PRODUCT KHÔNG CÓ VARIANT THẬT
    // ========================================================

    normalizedVariantId = null;

    const stock = Math.max(Number(product.quantity || 0), 0);

    if (stock <= 0) {
      throw new Error("Sản phẩm đã hết hàng");
    }

    return {
      product,

      variant: null,

      product_id: Number(product.id),

      variant_id: null,

      sku: product.sku,

      variant_name: null,

      options: [],

      price: getFinalPrice(product),

      regular_price: Number(product.price || 0),

      sale_price:
        product.sale_price !== null ? Number(product.sale_price) : null,

      stock,

      image: product.thumbnail || null,

      has_variant: false,
    };
  },

  // ==========================================================
  // GET CART ITEM
  //
  // product_id + variant_id là identity của cart item.
  // ==========================================================

  async getCartItem(cartId, productId, variantId = null, executor = db) {
    const normalizedVariantId = normalizeNullableInt(variantId);

    let sql = `
      SELECT *

      FROM cart_items

      WHERE
        cart_id = ?
        AND product_id = ?
        AND deleted_at IS NULL
    `;

    const params = [cartId, productId];

    if (normalizedVariantId) {
      sql += `
        AND variant_id = ?
      `;

      params.push(normalizedVariantId);
    } else {
      sql += `
        AND variant_id IS NULL
      `;
    }

    sql += `
      ORDER BY id ASC
      LIMIT 1
    `;

    const rows = await runQuery(executor, sql, params);

    return rows[0] || null;
  },

  // ==========================================================
  // GET SOFT-DELETED CART ITEM
  // ==========================================================

  async getDeletedCartItem(cartId, productId, variantId = null, executor = db) {
    const normalizedVariantId = normalizeNullableInt(variantId);

    let sql = `
      SELECT id

      FROM cart_items

      WHERE
        cart_id = ?
        AND product_id = ?
        AND deleted_at IS NOT NULL
    `;

    const params = [cartId, productId];

    if (normalizedVariantId) {
      sql += `
        AND variant_id = ?
      `;

      params.push(normalizedVariantId);
    } else {
      sql += `
        AND variant_id IS NULL
      `;
    }

    sql += `
      ORDER BY id DESC
      LIMIT 1
    `;

    const rows = await runQuery(executor, sql, params);

    return rows[0] || null;
  },

  // ==========================================================
  // ADD ITEM
  // ==========================================================

  async addItem({ user_id, product_id, variant_id = null, quantity = 1 }) {
    const userId = normalizeInt(user_id);

    const productId = normalizeInt(product_id);

    const variantId = normalizeNullableInt(variant_id);

    const qty = Math.max(normalizeInt(quantity, 1), 1);

    if (userId < 1) {
      throw new Error("Người dùng không hợp lệ");
    }

    if (productId < 1) {
      throw new Error("Sản phẩm không hợp lệ");
    }

    const connection = await getTransactionConnection();

    try {
      await connection.beginTransaction();

      // ======================================================
      // LOCK / CREATE CART
      // ======================================================

      let cartRows = await runQuery(
        connection,
        `
            SELECT *

            FROM carts

            WHERE
              user_id = ?
              AND deleted_at IS NULL

            ORDER BY id ASC

            LIMIT 1

            FOR UPDATE
          `,
        [userId],
      );

      let cart = cartRows[0];

      if (!cart) {
        const cartResult = await runQuery(
          connection,
          `
              INSERT INTO carts
              (
                user_id,
                quantity,
                total_price,
                created_at,
                updated_at
              )

              VALUES
              (
                ?,
                0,
                0,
                NOW(),
                NOW()
              )
            `,
          [userId],
        );

        cartRows = await runQuery(
          connection,
          `
              SELECT *

              FROM carts

              WHERE id = ?

              LIMIT 1

              FOR UPDATE
            `,
          [cartResult.insertId],
        );

        cart = cartRows[0];
      }

      // ======================================================
      // LOCK PRODUCT
      // ======================================================

      const productRows = await runQuery(
        connection,
        `
            SELECT
              id,
              name,
              slug,
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
        [productId],
      );

      const product = productRows[0];

      if (!product) {
        throw new Error("Không tìm thấy sản phẩm");
      }

      if (Number(product.status) !== 1) {
        throw new Error("Sản phẩm đang tắt hoặc không khả dụng");
      }

      // ======================================================
      // RESOLVE VARIANT / PRODUCT
      // ======================================================

      const sellable = await this.resolveSellableItem({
        productId,
        variantId,
        executor: connection,
      });

      // ======================================================
      // FIND CURRENT ITEM
      // ======================================================

      const existingItem = await this.getCartItem(
        cart.id,
        productId,
        sellable.variant_id,
        connection,
      );

      const finalPrice = Number(sellable.price || 0);

      if (!Number.isFinite(finalPrice) || finalPrice <= 0) {
        throw new Error("Giá sản phẩm không hợp lệ.");
      }

      // ======================================================
      // ITEM ĐÃ CÓ
      // ======================================================

      if (existingItem) {
        const newQuantity = Number(existingItem.quantity || 0) + qty;

        if (newQuantity > sellable.stock) {
          throw new Error(
            sellable.has_variant
              ? `Biến thể "${sellable.variant_name}" chỉ còn ${sellable.stock} sản phẩm.`
              : `Sản phẩm chỉ còn ${sellable.stock} sản phẩm.`,
          );
        }

        await runQuery(
          connection,
          `
            UPDATE cart_items

            SET
              quantity = ?,
              price = ?,
              total_price = ?,
              updated_at = NOW()

            WHERE
              id = ?
              AND deleted_at IS NULL
          `,
          [newQuantity, finalPrice, finalPrice * newQuantity, existingItem.id],
        );

        await recalculateCartSummary(connection, cart.id);

        await connection.commit();

        return this.getCart(userId);
      }

      // ======================================================
      // ITEM MỚI
      // ======================================================

      if (qty > sellable.stock) {
        throw new Error(
          sellable.has_variant
            ? `Biến thể "${sellable.variant_name}" chỉ còn ${sellable.stock} sản phẩm.`
            : `Sản phẩm chỉ còn ${sellable.stock} sản phẩm.`,
        );
      }

      const deletedItem = await this.getDeletedCartItem(
        cart.id,
        productId,
        sellable.variant_id,
        connection,
      );

      if (deletedItem) {
        await runQuery(
          connection,
          `
            UPDATE cart_items

            SET
              variant_id = ?,

              quantity = ?,

              price = ?,

              total_price = ?,

              deleted_at = NULL,

              updated_at = NOW()

            WHERE id = ?
          `,
          [
            sellable.variant_id,

            qty,

            finalPrice,

            finalPrice * qty,

            deletedItem.id,
          ],
        );
      } else {
        await runQuery(
          connection,
          `
            INSERT INTO cart_items
            (
              cart_id,
              product_id,
              variant_id,

              quantity,

              price,
              total_price,

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
            cart.id,

            productId,

            sellable.variant_id,

            qty,

            finalPrice,

            finalPrice * qty,
          ],
        );
      }

      await recalculateCartSummary(connection, cart.id);

      await connection.commit();
    } catch (error) {
      await connection.rollback();

      throw error;
    } finally {
      connection.release();
    }

    return this.getCart(userId);
  },

  // ==========================================================
  // UPDATE ITEM QUANTITY
  // ==========================================================

  async updateItemQuantity({ user_id, item_id, quantity }) {
    const userId = normalizeInt(user_id);

    const itemId = normalizeInt(item_id);

    const qty = normalizeInt(quantity);

    if (userId < 1) {
      throw new Error("Người dùng không hợp lệ");
    }

    if (itemId < 1) {
      throw new Error("Sản phẩm trong giỏ không hợp lệ");
    }

    if (qty <= 0) {
      return this.removeItem({
        user_id: userId,

        item_id: itemId,
      });
    }

    const connection = await getTransactionConnection();

    try {
      await connection.beginTransaction();

      const cartRows = await runQuery(
        connection,
        `
            SELECT *

            FROM carts

            WHERE
              user_id = ?
              AND deleted_at IS NULL

            ORDER BY id ASC

            LIMIT 1

            FOR UPDATE
          `,
        [userId],
      );

      const cart = cartRows[0];

      if (!cart) {
        throw new Error("Không tìm thấy giỏ hàng");
      }

      const rows = await runQuery(
        connection,
        `
            SELECT
              ci.id,
              ci.cart_id,
              ci.product_id,
              ci.variant_id,
              ci.quantity,

              p.status
                AS product_status,

              p.deleted_at
                AS product_deleted_at

            FROM cart_items ci

            INNER JOIN products p
              ON p.id = ci.product_id

            WHERE
              ci.id = ?
              AND ci.cart_id = ?
              AND ci.deleted_at IS NULL

            LIMIT 1

            FOR UPDATE
          `,
        [itemId, cart.id],
      );

      const item = rows[0];

      if (!item) {
        throw new Error("Không tìm thấy sản phẩm trong giỏ hàng");
      }

      if (item.product_deleted_at) {
        throw new Error("Sản phẩm không còn tồn tại.");
      }

      if (Number(item.product_status) !== 1) {
        throw new Error("Sản phẩm hiện không khả dụng");
      }

      const sellable = await this.resolveSellableItem({
        productId: item.product_id,

        variantId: item.variant_id,

        executor: connection,
      });

      if (qty > sellable.stock) {
        throw new Error(
          sellable.has_variant
            ? `Biến thể "${sellable.variant_name}" chỉ còn ${sellable.stock} sản phẩm.`
            : `Sản phẩm chỉ còn ${sellable.stock} sản phẩm.`,
        );
      }

      const finalPrice = Number(sellable.price || 0);

      await runQuery(
        connection,
        `
          UPDATE cart_items

          SET
            quantity = ?,

            price = ?,

            total_price = ?,

            updated_at = NOW()

          WHERE
            id = ?
            AND deleted_at IS NULL
        `,
        [qty, finalPrice, finalPrice * qty, itemId],
      );

      await recalculateCartSummary(connection, cart.id);

      await connection.commit();
    } catch (error) {
      await connection.rollback();

      throw error;
    } finally {
      connection.release();
    }

    return this.getCart(userId);
  },

  // ==========================================================
  // REMOVE ITEM
  // ==========================================================

  async removeItem({ user_id, item_id }) {
    const userId = normalizeInt(user_id);

    const itemId = normalizeInt(item_id);

    if (userId < 1) {
      throw new Error("Người dùng không hợp lệ");
    }

    if (itemId < 1) {
      throw new Error("Sản phẩm trong giỏ không hợp lệ");
    }

    const connection = await getTransactionConnection();

    try {
      await connection.beginTransaction();

      const cartRows = await runQuery(
        connection,
        `
            SELECT id

            FROM carts

            WHERE
              user_id = ?
              AND deleted_at IS NULL

            ORDER BY id ASC

            LIMIT 1

            FOR UPDATE
          `,
        [userId],
      );

      const cart = cartRows[0];

      if (!cart) {
        throw new Error("Không tìm thấy giỏ hàng");
      }

      const result = await runQuery(
        connection,
        `
            UPDATE cart_items

            SET
              deleted_at = NOW(),
              updated_at = NOW()

            WHERE
              id = ?
              AND cart_id = ?
              AND deleted_at IS NULL
          `,
        [itemId, cart.id],
      );

      if (Number(result.affectedRows || 0) === 0) {
        throw new Error("Không tìm thấy sản phẩm trong giỏ hàng");
      }

      await recalculateCartSummary(connection, cart.id);

      await connection.commit();
    } catch (error) {
      await connection.rollback();

      throw error;
    } finally {
      connection.release();
    }

    return this.getCart(userId);
  },

  // ==========================================================
  // CLEAR CART
  // ==========================================================

  async clearCart(userId) {
    const normalizedUserId = normalizeInt(userId);

    if (normalizedUserId < 1) {
      throw new Error("Người dùng không hợp lệ");
    }

    const connection = await getTransactionConnection();

    try {
      await connection.beginTransaction();

      const cartRows = await runQuery(
        connection,
        `
            SELECT id

            FROM carts

            WHERE
              user_id = ?
              AND deleted_at IS NULL

            ORDER BY id ASC

            LIMIT 1

            FOR UPDATE
          `,
        [normalizedUserId],
      );

      let cart = cartRows[0];

      if (!cart) {
        const result = await runQuery(
          connection,
          `
              INSERT INTO carts
              (
                user_id,
                quantity,
                total_price,
                created_at,
                updated_at
              )

              VALUES
              (
                ?,
                0,
                0,
                NOW(),
                NOW()
              )
            `,
          [normalizedUserId],
        );

        cart = {
          id: result.insertId,
        };
      }

      await runQuery(
        connection,
        `
          UPDATE cart_items

          SET
            deleted_at = NOW(),
            updated_at = NOW()

          WHERE
            cart_id = ?
            AND deleted_at IS NULL
        `,
        [cart.id],
      );

      await recalculateCartSummary(connection, cart.id);

      await connection.commit();
    } catch (error) {
      await connection.rollback();

      throw error;
    } finally {
      connection.release();
    }

    return this.getCart(normalizedUserId);
  },

  // ==========================================================
  // ADD ITEMS FROM ORDER
  //
  // Chức năng legacy "Mua lại".
  //
  // Sau khi Order.js được chuyển hoàn toàn sang variant,
  // hàm này cũng hỗ trợ variant_id.
  // ==========================================================

  async addItemsFromOrder({ userId, items }) {
    const normalizedUserId = normalizeInt(userId);

    if (normalizedUserId < 1) {
      throw new Error("Người dùng không hợp lệ");
    }

    if (!Array.isArray(items) || items.length === 0) {
      throw new Error("Đơn hàng không có sản phẩm để mua lại");
    }

    /*
     * Identity phải là:
     *
     * product_id + variant_id
     *
     * Không còn chỉ group product_id,
     * vì:
     *
     * Product 66 / Variant 71
     * Product 66 / Variant 81
     *
     * là hai sản phẩm mua khác nhau.
     */
    const groupedItems = new Map();

    for (const item of items) {
      const productId = normalizeInt(item.product_id);

      const variantId = normalizeNullableInt(item.variant_id);

      const quantity = Math.max(normalizeInt(item.quantity, 0), 0);

      if (productId < 1 || quantity < 1) {
        continue;
      }

      const key = `${productId}:${variantId || "none"}`;

      const previous = groupedItems.get(key) || {
        product_id: productId,

        variant_id: variantId,

        product_name: item.product_name || `Sản phẩm #${productId}`,

        variant_name: item.variant_name || null,

        quantity: 0,
      };

      previous.quantity += quantity;

      groupedItems.set(key, previous);
    }

    if (groupedItems.size === 0) {
      throw new Error("Đơn hàng không có sản phẩm hợp lệ để mua lại");
    }

    const connection = await getTransactionConnection();

    const addedItems = [];

    const unchangedItems = [];

    const unavailableItems = [];

    try {
      await connection.beginTransaction();

      // ======================================================
      // CART
      // ======================================================

      const cartRows = await runQuery(
        connection,
        `
            SELECT *

            FROM carts

            WHERE
              user_id = ?
              AND deleted_at IS NULL

            ORDER BY id ASC

            LIMIT 1

            FOR UPDATE
          `,
        [normalizedUserId],
      );

      let cart = cartRows[0];

      if (!cart) {
        const cartResult = await runQuery(
          connection,
          `
              INSERT INTO carts
              (
                user_id,
                quantity,
                total_price,
                created_at,
                updated_at
              )

              VALUES
              (
                ?,
                0,
                0,
                NOW(),
                NOW()
              )
            `,
          [normalizedUserId],
        );

        cart = {
          id: cartResult.insertId,
        };
      }

      // ======================================================
      // ITEMS
      // ======================================================

      for (const sourceItem of groupedItems.values()) {
        let sellable;

        try {
          sellable = await this.resolveSellableItem({
            productId: sourceItem.product_id,

            variantId: sourceItem.variant_id,

            executor: connection,
          });
        } catch (error) {
          unavailableItems.push({
            product_id: sourceItem.product_id,

            variant_id: sourceItem.variant_id,

            product_name: sourceItem.product_name,

            variant_name: sourceItem.variant_name,

            requested_quantity: sourceItem.quantity,

            current_cart_quantity: 0,

            added_quantity: 0,

            reason: error.message,
          });

          continue;
        }

        const activeItem = await this.getCartItem(
          cart.id,
          sellable.product_id,
          sellable.variant_id,
          connection,
        );

        const existingQuantity = Math.max(Number(activeItem?.quantity || 0), 0);

        const desiredQuantity = Math.max(Number(sourceItem.quantity || 0), 0);

        const stock = Math.max(Number(sellable.stock || 0), 0);

        /*
         * Idempotent:
         *
         * Đơn cũ x2,
         * cart đã có x2
         * => không cộng thêm.
         */
        const missingQuantity = Math.max(desiredQuantity - existingQuantity, 0);

        if (missingQuantity === 0) {
          unchangedItems.push({
            product_id: sellable.product_id,

            variant_id: sellable.variant_id,

            product_name: sellable.product.name,

            variant_name: sellable.variant_name,

            requested_quantity: desiredQuantity,

            current_cart_quantity: existingQuantity,

            added_quantity: 0,

            reason: "Sản phẩm đã có đủ số lượng trong giỏ",
          });

          continue;
        }

        const availableToAdd = Math.max(stock - existingQuantity, 0);

        const addedQuantity = Math.min(missingQuantity, availableToAdd);

        if (addedQuantity < 1) {
          unavailableItems.push({
            product_id: sellable.product_id,

            variant_id: sellable.variant_id,

            product_name: sellable.product.name,

            variant_name: sellable.variant_name,

            requested_quantity: desiredQuantity,

            current_cart_quantity: existingQuantity,

            added_quantity: 0,

            reason:
              stock <= 0
                ? "Sản phẩm đã hết hàng"
                : "Số lượng trong giỏ đã đạt tồn kho",
          });

          continue;
        }

        const finalPrice = Number(sellable.price || 0);

        const nextQuantity = existingQuantity + addedQuantity;

        if (activeItem) {
          await runQuery(
            connection,
            `
              UPDATE cart_items

              SET
                quantity = ?,

                price = ?,

                total_price = ?,

                updated_at = NOW()

              WHERE
                id = ?
                AND deleted_at IS NULL
            `,
            [
              nextQuantity,

              finalPrice,

              finalPrice * nextQuantity,

              activeItem.id,
            ],
          );
        } else {
          const deletedItem = await this.getDeletedCartItem(
            cart.id,
            sellable.product_id,
            sellable.variant_id,
            connection,
          );

          if (deletedItem) {
            await runQuery(
              connection,
              `
                UPDATE cart_items

                SET
                  variant_id = ?,

                  quantity = ?,

                  price = ?,

                  total_price = ?,

                  deleted_at = NULL,

                  updated_at = NOW()

                WHERE id = ?
              `,
              [
                sellable.variant_id,

                addedQuantity,

                finalPrice,

                finalPrice * addedQuantity,

                deletedItem.id,
              ],
            );
          } else {
            await runQuery(
              connection,
              `
                INSERT INTO cart_items
                (
                  cart_id,
                  product_id,
                  variant_id,

                  quantity,

                  price,
                  total_price,

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
                cart.id,

                sellable.product_id,

                sellable.variant_id,

                addedQuantity,

                finalPrice,

                finalPrice * addedQuantity,
              ],
            );
          }
        }

        addedItems.push({
          product_id: sellable.product_id,

          variant_id: sellable.variant_id,

          product_name: sellable.product.name,

          variant_name: sellable.variant_name,

          sku: sellable.sku,

          variant_options: sellable.options,

          requested_quantity: desiredQuantity,

          previous_cart_quantity: existingQuantity,

          added_quantity: addedQuantity,

          current_cart_quantity: nextQuantity,

          price: finalPrice,
        });

        if (nextQuantity < desiredQuantity) {
          unavailableItems.push({
            product_id: sellable.product_id,

            variant_id: sellable.variant_id,

            product_name: sellable.product.name,

            variant_name: sellable.variant_name,

            requested_quantity: desiredQuantity,

            current_cart_quantity: nextQuantity,

            added_quantity: addedQuantity,

            reason: "Không đủ tồn kho để đạt toàn bộ số lượng của đơn cũ",
          });
        }
      }

      if (addedItems.length === 0 && unchangedItems.length === 0) {
        throw new Error("Không có sản phẩm nào còn khả dụng để mua lại");
      }

      await recalculateCartSummary(connection, cart.id);

      await connection.commit();
    } catch (error) {
      await connection.rollback();

      throw error;
    } finally {
      connection.release();
    }

    const cart = await this.getCart(normalizedUserId);

    return {
      cart,

      added_items: addedItems,

      unchanged_items: unchangedItems,

      unavailable_items: unavailableItems,
    };
  },
};

module.exports = Cart;
