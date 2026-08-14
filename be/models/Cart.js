const database = require("../config/database");

const db =
  database.pool ||
  database.db ||
  database.connection ||
  database.conn ||
  database;

const pool =
  database.pool ||
  db;

const runQuery = async (
  executor,
  sql,
  params = []
) => {
  if (
    typeof executor.query ===
    "function"
  ) {
    const result =
      await executor.query(
        sql,
        params
      );

    return Array.isArray(result)
      ? result[0]
      : result;
  }

  if (
    typeof executor.execute ===
    "function"
  ) {
    const result =
      await executor.execute(
        sql,
        params
      );

    return Array.isArray(result)
      ? result[0]
      : result;
  }

  throw new Error(
    "Database connection không có hàm query hoặc execute"
  );
};

const query = async (
  sql,
  params = []
) => {
  return runQuery(
    db,
    sql,
    params
  );
};

const normalizeInt = (
  value,
  defaultValue = 0
) => {
  const parsed =
    Number.parseInt(
      value,
      10
    );

  return Number.isNaN(parsed)
    ? defaultValue
    : parsed;
};

const getFinalPrice = (
  product
) => {
  const salePrice =
    Number(
      product?.sale_price || 0
    );

  const regularPrice =
    Number(
      product?.price || 0
    );

  return salePrice > 0
    ? salePrice
    : regularPrice;
};

const getTransactionConnection =
  async () => {
    if (
      !pool ||
      typeof pool.getConnection !==
        "function"
    ) {
      throw new Error(
        "Database pool không hỗ trợ transaction"
      );
    }

    return pool.getConnection();
  };

const recalculateCartSummary =
  async (
    executor,
    cartId
  ) => {
    const rows =
      await runQuery(
        executor,
        `SELECT
            COALESCE(
              SUM(quantity),
              0
            ) AS total_quantity,

            COALESCE(
              SUM(total_price),
              0
            ) AS total_amount

         FROM cart_items

         WHERE cart_id = ?
           AND deleted_at IS NULL`,
        [cartId]
      );

    const totalQuantity =
      Number(
        rows[0]?.total_quantity ||
          0
      );

    const totalAmount =
      Number(
        rows[0]?.total_amount ||
          0
      );

    await runQuery(
      executor,
      `UPDATE carts
       SET
         quantity = ?,
         total_price = ?,
         updated_at = NOW()

       WHERE id = ?
         AND deleted_at IS NULL`,
      [
        totalQuantity,
        totalAmount,
        cartId,
      ]
    );

    return {
      total_quantity:
        totalQuantity,

      total_amount:
        totalAmount,
    };
  };

const Cart = {
  async getOrCreateCart(userId) {
    const normalizedUserId =
      normalizeInt(userId);

    if (normalizedUserId < 1) {
      throw new Error(
        "Người dùng không hợp lệ"
      );
    }

    const rows = await query(
      `SELECT *

       FROM carts

       WHERE user_id = ?
         AND deleted_at IS NULL

       ORDER BY id ASC
       LIMIT 1`,
      [normalizedUserId]
    );

    if (rows[0]) {
      return rows[0];
    }

    const result = await query(
      `INSERT INTO carts
        (
          user_id,
          quantity,
          total_price,
          created_at,
          updated_at
        )
       VALUES (
         ?,
         0,
         0,
         NOW(),
         NOW()
       )`,
      [normalizedUserId]
    );

    const newRows = await query(
      `SELECT *

       FROM carts

       WHERE id = ?
       LIMIT 1`,
      [result.insertId]
    );

    return newRows[0] || null;
  },

  async getCart(userId) {
    const cart =
      await this.getOrCreateCart(
        userId
      );

    const items = await query(
      `SELECT
          ci.id,
          ci.cart_id,
          ci.product_id,
          ci.quantity,
          ci.price AS cart_price,
          ci.total_price,

          p.name AS product_name,
          p.thumbnail AS product_image,
          p.price,
          p.sale_price,
          p.quantity AS product_stock,
          p.status AS product_status,

          CASE
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

       ORDER BY ci.id DESC`,
      [cart.id]
    );

    const totalQuantity =
      items.reduce(
        (sum, item) =>
          sum +
          Number(
            item.quantity || 0
          ),
        0
      );

    const totalAmount =
      items.reduce(
        (sum, item) =>
          sum +
          Number(
            item.total_price || 0
          ),
        0
      );

    return {
      cart: {
        ...cart,
        quantity:
          totalQuantity,
        total_price:
          totalAmount,
      },

      items,

      total_quantity:
        totalQuantity,

      total_amount:
        totalAmount,
    };
  },

  async getProductById(
    productId
  ) {
    const rows = await query(
      `SELECT *

       FROM products

       WHERE id = ?
         AND deleted_at IS NULL

       LIMIT 1`,
      [productId]
    );

    return rows[0] || null;
  },

  async getCartItem(
    cartId,
    productId
  ) {
    const rows = await query(
      `SELECT *

       FROM cart_items

       WHERE cart_id = ?
         AND product_id = ?
         AND deleted_at IS NULL

       ORDER BY id ASC
       LIMIT 1`,
      [
        cartId,
        productId,
      ]
    );

    return rows[0] || null;
  },

  async addItem({
    user_id,
    product_id,
    quantity = 1,
  }) {
    const userId =
      normalizeInt(user_id);

    const productId =
      normalizeInt(product_id);

    const qty = Math.max(
      normalizeInt(
        quantity,
        1
      ),
      1
    );

    if (userId < 1) {
      throw new Error(
        "Người dùng không hợp lệ"
      );
    }

    if (productId < 1) {
      throw new Error(
        "Sản phẩm không hợp lệ"
      );
    }

    const product =
      await this.getProductById(
        productId
      );

    if (!product) {
      throw new Error(
        "Không tìm thấy sản phẩm"
      );
    }

    if (
      Number(product.status) !== 1
    ) {
      throw new Error(
        "Sản phẩm đang tắt hoặc không khả dụng"
      );
    }

    if (
      Number(
        product.quantity || 0
      ) <= 0
    ) {
      throw new Error(
        "Sản phẩm đã hết hàng"
      );
    }

    const cart =
      await this.getOrCreateCart(
        userId
      );

    const existingItem =
      await this.getCartItem(
        cart.id,
        productId
      );

    const finalPrice =
      getFinalPrice(product);

    if (existingItem) {
      const newQuantity =
        Number(
          existingItem.quantity
        ) + qty;

      if (
        newQuantity >
        Number(product.quantity)
      ) {
        throw new Error(
          "Số lượng trong giỏ vượt quá tồn kho"
        );
      }

      await query(
        `UPDATE cart_items
         SET
           quantity = ?,
           price = ?,
           total_price = ?,
           updated_at = NOW()

         WHERE id = ?
           AND deleted_at IS NULL`,
        [
          newQuantity,
          finalPrice,
          finalPrice *
            newQuantity,
          existingItem.id,
        ]
      );

      await recalculateCartSummary(
        db,
        cart.id
      );

      return this.getCart(userId);
    }

    if (
      qty >
      Number(product.quantity)
    ) {
      throw new Error(
        "Số lượng trong giỏ vượt quá tồn kho"
      );
    }

    const deletedRows =
      await query(
        `SELECT id

         FROM cart_items

         WHERE cart_id = ?
           AND product_id = ?
           AND deleted_at IS NOT NULL

         ORDER BY id DESC
         LIMIT 1`,
        [
          cart.id,
          productId,
        ]
      );

    if (deletedRows[0]) {
      await query(
        `UPDATE cart_items
         SET
           quantity = ?,
           price = ?,
           total_price = ?,
           deleted_at = NULL,
           updated_at = NOW()

         WHERE id = ?`,
        [
          qty,
          finalPrice,
          finalPrice * qty,
          deletedRows[0].id,
        ]
      );
    } else {
      await query(
        `INSERT INTO cart_items
          (
            cart_id,
            product_id,
            quantity,
            price,
            total_price,
            created_at,
            updated_at
          )
         VALUES (
           ?, ?, ?, ?, ?,
           NOW(),
           NOW()
         )`,
        [
          cart.id,
          productId,
          qty,
          finalPrice,
          finalPrice * qty,
        ]
      );
    }

    await recalculateCartSummary(
      db,
      cart.id
    );

    return this.getCart(userId);
  },

  async updateItemQuantity({
    user_id,
    item_id,
    quantity,
  }) {
    const userId =
      normalizeInt(user_id);

    const itemId =
      normalizeInt(item_id);

    const qty =
      normalizeInt(quantity);

    if (userId < 1) {
      throw new Error(
        "Người dùng không hợp lệ"
      );
    }

    if (qty <= 0) {
      return this.removeItem({
        user_id: userId,
        item_id: itemId,
      });
    }

    const cart =
      await this.getOrCreateCart(
        userId
      );

    const rows = await query(
      `SELECT
          ci.*,

          p.price AS product_price,
          p.sale_price,
          p.quantity AS product_stock,
          p.status AS product_status

       FROM cart_items ci

       INNER JOIN products p
         ON p.id = ci.product_id

       WHERE ci.id = ?
         AND ci.cart_id = ?
         AND ci.deleted_at IS NULL
         AND p.deleted_at IS NULL

       LIMIT 1`,
      [
        itemId,
        cart.id,
      ]
    );

    const item = rows[0];

    if (!item) {
      throw new Error(
        "Không tìm thấy sản phẩm trong giỏ hàng"
      );
    }

    if (
      Number(
        item.product_status
      ) !== 1
    ) {
      throw new Error(
        "Sản phẩm hiện không khả dụng"
      );
    }

    if (
      qty >
      Number(
        item.product_stock
      )
    ) {
      throw new Error(
        "Số lượng trong giỏ vượt quá tồn kho"
      );
    }

    const finalPrice =
      Number(
        item.sale_price || 0
      ) > 0
        ? Number(
            item.sale_price
          )
        : Number(
            item.product_price || 0
          );

    await query(
      `UPDATE cart_items
       SET
         quantity = ?,
         price = ?,
         total_price = ?,
         updated_at = NOW()

       WHERE id = ?
         AND deleted_at IS NULL`,
      [
        qty,
        finalPrice,
        finalPrice * qty,
        itemId,
      ]
    );

    await recalculateCartSummary(
      db,
      cart.id
    );

    return this.getCart(userId);
  },

  async removeItem({
    user_id,
    item_id,
  }) {
    const userId =
      normalizeInt(user_id);

    const itemId =
      normalizeInt(item_id);

    if (userId < 1) {
      throw new Error(
        "Người dùng không hợp lệ"
      );
    }

    const cart =
      await this.getOrCreateCart(
        userId
      );

    await query(
      `UPDATE cart_items
       SET
         deleted_at = NOW(),
         updated_at = NOW()

       WHERE id = ?
         AND cart_id = ?
         AND deleted_at IS NULL`,
      [
        itemId,
        cart.id,
      ]
    );

    await recalculateCartSummary(
      db,
      cart.id
    );

    return this.getCart(userId);
  },

  async clearCart(userId) {
    const normalizedUserId =
      normalizeInt(userId);

    if (
      normalizedUserId < 1
    ) {
      throw new Error(
        "Người dùng không hợp lệ"
      );
    }

    const cart =
      await this.getOrCreateCart(
        normalizedUserId
      );

    await query(
      `UPDATE cart_items
       SET
         deleted_at = NOW(),
         updated_at = NOW()

       WHERE cart_id = ?
         AND deleted_at IS NULL`,
      [cart.id]
    );

    await recalculateCartSummary(
      db,
      cart.id
    );

    return this.getCart(
      normalizedUserId
    );
  },

  async addItemsFromOrder({
    userId,
    items,
  }) {
    const normalizedUserId =
      normalizeInt(userId);

    if (
      normalizedUserId < 1
    ) {
      throw new Error(
        "Người dùng không hợp lệ"
      );
    }

    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {
      throw new Error(
        "Đơn hàng không có sản phẩm để mua lại"
      );
    }

    /*
     * Gộp các dòng cùng product_id trong order_items.
     *
     * Quan trọng:
     * "Mua lại" được xử lý theo hướng idempotent:
     * - Đơn cũ có 2 sản phẩm A.
     * - Giỏ đang có 0 A => thêm 2.
     * - Giỏ đang có 1 A => chỉ thêm 1 để đủ 2.
     * - Giỏ đang có 2 A => không thêm nữa.
     * - Giỏ đang có 3 A => giữ nguyên 3, không giảm.
     *
     * Nhờ vậy bấm "Mua lại" nhiều lần sẽ không cộng dồn vô hạn.
     */
    const groupedItems =
      new Map();

    items.forEach((item) => {
      const productId =
        normalizeInt(
          item.product_id
        );

      const quantity =
        Math.max(
          normalizeInt(
            item.quantity,
            0
          ),
          0
        );

      if (
        productId < 1 ||
        quantity < 1
      ) {
        return;
      }

      const previous =
        groupedItems.get(
          productId
        ) || {
          product_id:
            productId,

          product_name:
            item.product_name ||
            `Sản phẩm #${productId}`,

          quantity: 0,
        };

      previous.quantity +=
        quantity;

      groupedItems.set(
        productId,
        previous
      );
    });

    if (
      groupedItems.size === 0
    ) {
      throw new Error(
        "Đơn hàng không có sản phẩm hợp lệ để mua lại"
      );
    }

    const connection =
      await getTransactionConnection();

    const addedItems = [];
    const unchangedItems = [];
    const unavailableItems = [];

    try {
      await connection.beginTransaction();

      const cartRows =
        await runQuery(
          connection,
          `SELECT *

           FROM carts

           WHERE user_id = ?
             AND deleted_at IS NULL

           ORDER BY id ASC
           LIMIT 1
           FOR UPDATE`,
          [normalizedUserId]
        );

      let cart =
        cartRows[0];

      if (!cart) {
        const cartResult =
          await runQuery(
            connection,
            `INSERT INTO carts
              (
                user_id,
                quantity,
                total_price,
                created_at,
                updated_at
              )
             VALUES (
               ?,
               0,
               0,
               NOW(),
               NOW()
             )`,
            [normalizedUserId]
          );

        cart = {
          id:
            cartResult.insertId,
        };
      }

      for (
        const sourceItem of
        groupedItems.values()
      ) {
        const productRows =
          await runQuery(
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
            [
              sourceItem.product_id,
            ]
          );

        const product =
          productRows[0];

        if (!product) {
          unavailableItems.push({
            product_id:
              sourceItem.product_id,

            product_name:
              sourceItem.product_name,

            requested_quantity:
              sourceItem.quantity,

            current_cart_quantity:
              0,

            added_quantity:
              0,

            reason:
              "Sản phẩm không còn tồn tại",
          });

          continue;
        }

        if (
          Number(product.status) !==
          1
        ) {
          unavailableItems.push({
            product_id:
              product.id,

            product_name:
              product.name,

            requested_quantity:
              sourceItem.quantity,

            current_cart_quantity:
              0,

            added_quantity:
              0,

            reason:
              "Sản phẩm hiện không khả dụng",
          });

          continue;
        }

        const activeRows =
          await runQuery(
            connection,
            `SELECT *

             FROM cart_items

             WHERE cart_id = ?
               AND product_id = ?
               AND deleted_at IS NULL

             ORDER BY id ASC
             LIMIT 1
             FOR UPDATE`,
            [
              cart.id,
              product.id,
            ]
          );

        const activeItem =
          activeRows[0];

        const existingQuantity =
          Math.max(
            Number(
              activeItem?.quantity ||
                0
            ),
            0
          );

        const desiredQuantity =
          Math.max(
            Number(
              sourceItem.quantity ||
                0
            ),
            0
          );

        const stock =
          Math.max(
            Number(
              product.quantity ||
                0
            ),
            0
          );

        /*
         * Không cộng trực tiếp:
         * existingQuantity + desiredQuantity
         *
         * Chỉ thêm phần còn thiếu để giỏ đạt tối thiểu
         * số lượng của đơn được mua lại.
         */
        const missingQuantity =
          Math.max(
            desiredQuantity -
              existingQuantity,
            0
          );

        /*
         * Nếu giỏ đã có đủ hoặc nhiều hơn số lượng của đơn cũ,
         * giữ nguyên. Đây là điểm ngăn lỗi bấm "Mua lại" nhiều lần
         * bị cộng dồn.
         */
        if (
          missingQuantity === 0
        ) {
          unchangedItems.push({
            product_id:
              product.id,

            product_name:
              product.name,

            requested_quantity:
              desiredQuantity,

            current_cart_quantity:
              existingQuantity,

            added_quantity:
              0,

            reason:
              "Sản phẩm đã có đủ số lượng trong giỏ",
          });

          continue;
        }

        /*
         * Tổng số lượng trong giỏ sau cập nhật không được vượt stock.
         * Vì existingQuantity đã chiếm một phần stock có thể mua,
         * phần còn có thể thêm là stock - existingQuantity.
         */
        const availableToAdd =
          Math.max(
            stock -
              existingQuantity,
            0
          );

        const addedQuantity =
          Math.min(
            missingQuantity,
            availableToAdd
          );

        if (
          addedQuantity < 1
        ) {
          unavailableItems.push({
            product_id:
              product.id,

            product_name:
              product.name,

            requested_quantity:
              desiredQuantity,

            current_cart_quantity:
              existingQuantity,

            added_quantity:
              0,

            reason:
              stock <= 0
                ? "Sản phẩm đã hết hàng"
                : "Số lượng trong giỏ đã đạt tồn kho",
          });

          continue;
        }

        const finalPrice =
          getFinalPrice(product);

        const nextQuantity =
          existingQuantity +
          addedQuantity;

        if (activeItem) {
          await runQuery(
            connection,
            `UPDATE cart_items
             SET
               quantity = ?,
               price = ?,
               total_price = ?,
               updated_at = NOW()

             WHERE id = ?
               AND deleted_at IS NULL`,
            [
              nextQuantity,
              finalPrice,
              finalPrice *
                nextQuantity,
              activeItem.id,
            ]
          );
        } else {
          const deletedRows =
            await runQuery(
              connection,
              `SELECT id

               FROM cart_items

               WHERE cart_id = ?
                 AND product_id = ?
                 AND deleted_at IS NOT NULL

               ORDER BY id DESC
               LIMIT 1
               FOR UPDATE`,
              [
                cart.id,
                product.id,
              ]
            );

          if (deletedRows[0]) {
            await runQuery(
              connection,
              `UPDATE cart_items
               SET
                 quantity = ?,
                 price = ?,
                 total_price = ?,
                 deleted_at = NULL,
                 updated_at = NOW()

               WHERE id = ?`,
              [
                addedQuantity,
                finalPrice,
                finalPrice *
                  addedQuantity,
                deletedRows[0].id,
              ]
            );
          } else {
            await runQuery(
              connection,
              `INSERT INTO cart_items
                (
                  cart_id,
                  product_id,
                  quantity,
                  price,
                  total_price,
                  created_at,
                  updated_at
                )
               VALUES (
                 ?, ?, ?, ?, ?,
                 NOW(),
                 NOW()
               )`,
              [
                cart.id,
                product.id,
                addedQuantity,
                finalPrice,
                finalPrice *
                  addedQuantity,
              ]
            );
          }
        }

        addedItems.push({
          product_id:
            product.id,

          product_name:
            product.name,

          requested_quantity:
            desiredQuantity,

          previous_cart_quantity:
            existingQuantity,

          added_quantity:
            addedQuantity,

          current_cart_quantity:
            nextQuantity,

          price:
            finalPrice,
        });

        if (
          nextQuantity <
          desiredQuantity
        ) {
          unavailableItems.push({
            product_id:
              product.id,

            product_name:
              product.name,

            requested_quantity:
              desiredQuantity,

            current_cart_quantity:
              nextQuantity,

            added_quantity:
              addedQuantity,

            reason:
              "Không đủ tồn kho để đạt toàn bộ số lượng của đơn cũ",
          });
        }
      }

      /*
       * Không throw khi addedItems = 0.
       *
       * Trường hợp người dùng bấm "Mua lại" lần thứ 2,
       * giỏ đã có đủ sản phẩm nên addedItems có thể bằng 0.
       * Đây vẫn là một request thành công.
       */
      if (
        addedItems.length === 0 &&
        unchangedItems.length === 0
      ) {
        throw new Error(
          "Không có sản phẩm nào còn khả dụng để mua lại"
        );
      }

      await recalculateCartSummary(
        connection,
        cart.id
      );

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    const cart =
      await this.getCart(
        normalizedUserId
      );

    return {
      cart,

      added_items:
        addedItems,

      unchanged_items:
        unchangedItems,

      unavailable_items:
        unavailableItems,
    };
  },

};

module.exports = Cart;