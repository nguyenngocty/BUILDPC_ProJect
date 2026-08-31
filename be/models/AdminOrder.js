const database = require("../config/database");
const Order = require("./Order");

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
  const parsed = Number(value || 0);

  return Number.isFinite(parsed) ? parsed : 0;
};

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

// ============================================================
// ORDER STATUS
// ============================================================

const STATUS_LABELS = {
  PENDING: "Chờ xác nhận",
  PROCESSING: "Đang xử lý",
  SHIPPING: "Đang giao",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
};

const STATUS_FLOW = {
  PENDING: ["PROCESSING", "CANCELLED"],

  PROCESSING: ["SHIPPING", "CANCELLED"],

  SHIPPING: ["COMPLETED"],

  COMPLETED: [],

  CANCELLED: [],
};

const VALID_STATUSES = Object.keys(STATUS_LABELS);

// ============================================================
// PAYMENT
// ============================================================

const PAYMENT_METHOD_LABELS = {
  cod: "Thanh toán khi nhận hàng",
  bank: "Chuyển khoản ngân hàng",
  momo: "MoMo",
};

const PAYMENT_SELECT_SQL = `
  pay.id AS payment_id,

  pay.payment_method,

  pay.amount AS payment_amount,

  pay.status AS payment_status,

  pay.transaction_code,

  pay.paid_at,

  CASE pay.payment_method
    WHEN 'cod'
      THEN 'Thanh toán khi nhận hàng'

    WHEN 'bank'
      THEN 'Chuyển khoản ngân hàng'

    WHEN 'momo'
      THEN 'MoMo'

    ELSE 'Không xác định'
  END AS payment_method_label,

  CASE
    WHEN pay.status = 1
      THEN 'Đã thanh toán'

    WHEN pay.payment_method = 'cod'
      THEN 'Thu khi giao'

    WHEN pay.payment_method = 'bank'
      THEN 'Chờ xác nhận chuyển khoản'

    WHEN pay.payment_method = 'momo'
      THEN 'Chưa thanh toán'

    ELSE 'Chưa thanh toán'
  END AS payment_status_label
`;

const LATEST_PAYMENT_JOIN_SQL = `
  LEFT JOIN payments pay
    ON pay.id = (
      SELECT
        p2.id

      FROM payments p2

      WHERE
        p2.order_id = o.id
        AND p2.deleted_at IS NULL

      ORDER BY
        p2.id DESC

      LIMIT 1
    )
`;

const STATUS_SELECT_SQL = `
  CASE o.status

    WHEN 'PENDING'
      THEN 'Chờ xác nhận'

    WHEN 'PROCESSING'
      THEN 'Đang xử lý'

    WHEN 'SHIPPING'
      THEN 'Đang giao'

    WHEN 'COMPLETED'
      THEN 'Hoàn thành'

    WHEN 'CANCELLED'
      THEN 'Đã hủy'

    ELSE o.status
  END AS status_label
`;

// ============================================================
// NORMALIZE ORDER
// ============================================================

const normalizeOrder = (order) => {
  if (!order) {
    return null;
  }

  return {
    ...order,

    id: Number(order.id),

    user_id: Number(order.user_id),

    subtotal: normalizeMoney(order.subtotal),

    shipping_fee: normalizeMoney(order.shipping_fee),

    discount_amount: normalizeMoney(order.discount_amount),

    coupon_id: normalizeNullableInt(order.coupon_id),

    shipping_rate_id: normalizeNullableInt(order.shipping_rate_id),

    total_amount: normalizeMoney(order.total_amount),

    payment_id: normalizeNullableInt(order.payment_id),

    payment_amount:
      order.payment_amount !== null && order.payment_amount !== undefined
        ? normalizeMoney(order.payment_amount)
        : null,

    payment_status:
      order.payment_status !== null && order.payment_status !== undefined
        ? Number(order.payment_status)
        : null,
  };
};

// ============================================================
// WHERE
// ============================================================

const buildWhereClause = ({
  keyword = "",

  status = "",

  payment_method = "",

  payment_status = "",

  from_date = "",

  to_date = "",
} = {}) => {
  const where = ["o.deleted_at IS NULL"];

  const params = [];

  // ==========================================================
  // SEARCH
  // ==========================================================

  const searchKeyword = String(keyword || "")
    .trim()
    .toLowerCase()
    .slice(0, 150);

  if (searchKeyword) {
    const key = `%${searchKeyword}%`;

    where.push(`
      (
        LOWER(
          COALESCE(
            o.order_code,
            ''
          )
        ) LIKE ?

        OR LOWER(
          COALESCE(
            o.shipping_name,
            ''
          )
        ) LIKE ?

        OR LOWER(
          COALESCE(
            o.shipping_phone,
            ''
          )
        ) LIKE ?

        OR LOWER(
          COALESCE(
            o.shipping_email,
            ''
          )
        ) LIKE ?

        OR LOWER(
          COALESCE(
            o.shipping_address,
            ''
          )
        ) LIKE ?

        OR LOWER(
          COALESCE(
            o.coupon_code,
            ''
          )
        ) LIKE ?

        OR LOWER(
          COALESCE(
            o.shipping_province_name,
            ''
          )
        ) LIKE ?

        OR LOWER(
          COALESCE(
            pay.payment_method,
            ''
          )
        ) LIKE ?

        OR EXISTS (
          SELECT 1

          FROM order_items oi_search

          WHERE
            oi_search.order_id =
              o.id

            AND oi_search.deleted_at
                IS NULL

            AND (
              LOWER(
                COALESCE(
                  oi_search.product_name,
                  ''
                )
              ) LIKE ?

              OR LOWER(
                COALESCE(
                  oi_search.variant_name,
                  ''
                )
              ) LIKE ?

              OR LOWER(
                COALESCE(
                  oi_search.sku,
                  ''
                )
              ) LIKE ?
            )
        )
      )
    `);

    params.push(key, key, key, key, key, key, key, key, key, key, key);
  }

  // ==========================================================
  // STATUS
  // ==========================================================

  const normalizedStatus = String(status || "")
    .trim()
    .toUpperCase();

  if (normalizedStatus) {
    if (!VALID_STATUSES.includes(normalizedStatus)) {
      throw new Error("Trạng thái đơn hàng không hợp lệ.");
    }

    where.push("o.status = ?");

    params.push(normalizedStatus);
  }

  // ==========================================================
  // PAYMENT METHOD
  // ==========================================================

  const paymentMethod = String(payment_method || "")
    .trim()
    .toLowerCase();

  if (paymentMethod) {
    if (!["cod", "bank", "momo"].includes(paymentMethod)) {
      throw new Error("Phương thức thanh toán không hợp lệ.");
    }

    where.push("pay.payment_method = ?");

    params.push(paymentMethod);
  }

  // ==========================================================
  // PAYMENT STATUS
  // ==========================================================

  if (
    payment_status !== "" &&
    payment_status !== null &&
    payment_status !== undefined
  ) {
    const paymentStatus = Number(payment_status);

    if (paymentStatus !== 0 && paymentStatus !== 1) {
      throw new Error("Trạng thái thanh toán không hợp lệ.");
    }

    where.push("pay.status = ?");

    params.push(paymentStatus);
  }

  // ==========================================================
  // DATE
  // ==========================================================

  if (from_date) {
    where.push("DATE(o.created_at) >= ?");

    params.push(String(from_date).slice(0, 10));
  }

  if (to_date) {
    where.push("DATE(o.created_at) <= ?");

    params.push(String(to_date).slice(0, 10));
  }

  return {
    whereSql: `WHERE ${where.join(" AND ")}`,

    params,
  };
};

// ============================================================
// ADMIN ORDER MODEL
// ============================================================

const AdminOrder = {
  STATUS_LABELS,

  STATUS_FLOW,

  PAYMENT_METHOD_LABELS,

  // ==========================================================
  // GET ALL
  // ==========================================================

  async getAll(filters = {}) {
    const pageNumber = Math.max(normalizeInt(filters.page, 1), 1);

    const limitNumber = Math.min(
      Math.max(normalizeInt(filters.limit, 10), 1),
      100,
    );

    const offset = (pageNumber - 1) * limitNumber;

    const { whereSql, params } = buildWhereClause(filters);

    const rows = await query(
      `
          SELECT
            o.*,

            ${STATUS_SELECT_SQL},

            ${PAYMENT_SELECT_SQL},

            COALESCE(
              item_summary.item_count,
              0
            ) AS item_count,

            COALESCE(
              item_summary.total_quantity,
              0
            ) AS total_quantity

          FROM orders o

          ${LATEST_PAYMENT_JOIN_SQL}

          LEFT JOIN (
            SELECT
              order_id,

              COUNT(*) AS item_count,

              SUM(
                quantity
              ) AS total_quantity

            FROM order_items

            WHERE
              deleted_at IS NULL

            GROUP BY
              order_id
          ) AS item_summary
            ON item_summary.order_id =
               o.id

          ${whereSql}

          ORDER BY
            o.created_at DESC,
            o.id DESC

          LIMIT ?
          OFFSET ?
        `,
      [...params, limitNumber, offset],
    );

    const countRows = await query(
      `
          SELECT
            COUNT(*) AS total

          FROM orders o

          ${LATEST_PAYMENT_JOIN_SQL}

          ${whereSql}
        `,
      params,
    );

    const total = Number(countRows[0]?.total || 0);

    const data = rows.map((row) => ({
      ...normalizeOrder(row),

      item_count: Number(row.item_count || 0),

      total_quantity: Number(row.total_quantity || 0),
    }));

    return {
      data,

      pagination: {
        page: pageNumber,

        limit: limitNumber,

        total,

        totalPages: total > 0 ? Math.ceil(total / limitNumber) : 0,

        hasPreviousPage: pageNumber > 1,

        hasNextPage: total > pageNumber * limitNumber,
      },

      filters: {
        keyword: String(filters.keyword || ""),

        status: String(filters.status || "")
          .trim()
          .toUpperCase(),

        payment_method: String(filters.payment_method || "")
          .trim()
          .toLowerCase(),

        payment_status: filters.payment_status ?? "",

        from_date: filters.from_date || "",

        to_date: filters.to_date || "",
      },

      statuses: STATUS_LABELS,
    };
  },

  // ==========================================================
  // GET BY ID
  // ==========================================================

  async getById(id) {
    const orderId = normalizeInt(id);

    if (orderId < 1) {
      return null;
    }

    const orderRows = await query(
      `
          SELECT
            o.*,

            ${STATUS_SELECT_SQL},

            ${PAYMENT_SELECT_SQL}

          FROM orders o

          ${LATEST_PAYMENT_JOIN_SQL}

          WHERE
            o.id = ?
            AND o.deleted_at IS NULL

          LIMIT 1
        `,
      [orderId],
    );

    const order = orderRows[0];

    if (!order) {
      return null;
    }

    const items = await query(
      `
          SELECT
            oi.id,

            oi.order_id,

            oi.product_id,

            oi.variant_id,

            oi.product_name,

            oi.variant_name,

            oi.sku,

            oi.product_image,

            oi.variant_options,

            oi.price,

            oi.quantity,

            oi.total_price,

            oi.created_at,

            oi.updated_at,

            p.name
              AS current_product_name,

            p.sku
              AS current_product_sku,

            p.status
              AS current_product_status,

            p.deleted_at
              AS current_product_deleted_at,

            pv.sku
              AS current_variant_sku,

            pv.variant_name
              AS current_variant_name,

            pv.status
              AS current_variant_status,

            pv.deleted_at
              AS current_variant_deleted_at

          FROM order_items oi

          LEFT JOIN products p
            ON p.id =
               oi.product_id

          LEFT JOIN product_variants pv
            ON pv.id =
               oi.variant_id

            AND pv.product_id =
                oi.product_id

          WHERE
            oi.order_id = ?
            AND oi.deleted_at IS NULL

          ORDER BY
            oi.id ASC
        `,
      [orderId],
    );

    const normalizedItems = items.map((item) => ({
      ...item,

      id: Number(item.id),

      order_id: Number(item.order_id),

      product_id: Number(item.product_id),

      variant_id: normalizeNullableInt(item.variant_id),

      price: normalizeMoney(item.price),

      quantity: Number(item.quantity || 0),

      total_price: normalizeMoney(item.total_price),

      variant_options: parseJson(item.variant_options, []),

      current_product_status:
        item.current_product_status !== null &&
        item.current_product_status !== undefined
          ? Number(item.current_product_status)
          : null,

      current_variant_status:
        item.current_variant_status !== null &&
        item.current_variant_status !== undefined
          ? Number(item.current_variant_status)
          : null,
    }));

    return {
      ...normalizeOrder(order),

      allowed_next_statuses:
        STATUS_FLOW[String(order.status || "").toUpperCase()] || [],

      items: normalizedItems,
    };
  },

  // ==========================================================
  // UPDATE STATUS
  // ==========================================================

  async updateStatus(id, newStatus) {
    const orderId = normalizeInt(id);

    if (orderId < 1) {
      throw new Error("ID đơn hàng không hợp lệ.");
    }

    const nextStatus = String(newStatus || "")
      .trim()
      .toUpperCase();

    if (!VALID_STATUSES.includes(nextStatus)) {
      throw new Error("Trạng thái đơn hàng không hợp lệ.");
    }

    // ========================================================
    // CANCEL
    //
    // Dùng đúng Order core hiện tại để:
    //
    // - restore stock
    // - restore variant
    // - restore coupon
    // - stock log
    // - chống restore 2 lần
    // ========================================================

    if (nextStatus === "CANCELLED") {
      const current = await this.getById(orderId);

      if (!current) {
        return null;
      }

      const currentStatus = String(current.status || "").toUpperCase();

      const allowedStatuses = STATUS_FLOW[currentStatus] || [];

      if (!allowedStatuses.includes("CANCELLED")) {
        throw new Error(
          `Không thể chuyển trạng thái từ "${
            STATUS_LABELS[currentStatus] || currentStatus
          }" sang "${STATUS_LABELS.CANCELLED}".`,
        );
      }

      await Order.cancelAndRestoreStock({
        orderId,

        reason: "Admin hủy đơn hàng",

        allowedStatuses: ["PENDING", "PROCESSING"],
      });

      return this.getById(orderId);
    }

    // ========================================================
    // NON-CANCEL STATUS
    // ========================================================

    const connection = await getTransactionConnection();

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
              status

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
        await connection.rollback();

        return null;
      }

      const currentStatus = String(order.status || "").toUpperCase();

      const allowedStatuses = STATUS_FLOW[currentStatus] || [];

      if (!allowedStatuses.includes(nextStatus)) {
        throw new Error(
          `Không thể chuyển trạng thái từ "${
            STATUS_LABELS[currentStatus] || currentStatus
          }" sang "${STATUS_LABELS[nextStatus] || nextStatus}".`,
        );
      }

      // ======================================================
      // LATEST PAYMENT
      // ======================================================

      const paymentRows = await runQuery(
        connection,
        `
            SELECT
              id,

              payment_method,

              status,

              amount,

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

      const payment = paymentRows[0] || null;

      // ======================================================
      // PROCESSING → SHIPPING
      //
      // Bank / MoMo phải đã thanh toán.
      //
      // COD cho phép giao khi payment = 0.
      // ======================================================

      if (nextStatus === "SHIPPING" && payment) {
        const method = String(payment.payment_method || "").toLowerCase();

        if (["bank", "momo"].includes(method) && Number(payment.status) !== 1) {
          throw new Error(
            "Đơn chuyển khoản/MoMo phải được xác nhận thanh toán trước khi giao hàng.",
          );
        }
      }

      // ======================================================
      // UPDATE ORDER
      // ======================================================

      await runQuery(
        connection,
        `
          UPDATE orders

          SET
            status = ?,

            updated_at = NOW()

          WHERE
            id = ?
            AND deleted_at IS NULL
        `,
        [nextStatus, orderId],
      );

      // ======================================================
      // COD COMPLETED
      //
      // Khi giao hoàn thành:
      // coi COD đã thu tiền.
      // ======================================================

      if (
        nextStatus === "COMPLETED" &&
        payment &&
        String(payment.payment_method || "").toLowerCase() === "cod" &&
        Number(payment.status) !== 1
      ) {
        await runQuery(
          connection,
          `
            UPDATE payments

            SET
              status = 1,

              paid_at =
                COALESCE(
                  paid_at,
                  NOW()
                ),

              updated_at = NOW()

            WHERE
              id = ?
              AND deleted_at IS NULL
          `,
          [payment.id],
        );
      }

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
  // UPDATE PAYMENT STATUS
  //
  // Dùng chủ yếu cho BANK.
  //
  // MoMo success do callback xử lý.
  // COD sẽ tự paid khi COMPLETED.
  // ==========================================================

  async updatePaymentStatus(
    id,
    {
      payment_status,

      transaction_code = null,
    },
  ) {
    const orderId = normalizeInt(id);

    if (orderId < 1) {
      throw new Error("ID đơn hàng không hợp lệ.");
    }

    const normalizedStatus = Number(payment_status);

    if (normalizedStatus !== 0 && normalizedStatus !== 1) {
      throw new Error("Trạng thái thanh toán không hợp lệ.");
    }

    const connection = await getTransactionConnection();

    try {
      await connection.beginTransaction();

      const orderRows = await runQuery(
        connection,
        `
            SELECT
              id,
              status

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
        await connection.rollback();

        return null;
      }

      if (String(order.status || "").toUpperCase() === "CANCELLED") {
        throw new Error("Không thể cập nhật thanh toán cho đơn hàng đã hủy.");
      }

      const paymentRows = await runQuery(
        connection,
        `
            SELECT
              id,

              payment_method,

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
        throw new Error("Không tìm thấy thông tin thanh toán.");
      }

      const method = String(payment.payment_method || "").toLowerCase();

      /*
       * MoMo được xác nhận từ callback.
       * Không cho Admin tự gán success để tránh lệch gateway.
       */
      if (method === "momo") {
        throw new Error(
          "Thanh toán MoMo được xác nhận tự động từ cổng thanh toán.",
        );
      }

      /*
       * Không cho đảo payment đã paid về unpaid.
       */
      if (Number(payment.status) === 1 && normalizedStatus === 0) {
        throw new Error(
          "Thanh toán đã được xác nhận, không thể chuyển lại về chưa thanh toán.",
        );
      }

      await runQuery(
        connection,
        `
          UPDATE payments

          SET
            status = ?,

            transaction_code =
              CASE
                WHEN ? IS NOT NULL
                     AND ? <> ''
                THEN ?
                ELSE transaction_code
              END,

            paid_at =
              CASE
                WHEN ? = 1
                THEN COALESCE(
                  paid_at,
                  NOW()
                )

                ELSE NULL
              END,

            updated_at = NOW()

          WHERE
            id = ?
            AND deleted_at IS NULL
        `,
        [
          normalizedStatus,

          transaction_code,

          transaction_code,

          transaction_code,

          normalizedStatus,

          payment.id,
        ],
      );

      /*
       * Bank đã xác nhận thanh toán:
       *
       * PENDING → PROCESSING
       *
       * giống behavior hiện tại của MoMo.
       */
      if (normalizedStatus === 1 && method === "bank") {
        await runQuery(
          connection,
          `
            UPDATE orders

            SET
              status =
                CASE
                  WHEN status =
                       'PENDING'
                  THEN 'PROCESSING'
                  ELSE status
                END,

              updated_at = NOW()

            WHERE
              id = ?
              AND deleted_at IS NULL
              AND status <>
                  'CANCELLED'
          `,
          [orderId],
        );
      }

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
  // INVOICE
  // ==========================================================

  async getInvoice(id) {
    const order = await this.getById(id);

    if (!order) {
      return null;
    }

    const invoiceCode = `INV-${order.order_code}`;

    const exportedAt = new Date().toISOString();

    return {
      invoice_code: invoiceCode,

      exported_at: exportedAt,

      order,

      customer: {
        name: order.shipping_name || "Không có",

        phone: order.shipping_phone || "Không có",

        email: order.shipping_email || null,

        address: order.shipping_address || "Không có",

        province: order.shipping_province_name || null,
      },

      items: order.items || [],

      summary: {
        subtotal: order.subtotal,

        shipping_fee: order.shipping_fee,

        discount_amount: order.discount_amount,

        coupon_code: order.coupon_code || null,

        total_amount: order.total_amount,

        payment_method: order.payment_method_label || "Không xác định",

        payment_status: order.payment_status_label || "Chưa thanh toán",

        transaction_code: order.transaction_code || null,

        paid_at: order.paid_at || null,
      },
    };
  },
};

module.exports = AdminOrder;
