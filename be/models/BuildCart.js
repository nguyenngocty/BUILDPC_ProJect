const database = require("../config/database");

const Cart = require("./Cart");
const PcBuild = require("./PcBuild");

const pool =
  database.pool ||
  database.db ||
  database.connection ||
  database.conn ||
  database;

// ============================================================
// DATABASE HELPER
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

// ============================================================
// NORMALIZE
// ============================================================

const normalizePositiveInt = (value, defaultValue = null) => {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return defaultValue;
  }

  return parsed;
};

// ============================================================
// BUSINESS ERROR
// ============================================================

const createBusinessError = (message, statusCode = 400, details = null) => {
  const error = new Error(message);

  error.statusCode = statusCode;

  error.status = statusCode;

  if (details) {
    error.details = details;
  }

  return error;
};

// ============================================================
// CART SUMMARY
// ============================================================

const recalculateCartSummary = async (connection, cartId) => {
  const rows = await runQuery(
    connection,
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
    connection,
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
// LOCK / CREATE USER CART
// ============================================================

const getOrCreateCartForUpdate = async (connection, userId) => {
  let rows = await runQuery(
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

  if (rows[0]) {
    return rows[0];
  }

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
    [userId],
  );

  rows = await runQuery(
    connection,
    `
          SELECT *

          FROM carts

          WHERE id = ?

          LIMIT 1

          FOR UPDATE
        `,
    [result.insertId],
  );

  return rows[0] || null;
};

// ============================================================
// NORMALIZE VALIDATED BUILD ITEMS
//
// Sau PcBuild.validateItems(),
// product_id / variant_id / price / stock
// đều đã được Backend resolve.
//
// Tuy nhiên khi đưa vào Cart, vẫn resolve lần nữa
// bên trong transaction để tránh race condition.
// ============================================================

const normalizeValidatedItems = (validation) => {
  const sourceItems = Array.isArray(validation?.items) ? validation.items : [];

  if (!sourceItems.length) {
    throw createBusinessError(
      "Cấu hình không có linh kiện để thêm vào giỏ hàng",
      400,
    );
  }

  // ----------------------------------------------------------
  // Aggregate theo identity thật của Cart:
  //
  // product_id + variant_id
  //
  // Phòng trường hợp nhiều PcPart cùng ánh xạ đến
  // cùng một Product / Variant.
  // ----------------------------------------------------------

  const grouped = new Map();

  for (const item of sourceItems) {
    const productId = normalizePositiveInt(item.product_id);

    const variantId = normalizePositiveInt(item.variant_id, null);

    const quantity = normalizePositiveInt(item.quantity);

    if (!productId || !quantity) {
      throw createBusinessError(
        "Dữ liệu linh kiện sau kiểm tra không hợp lệ",
        400,
      );
    }

    const key = `${productId}:${variantId || "none"}`;

    const current = grouped.get(key) || {
      product_id: productId,

      variant_id: variantId,

      quantity: 0,

      part_ids: [],

      type_codes: [],

      names: [],
    };

    current.quantity += quantity;

    if (item.part_id) {
      current.part_ids.push(Number(item.part_id));
    }

    if (item.type_code) {
      current.type_codes.push(String(item.type_code));
    }

    if (item.name) {
      current.names.push(item.name);
    }

    grouped.set(key, current);
  }

  return [...grouped.values()];
};

// ============================================================
// BUILD CART
// ============================================================

const BuildCart = {
  // ==========================================================
  // ADD VALIDATED BUILD TO CART
  //
  // items:
  //
  // [
  //   {
  //     part_id: 3,
  //     quantity: 1
  //   }
  // ]
  //
  // Flow:
  //
  // 1. PcBuild.validateItems()
  // 2. BEGIN TRANSACTION
  // 3. Lock Cart
  // 4. Resolve Product/Variant CURRENT state
  // 5. Check current stock
  // 6. Use CURRENT price
  // 7. Add/update all items
  // 8. One error => rollback all
  // 9. Commit
  // ==========================================================

  async addItems({ user_id, items }) {
    const userId = normalizePositiveInt(user_id);

    if (!userId) {
      throw createBusinessError("Người dùng không hợp lệ", 401);
    }

    if (!Array.isArray(items) || items.length === 0) {
      throw createBusinessError("Cấu hình PC không có linh kiện", 400);
    }

    // ========================================================
    // AUTHORITATIVE BUILD VALIDATION
    //
    // Không tin:
    // - product_id client
    // - variant_id client
    // - price client
    // - stock client
    // ========================================================

    const validation = await PcBuild.validateItems(items);

    if (!validation || validation.is_valid === false) {
      throw createBusinessError(
        "Cấu hình PC không tương thích nên không thể thêm vào giỏ hàng",
        422,
        validation || null,
      );
    }

    const normalizedItems = normalizeValidatedItems(validation);

    // ========================================================
    // TRANSACTION
    // ========================================================

    if (!pool || typeof pool.getConnection !== "function") {
      throw new Error("Database pool không hỗ trợ transaction");
    }

    const connection = await pool.getConnection();

    const addedItems = [];

    try {
      await connection.beginTransaction();

      // ======================================================
      // CART
      // ======================================================

      const cart = await getOrCreateCartForUpdate(connection, userId);

      if (!cart) {
        throw new Error("Không thể khởi tạo giỏ hàng");
      }

      // ======================================================
      // PRECHECK ALL ITEMS
      //
      // Chưa UPDATE/INSERT gì ở vòng này.
      //
      // Mục đích:
      // kiểm tra tất cả trước khi mutate cart.
      // ======================================================

      const preparedItems = [];

      for (const sourceItem of normalizedItems) {
        const sellable = await Cart.resolveSellableItem({
          productId: sourceItem.product_id,

          variantId: sourceItem.variant_id,

          executor: connection,
        });

        if (!sellable) {
          throw new Error(
            `Không thể xác định sản phẩm #${sourceItem.product_id}`,
          );
        }

        const finalPrice = Number(sellable.price || 0);

        if (!Number.isFinite(finalPrice) || finalPrice <= 0) {
          throw new Error(
            `Giá hiện tại của "${sellable.product?.name || "sản phẩm"}" không hợp lệ.`,
          );
        }

        const requestedQuantity = Number(sourceItem.quantity || 0);

        const stock = Math.max(Number(sellable.stock || 0), 0);

        const existingItem = await Cart.getCartItem(
          cart.id,
          sellable.product_id,
          sellable.variant_id,
          connection,
        );

        const existingQuantity = Math.max(
          Number(existingItem?.quantity || 0),
          0,
        );

        const nextQuantity = existingQuantity + requestedQuantity;

        // ----------------------------------------------------
        // QUANTITY TRONG CART + BUILD PHẢI <= STOCK
        // ----------------------------------------------------

        if (nextQuantity > stock) {
          const displayName = sellable.has_variant
            ? `${sellable.product?.name || "Sản phẩm"} - ${sellable.variant_name || "Biến thể"}`
            : sellable.product?.name || "Sản phẩm";

          throw createBusinessError(
            `"${displayName}" không đủ tồn kho để thêm toàn bộ cấu hình vào giỏ hàng`,
            409,
            {
              product_id: sellable.product_id,

              variant_id: sellable.variant_id,

              requested_quantity: requestedQuantity,

              current_cart_quantity: existingQuantity,

              available_stock: stock,

              required_total_quantity: nextQuantity,
            },
          );
        }

        preparedItems.push({
          source: sourceItem,

          sellable,

          existingItem,

          existingQuantity,

          requestedQuantity,

          nextQuantity,

          finalPrice,
        });
      }

      // ======================================================
      // MUTATE CART
      //
      // Chỉ chạy khi TOÀN BỘ items đã precheck PASS.
      // ======================================================

      for (const prepared of preparedItems) {
        const {
          source,
          sellable,
          existingItem,
          existingQuantity,
          requestedQuantity,
          nextQuantity,
          finalPrice,
        } = prepared;

        // ----------------------------------------------------
        // ALREADY ACTIVE IN CART
        // ----------------------------------------------------

        if (existingItem) {
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

              existingItem.id,
            ],
          );
        } else {
          // --------------------------------------------------
          // CHECK SOFT DELETED ITEM
          // --------------------------------------------------

          const deletedItem = await Cart.getDeletedCartItem(
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

                requestedQuantity,

                finalPrice,

                finalPrice * requestedQuantity,

                deletedItem.id,
              ],
            );
          } else {
            // ------------------------------------------------
            // INSERT NEW CART ITEM
            // ------------------------------------------------

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

                requestedQuantity,

                finalPrice,

                finalPrice * requestedQuantity,
              ],
            );
          }
        }

        addedItems.push({
          part_ids: source.part_ids,

          type_codes: source.type_codes,

          product_id: sellable.product_id,

          variant_id: sellable.variant_id,

          product_name: sellable.product?.name || null,

          variant_name: sellable.variant_name || null,

          sku: sellable.sku || null,

          has_variant: Boolean(sellable.has_variant),

          added_quantity: requestedQuantity,

          previous_cart_quantity: existingQuantity,

          current_cart_quantity: nextQuantity,

          current_price: finalPrice,

          current_stock: Number(sellable.stock || 0),
        });
      }

      // ======================================================
      // SUMMARY
      // ======================================================

      await recalculateCartSummary(connection, cart.id);

      // ======================================================
      // COMMIT ALL
      // ======================================================

      await connection.commit();
    } catch (error) {
      await connection.rollback();

      throw error;
    } finally {
      connection.release();
    }

    // ========================================================
    // RETURN CURRENT CART
    // ========================================================

    const cart = await Cart.getCart(userId);

    return {
      cart,

      build_validation: {
        is_valid: validation.is_valid,

        total_price: Number(validation.total_price || 0),

        errors: validation.errors || [],

        warnings: validation.warnings || [],

        checks: validation.checks || [],
      },

      added_items: addedItems,

      added_item_count: addedItems.length,
    };
  },
};

module.exports = BuildCart;
