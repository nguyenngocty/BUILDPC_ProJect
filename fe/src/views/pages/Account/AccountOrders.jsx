import { useEffect, useMemo, useState } from "react";

import { Link, useNavigate, useSearchParams } from "react-router-dom";

import toast from "react-hot-toast";

import {
  cancelClientOrder,
  getClientOrders,
} from "../../../controllers/orderController";

import {
  formatOrderCurrency,
  formatOrderDateTime,
  getPaymentMethodLabel,
  getPaymentStatusMeta,
  ORDER_STATUS_OPTIONS,
} from "../../../models/OrderModel";

import CancelOrderModal from "../../components/Account/CancelOrderModal";
import OrderPagination from "../../components/Account/OrderPagination";
import OrderStatusBadge from "../../components/Account/OrderStatusBadge";

import "./AccountOrders.css";

function AccountOrders() {
  const navigate = useNavigate();

  const [searchParams, setSearchParams] = useSearchParams();

  const page = Math.max(Number.parseInt(searchParams.get("page"), 10) || 1, 1);

  const status = searchParams.get("status") || "";

  const search = searchParams.get("search") || "";

  const [searchInput, setSearchInput] = useState(search);

  const [orders, setOrders] = useState([]);

  const [pagination, setPagination] = useState({
    page: 1,

    limit: 10,

    totalItems: 0,

    totalPages: 0,

    hasPreviousPage: false,

    hasNextPage: false,
  });

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [reloadKey, setReloadKey] = useState(0);

  const [selectedOrder, setSelectedOrder] = useState(null);

  const [cancelling, setCancelling] = useState(false);

  // ==========================================================
  // SEARCH SYNC
  // ==========================================================

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  // ==========================================================
  // LOAD ORDERS
  // ==========================================================

  useEffect(() => {
    let active = true;

    const loadOrders = async () => {
      setLoading(true);

      setError("");

      try {
        const result = await getClientOrders({
          page,

          limit: 10,

          status,

          search,
        });

        if (!active) {
          return;
        }

        setOrders(result.orders);

        setPagination(result.pagination);

        if (result.pagination.page !== page) {
          setSearchParams(
            {
              ...(status
                ? {
                    status,
                  }
                : {}),

              ...(search
                ? {
                    search,
                  }
                : {}),

              page: String(result.pagination.page),
            },
            {
              replace: true,
            },
          );
        }
      } catch (loadError) {
        if (!active) {
          return;
        }

        setOrders([]);

        setError(loadError?.message || "Không thể tải danh sách đơn hàng.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadOrders();

    return () => {
      active = false;
    };
  }, [page, reloadKey, search, setSearchParams, status]);

  // ==========================================================
  // SUMMARY
  // ==========================================================

  const resultSummary = useMemo(() => {
    if (pagination.totalItems === 0) {
      return "Không có đơn hàng";
    }

    const first = (pagination.page - 1) * pagination.limit + 1;

    const last = Math.min(
      pagination.page * pagination.limit,

      pagination.totalItems,
    );

    return `Hiển thị ${first} - ${last} trong ${pagination.totalItems} đơn hàng`;
  }, [pagination]);

  // ==========================================================
  // QUERY
  // ==========================================================

  const updateQuery = (updates) => {
    const next = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, value]) => {
      const normalized = String(value ?? "").trim();

      if (normalized) {
        next.set(key, normalized);
      } else {
        next.delete(key);
      }
    });

    setSearchParams(next);
  };

  // ==========================================================
  // SEARCH
  // ==========================================================

  const handleSearchSubmit = (event) => {
    event.preventDefault();

    updateQuery({
      search: searchInput.trim(),

      page: 1,
    });
  };

  const handleStatusChange = (event) => {
    updateQuery({
      status: event.target.value,

      page: 1,
    });
  };

  const handleResetFilters = () => {
    setSearchInput("");

    setSearchParams({});
  };

  const handlePageChange = (nextPage) => {
    updateQuery({
      page: nextPage,
    });

    window.scrollTo({
      top: 0,

      behavior: "smooth",
    });
  };

  // ==========================================================
  // CANCEL
  // ==========================================================

  const openCancelModal = (order) => {
    setSelectedOrder(order);
  };

  const closeCancelModal = () => {
    if (cancelling) {
      return;
    }

    setSelectedOrder(null);
  };

  const handleCancelOrder = async (reason) => {
    if (!selectedOrder) {
      return;
    }

    try {
      setCancelling(true);

      const result = await cancelClientOrder(selectedOrder.id, reason);

      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.id === selectedOrder.id
            ? {
                ...order,

                ...result.order,
              }
            : order,
        ),
      );

      setSelectedOrder(null);

      toast.success(result.message);

      setReloadKey((value) => value + 1);
    } catch (cancelError) {
      toast.error(cancelError?.message || "Không thể hủy đơn hàng.");
    } finally {
      setCancelling(false);
    }
  };

  // ==========================================================
  // REORDER
  // ==========================================================

  const handleReorder = (order) => {
    navigate(`/checkout/reorder/${order.id}`);
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <section className="account-orders-page">
      {/* HEADER */}

      <header className="account-orders-header">
        <div>
          <span className="account-orders-kicker">Lịch sử mua hàng</span>

          <h1>Đơn hàng của tôi</h1>

          <p>
            Theo dõi trạng thái, thanh toán và đánh giá sản phẩm sau khi đơn
            hàng hoàn tất.
          </p>
        </div>

        <span className="account-orders-total">
          {pagination.totalItems} đơn hàng
        </span>
      </header>

      {/* TOOLBAR */}

      <div className="account-orders-toolbar">
        <form className="account-orders-search" onSubmit={handleSearchSubmit}>
          <i className="bi bi-search" />

          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Tìm mã đơn, người nhận, số điện thoại..."
            aria-label="Tìm kiếm đơn hàng"
          />

          <button type="submit" disabled={loading}>
            Tìm kiếm
          </button>
        </form>

        <div className="account-orders-filter">
          <label htmlFor="orderStatusFilter">Trạng thái</label>

          <select
            id="orderStatusFilter"
            value={status}
            onChange={handleStatusChange}
            disabled={loading}
          >
            {ORDER_STATUS_OPTIONS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {(status || search) && (
            <button
              type="button"
              className="account-orders-reset"
              onClick={handleResetFilters}
              disabled={loading}
            >
              <i className="bi bi-arrow-counterclockwise" />
              Xóa lọc
            </button>
          )}
        </div>
      </div>

      <div className="account-orders-result-bar">
        <span>{resultSummary}</span>

        {(status || search) && <small>Đang áp dụng bộ lọc</small>}
      </div>

      {/* ERROR */}

      {error && (
        <div className="account-orders-state error" role="alert">
          <i className="bi bi-exclamation-circle" />

          <strong>Không tải được đơn hàng</strong>

          <p>{error}</p>
        </div>
      )}

      {/* LOADING */}

      {!error && loading && (
        <div className="account-orders-loading">
          <i className="bi bi-arrow-repeat" />
          Đang tải danh sách đơn hàng...
        </div>
      )}

      {/* EMPTY */}

      {!error && !loading && orders.length === 0 && (
        <div className="account-orders-state">
          <i className="bi bi-box-seam" />

          <strong>Chưa tìm thấy đơn hàng</strong>

          <p>Thử thay đổi từ khóa hoặc trạng thái đang lọc.</p>

          {status || search ? (
            <button type="button" onClick={handleResetFilters}>
              Xóa bộ lọc
            </button>
          ) : (
            <Link to="/products">Tiếp tục mua sắm</Link>
          )}
        </div>
      )}

      {/* LIST */}

      {!error && !loading && orders.length > 0 && (
        <div className="account-orders-list">
          {orders.map((order) => {
            const payment = getPaymentStatusMeta(order.payment_status);

            const normalizedStatus = String(order.status || "").toUpperCase();

            const canCancel =
              normalizedStatus === "PENDING" &&
              Number(order.payment_status) !== 1;

            const canReorder = normalizedStatus === "CANCELLED";

            const isCompleted = normalizedStatus === "COMPLETED";

            return (
              <article className="account-order-card" key={order.id}>
                <div className="account-order-card-main">
                  <div className="account-order-code">
                    <span>Mã đơn hàng</span>

                    <strong>{order.order_code}</strong>
                  </div>

                  <OrderStatusBadge status={order.status} />

                  <div className="account-order-date">
                    <span>Ngày đặt</span>

                    <strong>{formatOrderDateTime(order.created_at)}</strong>
                  </div>
                </div>

                <div className="account-order-card-details">
                  <div>
                    <span>Sản phẩm</span>

                    <strong>
                      {Number(order.total_quantity || 0)} sản phẩm
                    </strong>
                  </div>

                  <div>
                    <span>Thanh toán</span>

                    <strong>
                      {getPaymentMethodLabel(order.payment_method)}
                    </strong>

                    <small
                      className={`account-payment-state ${payment.className}`}
                    >
                      {payment.label}
                    </small>
                  </div>

                  <div className="account-order-total">
                    <span>Tổng tiền</span>

                    <strong>{formatOrderCurrency(order.total_amount)}</strong>
                  </div>

                  <div className="account-order-card-actions">
                    {canCancel && (
                      <button
                        type="button"
                        className="account-order-action-button cancel"
                        onClick={() => openCancelModal(order)}
                      >
                        <i className="bi bi-x-circle" />
                        Hủy đơn
                      </button>
                    )}

                    {canReorder && (
                      <button
                        type="button"
                        className="account-order-action-button reorder"
                        onClick={() => handleReorder(order)}
                      >
                        <i className="bi bi-arrow-repeat" />
                        Mua lại
                      </button>
                    )}

                    <Link
                      className="account-order-detail-link"
                      to={`/account/orders/${order.id}`}
                    >
                      {isCompleted ? (
                        <>
                          <i className="bi bi-star" />
                          Xem & đánh giá
                        </>
                      ) : (
                        <>
                          Xem chi tiết
                          <i className="bi bi-arrow-right" />
                        </>
                      )}
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <OrderPagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        onPageChange={handlePageChange}
        disabled={loading}
      />

      <CancelOrderModal
        isOpen={Boolean(selectedOrder)}
        order={selectedOrder}
        loading={cancelling}
        onClose={closeCancelModal}
        onConfirm={handleCancelOrder}
      />
    </section>
  );
}

export default AccountOrders;
