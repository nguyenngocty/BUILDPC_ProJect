import React, { useCallback, useEffect, useMemo, useState } from "react";

import { useNavigate } from "react-router-dom";

import dashboardService from "../../../../services/admin/dashboardService";

const RANGE_LABELS = {
  "7d": "7 ngày",
  "30d": "30 ngày",
  "90d": "90 ngày",
};

// =========================================================
// FORMAT
// =========================================================

function formatCurrency(value) {
  return `${new Intl.NumberFormat("vi-VN").format(Number(value || 0))}đ`;
}

function formatNumber(value) {
  return new Intl.NumberFormat("vi-VN").format(Number(value || 0));
}

// =========================================================
// COMPARISON
// =========================================================

function getComparisonData(percent, label, emptyMessage) {
  if (percent === null || percent === undefined) {
    return {
      type: "neutral",
      icon: "bi-dash-circle",
      text: emptyMessage,
    };
  }

  const numberPercent = Number(percent);

  const isNegative = numberPercent < 0;

  return {
    type: isNegative ? "negative" : "positive",

    icon: isNegative ? "bi-arrow-down" : "bi-arrow-up",

    text: `${numberPercent > 0 ? "+" : ""}${numberPercent}% ${label}`,
  };
}

// =========================================================
// ORDER STATUS
// =========================================================

function getOrderStatusMeta(status) {
  const normalizedStatus = String(status || "").toUpperCase();

  const statusMap = {
    COMPLETED: {
      type: "success",
      icon: "bi-check-circle-fill",
      label: "Hoàn thành",
    },

    CANCELLED: {
      type: "danger",
      icon: "bi-x-circle-fill",
      label: "Đã hủy",
    },

    PENDING: {
      type: "warning",
      icon: "bi-hourglass-split",
      label: "Chờ xử lý",
    },

    CONFIRMED: {
      type: "info",
      icon: "bi-check2-circle",
      label: "Đã xác nhận",
    },

    PROCESSING: {
      type: "processing",
      icon: "bi-arrow-repeat",
      label: "Đang xử lý",
    },

    SHIPPING: {
      type: "shipping",
      icon: "bi-truck",
      label: "Đang giao hàng",
    },
  };

  return (
    statusMap[normalizedStatus] || {
      type: "neutral",
      icon: "bi-info-circle-fill",
      label: normalizedStatus || "Không xác định",
    }
  );
}

// =========================================================
// CHART
// =========================================================

function shouldShowChartLabel(index, totalItems) {
  if (totalItems <= 7) {
    return true;
  }

  if (totalItems <= 30) {
    return index % 5 === 0 || index === totalItems - 1;
  }

  return index % 15 === 0 || index === totalItems - 1;
}

// =========================================================
// ORDER UPDATED TIME
// =========================================================

function getOrderUpdateTime(order) {
  const value =
    order?.updatedAt ||
    order?.updated_at ||
    order?.statusUpdatedAt ||
    order?.status_updated_at ||
    order?.createdAt ||
    order?.created_at;

  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
}

// =========================================================
// COMPONENT
// =========================================================

function AdminDashboard() {
  const navigate = useNavigate();

  const [range, setRange] = useState("7d");

  const [dashboardData, setDashboardData] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  // =======================================================
  // FETCH DASHBOARD
  // =======================================================

  const fetchDashboard = useCallback(
    async (signal) => {
      try {
        setLoading(true);
        setError("");

        const response = await dashboardService.getSummary(range, signal);

        if (!response?.success) {
          throw new Error(
            response?.message || "Không thể lấy dữ liệu Dashboard.",
          );
        }

        setDashboardData(response.data);
      } catch (requestError) {
        if (
          requestError?.code === "ERR_CANCELED" ||
          requestError?.name === "CanceledError"
        ) {
          return;
        }

        console.error("Lỗi lấy dữ liệu Dashboard:", requestError);

        setError(
          requestError?.response?.data?.message ||
            requestError?.message ||
            "Không thể kết nối đến máy chủ.",
        );
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [range],
  );

  // =======================================================
  // LOAD DATA
  // =======================================================

  useEffect(() => {
    const controller = new AbortController();

    fetchDashboard(controller.signal);

    return () => {
      controller.abort();
    };
  }, [fetchDashboard]);

  // =======================================================
  // DATA
  // =======================================================

  const summary = dashboardData?.summary || {};

  const revenue = summary.revenue || {};

  const orders = summary.orders || {};

  const customers = summary.customers || {};

  const products = summary.products || {};

  const inventoryStatus = dashboardData?.inventoryStatus || {};

  const recentOrders = dashboardData?.recentOrders || [];

  const revenueChart = dashboardData?.revenueChart || [];

  // =======================================================
  // SORT RECENT ORDERS
  // =======================================================

  const sortedRecentOrders = useMemo(() => {
    return [...recentOrders].sort((a, b) => {
      const timeA = getOrderUpdateTime(a);

      const timeB = getOrderUpdateTime(b);

      if (timeA !== timeB) {
        return timeB - timeA;
      }

      return Number(b?.id || 0) - Number(a?.id || 0);
    });
  }, [recentOrders]);

  // =======================================================
  // CHART MAX
  // =======================================================

  const maximumRevenue = useMemo(() => {
    return Math.max(
      1,
      ...revenueChart.map((item) => Number(item.revenue || 0)),
    );
  }, [revenueChart]);

  // =======================================================
  // CHART MIN WIDTH
  // =======================================================

  const chartMinWidth = useMemo(() => {
    if (revenueChart.length <= 7) {
      return "100%";
    }

    return `${revenueChart.length * 62}px`;
  }, [revenueChart.length]);

  // =======================================================
  // COMPARISONS
  // =======================================================

  const revenueComparison = getComparisonData(
    revenue.comparisonPercent,
    revenue.comparisonLabel,
    "Chưa có dữ liệu tháng trước",
  );

  const orderComparison = getComparisonData(
    orders.comparisonPercent,
    orders.comparisonLabel,
    "Chưa có dữ liệu kỳ trước",
  );

  // =======================================================
  // LOADING
  // =======================================================

  if (loading && !dashboardData) {
    return (
      <section className="adm-dashboard-state">
        <div className="adm-dashboard-state__icon adm-dashboard-state__icon--loading">
          <i className="bi bi-arrow-repeat" />
        </div>

        <h2>Đang tải Dashboard</h2>

        <p>Hệ thống đang lấy dữ liệu từ máy chủ...</p>
      </section>
    );
  }

  // =======================================================
  // ERROR
  // =======================================================

  if (error && !dashboardData) {
    return (
      <section className="adm-dashboard-state adm-dashboard-state--error">
        <div className="adm-dashboard-state__icon adm-dashboard-state__icon--error">
          <i className="bi bi-exclamation-triangle-fill" />
        </div>

        <h2>Không thể tải Dashboard</h2>

        <p>{error}</p>

        <button
          className="adm-dashboard-button adm-dashboard-button--primary"
          type="button"
          onClick={() => fetchDashboard()}
        >
          <i className="bi bi-arrow-clockwise" />

          <span>Thử lại</span>
        </button>
      </section>
    );
  }

  return (
    <div className="adm-dashboard">
      {/* ===================================================
          HEADER
          =================================================== */}

      <section className="adm-dashboard-header">
        <div className="adm-dashboard-header__content">
          <span className="adm-dashboard-header__kicker">Dashboard</span>

          <h1 className="adm-dashboard-header__title">
            <span className="adm-dashboard-header__title-icon">
              <i className="bi bi-speedometer2" />
            </span>

            <span>Tổng quan hệ thống</span>
          </h1>

          <p className="adm-dashboard-header__description">
            Theo dõi nhanh doanh thu, đơn hàng, khách hàng và tình trạng sản
            phẩm trong hệ thống.
          </p>
        </div>

        <button
          className="adm-dashboard-button adm-dashboard-button--primary"
          type="button"
          onClick={() => navigate("/admin/products")}
        >
          <i className="bi bi-plus-lg" />

          <span>Tạo sản phẩm</span>
        </button>
      </section>

      {/* ===================================================
          WARNING
          =================================================== */}

      {error && (
        <div className="adm-dashboard-warning">
          <div className="adm-dashboard-warning__message">
            <span className="adm-dashboard-warning__icon">
              <i className="bi bi-exclamation-circle-fill" />
            </span>

            <span>{error}</span>
          </div>

          <button
            className="adm-dashboard-warning__button"
            type="button"
            onClick={() => fetchDashboard()}
          >
            <i className="bi bi-arrow-clockwise" />
            Tải lại
          </button>
        </div>
      )}

      {/* ===================================================
          STATISTICS
          =================================================== */}

      <section className="adm-dashboard-stats" aria-label="Chỉ số nhanh">
        {/* REVENUE */}

        <article className="adm-dashboard-stat-card adm-dashboard-stat-card--revenue">
          <div className="adm-dashboard-stat-card__top">
            <div>
              <span className="adm-dashboard-stat-card__label">Doanh thu</span>

              <strong className="adm-dashboard-stat-card__value">
                {formatCurrency(revenue.value)}
              </strong>
            </div>

            <div className="adm-dashboard-stat-card__icon">
              <i className="bi bi-cash-stack" />
            </div>
          </div>

          <div
            className={`adm-dashboard-stat-card__comparison adm-dashboard-stat-card__comparison--${revenueComparison.type}`}
          >
            <i className={`bi ${revenueComparison.icon}`} />

            <span>{revenueComparison.text}</span>
          </div>
        </article>

        {/* ORDERS */}

        <article className="adm-dashboard-stat-card adm-dashboard-stat-card--orders">
          <div className="adm-dashboard-stat-card__top">
            <div>
              <span className="adm-dashboard-stat-card__label">Đơn hàng</span>

              <strong className="adm-dashboard-stat-card__value">
                {formatNumber(orders.value)}
              </strong>
            </div>

            <div className="adm-dashboard-stat-card__icon">
              <i className="bi bi-cart-check" />
            </div>
          </div>

          <div
            className={`adm-dashboard-stat-card__comparison adm-dashboard-stat-card__comparison--${orderComparison.type}`}
          >
            <i className={`bi ${orderComparison.icon}`} />

            <span>{orderComparison.text}</span>
          </div>
        </article>

        {/* CUSTOMERS */}

        <article className="adm-dashboard-stat-card adm-dashboard-stat-card--customers">
          <div className="adm-dashboard-stat-card__top">
            <div>
              <span className="adm-dashboard-stat-card__label">Khách hàng</span>

              <strong className="adm-dashboard-stat-card__value">
                {formatNumber(customers.value)}
              </strong>
            </div>

            <div className="adm-dashboard-stat-card__icon">
              <i className="bi bi-people" />
            </div>
          </div>

          <div className="adm-dashboard-stat-card__comparison adm-dashboard-stat-card__comparison--positive">
            <i className="bi bi-person-plus" />

            <span>
              +{formatNumber(customers.newCustomersLast30Days)} tài khoản mới
            </span>
          </div>
        </article>

        {/* PRODUCTS */}

        <article className="adm-dashboard-stat-card adm-dashboard-stat-card--attention">
          <div className="adm-dashboard-stat-card__top">
            <div>
              <span className="adm-dashboard-stat-card__label">
                Sản phẩm cần chú ý
              </span>

              <strong className="adm-dashboard-stat-card__value">
                {formatNumber(products.needAttentionProducts)}
              </strong>
            </div>

            <div className="adm-dashboard-stat-card__icon">
              <i className="bi bi-exclamation-triangle" />
            </div>
          </div>

          <div className="adm-dashboard-stat-card__comparison adm-dashboard-stat-card__comparison--negative">
            <i className="bi bi-exclamation-circle" />

            <span>
              {products.outOfStockProducts || 0} hết hàng,{" "}
              {products.lowStockProducts || 0} sắp hết
            </span>
          </div>
        </article>
      </section>

      {/* ===================================================
          CHART + STOCK
          =================================================== */}

      <div className="adm-dashboard-content-grid">
        {/* CHART */}

        <section className="adm-dashboard-panel adm-dashboard-panel--chart">
          <div className="adm-dashboard-panel__header">
            <div className="adm-dashboard-panel__heading">
              <span className="adm-dashboard-panel__icon adm-dashboard-panel__icon--primary">
                <i className="bi bi-graph-up-arrow" />
              </span>

              <div>
                <h2>Doanh thu {RANGE_LABELS[range]}</h2>

                <p>
                  Doanh thu từ các đơn hàng đã hoàn thành trong{" "}
                  {RANGE_LABELS[range]} gần nhất.
                </p>
              </div>
            </div>

            <div className="adm-dashboard-range">
              <i className="bi bi-calendar3" />

              <select
                value={range}
                disabled={loading}
                onChange={(event) => setRange(event.target.value)}
                aria-label="Lọc doanh thu"
              >
                <option value="7d">7 ngày</option>

                <option value="30d">30 ngày</option>

                <option value="90d">90 ngày</option>
              </select>
            </div>
          </div>

          {revenueChart.length === 0 ? (
            <div className="adm-dashboard-empty">
              <div className="adm-dashboard-empty__icon">
                <i className="bi bi-bar-chart" />
              </div>

              <strong>Chưa có dữ liệu</strong>

              <p>Chưa có dữ liệu doanh thu trong khoảng thời gian đã chọn.</p>
            </div>
          ) : (
            <div className="adm-dashboard-chart-scroll">
              <div
                className="adm-dashboard-chart"
                aria-label="Biểu đồ doanh thu"
                style={{
                  width: chartMinWidth,
                  minWidth: chartMinWidth,
                }}
              >
                {revenueChart.map((item, index) => {
                  const itemRevenue = Number(item.revenue || 0);

                  const barValue =
                    itemRevenue <= 0
                      ? 4
                      : Math.max(
                          10,
                          Math.round((itemRevenue / maximumRevenue) * 100),
                        );

                  return (
                    <div
                      key={item.date}
                      className="adm-dashboard-chart__column"
                    >
                      <div className="adm-dashboard-chart__bar-wrap">
                        <div
                          className="adm-dashboard-chart__bar"
                          style={{
                            "--adm-chart-value": `${barValue}%`,
                          }}
                          title={`${item.label}: ${formatCurrency(
                            itemRevenue,
                          )} - ${item.orderCount || 0} đơn`}
                        >
                          <span className="adm-dashboard-chart__tooltip">
                            {formatCurrency(itemRevenue)}
                          </span>
                        </div>
                      </div>

                      <span className="adm-dashboard-chart__label">
                        {shouldShowChartLabel(index, revenueChart.length)
                          ? item.label
                          : ""}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* STOCK */}

        <section className="adm-dashboard-panel adm-dashboard-panel--stock">
          <div className="adm-dashboard-panel__header">
            <div className="adm-dashboard-panel__heading">
              <span className="adm-dashboard-panel__icon adm-dashboard-panel__icon--blue">
                <i className="bi bi-boxes" />
              </span>

              <div>
                <h2>Trạng thái kho</h2>

                <p>Tổng quan tình trạng tồn kho sản phẩm.</p>
              </div>
            </div>
          </div>

          <div className="adm-dashboard-stock">
            {/* IN STOCK */}

            <div className="adm-dashboard-stock__item">
              <div className="adm-dashboard-stock__left">
                <span className="adm-dashboard-stock__icon adm-dashboard-stock__icon--success">
                  <i className="bi bi-check-circle-fill" />
                </span>

                <div>
                  <strong>Còn hàng</strong>

                  <span>Sản phẩm có thể bán</span>
                </div>
              </div>

              <strong className="adm-dashboard-stock__value adm-dashboard-stock__value--success">
                {formatNumber(inventoryStatus.inStockProducts)}
              </strong>
            </div>

            {/* LOW STOCK */}

            <div className="adm-dashboard-stock__item">
              <div className="adm-dashboard-stock__left">
                <span className="adm-dashboard-stock__icon adm-dashboard-stock__icon--warning">
                  <i className="bi bi-exclamation-circle-fill" />
                </span>

                <div>
                  <strong>Sắp hết</strong>

                  <span>Cần nhập thêm hàng</span>
                </div>
              </div>

              <strong className="adm-dashboard-stock__value adm-dashboard-stock__value--warning">
                {formatNumber(inventoryStatus.lowStockProducts)}
              </strong>
            </div>

            {/* OUT OF STOCK */}

            <div className="adm-dashboard-stock__item">
              <div className="adm-dashboard-stock__left">
                <span className="adm-dashboard-stock__icon adm-dashboard-stock__icon--danger">
                  <i className="bi bi-x-octagon-fill" />
                </span>

                <div>
                  <strong>Hết hàng</strong>

                  <span>Không còn tồn kho</span>
                </div>
              </div>

              <strong className="adm-dashboard-stock__value adm-dashboard-stock__value--danger">
                {formatNumber(inventoryStatus.outOfStockProducts)}
              </strong>
            </div>

            {/* HIDDEN */}

            <div className="adm-dashboard-stock__item">
              <div className="adm-dashboard-stock__left">
                <span className="adm-dashboard-stock__icon adm-dashboard-stock__icon--neutral">
                  <i className="bi bi-eye-slash-fill" />
                </span>

                <div>
                  <strong>Tạm ẩn</strong>

                  <span>Không hiển thị bán</span>
                </div>
              </div>

              <strong className="adm-dashboard-stock__value adm-dashboard-stock__value--neutral">
                {formatNumber(inventoryStatus.hiddenProducts)}
              </strong>
            </div>
          </div>
        </section>
      </div>

      {/* ===================================================
          RECENT ORDERS
          =================================================== */}

      <section className="adm-dashboard-panel adm-dashboard-panel--orders">
        <div className="adm-dashboard-panel__header">
          <div className="adm-dashboard-panel__heading">
            <span className="adm-dashboard-panel__icon adm-dashboard-panel__icon--purple">
              <i className="bi bi-receipt" />
            </span>

            <div>
              <h2>Đơn hàng gần đây</h2>

              <p>
                Đơn vừa thay đổi trạng thái sẽ được ưu tiên hiển thị lên đầu.
              </p>
            </div>
          </div>

          <button
            className="adm-dashboard-button adm-dashboard-button--secondary"
            type="button"
            onClick={() => navigate("/admin/orders")}
          >
            <span>Xem tất cả</span>

            <i className="bi bi-arrow-right" />
          </button>
        </div>

        <div className="adm-dashboard-table-wrap">
          <table className="adm-dashboard-table">
            <thead>
              <tr>
                <th>Mã đơn</th>

                <th>Khách hàng</th>

                <th>Sản phẩm</th>

                <th>Tổng tiền</th>

                <th>Trạng thái</th>
              </tr>
            </thead>

            <tbody>
              {sortedRecentOrders.length === 0 ? (
                <tr>
                  <td colSpan="5" className="adm-dashboard-table__empty">
                    <i className="bi bi-inbox" />

                    <span>Chưa có đơn hàng nào.</span>
                  </td>
                </tr>
              ) : (
                sortedRecentOrders.map((order) => {
                  const statusMeta = getOrderStatusMeta(order.orderStatus);

                  return (
                    <tr key={order.id}>
                      <td>
                        <span
                          className="adm-dashboard-table__order-code"
                          title={`#${order.orderCode}`}
                        >
                          #{order.orderCode}
                        </span>
                      </td>

                      <td title={order.customerName || "Khách hàng"}>
                        <div className="adm-dashboard-table__customer">
                          <span className="adm-dashboard-table__customer-avatar">
                            <i className="bi bi-person" />
                          </span>

                          <span>{order.customerName || "Khách hàng"}</span>
                        </div>
                      </td>

                      <td title={order.productSummary || ""}>
                        <span className="adm-dashboard-table__product">
                          {order.productSummary || "Không có thông tin"}
                        </span>
                      </td>

                      <td>
                        <strong className="adm-dashboard-table__price">
                          {formatCurrency(order.totalAmount)}
                        </strong>
                      </td>

                      <td>
                        <span
                          className={`adm-dashboard-status adm-dashboard-status--${statusMeta.type}`}
                        >
                          <i className={`bi ${statusMeta.icon}`} />

                          <span>
                            {order.orderStatusLabel || statusMeta.label}
                          </span>
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default AdminDashboard;
