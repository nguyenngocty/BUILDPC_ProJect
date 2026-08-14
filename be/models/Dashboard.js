const { pool } = require("../config/database");

const ALLOWED_RANGE_DAYS = [7, 30, 90];

function normalizeRangeDays(value) {
  const rangeDays = Number(value);
  return ALLOWED_RANGE_DAYS.includes(rangeDays) ? rangeDays : 7;
}

function normalizePositiveInteger(value, fallback, maxValue = 50) {
  const numberValue = Number(value);

  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    return fallback;
  }

  return Math.min(numberValue, maxValue);
}

async function getDashboardSummary(options = {}) {
  const rangeDays = normalizeRangeDays(options.rangeDays);

  const lowStockThreshold = normalizePositiveInteger(
    options.lowStockThreshold,
    5,
    1000000
  );

  const recentOrderLimit = normalizePositiveInteger(
    options.recentOrderLimit,
    8,
    50
  );

  const currentRangeStart = rangeDays - 1;
  const previousRangeStart = rangeDays * 2 - 1;

  const [todayRows] = await pool.query(`
    SELECT DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS today
  `);

  const today = todayRows[0]?.today || null;

  const [
    [orderStatsRows],
    [customerStatsRows],
    [inventoryStatsRows],
    [revenueChartRows],
    [recentOrderRows],
    [orderStatusRows],
  ] = await Promise.all([
    pool.query(
      `
        SELECT
          COALESCE(SUM(
            CASE
              WHEN UPPER(COALESCE(o.status, '')) = 'COMPLETED'
              THEN o.total_amount
              ELSE 0
            END
          ), 0) AS total_revenue,

          COALESCE(SUM(
            CASE
              WHEN UPPER(COALESCE(o.status, '')) = 'COMPLETED'
                AND DATE(o.created_at) = CURDATE()
              THEN o.total_amount
              ELSE 0
            END
          ), 0) AS today_revenue,

          COALESCE(SUM(
            CASE
              WHEN UPPER(COALESCE(o.status, '')) = 'COMPLETED'
                AND o.created_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
              THEN o.total_amount
              ELSE 0
            END
          ), 0) AS current_month_revenue,

          COALESCE(SUM(
            CASE
              WHEN UPPER(COALESCE(o.status, '')) = 'COMPLETED'
                AND o.created_at >= DATE_FORMAT(
                  DATE_SUB(CURDATE(), INTERVAL 1 MONTH),
                  '%Y-%m-01'
                )
                AND o.created_at < DATE_FORMAT(CURDATE(), '%Y-%m-01')
              THEN o.total_amount
              ELSE 0
            END
          ), 0) AS previous_month_revenue,

          COUNT(*) AS total_orders,

          COALESCE(SUM(
            CASE
              WHEN UPPER(COALESCE(o.status, '')) = 'PENDING'
              THEN 1
              ELSE 0
            END
          ), 0) AS pending_orders,

          COALESCE(SUM(
            CASE
              WHEN UPPER(COALESCE(o.status, '')) = 'COMPLETED'
              THEN 1
              ELSE 0
            END
          ), 0) AS completed_orders,

          COALESCE(SUM(
            CASE
              WHEN UPPER(COALESCE(o.status, '')) = 'CANCELLED'
              THEN 1
              ELSE 0
            END
          ), 0) AS cancelled_orders,

          COALESCE(SUM(
            CASE
              WHEN DATE(o.created_at) >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
              THEN 1
              ELSE 0
            END
          ), 0) AS current_range_orders,

          COALESCE(SUM(
            CASE
              WHEN DATE(o.created_at) BETWEEN DATE_SUB(CURDATE(), INTERVAL ? DAY)
                AND DATE_SUB(CURDATE(), INTERVAL ? DAY)
              THEN 1
              ELSE 0
            END
          ), 0) AS previous_range_orders

        FROM orders o
        WHERE o.deleted_at IS NULL
      `,
      [
        currentRangeStart,
        previousRangeStart,
        rangeDays,
      ]
    ),

    pool.query(`
      SELECT
        COUNT(DISTINCT u.id) AS total_customers,

        COALESCE(SUM(
          CASE WHEN u.status = 1 THEN 1 ELSE 0 END
        ), 0) AS active_customers,

        COALESCE(SUM(
          CASE
            WHEN u.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            THEN 1
            ELSE 0
          END
        ), 0) AS new_customers_last_30_days

      FROM users u
      INNER JOIN roles r ON r.id = u.role_id
      WHERE u.deleted_at IS NULL
        AND r.deleted_at IS NULL
        AND r.status = 1
        AND r.code = 'CUSTOMER'
    `),

    pool.query(
      `
        SELECT
          COUNT(*) AS total_products,

          COALESCE(SUM(
            CASE
              WHEN p.status = 1 AND p.quantity > ?
              THEN 1
              ELSE 0
            END
          ), 0) AS in_stock_products,

          COALESCE(SUM(
            CASE
              WHEN p.status = 1 AND p.quantity BETWEEN 1 AND ?
              THEN 1
              ELSE 0
            END
          ), 0) AS low_stock_products,

          COALESCE(SUM(
            CASE
              WHEN p.status = 1 AND p.quantity <= 0
              THEN 1
              ELSE 0
            END
          ), 0) AS out_of_stock_products,

          COALESCE(SUM(
            CASE
              WHEN p.status = 0
              THEN 1
              ELSE 0
            END
          ), 0) AS hidden_products

        FROM products p
        WHERE p.deleted_at IS NULL
      `,
      [
        lowStockThreshold,
        lowStockThreshold,
      ]
    ),

    pool.query(
      `
        SELECT
          DATE_FORMAT(o.created_at, '%Y-%m-%d') AS date,
          COALESCE(SUM(o.total_amount), 0) AS revenue,
          COUNT(*) AS order_count

        FROM orders o
        WHERE o.deleted_at IS NULL
          AND UPPER(COALESCE(o.status, '')) = 'COMPLETED'
          AND DATE(o.created_at) >= DATE_SUB(CURDATE(), INTERVAL ? DAY)

        GROUP BY DATE(o.created_at)
        ORDER BY DATE(o.created_at) ASC
      `,
      [currentRangeStart]
    ),

    pool.query(
      `
        SELECT
          o.id,
          o.order_code,
          o.shipping_name AS customer_name,
          o.shipping_phone AS customer_phone,
          o.total_amount,
          o.status AS order_status,
          o.created_at,

          COALESCE(item_data.item_count, 0) AS item_count,
          item_data.first_product_name,

          COALESCE(payment_data.payment_status, 0) AS payment_status,
          payment_data.payment_method

        FROM orders o

        LEFT JOIN (
          SELECT
            oi.order_id,
            COUNT(*) AS item_count,
            SUBSTRING_INDEX(
              GROUP_CONCAT(
                oi.product_name
                ORDER BY oi.id ASC
                SEPARATOR '|||'
              ),
              '|||',
              1
            ) AS first_product_name
          FROM order_items oi
          WHERE oi.deleted_at IS NULL
          GROUP BY oi.order_id
        ) AS item_data ON item_data.order_id = o.id

        LEFT JOIN (
          SELECT
            p.order_id,
            MAX(p.status) AS payment_status,
            SUBSTRING_INDEX(
              GROUP_CONCAT(
                p.payment_method
                ORDER BY p.id DESC
                SEPARATOR '|||'
              ),
              '|||',
              1
            ) AS payment_method
          FROM payments p
          WHERE p.deleted_at IS NULL
          GROUP BY p.order_id
        ) AS payment_data ON payment_data.order_id = o.id

        WHERE o.deleted_at IS NULL
        ORDER BY o.created_at DESC
        LIMIT ?
      `,
      [recentOrderLimit]
    ),

    pool.query(`
      SELECT
        UPPER(COALESCE(o.status, 'PENDING')) AS status,
        COUNT(*) AS total

      FROM orders o
      WHERE o.deleted_at IS NULL
      GROUP BY UPPER(COALESCE(o.status, 'PENDING'))
    `),
  ]);

  return {
    today,
    rangeDays,
    lowStockThreshold,

    orderStats: orderStatsRows[0] || {},
    customerStats: customerStatsRows[0] || {},
    inventoryStats: inventoryStatsRows[0] || {},

    revenueChartRows,
    recentOrderRows,
    orderStatusRows,
  };
}

module.exports = {
  getDashboardSummary,
};