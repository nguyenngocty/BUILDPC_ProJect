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

const getTransactionConnection = async () => {
  const pool = database.pool || db;

  if (!pool || typeof pool.getConnection !== "function") {
    throw new Error("Database pool không hỗ trợ transaction");
  }

  return pool.getConnection();
};

const connectionQuery = async (connection, sql, params = []) => {
  const result = await connection.query(sql, params);

  return Array.isArray(result) ? result[0] : result;
};

const normalizeInt = (value, defaultValue = 0) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
};

const generateOrderCode = () => {
  const time = Date.now();
  const random = Math.floor(Math.random() * 9000) + 1000;

  return `ORD${time}${random}`;
};

const restoreOrderStock = async (connection, orderId) => {
  /*
   * Lock order để ngăn:
   *
   * - Admin cancel
   * - Client cancel
   * - MoMo return
   * - MoMo IPN
   *
   * cùng hoàn kho một đơn nhiều lần.
   */

  const orderRows = await connectionQuery(
    connection,
    `
        SELECT
          id,
          status,
          stock_restored_at

        FROM orders

        WHERE id = ?
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

  // Kho đã được hoàn trước đó.
  if (order.stock_restored_at) {
    return {
      restored: false,
      already_restored: true,
    };
  }

  const items = await connectionQuery(
    connection,
    `
        SELECT
          product_id,
          quantity

        FROM order_items

        WHERE order_id = ?
          AND deleted_at IS NULL

        ORDER BY id ASC

        FOR UPDATE
      `,
    [orderId],
  );

  for (const item of items) {
    const productId = normalizeInt(item.product_id);

    const quantity = Math.max(normalizeInt(item.quantity, 0), 0);

    if (productId < 1 || quantity < 1) {
      continue;
    }

    await connectionQuery(
      connection,
      `
        UPDATE products

        SET
          quantity =
            quantity + ?,

          updated_at =
            NOW()

        WHERE id = ?
          AND deleted_at IS NULL
      `,
      [quantity, productId],
    );
  }

  /*
   * Đây chính là cờ chống hoàn kho 2 lần.
   */
  await connectionQuery(
    connection,
    `
      UPDATE orders

      SET
        stock_restored_at =
          NOW(),

        updated_at =
          NOW()

      WHERE id = ?
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

const buildUserOrderConditions = ({ userId, status, search }) => {
  const conditions = ["o.user_id = ?", "o.deleted_at IS NULL"];

  const params = [userId];

  if (status) {
    conditions.push("o.status = ?");
    params.push(status);
  }

  if (search) {
    const keyword = `%${search}%`;

    conditions.push(`(
      o.order_code LIKE ?
      OR o.shipping_name LIKE ?
      OR o.shipping_phone LIKE ?
      OR COALESCE(o.shipping_email, '') LIKE ?
    )`);

    params.push(keyword, keyword, keyword, keyword);
  }

  return {
    whereSql: conditions.join("\n AND "),
    params,
  };
};

const Order = {
  async getCartWithItems(userId) {
    const cartRows = await query(
      `SELECT *
       FROM carts
       WHERE user_id = ?
         AND deleted_at IS NULL
       LIMIT 1`,
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
      `SELECT
          ci.id AS cart_item_id,
          ci.cart_id,
          ci.product_id,
          ci.quantity,
          ci.price AS cart_price,
          ci.total_price AS cart_total_price,

          p.name AS product_name,
          p.thumbnail AS product_image,
          p.price AS product_price,
          p.sale_price AS product_sale_price,
          p.quantity AS product_stock,
          p.status AS product_status,

          CASE
            WHEN ci.price IS NOT NULL
              AND ci.price > 0
              THEN ci.price
            WHEN p.sale_price IS NOT NULL
              AND p.sale_price > 0
              THEN p.sale_price
            ELSE p.price
          END AS final_price

       FROM cart_items ci

       INNER JOIN products p
         ON p.id = ci.product_id

       WHERE ci.cart_id = ?
         AND ci.deleted_at IS NULL
         AND p.deleted_at IS NULL

       ORDER BY ci.id ASC`,
      [cart.id],
    );

    return {
      cart,
      items,
    };
  },

  async createFromCart(data) {
    const userId = normalizeInt(data.user_id);

    if (userId < 1) {
      throw new Error("Người dùng không hợp lệ");
    }

    const connection = await getTransactionConnection();

    let orderId = null;

    try {
      await connection.beginTransaction();

      // ===================================================
      // LOCK CART
      // ===================================================

      const cartRows = await connectionQuery(
        connection,
        `
          SELECT
            id,
            user_id

          FROM carts

          WHERE user_id = ?
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

      // ===================================================
      // CART ITEMS
      // ===================================================

      const cartItems = await connectionQuery(
        connection,
        `
          SELECT
            ci.id
              AS cart_item_id,

            ci.product_id,
            ci.quantity,

            p.name
              AS product_name,

            p.thumbnail
              AS product_image,

            p.price
              AS product_price,

            p.sale_price
              AS product_sale_price,

            p.quantity
              AS product_stock,

            p.status
              AS product_status

          FROM cart_items ci

          INNER JOIN products p
            ON p.id =
               ci.product_id

          WHERE
            ci.cart_id = ?

            AND ci.deleted_at
                IS NULL

            AND p.deleted_at
                IS NULL

          ORDER BY ci.id ASC
        `,
        [cart.id],
      );

      if (cartItems.length === 0) {
        throw new Error("Giỏ hàng đang trống");
      }

      const checkoutItems = [];

      // ===================================================
      // LOCK TỪNG PRODUCT
      // ===================================================

      for (const cartItem of cartItems) {
        const productRows = await connectionQuery(
          connection,
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

              AND deleted_at
                  IS NULL

            LIMIT 1

            FOR UPDATE
          `,
          [cartItem.product_id],
        );

        const product = productRows[0];

        if (!product) {
          throw new Error(
            `Sản phẩm ID ${cartItem.product_id} không còn tồn tại`,
          );
        }

        if (Number(product.status) !== 1) {
          throw new Error(`Sản phẩm "${product.name}" hiện không khả dụng`);
        }

        const requestedQuantity = Math.max(
          normalizeInt(cartItem.quantity, 0),
          0,
        );

        const stock = Math.max(normalizeInt(product.quantity, 0), 0);

        if (requestedQuantity < 1) {
          throw new Error(`Số lượng "${product.name}" không hợp lệ`);
        }

        if (requestedQuantity > stock) {
          throw new Error(
            `Sản phẩm "${product.name}" chỉ còn ${stock} sản phẩm`,
          );
        }

        const regularPrice = Number(product.price || 0);

        const salePrice = Number(product.sale_price || 0);

        /*
         * Sale chỉ hợp lệ khi:
         *
         * 0 < sale_price < price
         */
        const finalPrice =
          salePrice > 0 && salePrice < regularPrice ? salePrice : regularPrice;

        checkoutItems.push({
          product_id: product.id,

          product_name: product.name,

          product_image: product.thumbnail || null,

          quantity: requestedQuantity,

          price: finalPrice,

          total_price: finalPrice * requestedQuantity,
        });
      }

      // ===================================================
      // TOTAL
      // ===================================================

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

      // ===================================================
      // CREATE ORDER
      // ===================================================

      const orderResult = await connectionQuery(
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

      // ===================================================
      // ORDER ITEMS + TRỪ KHO
      // ===================================================

      for (const item of checkoutItems) {
        /*
         * Update có điều kiện quantity >= ?
         *
         * Dù đã FOR UPDATE, điều kiện này
         * vẫn là tầng bảo vệ cuối.
         */

        const stockResult = await connectionQuery(
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

              AND deleted_at
                  IS NULL

              AND status = 1

              AND quantity >= ?
          `,
          [item.quantity, item.product_id, item.quantity],
        );

        if (Number(stockResult.affectedRows || 0) !== 1) {
          throw new Error(
            `Sản phẩm "${item.product_name}" vừa thay đổi tồn kho. Vui lòng tải lại giỏ hàng.`,
          );
        }

        await connectionQuery(
          connection,
          `
          INSERT INTO order_items
          (
            order_id,
            product_id,

            product_name,
            product_image,

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

            NOW(),
            NOW()
          )
        `,
          [
            orderId,
            item.product_id,

            item.product_name,
            item.product_image,

            item.price,
            item.quantity,
            item.total_price,
          ],
        );
      }

      // ===================================================
      // PAYMENT
      // ===================================================

      await connectionQuery(
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

      // ===================================================
      // CLEAR CART
      // ===================================================

      await connectionQuery(
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

          AND deleted_at
              IS NULL
      `,
        [cart.id],
      );

      await connectionQuery(
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

      // ===================================================
      // COMMIT
      // ===================================================

      await connection.commit();
    } catch (error) {
      await connection.rollback();

      throw error;
    } finally {
      connection.release();
    }

    return this.getById(orderId);
  },

  async getById(id) {
    const orderRows = await query(
      `SELECT
          o.*,

          p.payment_method,
          p.amount AS payment_amount,
          p.status AS payment_status,
          p.transaction_code,
          p.paid_at

       FROM orders o

       LEFT JOIN payments p
         ON p.id = (
           SELECT p2.id
           FROM payments p2
           WHERE p2.order_id = o.id
             AND p2.deleted_at IS NULL
           ORDER BY p2.id DESC
           LIMIT 1
         )

       WHERE o.id = ?
         AND o.deleted_at IS NULL

       LIMIT 1`,
      [id],
    );

    const order = orderRows[0];

    if (!order) return null;

    const items = await query(
      `SELECT
          id,
          order_id,
          product_id,
          product_name,
          product_image,
          price,
          quantity,
          total_price,
          created_at,
          updated_at

       FROM order_items

       WHERE order_id = ?
         AND deleted_at IS NULL

       ORDER BY id ASC`,
      [id],
    );

    return {
      ...order,
      items,
    };
  },

  async getUserOrderById({ userId, orderId }) {
    const orderRows = await query(
      `SELECT
          o.*,

          p.payment_method,
          p.amount AS payment_amount,
          p.status AS payment_status,
          p.transaction_code,
          p.paid_at

       FROM orders o

       LEFT JOIN payments p
         ON p.id = (
           SELECT p2.id
           FROM payments p2
           WHERE p2.order_id = o.id
             AND p2.deleted_at IS NULL
           ORDER BY p2.id DESC
           LIMIT 1
         )

       WHERE o.id = ?
         AND o.user_id = ?
         AND o.deleted_at IS NULL

       LIMIT 1`,
      [orderId, userId],
    );

    const order = orderRows[0];

    if (!order) return null;

    const items = await query(
      `SELECT
          id,
          order_id,
          product_id,
          product_name,
          product_image,
          price,
          quantity,
          total_price,
          created_at,
          updated_at

       FROM order_items

       WHERE order_id = ?
         AND deleted_at IS NULL

       ORDER BY id ASC`,
      [orderId],
    );

    return {
      ...order,
      items,
    };
  },

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

    return query(
      `SELECT
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
          p.amount AS payment_amount,
          p.status AS payment_status,
          p.transaction_code,
          p.paid_at,

          COALESCE(item_summary.item_count, 0)
            AS item_count,

          COALESCE(item_summary.total_quantity, 0)
            AS total_quantity

       FROM orders o

       LEFT JOIN payments p
         ON p.id = (
           SELECT p2.id
           FROM payments p2
           WHERE p2.order_id = o.id
             AND p2.deleted_at IS NULL
           ORDER BY p2.id DESC
           LIMIT 1
         )

       LEFT JOIN (
         SELECT
           order_id,
           COUNT(*) AS item_count,
           SUM(quantity) AS total_quantity

         FROM order_items

         WHERE deleted_at IS NULL

         GROUP BY order_id
       ) AS item_summary
         ON item_summary.order_id = o.id

       WHERE ${whereSql}

       ORDER BY
         o.created_at DESC,
         o.id DESC

       LIMIT ${safeLimit}
       OFFSET ${offset}`,
      params,
    );
  },

  async countUserOrders({ userId, status = "", search = "" }) {
    const { whereSql, params } = buildUserOrderConditions({
      userId,
      status,
      search,
    });

    const rows = await query(
      `SELECT
          COUNT(*) AS total

       FROM orders o

       WHERE ${whereSql}`,
      params,
    );

    return normalizeInt(rows[0]?.total, 0);
  },

  async getByOrderCode(orderCode) {
    const orderRows = await query(
      `SELECT id

       FROM orders

       WHERE order_code = ?
         AND deleted_at IS NULL

       LIMIT 1`,
      [orderCode],
    );

    const order = orderRows[0];

    if (!order) return null;

    return this.getById(order.id);
  },

  async getByUserId(userId) {
    return query(
      `SELECT *

       FROM orders

       WHERE user_id = ?
         AND deleted_at IS NULL

       ORDER BY id DESC`,
      [userId],
    );
  },

  async updatePaymentStatusByOrderCode({
    order_code,
    payment_status,
    transaction_code = null,
  }) {
    const connection = await getTransactionConnection();

    let orderId = null;

    try {
      await connection.beginTransaction();

      // ==================================================
      // LOCK ORDER
      // ==================================================

      const orderRows = await connectionQuery(
        connection,
        `
          SELECT
            id,
            status,
            stock_restored_at

          FROM orders

          WHERE order_code = ?
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

      orderId = order.id;

      const isPaid = Number(payment_status) === 1;

      // ==================================================
      // LOCK PAYMENT
      // ==================================================

      const paymentRows = await connectionQuery(
        connection,
        `
          SELECT
            id,
            status,
            transaction_code,
            paid_at

          FROM payments

          WHERE order_id = ?
            AND deleted_at IS NULL

          ORDER BY id DESC
          LIMIT 1

          FOR UPDATE
        `,
        [orderId],
      );

      const payment = paymentRows[0];

      if (!payment) {
        throw new Error("Không tìm thấy thông tin thanh toán");
      }

      // ==================================================
      // PAYMENT SUCCESS
      // ==================================================

      if (isPaid) {
        /*
         * Cực kỳ quan trọng:
         * nếu order đã CANCELLED + stock đã restore,
         * callback success đến muộn không được hồi sinh order.
         */

        if (String(order.status || "").toUpperCase() === "CANCELLED") {
          throw new Error("Đơn hàng đã bị hủy, không thể xác nhận thanh toán.");
        }

        await connectionQuery(
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

          WHERE id = ?
            AND deleted_at IS NULL
        `,
          [transaction_code, payment.id],
        );

        /*
         * Chỉ PENDING mới chuyển PROCESSING.
         *
         * Nếu IPN success chạy lần 2,
         * PROCESSING vẫn giữ PROCESSING.
         */

        await connectionQuery(
          connection,
          `
          UPDATE orders

          SET
            status =
              CASE
                WHEN status = 'PENDING'
                THEN 'PROCESSING'

                ELSE status
              END,

            updated_at = NOW()

          WHERE id = ?
            AND deleted_at IS NULL
            AND status <> 'CANCELLED'
        `,
          [orderId],
        );

        await connection.commit();

        return this.getById(orderId);
      }

      // ==================================================
      // PAYMENT FAILED
      // ==================================================

      /*
       * Nếu payment trước đó đã SUCCESS,
       * callback fail đến trễ KHÔNG được đảo ngược.
       */

      if (Number(payment.status) === 1) {
        await connection.commit();

        return this.getById(orderId);
      }

      await connectionQuery(
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

        WHERE id = ?
          AND deleted_at IS NULL
      `,
        [transaction_code, payment.id],
      );

      // ==================================================
      // RESTORE STOCK NGAY TRONG TRANSACTION
      // ==================================================

      if (!order.stock_restored_at) {
        const items = await connectionQuery(
          connection,
          `
            SELECT
              product_id,
              quantity

            FROM order_items

            WHERE order_id = ?
              AND deleted_at IS NULL

            ORDER BY id ASC

            FOR UPDATE
          `,
          [orderId],
        );

        for (const item of items) {
          const productId = normalizeInt(item.product_id);

          const quantity = Math.max(normalizeInt(item.quantity, 0), 0);

          if (productId < 1 || quantity < 1) {
            continue;
          }

          await connectionQuery(
            connection,
            `
            UPDATE products

            SET
              quantity =
                quantity + ?,

              updated_at =
                NOW()

            WHERE id = ?
              AND deleted_at IS NULL
          `,
            [quantity, productId],
          );
        }

        await connectionQuery(
          connection,
          `
          UPDATE orders

          SET
            stock_restored_at =
              NOW(),

            updated_at =
              NOW()

          WHERE id = ?
            AND stock_restored_at IS NULL
            AND deleted_at IS NULL
        `,
          [orderId],
        );
      }

      // ==================================================
      // CANCEL ORDER
      // ==================================================

      await connectionQuery(
        connection,
        `
        UPDATE orders

        SET
          status = 'CANCELLED',

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

        WHERE id = ?
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

    if (isPaid) {
      await query(
        `
        UPDATE payments

        SET
          status = 1,
          transaction_code = ?,

          paid_at =
            COALESCE(
              paid_at,
              NOW()
            ),

          updated_at =
            NOW()

        WHERE
          order_id = ?

          AND deleted_at
              IS NULL
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

        WHERE id = ?

          AND deleted_at
              IS NULL

          AND status <>
              'CANCELLED'
      `,
        [order_id],
      );

      return this.getById(order_id);
    }

    await query(
      `
      UPDATE payments

      SET
        status = 0,

        transaction_code = ?,

        paid_at = NULL,

        updated_at =
          NOW()

      WHERE order_id = ?

        AND deleted_at
            IS NULL
    `,
      [transaction_code, order_id],
    );

    return this.cancelAndRestoreStock({
      orderId: order_id,

      reason: "Thanh toán thất bại",

      allowedStatuses: ["PENDING"],
    });
  },

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

    /*
     * Quan trọng:
     * kiểm tra đơn thuộc user trước.
     */

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

    const groupedItems = new Map();

    for (const item of sourceOrder.items || []) {
      const productId = normalizeInt(item.product_id);

      const quantity = Math.max(normalizeInt(item.quantity, 0), 0);

      if (productId < 1 || quantity < 1) {
        continue;
      }

      const previous = groupedItems.get(productId) || {
        product_id: productId,

        product_name: item.product_name || `Sản phẩm #${productId}`,

        product_image: item.product_image || null,

        requested_quantity: 0,
      };

      previous.requested_quantity += quantity;

      groupedItems.set(productId, previous);
    }

    const availableItems = [];
    const unavailableItems = [];

    for (const sourceItem of groupedItems.values()) {
      const productRows = await query(
        `SELECT
              id,
              name,
              thumbnail,
              price,
              sale_price,
              quantity,
              status

           FROM products

           WHERE id = ?
             AND deleted_at IS NULL

           LIMIT 1`,
        [sourceItem.product_id],
      );

      const product = productRows[0];

      if (!product) {
        unavailableItems.push({
          product_id: sourceItem.product_id,

          product_name: sourceItem.product_name,

          requested_quantity: sourceItem.requested_quantity,

          available_quantity: 0,

          reason: "Sản phẩm không còn tồn tại",
        });

        continue;
      }

      if (Number(product.status) !== 1) {
        unavailableItems.push({
          product_id: product.id,

          product_name: product.name,

          requested_quantity: sourceItem.requested_quantity,

          available_quantity: 0,

          reason: "Sản phẩm hiện không khả dụng",
        });

        continue;
      }

      const stock = Math.max(Number(product.quantity || 0), 0);

      if (stock <= 0) {
        unavailableItems.push({
          product_id: product.id,

          product_name: product.name,

          requested_quantity: sourceItem.requested_quantity,

          available_quantity: 0,

          reason: "Sản phẩm đã hết hàng",
        });

        continue;
      }

      const checkoutQuantity = Math.min(sourceItem.requested_quantity, stock);

      const salePrice = Number(product.sale_price || 0);

      const regularPrice = Number(product.price || 0);

      const price = salePrice > 0 ? salePrice : regularPrice;

      availableItems.push({
        product_id: product.id,

        product_name: product.name,

        product_image: product.thumbnail || sourceItem.product_image || null,

        requested_quantity: sourceItem.requested_quantity,

        quantity: checkoutQuantity,

        product_stock: stock,

        price,

        final_price: price,

        total_price: price * checkoutQuantity,

        quantity_adjusted: checkoutQuantity < sourceItem.requested_quantity,
      });

      if (checkoutQuantity < sourceItem.requested_quantity) {
        unavailableItems.push({
          product_id: product.id,

          product_name: product.name,

          requested_quantity: sourceItem.requested_quantity,

          available_quantity: checkoutQuantity,

          reason: "Tồn kho hiện tại không đủ số lượng như đơn cũ",
        });
      }
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

  async createFromReorder(data) {
    const userId = normalizeInt(data.user_id);

    const sourceOrderId = normalizeInt(data.source_order_id);

    if (userId < 1 || sourceOrderId < 1) {
      throw new Error("Thông tin mua lại không hợp lệ");
    }

    const connection = await getTransactionConnection();

    let newOrderId = null;

    try {
      await connection.beginTransaction();

      const sourceOrderRows = await connectionQuery(
        connection,
        `SELECT
              id,
              user_id,
              order_code,
              status

           FROM orders

           WHERE id = ?
             AND user_id = ?
             AND deleted_at IS NULL

           LIMIT 1
           FOR UPDATE`,
        [sourceOrderId, userId],
      );

      const sourceOrder = sourceOrderRows[0];

      if (!sourceOrder) {
        throw new Error("Không tìm thấy đơn hàng cần mua lại");
      }

      if (String(sourceOrder.status || "").toUpperCase() !== "CANCELLED") {
        throw new Error("Chỉ đơn hàng đã hủy mới có thể mua lại");
      }

      const sourceItems = await connectionQuery(
        connection,
        `SELECT
              product_id,
              product_name,
              product_image,
              quantity

           FROM order_items

           WHERE order_id = ?
             AND deleted_at IS NULL

           ORDER BY id ASC
           FOR UPDATE`,
        [sourceOrderId],
      );

      if (sourceItems.length === 0) {
        throw new Error("Đơn hàng cũ không có sản phẩm để mua lại");
      }

      const groupedItems = new Map();

      for (const item of sourceItems) {
        const productId = normalizeInt(item.product_id);

        const quantity = Math.max(normalizeInt(item.quantity, 0), 0);

        if (productId < 1 || quantity < 1) {
          continue;
        }

        const previous = groupedItems.get(productId) || {
          product_id: productId,

          product_name: item.product_name || `Sản phẩm #${productId}`,

          product_image: item.product_image || null,

          requested_quantity: 0,
        };

        previous.requested_quantity += quantity;

        groupedItems.set(productId, previous);
      }

      const checkoutItems = [];

      for (const sourceItem of groupedItems.values()) {
        const productRows = await connectionQuery(
          connection,
          `SELECT
                id,
                name,
                thumbnail,
                price,
                sale_price,
                quantity,
                status

             FROM products

             WHERE id = ?
               AND deleted_at IS NULL

             LIMIT 1
             FOR UPDATE`,
          [sourceItem.product_id],
        );

        const product = productRows[0];

        if (!product || Number(product.status) !== 1) {
          continue;
        }

        const stock = Math.max(Number(product.quantity || 0), 0);

        if (stock <= 0) {
          continue;
        }

        const checkoutQuantity = Math.min(sourceItem.requested_quantity, stock);

        if (checkoutQuantity <= 0) {
          continue;
        }

        const salePrice = Number(product.sale_price || 0);

        const regularPrice = Number(product.price || 0);

        const price = salePrice > 0 ? salePrice : regularPrice;

        checkoutItems.push({
          product_id: product.id,

          product_name: product.name,

          product_image: product.thumbnail || sourceItem.product_image || null,

          quantity: checkoutQuantity,

          price,

          total_price: price * checkoutQuantity,
        });
      }

      if (checkoutItems.length === 0) {
        throw new Error("Không có sản phẩm nào còn khả dụng để mua lại");
      }

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

      const orderResult = await connectionQuery(
        connection,
        `INSERT INTO orders
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
              created_at,
              updated_at
            )
           VALUES (
             ?, ?, ?, ?, ?, ?, ?, ?,
             'PENDING',
             NOW(),
             NOW()
           )`,
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

      for (const item of checkoutItems) {
        const stockResult = await connectionQuery(
          connection,
          `UPDATE products
             SET
               quantity =
                 quantity - ?,
               updated_at = NOW()

             WHERE id = ?
               AND deleted_at IS NULL
               AND status = 1
               AND quantity >= ?`,
          [item.quantity, item.product_id, item.quantity],
        );

        if (Number(stockResult.affectedRows || 0) !== 1) {
          throw new Error(
            `Sản phẩm "${item.product_name}" vừa thay đổi tồn kho, vui lòng tải lại trang thanh toán`,
          );
        }

        await connectionQuery(
          connection,
          `INSERT INTO order_items
            (
              order_id,
              product_id,
              product_name,
              product_image,
              price,
              quantity,
              total_price,
              created_at,
              updated_at
            )
           VALUES (
             ?, ?, ?, ?, ?, ?, ?,
             NOW(),
             NOW()
           )`,
          [
            newOrderId,
            item.product_id,
            item.product_name,
            item.product_image || null,
            item.price,
            item.quantity,
            item.total_price,
          ],
        );
      }

      await connectionQuery(
        connection,
        `INSERT INTO payments
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
         VALUES (
           ?, ?, ?, ?, ?, ?,
           NOW(),
           NOW()
         )`,
        [newOrderId, data.payment_method || "cod", totalAmount, null, null, 0],
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

  async getBankInfo(orderId) {
    const order = await this.getById(orderId);

    if (!order) return null;

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

      const orderRows = await connectionQuery(
        connection,
        `
          SELECT
            id,
            status,
            stock_restored_at

          FROM orders

          WHERE id = ?
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

      // ================================================
      // ĐÃ CANCELLED
      //
      // Đây là trường hợp callback/request chạy lại.
      // Không đổi trạng thái lần nữa.
      // Chỉ đảm bảo stock đã được restore.
      // ================================================

      if (currentStatus === "CANCELLED") {
        await restoreOrderStock(connection, normalizedOrderId);

        await connection.commit();

        return this.getById(normalizedOrderId);
      }

      // ================================================
      // KHÔNG ĐƯỢC HỦY Ở TRẠNG THÁI HIỆN TẠI
      // ================================================

      if (!allowedStatuses.includes(currentStatus)) {
        throw new Error(`Không thể hủy đơn hàng ở trạng thái ${currentStatus}`);
      }

      // ================================================
      // RESTORE STOCK
      // ================================================

      await restoreOrderStock(connection, normalizedOrderId);

      // ================================================
      // CANCEL ORDER
      // ================================================

      await connectionQuery(
        connection,
        `
        UPDATE orders

        SET
          status = 'CANCELLED',

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

          updated_at = NOW()

        WHERE id = ?
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
