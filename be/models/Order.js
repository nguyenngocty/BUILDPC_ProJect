const database = require("../config/database");
const ProductVariant = require("./ProductVariant");

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
  if (executor && typeof executor.query === "function") {
    const result = await executor.query(sql, params);

    return Array.isArray(result) ? result[0] : result;
  }

  if (executor && typeof executor.execute === "function") {
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
// NORMALIZE
// ============================================================

const normalizeInt = (value, defaultValue = 0) => {
  const parsed = Number.parseInt(value, 10);

  return Number.isNaN(parsed) ? defaultValue : parsed;
};

const normalizeNullableInt = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number.parseInt(value, 10);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const normalizeMoney = (value) => {
  const number = Number(value || 0);

  return Number.isFinite(number) ? number : 0;
};

const getFinalPrice = ({ price, sale_price }) => {
  const regularPrice = normalizeMoney(price);

  const salePrice =
    sale_price !== null && sale_price !== undefined
      ? normalizeMoney(sale_price)
      : null;

  if (salePrice !== null && salePrice > 0 && salePrice < regularPrice) {
    return salePrice;
  }

  return regularPrice;
};

const generateOrderCode = () => {
  const time = Date.now();

  const random = Math.floor(Math.random() * 9000) + 1000;

  return `ORD${time}${random}`;
};

// ============================================================
// JSON
// ============================================================

const parseJson = (value, fallback = []) => {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const stringifyJson = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
};

// ============================================================
// BUILD VARIANT OPTIONS SNAPSHOT
// ============================================================

const getVariantOptionsSnapshot = async (executor, variantId) => {
  if (!variantId) {
    return [];
  }

  const rows = await runQuery(
    executor,
    `
          SELECT
            pvv.option_id,
            pvv.option_value_id,

            po.name
              AS option_name,

            po.code
              AS option_code,

            po.display_type,

            pov.value,
            pov.label,
            pov.color_code

          FROM product_variant_values pvv

          INNER JOIN product_options po
            ON po.id =
               pvv.option_id

          INNER JOIN product_option_values pov
            ON pov.id =
               pvv.option_value_id

          WHERE
            pvv.variant_id = ?

          ORDER BY
            po.sort_order ASC,
            po.id ASC
        `,
    [variantId],
  );

  return rows.map((item) => ({
    option_id: Number(item.option_id),

    option_value_id: Number(item.option_value_id),

    option_name: item.option_name,

    option_code: item.option_code,

    display_type: item.display_type,

    value: item.value,

    label: item.label,

    color_code: item.color_code,
  }));
};

// ============================================================
// CART ITEM NORMALIZER
// ============================================================

const normalizeCartCheckoutItem = async (connection, cartItem) => {
  const productId = normalizeInt(cartItem.product_id);

  const variantId = normalizeNullableInt(cartItem.variant_id);

  const requestedQuantity = Math.max(normalizeInt(cartItem.quantity, 0), 0);

  if (productId < 1 || requestedQuantity < 1) {
    throw new Error("Sản phẩm trong giỏ hàng không hợp lệ.");
  }

  // ========================================================
  // LOCK PRODUCT
  // ========================================================

  const productRows = await runQuery(
    connection,
    `
          SELECT
            id,
            name,
            slug,
            sku,

            thumbnail,

            price,
            sale_price,

            quantity,
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
    throw new Error(`Sản phẩm ID ${productId} không còn tồn tại.`);
  }

  if (Number(product.status) !== 1) {
    throw new Error(`Sản phẩm "${product.name}" hiện không khả dụng.`);
  }

  // ========================================================
  // PRODUCT ACTIVE VARIANT COUNT
  // ========================================================

  const variantCountRows = await runQuery(
    connection,
    `
          SELECT
            COUNT(*) AS total

          FROM product_variants

          WHERE
            product_id = ?
            AND deleted_at IS NULL
        `,
    [productId],
  );

  const activeVariantCount = Number(variantCountRows[0]?.total || 0);

  // ========================================================
  // VARIANT PRODUCT
  // ========================================================

  if (variantId) {
    const variantRows = await runQuery(
      connection,
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
              is_default

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

    const variant = variantRows[0];

    if (!variant) {
      throw new Error(
        `Biến thể đã chọn của "${product.name}" không còn tồn tại.`,
      );
    }

    if (Number(variant.status) !== 1) {
      throw new Error(
        `Biến thể "${variant.variant_name}" hiện không khả dụng.`,
      );
    }

    const stock = Math.max(Number(variant.quantity || 0), 0);

    if (requestedQuantity > stock) {
      throw new Error(
        `Biến thể "${variant.variant_name}" chỉ còn ${stock} sản phẩm.`,
      );
    }

    const price = getFinalPrice({
      price: variant.price,

      sale_price: variant.sale_price,
    });

    const options = await getVariantOptionsSnapshot(connection, variantId);

    return {
      product_id: Number(product.id),

      variant_id: Number(variant.id),

      product_name: product.name,

      variant_name: variant.variant_name || null,

      sku: variant.sku || product.sku || null,

      product_image: variant.thumbnail || product.thumbnail || null,

      variant_options: options,

      quantity: requestedQuantity,

      price,

      total_price: price * requestedQuantity,

      stock_scope: "variant",

      available_stock: stock,
    };
  }

  // ========================================================
  // PRODUCT CÓ VARIANT NHƯNG CART LẠI KHÔNG CÓ VARIANT ID
  // ========================================================

  if (activeVariantCount > 1) {
    throw new Error(`Vui lòng chọn biến thể của sản phẩm "${product.name}".`);
  }

  // ========================================================
  // TRƯỜNG HỢP PRODUCT CÓ 1 DEFAULT VARIANT LEGACY
  //
  // Nếu Cart cũ chưa có variant_id,
  // ta cho phép map sang variant duy nhất.
  // ========================================================

  if (activeVariantCount === 1) {
    const onlyVariantRows = await runQuery(
      connection,
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
              is_default

            FROM product_variants

            WHERE
              product_id = ?
              AND deleted_at IS NULL

            ORDER BY
              is_default DESC,
              sort_order ASC,
              id ASC

            LIMIT 1

            FOR UPDATE
          `,
      [productId],
    );

    const variant = onlyVariantRows[0];

    if (variant && Number(variant.status) === 1) {
      const stock = Math.max(Number(variant.quantity || 0), 0);

      if (requestedQuantity > stock) {
        throw new Error(
          `Sản phẩm "${product.name}" chỉ còn ${stock} sản phẩm.`,
        );
      }

      const price = getFinalPrice({
        price: variant.price,

        sale_price: variant.sale_price,
      });

      const options = await getVariantOptionsSnapshot(connection, variant.id);

      return {
        product_id: Number(product.id),

        variant_id: Number(variant.id),

        product_name: product.name,

        variant_name: variant.variant_name || null,

        sku: variant.sku || product.sku || null,

        product_image: variant.thumbnail || product.thumbnail || null,

        variant_options: options,

        quantity: requestedQuantity,

        price,

        total_price: price * requestedQuantity,

        stock_scope: "variant",

        available_stock: stock,
      };
    }
  }

  // ========================================================
  // PRODUCT LEGACY KHÔNG CÓ VARIANT
  // ========================================================

  const stock = Math.max(Number(product.quantity || 0), 0);

  if (requestedQuantity > stock) {
    throw new Error(`Sản phẩm "${product.name}" chỉ còn ${stock} sản phẩm.`);
  }

  const price = getFinalPrice({
    price: product.price,

    sale_price: product.sale_price,
  });

  return {
    product_id: Number(product.id),

    variant_id: null,

    product_name: product.name,

    variant_name: null,

    sku: product.sku || null,

    product_image: product.thumbnail || null,

    variant_options: [],

    quantity: requestedQuantity,

    price,

    total_price: price * requestedQuantity,

    stock_scope: "product",

    available_stock: stock,
  };
};

// ============================================================
// DECREASE STOCK
// ============================================================

const decreaseCheckoutStock = async (connection, item) => {
  // ========================================================
  // VARIANT
  // ========================================================

  if (item.variant_id) {
    const result = await runQuery(
      connection,
      `
            UPDATE product_variants

            SET
              quantity =
                quantity - ?,

              updated_at =
                NOW()

            WHERE
              id = ?
              AND product_id = ?
              AND deleted_at IS NULL
              AND status = 1
              AND quantity >= ?
          `,
      [item.quantity, item.variant_id, item.product_id, item.quantity],
    );

    if (Number(result.affectedRows || 0) !== 1) {
      throw new Error(
        `Biến thể "${item.variant_name || item.product_name}" vừa thay đổi tồn kho. Vui lòng tải lại giỏ hàng.`,
      );
    }

    /*
     * products.quantity
     * = tổng stock variant.
     */
    await ProductVariant.syncProductAggregate(connection, item.product_id);

    return;
  }

  // ========================================================
  // LEGACY PRODUCT
  // ========================================================

  const result = await runQuery(
    connection,
    `
          UPDATE products

          SET
            quantity =
              quantity - ?,

            updated_at =
              NOW()

          WHERE
            id = ?
            AND deleted_at IS NULL
            AND status = 1
            AND quantity >= ?
        `,
    [item.quantity, item.product_id, item.quantity],
  );

  if (Number(result.affectedRows || 0) !== 1) {
    throw new Error(
      `Sản phẩm "${item.product_name}" vừa thay đổi tồn kho. Vui lòng tải lại giỏ hàng.`,
    );
  }
};

// ============================================================
// RESTORE STOCK OF ONE ORDER
// ============================================================

const restoreOrderStock = async (connection, orderId) => {
  // ========================================================
  // LOCK ORDER
  // ========================================================

  const orderRows = await runQuery(
    connection,
    `
          SELECT
            id,
            status,
            stock_restored_at

          FROM orders

          WHERE
            id = ?
            AND deleted_at IS NULL

          LIMIT 1

          FOR UPDATE
        `,
    [orderId],
  );

  const order = orderRows[0];

  if (!order) {
    throw new Error("Không tìm thấy đơn hàng");
  }

  /*
   * Chống hoàn kho hai lần.
   */
  if (order.stock_restored_at) {
    return {
      restored: false,
      already_restored: true,
    };
  }

  // ========================================================
  // LOCK ORDER ITEMS
  // ========================================================

  const items = await runQuery(
    connection,
    `
          SELECT
            id,
            product_id,
            variant_id,
            product_name,
            variant_name,
            sku,
            quantity

          FROM order_items

          WHERE
            order_id = ?
            AND deleted_at IS NULL

          ORDER BY id ASC

          FOR UPDATE
        `,
    [orderId],
  );

  const productsToSync = new Set();

  for (const item of items) {
    const productId = normalizeInt(item.product_id);

    const variantId = normalizeNullableInt(item.variant_id);

    const quantity = Math.max(normalizeInt(item.quantity, 0), 0);

    if (productId < 1 || quantity < 1) {
      continue;
    }

    // ======================================================
    // RESTORE VARIANT STOCK
    // ======================================================

    if (variantId) {
      const result = await runQuery(
        connection,
        `
              UPDATE product_variants

              SET
                quantity =
                  quantity + ?,

                updated_at =
                  NOW()

              WHERE
                id = ?
                AND product_id = ?
            `,
        [quantity, variantId, productId],
      );

      /*
       * Variant có thể đã bị force delete.
       * Không được cộng nhầm vào products.
       */
      if (Number(result.affectedRows || 0) === 1) {
        productsToSync.add(productId);
      }

      continue;
    }

    // ======================================================
    // RESTORE LEGACY PRODUCT STOCK
    // ======================================================

    await runQuery(
      connection,
      `
          UPDATE products

          SET
            quantity =
              quantity + ?,

            updated_at =
              NOW()

          WHERE
            id = ?
            AND deleted_at IS NULL
        `,
      [quantity, productId],
    );
  }

  // ========================================================
  // SYNC PRODUCT AGGREGATE
  // ========================================================

  for (const productId of productsToSync) {
    await ProductVariant.syncProductAggregate(connection, productId);
  }

  // ========================================================
  // MARK RESTORED
  // ========================================================

  await runQuery(
    connection,
    `
        UPDATE orders

        SET
          stock_restored_at =
            NOW(),

          updated_at =
            NOW()

        WHERE
          id = ?
          AND stock_restored_at IS NULL
          AND deleted_at IS NULL
      `,
    [orderId],
  );

  return {
    restored: true,
    already_restored: false,
  };
};

// ============================================================
// USER ORDER FILTER
// ============================================================

const buildUserOrderConditions = ({ userId, status, search }) => {
  const conditions = ["o.user_id = ?", "o.deleted_at IS NULL"];

  const params = [userId];

  if (status) {
    conditions.push("o.status = ?");

    params.push(status);
  }

  if (search) {
    const keyword = `%${search}%`;

    conditions.push(
      `
          (
            o.order_code LIKE ?
            OR o.shipping_name LIKE ?
            OR o.shipping_phone LIKE ?
            OR COALESCE(
              o.shipping_email,
              ''
            ) LIKE ?
          )
        `,
    );

    params.push(keyword, keyword, keyword, keyword);
  }

  return {
    whereSql: conditions.join("\n AND "),

    params,
  };
};

// ============================================================
// NORMALIZE ORDER ITEM
// ============================================================

const normalizeOrderItem = (item) => {
  return {
    ...item,

    id: Number(item.id),

    order_id: Number(item.order_id),

    product_id: Number(item.product_id),

    variant_id:
      item.variant_id !== null && item.variant_id !== undefined
        ? Number(item.variant_id)
        : null,

    price: Number(item.price || 0),

    quantity: Number(item.quantity || 0),

    total_price: Number(item.total_price || 0),

    variant_options: parseJson(item.variant_options, []),
  };
};

// ============================================================
// ORDER MODEL
// ============================================================

const Order = {
  // ==========================================================
  // CART + ITEMS
  // ==========================================================

  async getCartWithItems(userId) {
    const cartRows = await query(
      `
          SELECT *

          FROM carts

          WHERE
            user_id = ?
            AND deleted_at IS NULL

          LIMIT 1
        `,
      [userId],
    );

    const cart = cartRows[0];

    if (!cart) {
      return {
        cart: null,
        items: [],
      };
    }

    const items = await query(
      `
          SELECT
            ci.id
              AS cart_item_id,

            ci.cart_id,

            ci.product_id,
            ci.variant_id,

            ci.quantity,

            ci.price
              AS cart_price,

            ci.total_price
              AS cart_total_price,

            p.name
              AS product_name,

            p.slug
              AS product_slug,

            p.thumbnail
              AS product_image,

            p.status
              AS product_status,

            pv.variant_name,
            pv.sku
              AS variant_sku,

            pv.thumbnail
              AS variant_thumbnail,

            pv.price
              AS variant_price,

            pv.sale_price
              AS variant_sale_price,

            pv.quantity
              AS variant_stock,

            pv.status
              AS variant_status

          FROM cart_items ci

          INNER JOIN products p
            ON p.id =
               ci.product_id

          LEFT JOIN product_variants pv
            ON pv.id =
               ci.variant_id

          WHERE
            ci.cart_id = ?
            AND ci.deleted_at IS NULL
            AND p.deleted_at IS NULL

          ORDER BY
            ci.id ASC
        `,
      [cart.id],
    );

    return {
      cart,
      items,
    };
  },

  // ==========================================================
  // CREATE ORDER FROM CART
  // ==========================================================

  async createFromCart(data) {
    const userId = normalizeInt(data.user_id);

    if (userId < 1) {
      throw new Error("Người dùng không hợp lệ");
    }

    const connection = await getTransactionConnection();

    let orderId = null;

    try {
      await connection.beginTransaction();

      // ======================================================
      // LOCK CART
      // ======================================================

      const cartRows = await runQuery(
        connection,
        `
            SELECT
              id,
              user_id

            FROM carts

            WHERE
              user_id = ?
              AND deleted_at IS NULL

            LIMIT 1

            FOR UPDATE
          `,
        [userId],
      );

      const cart = cartRows[0];

      if (!cart) {
        throw new Error("Giỏ hàng đang trống");
      }

      // ======================================================
      // CART ITEMS
      // ======================================================

      const cartItems = await runQuery(
        connection,
        `
            SELECT
              id,
              cart_id,
              product_id,
              variant_id,
              quantity,
              price,
              total_price

            FROM cart_items

            WHERE
              cart_id = ?
              AND deleted_at IS NULL

            ORDER BY
              id ASC

            FOR UPDATE
          `,
        [cart.id],
      );

      if (cartItems.length === 0) {
        throw new Error("Giỏ hàng đang trống");
      }

      // ======================================================
      // BUILD CHECKOUT ITEMS
      //
      // Re-read Product + Variant.
      //
      // Không tin price hiện tại trong cart_items vì admin
      // có thể vừa đổi giá.
      // ======================================================

      const checkoutItems = [];

      for (const cartItem of cartItems) {
        const checkoutItem = await normalizeCartCheckoutItem(
          connection,
          cartItem,
        );

        checkoutItems.push(checkoutItem);
      }

      // ======================================================
      // TOTAL
      // ======================================================

      const itemsTotal = checkoutItems.reduce(
        (sum, item) => sum + Number(item.total_price || 0),
        0,
      );

      const shippingFee = Math.max(Number(data.shipping_fee || 0), 0);

      const discountAmount = Math.max(Number(data.discount_amount || 0), 0);

      const totalAmount = Math.max(
        itemsTotal + shippingFee - discountAmount,
        0,
      );

      const orderCode = generateOrderCode();

      // ======================================================
      // CREATE ORDER
      // ======================================================

      const orderResult = await runQuery(
        connection,
        `
            INSERT INTO orders
            (
              user_id,
              order_code,

              total_amount,

              shipping_name,
              shipping_phone,
              shipping_email,
              shipping_address,

              note,

              status,

              stock_restored_at,

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
              ?,
              ?,

              'PENDING',

              NULL,

              NOW(),
              NOW()
            )
          `,
        [
          userId,

          orderCode,

          totalAmount,

          data.shipping_name,

          data.shipping_phone,

          data.shipping_email || null,

          data.shipping_address,

          data.note || null,
        ],
      );

      orderId = orderResult.insertId;

      if (!orderId) {
        throw new Error("Không tạo được đơn hàng");
      }

      // ======================================================
      // ORDER ITEMS + STOCK
      // ======================================================

      for (const item of checkoutItems) {
        // ----------------------------------------------------
        // Trừ stock đúng Product / Variant
        // ----------------------------------------------------

        await decreaseCheckoutStock(connection, item);

        // ----------------------------------------------------
        // Snapshot order item
        // ----------------------------------------------------

        await runQuery(
          connection,
          `
            INSERT INTO order_items
            (
              order_id,

              product_id,
              variant_id,

              product_name,
              variant_name,

              sku,

              product_image,

              variant_options,

              price,
              quantity,
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
            orderId,

            item.product_id,

            item.variant_id,

            item.product_name,

            item.variant_name,

            item.sku,

            item.product_image,

            stringifyJson(item.variant_options),

            item.price,

            item.quantity,

            item.total_price,
          ],
        );
      }

      // ======================================================
      // PAYMENT
      // ======================================================

      await runQuery(
        connection,
        `
          INSERT INTO payments
          (
            order_id,

            payment_method,

            amount,

            transaction_code,
            paid_at,

            status,

            created_at,
            updated_at
          )

          VALUES
          (
            ?,
            ?,
            ?,

            NULL,
            NULL,

            0,

            NOW(),
            NOW()
          )
        `,
        [orderId, data.payment_method || "cod", totalAmount],
      );

      // ======================================================
      // CLEAR CART
      // ======================================================

      await runQuery(
        connection,
        `
          UPDATE cart_items

          SET
            deleted_at =
              NOW(),

            updated_at =
              NOW()

          WHERE
            cart_id = ?
            AND deleted_at IS NULL
        `,
        [cart.id],
      );

      await runQuery(
        connection,
        `
          UPDATE carts

          SET
            quantity = 0,

            total_price = 0,

            updated_at =
              NOW()

          WHERE id = ?
        `,
        [cart.id],
      );

      // ======================================================
      // COMMIT
      // ======================================================

      await connection.commit();
    } catch (error) {
      await connection.rollback();

      throw error;
    } finally {
      connection.release();
    }

    return this.getById(orderId);
  },

  // ==========================================================
  // GET ORDER BY ID
  // ==========================================================

  async getById(id) {
    const orderRows = await query(
      `
          SELECT
            o.*,

            p.payment_method,

            p.amount
              AS payment_amount,

            p.status
              AS payment_status,

            p.transaction_code,

            p.paid_at

          FROM orders o

          LEFT JOIN payments p
            ON p.id = (
              SELECT
                p2.id

              FROM payments p2

              WHERE
                p2.order_id =
                  o.id

                AND p2.deleted_at
                    IS NULL

              ORDER BY
                p2.id DESC

              LIMIT 1
            )

          WHERE
            o.id = ?
            AND o.deleted_at IS NULL

          LIMIT 1
        `,
      [id],
    );

    const order = orderRows[0];

    if (!order) {
      return null;
    }

    const items = await query(
      `
          SELECT
            id,
            order_id,

            product_id,
            variant_id,

            product_name,
            variant_name,

            sku,

            product_image,

            variant_options,

            price,
            quantity,
            total_price,

            created_at,
            updated_at

          FROM order_items

          WHERE
            order_id = ?
            AND deleted_at IS NULL

          ORDER BY id ASC
        `,
      [id],
    );

    return {
      ...order,

      id: Number(order.id),

      total_amount: Number(order.total_amount || 0),

      payment_amount:
        order.payment_amount !== null && order.payment_amount !== undefined
          ? Number(order.payment_amount)
          : null,

      items: items.map(normalizeOrderItem),
    };
  },

  // ==========================================================
  // GET USER ORDER BY ID
  // ==========================================================

  async getUserOrderById({ userId, orderId }) {
    const orderRows = await query(
      `
          SELECT
            o.*,

            p.payment_method,

            p.amount
              AS payment_amount,

            p.status
              AS payment_status,

            p.transaction_code,

            p.paid_at

          FROM orders o

          LEFT JOIN payments p
            ON p.id = (
              SELECT
                p2.id

              FROM payments p2

              WHERE
                p2.order_id =
                  o.id

                AND p2.deleted_at
                    IS NULL

              ORDER BY
                p2.id DESC

              LIMIT 1
            )

          WHERE
            o.id = ?
            AND o.user_id = ?
            AND o.deleted_at IS NULL

          LIMIT 1
        `,
      [orderId, userId],
    );

    const order = orderRows[0];

    if (!order) {
      return null;
    }

    const items = await query(
      `
          SELECT
            id,
            order_id,

            product_id,
            variant_id,

            product_name,
            variant_name,

            sku,

            product_image,

            variant_options,

            price,
            quantity,
            total_price,

            created_at,
            updated_at

          FROM order_items

          WHERE
            order_id = ?
            AND deleted_at IS NULL

          ORDER BY
            id ASC
        `,
      [orderId],
    );

    return {
      ...order,

      id: Number(order.id),

      total_amount: Number(order.total_amount || 0),

      items: items.map(normalizeOrderItem),
    };
  },

  // ==========================================================
  // USER ORDERS
  // ==========================================================

  async getUserOrders({
    userId,

    page = 1,

    limit = 10,

    status = "",

    search = "",
  }) {
    const safePage = Math.max(normalizeInt(page, 1), 1);

    const safeLimit = Math.min(Math.max(normalizeInt(limit, 10), 1), 50);

    const offset = (safePage - 1) * safeLimit;

    const { whereSql, params } = buildUserOrderConditions({
      userId,
      status,
      search,
    });

    const rows = await query(
      `
          SELECT
            o.id,
            o.user_id,
            o.order_code,
            o.total_amount,

            o.shipping_name,
            o.shipping_phone,
            o.shipping_email,
            o.shipping_address,

            o.note,

            o.status,

            o.created_at,
            o.updated_at,

            p.payment_method,

            p.amount
              AS payment_amount,

            p.status
              AS payment_status,

            p.transaction_code,

            p.paid_at,

            COALESCE(
              item_summary.item_count,
              0
            ) AS item_count,

            COALESCE(
              item_summary.total_quantity,
              0
            ) AS total_quantity

          FROM orders o

          LEFT JOIN payments p
            ON p.id = (
              SELECT
                p2.id

              FROM payments p2

              WHERE
                p2.order_id =
                  o.id

                AND p2.deleted_at
                    IS NULL

              ORDER BY
                p2.id DESC

              LIMIT 1
            )

          LEFT JOIN (
            SELECT
              order_id,

              COUNT(*)
                AS item_count,

              SUM(quantity)
                AS total_quantity

            FROM order_items

            WHERE
              deleted_at IS NULL

            GROUP BY
              order_id
          ) AS item_summary
            ON item_summary.order_id =
               o.id

          WHERE
            ${whereSql}

          ORDER BY
            o.created_at DESC,
            o.id DESC

          LIMIT ${safeLimit}
          OFFSET ${offset}
        `,
      params,
    );

    return rows.map((item) => ({
      ...item,

      id: Number(item.id),

      user_id: Number(item.user_id),

      total_amount: Number(item.total_amount || 0),

      payment_amount:
        item.payment_amount !== null && item.payment_amount !== undefined
          ? Number(item.payment_amount)
          : null,

      item_count: Number(item.item_count || 0),

      total_quantity: Number(item.total_quantity || 0),
    }));
  },

  // ==========================================================
  // COUNT USER ORDERS
  // ==========================================================

  async countUserOrders({ userId, status = "", search = "" }) {
    const { whereSql, params } = buildUserOrderConditions({
      userId,
      status,
      search,
    });

    const rows = await query(
      `
          SELECT
            COUNT(*) AS total

          FROM orders o

          WHERE
            ${whereSql}
        `,
      params,
    );

    return normalizeInt(rows[0]?.total, 0);
  },

  // ==========================================================
  // GET BY ORDER CODE
  // ==========================================================

  async getByOrderCode(orderCode) {
    const orderRows = await query(
      `
          SELECT id

          FROM orders

          WHERE
            order_code = ?
            AND deleted_at IS NULL

          LIMIT 1
        `,
      [orderCode],
    );

    const order = orderRows[0];

    if (!order) {
      return null;
    }

    return this.getById(order.id);
  },

  // ==========================================================
  // GET BY USER
  // ==========================================================

  async getByUserId(userId) {
    return query(
      `
        SELECT *

        FROM orders

        WHERE
          user_id = ?
          AND deleted_at IS NULL

        ORDER BY id DESC
      `,
      [userId],
    );
  },

  // ==========================================================
  // MOMO PAYMENT STATUS BY ORDER CODE
  // ==========================================================

  async updatePaymentStatusByOrderCode({
    order_code,

    payment_status,

    transaction_code = null,
  }) {
    const connection = await getTransactionConnection();

    let orderId = null;

    try {
      await connection.beginTransaction();

      // ======================================================
      // LOCK ORDER
      // ======================================================

      const orderRows = await runQuery(
        connection,
        `
            SELECT
              id,
              status,
              stock_restored_at

            FROM orders

            WHERE
              order_code = ?
              AND deleted_at IS NULL

            LIMIT 1

            FOR UPDATE
          `,
        [order_code],
      );

      const order = orderRows[0];

      if (!order) {
        await connection.rollback();

        return null;
      }

      orderId = Number(order.id);

      const isPaid = Number(payment_status) === 1;

      // ======================================================
      // LOCK PAYMENT
      // ======================================================

      const paymentRows = await runQuery(
        connection,
        `
            SELECT
              id,
              status,
              transaction_code,
              paid_at

            FROM payments

            WHERE
              order_id = ?
              AND deleted_at IS NULL

            ORDER BY
              id DESC

            LIMIT 1

            FOR UPDATE
          `,
        [orderId],
      );

      const payment = paymentRows[0];

      if (!payment) {
        throw new Error("Không tìm thấy thông tin thanh toán");
      }

      // ======================================================
      // SUCCESS
      // ======================================================

      if (isPaid) {
        if (String(order.status || "").toUpperCase() === "CANCELLED") {
          throw new Error("Đơn hàng đã bị hủy, không thể xác nhận thanh toán.");
        }

        await runQuery(
          connection,
          `
            UPDATE payments

            SET
              status = 1,

              transaction_code =
                COALESCE(
                  ?,
                  transaction_code
                ),

              paid_at =
                COALESCE(
                  paid_at,
                  NOW()
                ),

              updated_at =
                NOW()

            WHERE
              id = ?
              AND deleted_at IS NULL
          `,
          [transaction_code, payment.id],
        );

        await runQuery(
          connection,
          `
            UPDATE orders

            SET
              status =
                CASE
                  WHEN status =
                       'PENDING'
                  THEN
                       'PROCESSING'

                  ELSE status
                END,

              updated_at =
                NOW()

            WHERE
              id = ?
              AND deleted_at IS NULL
              AND status <> 'CANCELLED'
          `,
          [orderId],
        );

        await connection.commit();

        return this.getById(orderId);
      }

      // ======================================================
      // FAIL CALLBACK SAU SUCCESS
      // ======================================================

      if (Number(payment.status) === 1) {
        await connection.commit();

        return this.getById(orderId);
      }

      // ======================================================
      // PAYMENT FAILED
      // ======================================================

      await runQuery(
        connection,
        `
          UPDATE payments

          SET
            status = 0,

            transaction_code =
              COALESCE(
                ?,
                transaction_code
              ),

            updated_at =
              NOW()

          WHERE
            id = ?
            AND deleted_at IS NULL
        `,
        [transaction_code, payment.id],
      );

      // ======================================================
      // RESTORE VARIANT / PRODUCT STOCK
      // ======================================================

      await restoreOrderStock(connection, orderId);

      // ======================================================
      // CANCEL ORDER
      // ======================================================

      await runQuery(
        connection,
        `
          UPDATE orders

          SET
            status =
              'CANCELLED',

            cancel_reason =
              COALESCE(
                cancel_reason,
                'Thanh toán MoMo thất bại'
              ),

            cancelled_at =
              COALESCE(
                cancelled_at,
                NOW()
              ),

            updated_at =
              NOW()

          WHERE
            id = ?
            AND deleted_at IS NULL
            AND status <> 'COMPLETED'
        `,
        [orderId],
      );

      await connection.commit();

      return this.getById(orderId);
    } catch (error) {
      await connection.rollback();

      throw error;
    } finally {
      connection.release();
    }
  },

  // ==========================================================
  // PAYMENT STATUS BY ORDER ID
  // ==========================================================

  // ==========================================================
  // PAYMENT STATUS BY ORDER ID
  // ==========================================================

  async updatePaymentStatusByOrderId({
    order_id,
    payment_status,
    transaction_code = null,
  }) {
    const order = await this.getById(order_id);

    if (!order) {
      return null;
    }

    const isPaid = Number(payment_status) === 1;

    // ========================================================
    // PAYMENT SUCCESS
    // ========================================================

    if (isPaid) {
      /*
       * Không cho callback success làm sống lại
       * một order đã CANCELLED.
       */
      if (String(order.status || "").toUpperCase() === "CANCELLED") {
        throw new Error("Đơn hàng đã bị hủy, không thể xác nhận thanh toán.");
      }

      await query(
        `
        UPDATE payments

        SET
          status = 1,

          transaction_code =
            COALESCE(
              ?,
              transaction_code
            ),

          paid_at =
            COALESCE(
              paid_at,
              NOW()
            ),

          updated_at =
            NOW()

        WHERE
          order_id = ?
          AND deleted_at IS NULL
      `,
        [transaction_code, order_id],
      );

      await query(
        `
        UPDATE orders

        SET
          status =
            CASE
              WHEN status = 'PENDING'
              THEN 'PROCESSING'

              ELSE status
            END,

          updated_at =
            NOW()

        WHERE
          id = ?
          AND deleted_at IS NULL
          AND status <> 'CANCELLED'
      `,
        [order_id],
      );

      return this.getById(order_id);
    }

    // ========================================================
    // PAYMENT FAILED
    // ========================================================

    /*
     * Nếu payment đã SUCCESS trước đó,
     * callback fail tới trễ không được đảo ngược.
     */
    const paymentRows = await query(
      `
      SELECT
        id,
        status

      FROM payments

      WHERE
        order_id = ?
        AND deleted_at IS NULL

      ORDER BY id DESC

      LIMIT 1
    `,
      [order_id],
    );

    const payment = paymentRows[0];

    if (payment && Number(payment.status) === 1) {
      return this.getById(order_id);
    }

    await query(
      `
      UPDATE payments

      SET
        status = 0,

        transaction_code =
          COALESCE(
            ?,
            transaction_code
          ),

        paid_at = NULL,

        updated_at =
          NOW()

      WHERE
        order_id = ?
        AND deleted_at IS NULL
    `,
      [transaction_code, order_id],
    );

    return this.cancelAndRestoreStock({
      orderId: order_id,

      reason: "Thanh toán thất bại",

      allowedStatuses: ["PENDING"],
    });
  },

  // ==========================================================
  // CANCEL BY USER
  // ==========================================================

  async cancelByUser({ userId, orderId, reason }) {
    const normalizedUserId = normalizeInt(userId);

    const normalizedOrderId = normalizeInt(orderId);

    const normalizedReason = String(reason || "")
      .trim()
      .slice(0, 500);

    if (normalizedUserId < 1 || normalizedOrderId < 1) {
      throw new Error("Thông tin đơn hàng không hợp lệ");
    }

    if (!normalizedReason) {
      throw new Error("Vui lòng chọn lý do hủy đơn hàng");
    }

    const order = await this.getUserOrderById({
      userId: normalizedUserId,

      orderId: normalizedOrderId,
    });

    if (!order) {
      throw new Error("Không tìm thấy đơn hàng");
    }

    if (String(order.status || "").toUpperCase() !== "PENDING") {
      throw new Error("Chỉ đơn hàng đang chờ xác nhận mới được hủy");
    }

    if (Number(order.payment_status) === 1) {
      throw new Error("Đơn hàng đã thanh toán nên không thể hủy trực tiếp");
    }

    return this.cancelAndRestoreStock({
      orderId: normalizedOrderId,

      reason: normalizedReason,

      allowedStatuses: ["PENDING"],
    });
  },

  // ==========================================================
  // REORDER PREVIEW
  // ==========================================================

  async getReorderCheckoutPreview({ userId, orderId }) {
    const normalizedUserId = normalizeInt(userId);

    const normalizedOrderId = normalizeInt(orderId);

    if (normalizedUserId < 1 || normalizedOrderId < 1) {
      return null;
    }

    const sourceOrder = await this.getUserOrderById({
      userId: normalizedUserId,

      orderId: normalizedOrderId,
    });

    if (!sourceOrder) {
      return null;
    }

    if (String(sourceOrder.status || "").toUpperCase() !== "CANCELLED") {
      throw new Error("Chỉ đơn hàng đã hủy mới có thể mua lại");
    }

    const availableItems = [];

    const unavailableItems = [];

    for (const item of sourceOrder.items || []) {
      const productId = normalizeInt(item.product_id);

      const variantId = normalizeNullableInt(item.variant_id);

      const requestedQuantity = Math.max(normalizeInt(item.quantity, 0), 0);

      if (productId < 1 || requestedQuantity < 1) {
        continue;
      }

      // ======================================================
      // PRODUCT
      // ======================================================

      const productRows = await query(
        `
            SELECT
              id,
              name,
              thumbnail,
              price,
              sale_price,
              quantity,
              status

            FROM products

            WHERE
              id = ?
              AND deleted_at IS NULL

            LIMIT 1
          `,
        [productId],
      );

      const product = productRows[0];

      if (!product) {
        unavailableItems.push({
          product_id: productId,

          variant_id: variantId,

          product_name: item.product_name,

          variant_name: item.variant_name,

          requested_quantity: requestedQuantity,

          available_quantity: 0,

          reason: "Sản phẩm không còn tồn tại",
        });

        continue;
      }

      if (Number(product.status) !== 1) {
        unavailableItems.push({
          product_id: productId,

          variant_id: variantId,

          product_name: item.product_name,

          variant_name: item.variant_name,

          requested_quantity: requestedQuantity,

          available_quantity: 0,

          reason: "Sản phẩm hiện không khả dụng",
        });

        continue;
      }

      // ======================================================
      // REORDER VARIANT
      // ======================================================

      if (variantId) {
        const variantRows = await query(
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

                status

              FROM product_variants

              WHERE
                id = ?
                AND product_id = ?
                AND deleted_at IS NULL

              LIMIT 1
            `,
          [variantId, productId],
        );

        const variant = variantRows[0];

        if (!variant) {
          unavailableItems.push({
            product_id: productId,

            variant_id: variantId,

            product_name: item.product_name,

            variant_name: item.variant_name,

            requested_quantity: requestedQuantity,

            available_quantity: 0,

            reason: "Biến thể đã mua trước đây không còn tồn tại",
          });

          continue;
        }

        if (Number(variant.status) !== 1) {
          unavailableItems.push({
            product_id: productId,

            variant_id: variantId,

            product_name: product.name,

            variant_name: variant.variant_name,

            requested_quantity: requestedQuantity,

            available_quantity: 0,

            reason: "Biến thể hiện không khả dụng",
          });

          continue;
        }

        const stock = Math.max(Number(variant.quantity || 0), 0);

        if (stock <= 0) {
          unavailableItems.push({
            product_id: productId,

            variant_id: variantId,

            product_name: product.name,

            variant_name: variant.variant_name,

            requested_quantity: requestedQuantity,

            available_quantity: 0,

            reason: "Biến thể đã hết hàng",
          });

          continue;
        }

        const checkoutQuantity = Math.min(requestedQuantity, stock);

        const price = getFinalPrice({
          price: variant.price,

          sale_price: variant.sale_price,
        });

        const variantOptions = await getVariantOptionsSnapshot(db, variantId);

        availableItems.push({
          product_id: productId,

          variant_id: variantId,

          product_name: product.name,

          variant_name: variant.variant_name,

          sku: variant.sku,

          product_image:
            variant.thumbnail ||
            product.thumbnail ||
            item.product_image ||
            null,

          variant_options: variantOptions,

          requested_quantity: requestedQuantity,

          quantity: checkoutQuantity,

          product_stock: stock,

          price,

          final_price: price,

          total_price: price * checkoutQuantity,

          quantity_adjusted: checkoutQuantity < requestedQuantity,
        });

        if (checkoutQuantity < requestedQuantity) {
          unavailableItems.push({
            product_id: productId,

            variant_id: variantId,

            product_name: product.name,

            variant_name: variant.variant_name,

            requested_quantity: requestedQuantity,

            available_quantity: checkoutQuantity,

            reason: "Tồn kho biến thể hiện tại không đủ số lượng như đơn cũ",
          });
        }

        continue;
      }

      // ======================================================
      // LEGACY PRODUCT
      // ======================================================

      const stock = Math.max(Number(product.quantity || 0), 0);

      if (stock <= 0) {
        unavailableItems.push({
          product_id: productId,

          variant_id: null,

          product_name: product.name,

          requested_quantity: requestedQuantity,

          available_quantity: 0,

          reason: "Sản phẩm đã hết hàng",
        });

        continue;
      }

      const checkoutQuantity = Math.min(requestedQuantity, stock);

      const price = getFinalPrice({
        price: product.price,

        sale_price: product.sale_price,
      });

      availableItems.push({
        product_id: productId,

        variant_id: null,

        product_name: product.name,

        variant_name: null,

        sku: item.sku || null,

        product_image: product.thumbnail || item.product_image || null,

        variant_options: [],

        requested_quantity: requestedQuantity,

        quantity: checkoutQuantity,

        product_stock: stock,

        price,

        final_price: price,

        total_price: price * checkoutQuantity,

        quantity_adjusted: checkoutQuantity < requestedQuantity,
      });
    }

    const subtotal = availableItems.reduce(
      (sum, item) => sum + Number(item.total_price || 0),
      0,
    );

    return {
      source_order: {
        id: sourceOrder.id,

        order_code: sourceOrder.order_code,

        status: sourceOrder.status,

        shipping_name: sourceOrder.shipping_name || "",

        shipping_phone: sourceOrder.shipping_phone || "",

        shipping_email: sourceOrder.shipping_email || "",

        shipping_address: sourceOrder.shipping_address || "",

        note: sourceOrder.note || "",
      },

      items: availableItems,

      unavailable_items: unavailableItems,

      subtotal,
    };
  },

  // ==========================================================
  // CREATE REORDER
  // ==========================================================

  async createFromReorder(data) {
    const userId = normalizeInt(data.user_id);

    const sourceOrderId = normalizeInt(data.source_order_id);

    if (userId < 1 || sourceOrderId < 1) {
      throw new Error("Thông tin mua lại không hợp lệ");
    }

    /*
     * Preview trước.
     *
     * Sau đó transaction sẽ lock + kiểm tra stock lần cuối.
     */
    const preview = await this.getReorderCheckoutPreview({
      userId,
      orderId: sourceOrderId,
    });

    if (
      !preview ||
      !Array.isArray(preview.items) ||
      preview.items.length === 0
    ) {
      throw new Error("Không có sản phẩm nào còn khả dụng để mua lại");
    }

    const connection = await getTransactionConnection();

    let newOrderId = null;

    try {
      await connection.beginTransaction();

      // ======================================================
      // LOCK SOURCE ORDER
      // ======================================================

      const sourceOrderRows = await runQuery(
        connection,
        `
            SELECT
              id,
              user_id,
              order_code,
              status

            FROM orders

            WHERE
              id = ?
              AND user_id = ?
              AND deleted_at IS NULL

            LIMIT 1

            FOR UPDATE
          `,
        [sourceOrderId, userId],
      );

      const sourceOrder = sourceOrderRows[0];

      if (!sourceOrder) {
        throw new Error("Không tìm thấy đơn hàng cần mua lại");
      }

      if (String(sourceOrder.status || "").toUpperCase() !== "CANCELLED") {
        throw new Error("Chỉ đơn hàng đã hủy mới có thể mua lại");
      }

      // ======================================================
      // REVALIDATE ITEMS
      // ======================================================

      const checkoutItems = [];

      for (const previewItem of preview.items) {
        const normalized = await normalizeCartCheckoutItem(connection, {
          product_id: previewItem.product_id,

          variant_id: previewItem.variant_id,

          quantity: previewItem.quantity,
        });

        checkoutItems.push(normalized);
      }

      if (checkoutItems.length === 0) {
        throw new Error("Không có sản phẩm nào còn khả dụng để mua lại");
      }

      // ======================================================
      // TOTAL
      // ======================================================

      const itemsTotal = checkoutItems.reduce(
        (sum, item) => sum + Number(item.total_price || 0),
        0,
      );

      const shippingFee = Math.max(Number(data.shipping_fee || 0), 0);

      const discountAmount = Math.max(Number(data.discount_amount || 0), 0);

      const totalAmount = Math.max(
        itemsTotal + shippingFee - discountAmount,
        0,
      );

      const orderCode = generateOrderCode();

      // ======================================================
      // CREATE NEW ORDER
      // ======================================================

      const orderResult = await runQuery(
        connection,
        `
            INSERT INTO orders
            (
              user_id,
              order_code,

              total_amount,

              shipping_name,
              shipping_phone,
              shipping_email,
              shipping_address,

              note,

              status,

              stock_restored_at,

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
              ?,
              ?,

              'PENDING',

              NULL,

              NOW(),
              NOW()
            )
          `,
        [
          userId,

          orderCode,

          totalAmount,

          data.shipping_name,

          data.shipping_phone,

          data.shipping_email || null,

          data.shipping_address,

          data.note || null,
        ],
      );

      newOrderId = orderResult.insertId;

      if (!newOrderId) {
        throw new Error("Không tạo được đơn mua lại");
      }

      // ======================================================
      // ITEMS + STOCK
      // ======================================================

      for (const item of checkoutItems) {
        await decreaseCheckoutStock(connection, item);

        await runQuery(
          connection,
          `
            INSERT INTO order_items
            (
              order_id,

              product_id,
              variant_id,

              product_name,
              variant_name,

              sku,

              product_image,

              variant_options,

              price,
              quantity,
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
            newOrderId,

            item.product_id,

            item.variant_id,

            item.product_name,

            item.variant_name,

            item.sku,

            item.product_image,

            stringifyJson(item.variant_options),

            item.price,

            item.quantity,

            item.total_price,
          ],
        );
      }

      // ======================================================
      // PAYMENT
      // ======================================================

      await runQuery(
        connection,
        `
          INSERT INTO payments
          (
            order_id,

            payment_method,

            amount,

            transaction_code,
            paid_at,

            status,

            created_at,
            updated_at
          )

          VALUES
          (
            ?,
            ?,
            ?,

            NULL,
            NULL,

            0,

            NOW(),
            NOW()
          )
        `,
        [newOrderId, data.payment_method || "cod", totalAmount],
      );

      await connection.commit();
    } catch (error) {
      await connection.rollback();

      throw error;
    } finally {
      connection.release();
    }

    return this.getById(newOrderId);
  },

  // ==========================================================
  // BANK INFO
  // ==========================================================

  async getBankInfo(orderId) {
    const order = await this.getById(orderId);

    if (!order) {
      return null;
    }

    return {
      order,

      bank: {
        bank_name: process.env.BANK_NAME || "MB Bank",

        account_number: process.env.BANK_ACCOUNT_NUMBER || "0123456789",

        account_name: process.env.BANK_ACCOUNT_NAME || "BUILDPC",

        branch: process.env.BANK_BRANCH || "Can Tho",

        transfer_content: order.order_code,

        amount: order.total_amount,
      },
    };
  },

  // ==========================================================
  // CANCEL + RESTORE STOCK
  // ==========================================================

  async cancelAndRestoreStock({
    orderId,

    reason = null,

    allowedStatuses = ["PENDING", "PROCESSING"],
  }) {
    const normalizedOrderId = normalizeInt(orderId);

    if (normalizedOrderId < 1) {
      throw new Error("Đơn hàng không hợp lệ");
    }

    const connection = await getTransactionConnection();

    try {
      await connection.beginTransaction();

      const orderRows = await runQuery(
        connection,
        `
            SELECT
              id,
              status,
              stock_restored_at

            FROM orders

            WHERE
              id = ?
              AND deleted_at IS NULL

            LIMIT 1

            FOR UPDATE
          `,
        [normalizedOrderId],
      );

      const order = orderRows[0];

      if (!order) {
        throw new Error("Không tìm thấy đơn hàng");
      }

      const currentStatus = String(order.status || "").toUpperCase();

      // ======================================================
      // ALREADY CANCELLED
      // ======================================================

      if (currentStatus === "CANCELLED") {
        await restoreOrderStock(connection, normalizedOrderId);

        await connection.commit();

        return this.getById(normalizedOrderId);
      }

      // ======================================================
      // STATUS VALIDATION
      // ======================================================

      if (!allowedStatuses.includes(currentStatus)) {
        throw new Error(`Không thể hủy đơn hàng ở trạng thái ${currentStatus}`);
      }

      // ======================================================
      // RESTORE PRODUCT / VARIANT STOCK
      // ======================================================

      await restoreOrderStock(connection, normalizedOrderId);

      // ======================================================
      // CANCEL
      // ======================================================

      await runQuery(
        connection,
        `
          UPDATE orders

          SET
            status =
              'CANCELLED',

            cancel_reason =
              COALESCE(
                ?,
                cancel_reason
              ),

            cancelled_at =
              COALESCE(
                cancelled_at,
                NOW()
              ),

            updated_at =
              NOW()

          WHERE
            id = ?
            AND deleted_at IS NULL
        `,
        [reason, normalizedOrderId],
      );

      await connection.commit();
    } catch (error) {
      await connection.rollback();

      throw error;
    } finally {
      connection.release();
    }

    return this.getById(normalizedOrderId);
  },
};

module.exports = Order;
