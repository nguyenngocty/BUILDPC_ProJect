const database = require("../config/database");
const Order = require("./Order");

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

const normalizeInt = (value, defaultValue = 0) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
};

const STATUS_LABELS = {
  PENDING: "Chờ xác nhận",
  PROCESSING: "Đang xử lý",
  SHIPPING: "Đang giao",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Hủy",
};

const STATUS_FLOW = {
  PENDING: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPING", "CANCELLED"],
  SHIPPING: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

const PAYMENT_SELECT_SQL = `
  pay.payment_method,
  pay.amount AS payment_amount,
  pay.status AS payment_status,
  pay.transaction_code,
  pay.paid_at,

  CASE pay.payment_method
    WHEN 'cod' THEN 'Thanh toán khi nhận hàng'
    WHEN 'bank' THEN 'Chuyển khoản ngân hàng'
    WHEN 'momo' THEN 'MoMo ATM/Napas'
    ELSE 'Không xác định'
  END AS payment_method_label,

  CASE
    WHEN pay.status = 1 THEN 'Đã thanh toán'
    WHEN pay.payment_method = 'cod' THEN 'Thu khi giao'
    WHEN pay.payment_method = 'bank' THEN 'Chờ xác nhận'
    ELSE 'Chưa thanh toán'
  END AS payment_status_label
`;

const STATUS_SELECT_SQL = `
  CASE o.status
    WHEN 'PENDING' THEN 'Chờ xác nhận'
    WHEN 'PROCESSING' THEN 'Đang xử lý'
    WHEN 'SHIPPING' THEN 'Đang giao'
    WHEN 'COMPLETED' THEN 'Hoàn thành'
    WHEN 'CANCELLED' THEN 'Hủy'
    ELSE o.status
  END AS status_label
`;

const buildWhereClause = ({
  keyword = "",
  status = "",
  from_date = "",
  to_date = "",
}) => {
  const where = ["o.deleted_at IS NULL"];
  const params = [];

  const searchKeyword = String(keyword || "")
    .trim()
    .toLowerCase();

  if (searchKeyword) {
    where.push(`(
      LOWER(o.order_code) LIKE ?
      OR LOWER(o.shipping_name) LIKE ?
      OR LOWER(o.shipping_phone) LIKE ?
      OR LOWER(o.shipping_address) LIKE ?
      OR LOWER(pay.payment_method) LIKE ?
      OR EXISTS (
        SELECT 1
        FROM order_items oi_search
        LEFT JOIN products p_search ON p_search.id = oi_search.product_id
        WHERE oi_search.order_id = o.id
          AND oi_search.deleted_at IS NULL
          AND (
            LOWER(oi_search.product_name) LIKE ?
            OR LOWER(p_search.sku) LIKE ?
          )
      )
    )`);

    const key = `%${searchKeyword}%`;
    params.push(key, key, key, key, key, key, key);
  }

  if (status) {
    where.push("o.status = ?");
    params.push(status);
  }

  if (from_date) {
    where.push("DATE(o.created_at) >= ?");
    params.push(from_date);
  }

  if (to_date) {
    where.push("DATE(o.created_at) <= ?");
    params.push(to_date);
  }

  return {
    whereSql: `WHERE ${where.join(" AND ")}`,
    params,
  };
};

const AdminOrder = {
  async getAll(filters = {}) {
    const pageNumber = Math.max(normalizeInt(filters.page, 1), 1);
    const limitNumber = Math.max(normalizeInt(filters.limit, 10), 1);
    const offset = (pageNumber - 1) * limitNumber;

    const { whereSql, params } = buildWhereClause(filters);

    const data = await query(
      `SELECT
          o.*,
          ${STATUS_SELECT_SQL},
          ${PAYMENT_SELECT_SQL}
       FROM orders o
       LEFT JOIN payments pay
         ON pay.order_id = o.id
        AND pay.deleted_at IS NULL
       ${whereSql}
       ORDER BY o.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limitNumber, offset],
    );

    const countRows = await query(
      `SELECT COUNT(DISTINCT o.id) AS total
       FROM orders o
       LEFT JOIN payments pay
         ON pay.order_id = o.id
        AND pay.deleted_at IS NULL
       ${whereSql}`,
      params,
    );

    const total = Number(countRows[0]?.total || 0);

    return {
      data,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages: Math.max(Math.ceil(total / limitNumber), 1),
      },
    };
  },

  async getById(id) {
    const orderRows = await query(
      `SELECT
          o.*,
          ${STATUS_SELECT_SQL},
          ${PAYMENT_SELECT_SQL}
       FROM orders o
       LEFT JOIN payments pay
         ON pay.order_id = o.id
        AND pay.deleted_at IS NULL
       WHERE o.id = ?
         AND o.deleted_at IS NULL
       LIMIT 1`,
      [id],
    );

    const order = orderRows[0];

    if (!order) return null;

    const items = await query(
      `SELECT
          oi.*,
          p.sku AS product_sku
       FROM order_items oi
       LEFT JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = ?
         AND oi.deleted_at IS NULL
       ORDER BY oi.id ASC`,
      [id],
    );

    return {
      ...order,
      items,
    };
  },

  async updateStatus(id, newStatus) {
    const order = await this.getById(id);

    if (!order) return null;

    const currentStatus = order.status;
    const nextStatus = String(newStatus || "").toUpperCase();

    if (!Object.prototype.hasOwnProperty.call(STATUS_LABELS, nextStatus)) {
      throw new Error("Trạng thái đơn hàng không hợp lệ");
    }

    const allowedStatuses = STATUS_FLOW[currentStatus] || [];

    if (!allowedStatuses.includes(nextStatus)) {
      throw new Error(
        `Không thể chuyển trạng thái từ "${STATUS_LABELS[currentStatus] || currentStatus}" sang "${STATUS_LABELS[nextStatus] || nextStatus}"`,
      );
    }

    if (nextStatus === "CANCELLED") {
      return Order.cancelAndRestoreStock({
        orderId: id,

        reason: "Admin hủy đơn hàng",

        allowedStatuses: ["PENDING", "PROCESSING"],
      });
    }

    await query(
      `UPDATE orders
       SET status = ?,
           updated_at = NOW()
       WHERE id = ?
         AND deleted_at IS NULL`,
      [nextStatus, id],
    );

    return this.getById(id);
  },

  async getInvoice(id) {
    const order = await this.getById(id);

    if (!order) return null;

    const invoiceCode = `INV-${order.order_code}`;
    const exportedAt = new Date().toISOString();

    return {
      invoice_code: invoiceCode,
      exported_at: exportedAt,
      order,
      customer: {
        name: order.shipping_name || "Không có",
        phone: order.shipping_phone || "Không có",
        address: order.shipping_address || "Không có",
      },
      items: order.items || [],
      summary: {
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
