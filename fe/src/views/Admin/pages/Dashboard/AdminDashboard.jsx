import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";

import dashboardService from "../../../../services/admin/dashboardService";

const RANGE_LABELS = {
  "7d": "7 ngày",
  "30d": "30 ngày",
  "90d": "90 ngày",
};

function formatCurrency(value) {
  return `${new Intl.NumberFormat("vi-VN").format(
    Number(value || 0)
  )}đ`;
}

function formatNumber(value) {
  return new Intl.NumberFormat("vi-VN").format(Number(value || 0));
}

function getComparisonData(percent, label, emptyMessage) {
  if (percent === null || percent === undefined) {
    return {
      className: "up",
      icon: "bi-dash-circle",
      text: emptyMessage,
    };
  }

  const numberPercent = Number(percent);
  const isNegative = numberPercent < 0;

  return {
    className: isNegative ? "down" : "up",
    icon: isNegative ? "bi-arrow-down" : "bi-arrow-up",
    text: `${numberPercent > 0 ? "+" : ""}${numberPercent}% ${label}`,
  };
}

function getOrderStatusMeta(status) {
  const normalizedStatus = String(status || "").toUpperCase();

  const statusMap = {
    COMPLETED: {
      className: "paid",
      icon: "bi-check-circle-fill",
      label: "Hoàn thành",
    },

    CANCELLED: {
      className: "cancel",
      icon: "bi-x-circle-fill",
      label: "Đã hủy",
    },

    PENDING: {
      className: "pending",
      icon: "bi-hourglass-split",
      label: "Chờ xử lý",
    },

    CONFIRMED: {
      className: "pending",
      icon: "bi-check2-circle",
      label: "Đã xác nhận",
    },

    PROCESSING: {
      className: "pending",
      icon: "bi-arrow-repeat",
      label: "Đang xử lý",
    },

    SHIPPING: {
      className: "pending",
      icon: "bi-truck",
      label: "Đang giao hàng",
    },
  };

  return (
    statusMap[normalizedStatus] || {
      className: "pending",
      icon: "bi-info-circle-fill",
      label: normalizedStatus || "Không xác định",
    }
  );
}

function shouldShowChartLabel(index, totalItems) {
  if (totalItems <= 7) {
    return true;
  }

  if (totalItems <= 30) {
    return index % 5 === 0 || index === totalItems - 1;
  }

  return index % 15 === 0 || index === totalItems - 1;
}

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

function AdminDashboard() {
  const navigate = useNavigate();

  const [range, setRange] = useState("7d");
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboard = useCallback(
    async (signal) => {
      try {
        setLoading(true);
        setError("");

        const response = await dashboardService.getSummary(range, signal);

        if (!response?.success) {
          throw new Error(
            response?.message || "Không thể lấy dữ liệu Dashboard."
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
            "Không thể kết nối đến máy chủ."
        );
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [range]
  );

  useEffect(() => {
    const controller = new AbortController();

    fetchDashboard(controller.signal);

    return () => {
      controller.abort();
    };
  }, [fetchDashboard]);

  const summary = dashboardData?.summary || {};
  const revenue = summary.revenue || {};
  const orders = summary.orders || {};
  const customers = summary.customers || {};
  const products = summary.products || {};

  const inventoryStatus = dashboardData?.inventoryStatus || {};
  const recentOrders = dashboardData?.recentOrders || [];
  const revenueChart = dashboardData?.revenueChart || [];

  /*
   * Đơn hàng nào vừa được cập nhật trạng thái
   * sẽ được đưa lên đầu danh sách.
   */
  const sortedRecentOrders = useMemo(() => {
    return [...recentOrders].sort((a, b) => {
      const timeA = getOrderUpdateTime(a);
      const timeB = getOrderUpdateTime(b);

      if (timeA !== timeB) {
        return timeB - timeA;
      }

      /*
       * Nếu thời gian bằng nhau hoặc backend chưa trả updatedAt,
       * ưu tiên đơn có id lớn hơn.
       */
      return Number(b?.id || 0) - Number(a?.id || 0);
    });
  }, [recentOrders]);

  const maximumRevenue = useMemo(() => {
    return Math.max(
      1,
      ...revenueChart.map((item) => Number(item.revenue || 0))
    );
  }, [revenueChart]);

  const chartMinWidth = useMemo(() => {
    if (revenueChart.length <= 7) {
      return "100%";
    }

    return `${revenueChart.length * 58}px`;
  }, [revenueChart.length]);

  const revenueComparison = getComparisonData(
    revenue.comparisonPercent,
    revenue.comparisonLabel,
    "Chưa có dữ liệu tháng trước"
  );

  const orderComparison = getComparisonData(
    orders.comparisonPercent,
    orders.comparisonLabel,
    "Chưa có dữ liệu kỳ trước"
  );

  if (loading && !dashboardData) {
    return (
      <section className="admin-panel dashboard-state">
        <div className="dashboard-state__icon">
          <i className="bi bi-arrow-repeat" />
        </div>

        <h2>Đang tải Dashboard</h2>
        <p>Hệ thống đang lấy dữ liệu từ máy chủ...</p>
      </section>
    );
  }

  if (error && !dashboardData) {
    return (
      <section className="admin-panel dashboard-state dashboard-state--error">
        <div className="dashboard-state__icon">
          <i className="bi bi-exclamation-triangle-fill" />
        </div>

        <h2>Không thể tải Dashboard</h2>

        <p>{error}</p>

        <button
          className="primary-action"
          type="button"
          onClick={() => fetchDashboard()}
        >
          <i className="bi bi-arrow-clockwise" /> Thử lại
        </button>
      </section>
    );
  }

  return (
    <>
      <section className="dashboard-heading">
        <div>
          <span className="page-kicker">Dashboard</span>

          <h1>
            <i className="bi bi-speedometer2" /> Tổng quan hệ thống
          </h1>

          <p>
            Theo dõi nhanh doanh thu, đơn hàng và tình trạng sản phẩm.
          </p>
        </div>

        <button
          className="primary-action"
          type="button"
          onClick={() => navigate("/admin/products")}
        >
          <i className="bi bi-plus-circle" /> Tạo sản phẩm
        </button>
      </section>

      {error && (
        <div className="dashboard-warning">
          <span>
            <i className="bi bi-exclamation-circle" /> {error}
          </span>

          <button
            type="button"
            onClick={() => fetchDashboard()}
          >
            Tải lại
          </button>
        </div>
      )}

      <section
        className="stats-grid"
        aria-label="Chỉ số nhanh"
      >
        <article className="stat-card">
          <div className="stat-icon">
            <i className="bi bi-cash-stack" />
          </div>

          <span>Doanh thu</span>

          <strong>{formatCurrency(revenue.value)}</strong>

          <small className={revenueComparison.className}>
            <i className={`bi ${revenueComparison.icon}`} />{" "}
            {revenueComparison.text}
          </small>
        </article>

        <article className="stat-card">
          <div className="stat-icon">
            <i className="bi bi-cart-check" />
          </div>

          <span>Đơn hàng</span>

          <strong>{formatNumber(orders.value)}</strong>

          <small className={orderComparison.className}>
            <i className={`bi ${orderComparison.icon}`} />{" "}
            {orderComparison.text}
          </small>
        </article>

        <article className="stat-card">
          <div className="stat-icon">
            <i className="bi bi-people-fill" />
          </div>

          <span>Khách hàng</span>

          <strong>{formatNumber(customers.value)}</strong>

          <small className="up">
            <i className="bi bi-person-plus" /> +
            {formatNumber(customers.newCustomersLast30Days)} tài khoản mới
          </small>
        </article>

        <article className="stat-card">
          <div className="stat-icon">
            <i className="bi bi-exclamation-triangle-fill" />
          </div>

          <span>Sản phẩm cần chú ý</span>

          <strong>
            {formatNumber(products.needAttentionProducts)}
          </strong>

          <small className="down">
            <i className="bi bi-exclamation-circle" />{" "}
            {products.outOfStockProducts || 0} hết hàng,{" "}
            {products.lowStockProducts || 0} sắp hết
          </small>
        </article>
      </section>

      <div className="dashboard-grid">
        <section className="admin-panel revenue-panel">
          <div className="panel-head">
            <div>
              <h2>
                <i className="bi bi-graph-up-arrow" /> Doanh thu{" "}
                {RANGE_LABELS[range]}
              </h2>

              <p>
                Doanh thu từ các đơn hàng đã hoàn thành trong{" "}
                {RANGE_LABELS[range]} gần nhất.
              </p>
            </div>

            <select
              aria-label="Lọc doanh thu"
              value={range}
              disabled={loading}
              onChange={(event) => setRange(event.target.value)}
            >
              <option value="7d">7 ngày</option>
              <option value="30d">30 ngày</option>
              <option value="90d">90 ngày</option>
            </select>
          </div>

          {revenueChart.length === 0 ? (
            <div className="dashboard-empty">
              <i className="bi bi-bar-chart" />

              <p>Chưa có dữ liệu doanh thu.</p>
            </div>
          ) : (
            <div className="bar-chart-scroll">
              <div
                className="bar-chart"
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
                          Math.round(
                            (itemRevenue / maximumRevenue) * 100
                          )
                        );

                  return (
                    <div
                      key={item.date}
                      className="bar-chart-item"
                      style={{
                        "--value": barValue,
                      }}
                      title={`${item.label}: ${formatCurrency(
                        itemRevenue
                      )} - ${item.orderCount || 0} đơn`}
                    >
                      {shouldShowChartLabel(
                        index,
                        revenueChart.length
                      ) && (
                        <span>{item.label}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <section className="admin-panel">
          <div className="panel-head">
            <div>
              <h2>
                <i className="bi bi-boxes" /> Trạng thái kho
              </h2>

              <p>Các nhóm sản phẩm cần chú ý.</p>
            </div>
          </div>

          <div className="stock-list">
            <div>
              <span>
                <i className="bi bi-check-circle-fill text-success" />{" "}
                Còn hàng
              </span>

              <strong>
                {formatNumber(inventoryStatus.inStockProducts)}
              </strong>
            </div>

            <div>
              <span>
                <i className="bi bi-exclamation-circle-fill text-warning" />{" "}
                Sắp hết
              </span>

              <strong>
                {formatNumber(inventoryStatus.lowStockProducts)}
              </strong>
            </div>

            <div>
              <span>
                <i className="bi bi-x-octagon-fill text-danger" />{" "}
                Hết hàng
              </span>

              <strong>
                {formatNumber(inventoryStatus.outOfStockProducts)}
              </strong>
            </div>

            <div>
              <span>
                <i className="bi bi-pause-circle-fill text-secondary" />{" "}
                Tạm ẩn
              </span>

              <strong>
                {formatNumber(inventoryStatus.hiddenProducts)}
              </strong>
            </div>
          </div>
        </section>
      </div>

      <section className="admin-panel">
        <div className="panel-head">
          <div>
            <h2>
              <i className="bi bi-receipt" /> Đơn hàng gần đây
            </h2>

            <p>
              Đơn vừa thay đổi trạng thái sẽ được ưu tiên hiển thị lên đầu.
            </p>
          </div>

          <button
            className="ghost-action"
            type="button"
            onClick={() => navigate("/admin/orders")}
          >
            <i className="bi bi-arrow-right-circle" /> Xem tất cả
          </button>
        </div>

        <div className="table-responsive">
          <table className="admin-table">
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
                  <td
                    colSpan="5"
                    className="admin-table-empty"
                  >
                    Chưa có đơn hàng nào.
                  </td>
                </tr>
              ) : (
                sortedRecentOrders.map((order) => {
                  const statusMeta = getOrderStatusMeta(
                    order.orderStatus
                  );

                  return (
                    <tr key={order.id}>
                      <td title={`#${order.orderCode}`}>
                        #{order.orderCode}
                      </td>

                      <td
                        title={
                          order.customerName ||
                          "Khách hàng"
                        }
                      >
                        {order.customerName ||
                          "Khách hàng"}
                      </td>

                      <td
                        title={
                          order.productSummary ||
                          ""
                        }
                      >
                        {order.productSummary}
                      </td>

                      <td
                        title={formatCurrency(
                          order.totalAmount
                        )}
                      >
                        {formatCurrency(
                          order.totalAmount
                        )}
                      </td>

                      <td>
                        <span
                          className={`status ${statusMeta.className}`}
                        >
                          <i
                            className={`bi ${statusMeta.icon}`}
                          />

                          {order.orderStatusLabel ||
                            statusMeta.label}
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
    </>
  );
}

export default AdminDashboard;