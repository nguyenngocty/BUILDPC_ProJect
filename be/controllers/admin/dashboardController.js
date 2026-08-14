const Dashboard = require("../../models/Dashboard");

const RANGE_CONFIG = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

const ORDER_STATUS_LABELS = {
  PENDING: "Chờ xử lý",
  CONFIRMED: "Đã xác nhận",
  PROCESSING: "Đang xử lý",
  SHIPPING: "Đang giao hàng",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
};

function toNumber(value) {
  return Number(value || 0);
}

function getLowStockThreshold() {
  const threshold = Number(process.env.LOW_STOCK_THRESHOLD || 5);

  if (!Number.isInteger(threshold) || threshold < 0) {
    return 5;
  }

  return threshold;
}

function calculatePercentChange(currentValue, previousValue) {
  const current = toNumber(currentValue);
  const previous = toNumber(previousValue);

  if (previous <= 0) {
    return null;
  }

  return Number((((current - previous) / previous) * 100).toFixed(2));
}

function getRangeFromRequest(rangeValue) {
  const normalizedRange = String(rangeValue || "7d").toLowerCase();

  return {
    range: RANGE_CONFIG[normalizedRange] ? normalizedRange : "7d",
    rangeDays: RANGE_CONFIG[normalizedRange] || 7,
  };
}

function formatChartLabel(dateString) {
  const parts = String(dateString || "").split("-");

  if (parts.length !== 3) {
    return String(dateString || "");
  }

  return `${parts[2]}/${parts[1]}`;
}

function createRevenueChart(todayString, rangeDays, chartRows) {
  const chartMap = new Map();

  chartRows.forEach((row) => {
    chartMap.set(String(row.date), {
      revenue: toNumber(row.revenue),
      orderCount: toNumber(row.order_count),
    });
  });

  const result = [];
  const today = new Date(`${todayString}T00:00:00.000Z`);

  for (let index = rangeDays - 1; index >= 0; index -= 1) {
    const currentDate = new Date(today);

    currentDate.setUTCDate(today.getUTCDate() - index);

    const date = currentDate.toISOString().slice(0, 10);
    const chartData = chartMap.get(date) || {
      revenue: 0,
      orderCount: 0,
    };

    result.push({
      date,
      label: formatChartLabel(date),
      revenue: chartData.revenue,
      orderCount: chartData.orderCount,
    });
  }

  return result;
}

function buildOrdersByStatus(orderStatusRows) {
  const result = {
    PENDING: 0,
    CONFIRMED: 0,
    PROCESSING: 0,
    SHIPPING: 0,
    COMPLETED: 0,
    CANCELLED: 0,
  };

  orderStatusRows.forEach((row) => {
    const status = String(row.status || "PENDING").toUpperCase();

    result[status] = toNumber(row.total);
  });

  return result;
}

function buildRecentOrders(recentOrderRows) {
  return recentOrderRows.map((order) => {
    const itemCount = toNumber(order.item_count);
    const firstProductName = order.first_product_name || "Chưa có sản phẩm";

    let productSummary = firstProductName;

    if (itemCount > 1) {
      productSummary = `${firstProductName} và ${itemCount - 1} sản phẩm khác`;
    }

    const orderStatus = String(order.order_status || "PENDING").toUpperCase();
    const paymentStatus = toNumber(order.payment_status);

    return {
      id: order.id,
      orderCode: order.order_code,
      customerName: order.customer_name,
      customerPhone: order.customer_phone,

      productSummary,
      itemCount,

      totalAmount: toNumber(order.total_amount),

      orderStatus,
      orderStatusLabel:
        ORDER_STATUS_LABELS[orderStatus] || orderStatus,

      paymentStatus,
      paymentStatusLabel:
        paymentStatus === 1 ? "Đã thanh toán" : "Chưa thanh toán",

      paymentMethod: order.payment_method || null,
      createdAt: order.created_at,
    };
  });
}

const getDashboardSummary = async (req, res, next) => {
  try {
    const { range, rangeDays } = getRangeFromRequest(req.query.range);

    const dashboardData = await Dashboard.getDashboardSummary({
      rangeDays,
      lowStockThreshold: getLowStockThreshold(),
      recentOrderLimit: 8,
    });

    const orderStats = dashboardData.orderStats;
    const customerStats = dashboardData.customerStats;
    const inventoryStats = dashboardData.inventoryStats;

    const totalRevenue = toNumber(orderStats.total_revenue);
    const todayRevenue = toNumber(orderStats.today_revenue);
    const currentMonthRevenue = toNumber(orderStats.current_month_revenue);
    const previousMonthRevenue = toNumber(orderStats.previous_month_revenue);

    const totalOrders = toNumber(orderStats.total_orders);
    const pendingOrders = toNumber(orderStats.pending_orders);
    const completedOrders = toNumber(orderStats.completed_orders);
    const cancelledOrders = toNumber(orderStats.cancelled_orders);

    const totalCustomers = toNumber(customerStats.total_customers);
    const activeCustomers = toNumber(customerStats.active_customers);
    const newCustomersLast30Days = toNumber(
      customerStats.new_customers_last_30_days
    );

    const totalProducts = toNumber(inventoryStats.total_products);
    const inStockProducts = toNumber(inventoryStats.in_stock_products);
    const lowStockProducts = toNumber(inventoryStats.low_stock_products);
    const outOfStockProducts = toNumber(inventoryStats.out_of_stock_products);
    const hiddenProducts = toNumber(inventoryStats.hidden_products);

    const needAttentionProducts = lowStockProducts + outOfStockProducts;

    const revenueComparisonPercent = calculatePercentChange(
      currentMonthRevenue,
      previousMonthRevenue
    );

    const ordersComparisonPercent = calculatePercentChange(
      orderStats.current_range_orders,
      orderStats.previous_range_orders
    );

    const ordersByStatus = buildOrdersByStatus(
      dashboardData.orderStatusRows
    );

    const revenueChart = createRevenueChart(
      dashboardData.today,
      rangeDays,
      dashboardData.revenueChartRows
    );

    const recentOrders = buildRecentOrders(
      dashboardData.recentOrderRows
    );

    return res.status(200).json({
      success: true,
      message: "Lấy dữ liệu dashboard thành công.",

      data: {
        range,
        rangeDays,
        generatedAt: new Date().toISOString(),

        summary: {
          revenue: {
            value: currentMonthRevenue,
            totalRevenue,
            todayRevenue,
            currentMonthRevenue,
            previousMonthRevenue,
            comparisonPercent: revenueComparisonPercent,
            comparisonLabel: "so với tháng trước",
          },

          orders: {
            value: totalOrders,
            totalOrders,
            pendingOrders,
            completedOrders,
            cancelledOrders,
            currentRangeOrders: toNumber(orderStats.current_range_orders),
            previousRangeOrders: toNumber(orderStats.previous_range_orders),
            comparisonPercent: ordersComparisonPercent,
            comparisonLabel: `so với ${rangeDays} ngày trước`,
          },

          customers: {
            value: totalCustomers,
            totalCustomers,
            activeCustomers,
            newCustomersLast30Days,
          },

          products: {
            value: needAttentionProducts,
            totalProducts,
            inStockProducts,
            lowStockProducts,
            outOfStockProducts,
            hiddenProducts,
            needAttentionProducts,
          },
        },

        ordersByStatus,

        revenueChart,

        inventoryStatus: {
          totalProducts,
          inStockProducts,
          lowStockProducts,
          outOfStockProducts,
          hiddenProducts,
          lowStockThreshold: dashboardData.lowStockThreshold,
        },

        recentOrders,
      },
    });
  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu Dashboard:", error);
    return next(error);
  }
};

module.exports = {
  getDashboardSummary,
};