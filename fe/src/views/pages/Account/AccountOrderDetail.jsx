import { useCallback, useEffect, useMemo, useState } from "react";

import { Link, useNavigate, useParams } from "react-router-dom";

import toast from "react-hot-toast";

import {
  cancelClientOrder,
  getClientOrderById,
} from "../../../controllers/orderController";

import { getOrderReviewItems } from "../../../services/commentService";

import {
  formatOrderCurrency,
  formatOrderDateTime,
  getPaymentMethodLabel,
  getPaymentStatusMeta,
  resolveOrderImageUrl,
} from "../../../models/OrderModel";

import CancelOrderModal from "../../components/Account/CancelOrderModal";
import OrderStatusBadge from "../../components/Account/OrderStatusBadge";

import "./AccountOrders.css";

function AccountOrderDetail() {
  const { id } = useParams();

  const navigate = useNavigate();

  // ==========================================================
  // ORDER
  // ==========================================================

  const [order, setOrder] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  // ==========================================================
  // REVIEW STATUS
  // ==========================================================

  const [reviewData, setReviewData] = useState({
    order: null,

    items: [],
  });

  const [reviewLoading, setReviewLoading] = useState(false);

  const [reviewError, setReviewError] = useState("");

  // ==========================================================
  // CANCEL
  // ==========================================================

  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  const [cancelling, setCancelling] = useState(false);

  // ==========================================================
  // LOAD ORDER
  // ==========================================================

  const loadOrder = useCallback(async () => {
    setLoading(true);

    setError("");

    try {
      const result = await getClientOrderById(id);

      setOrder(result);
    } catch (loadError) {
      setOrder(null);

      setError(loadError?.message || "Không thể tải chi tiết đơn hàng.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  // ==========================================================
  // LOAD REVIEW STATUS
  // ==========================================================

  const loadReviewStatus = useCallback(async () => {
    if (!id) {
      return;
    }

    try {
      setReviewLoading(true);

      setReviewError("");

      const response = await getOrderReviewItems(id);

      const data = response?.data?.data || {
        order: null,

        items: [],
      };

      setReviewData({
        order: data.order || null,

        items: Array.isArray(data.items) ? data.items : [],
      });
    } catch (loadError) {
      console.error("Load order review status:", loadError);

      setReviewData({
        order: null,

        items: [],
      });

      setReviewError(
        loadError?.response?.data?.message ||
          "Không thể kiểm tra trạng thái đánh giá.",
      );
    } finally {
      setReviewLoading(false);
    }
  }, [id]);

  // ==========================================================
  // INIT
  // ==========================================================

  useEffect(() => {
    loadOrder();

    loadReviewStatus();
  }, [loadOrder, loadReviewStatus]);

  // Khi user đi đánh giá rồi quay lại tab này,
  // tự cập nhật trạng thái.
  useEffect(() => {
    const handleFocus = () => {
      loadReviewStatus();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [loadReviewStatus]);

  // ==========================================================
  // REVIEW MAP
  // ==========================================================

  const reviewMap = useMemo(() => {
    const map = new Map();

    for (const item of reviewData.items || []) {
      map.set(
        Number(item.order_item_id),

        item,
      );
    }

    return map;
  }, [reviewData.items]);

  // ==========================================================
  // ITEM SUBTOTAL
  // ==========================================================

  const itemSubtotal = useMemo(() => {
    if (!order?.items) {
      return 0;
    }

    return order.items.reduce(
      (sum, item) => sum + Number(item.total_price || 0),
      0,
    );
  }, [order]);

  // ==========================================================
  // CANCEL
  // ==========================================================

  const handleCancelOrder = async (reason) => {
    if (!order) {
      return;
    }

    try {
      setCancelling(true);

      const result = await cancelClientOrder(order.id, reason);

      setOrder(result.order);

      setCancelModalOpen(false);

      toast.success(result.message);

      await loadReviewStatus();
    } catch (cancelError) {
      toast.error(cancelError?.message || "Không thể hủy đơn hàng.");
    } finally {
      setCancelling(false);
    }
  };

  // ==========================================================
  // REORDER
  // ==========================================================

  const handleReorder = () => {
    if (!order) {
      return;
    }

    navigate(`/checkout/reorder/${order.id}`);
  };

  // ==========================================================
  // GO REVIEW
  // ==========================================================

  const handleGoToReview = (reviewItem) => {
    if (!reviewItem?.review_url) {
      toast.error("Sản phẩm hiện không còn khả dụng.");

      return;
    }

    navigate(reviewItem.review_url);
  };

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <div className="account-orders-loading account-order-detail-loading">
        <i className="bi bi-arrow-repeat" />
        Đang tải chi tiết đơn hàng...
      </div>
    );
  }

  // ==========================================================
  // ERROR
  // ==========================================================

  if (error || !order) {
    return (
      <section className="account-order-detail-page">
        <div className="account-orders-state error">
          <i className="bi bi-exclamation-circle" />

          <strong>Không thể mở đơn hàng</strong>

          <p>{error || "Không tìm thấy đơn hàng."}</p>

          <Link to="/account/orders">Quay lại danh sách</Link>
        </div>
      </section>
    );
  }

  // ==========================================================
  // ORDER META
  // ==========================================================

  const payment = getPaymentStatusMeta(order.payment_status);

  const normalizedStatus = String(order.status || "").toUpperCase();

  const canCancel =
    normalizedStatus === "PENDING" && Number(order.payment_status) !== 1;

  const canReorder = normalizedStatus === "CANCELLED";

  const isCompleted = normalizedStatus === "COMPLETED";

  const pendingReviewCount = reviewData.items.filter(
    (item) => item.can_review,
  ).length;

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <section className="account-order-detail-page">
      <Link className="account-order-back-link" to="/account/orders">
        <i className="bi bi-arrow-left" />
        Quay lại danh sách đơn hàng
      </Link>

      {/* ====================================================
          HEADER
      ==================================================== */}

      <header className="account-order-detail-header">
        <div>
          <span className="account-orders-kicker">Chi tiết đơn hàng</span>

          <h1>{order.order_code}</h1>

          <p>Đặt lúc {formatOrderDateTime(order.created_at)}</p>
        </div>

        <OrderStatusBadge status={order.status} />
      </header>

      {/* ====================================================
          COMPLETED → REVIEW NOTICE
      ==================================================== */}

      {isCompleted && (
        <div className="account-order-detail-actions">
          <div>
            <strong>Đơn hàng đã hoàn thành.</strong>

            <span>
              {reviewLoading
                ? "Đang kiểm tra trạng thái đánh giá..."
                : pendingReviewCount > 0
                  ? `Bạn còn ${pendingReviewCount} sản phẩm có thể đánh giá.`
                  : "Các sản phẩm đủ điều kiện đã được kiểm tra trạng thái đánh giá."}
            </span>

            {reviewError && <span>{reviewError}</span>}
          </div>

          {pendingReviewCount > 0 && (
            <i
              className="bi bi-star-fill"
              style={{
                fontSize: "28px",
              }}
            />
          )}
        </div>
      )}

      {/* ====================================================
          CANCEL / REORDER
      ==================================================== */}

      {(canCancel || canReorder) && (
        <div className="account-order-detail-actions">
          <div>
            <strong>
              {canCancel
                ? "Bạn vẫn có thể hủy đơn hàng này."
                : "Bạn có thể mua lại các sản phẩm của đơn đã hủy."}
            </strong>

            <span>
              {canCancel
                ? "Chỉ đơn đang chờ xác nhận và chưa thanh toán mới được hủy."
                : "Giá bán và tồn kho sẽ được kiểm tra lại theo dữ liệu hiện tại."}
            </span>
          </div>

          {canCancel && (
            <button
              type="button"
              className="account-order-action-button cancel"
              onClick={() => setCancelModalOpen(true)}
            >
              <i className="bi bi-x-circle" />
              Hủy đơn hàng
            </button>
          )}

          {canReorder && (
            <button
              type="button"
              className="account-order-action-button reorder"
              onClick={handleReorder}
            >
              <i className="bi bi-arrow-repeat" />
              Mua lại
            </button>
          )}
        </div>
      )}

      {/* ====================================================
          INFORMATION
      ==================================================== */}

      <div className="account-order-detail-grid">
        <article className="account-order-detail-card">
          <div className="account-order-detail-card-title">
            <i className="bi bi-geo-alt-fill" />

            <div>
              <h2>Thông tin nhận hàng</h2>

              <p>Địa chỉ và người nhận</p>
            </div>
          </div>

          <dl className="account-order-info-list">
            <div>
              <dt>Người nhận</dt>

              <dd>{order.shipping_name}</dd>
            </div>

            <div>
              <dt>Số điện thoại</dt>

              <dd>{order.shipping_phone}</dd>
            </div>

            <div>
              <dt>Email</dt>

              <dd>{order.shipping_email || "--"}</dd>
            </div>

            <div>
              <dt>Địa chỉ</dt>

              <dd>{order.shipping_address}</dd>
            </div>
          </dl>
        </article>

        <article className="account-order-detail-card">
          <div className="account-order-detail-card-title">
            <i className="bi bi-credit-card-fill" />

            <div>
              <h2>Thông tin thanh toán</h2>

              <p>Phương thức và trạng thái</p>
            </div>
          </div>

          <dl className="account-order-info-list">
            <div>
              <dt>Phương thức</dt>

              <dd>{getPaymentMethodLabel(order.payment_method)}</dd>
            </div>

            <div>
              <dt>Trạng thái</dt>

              <dd>
                <span className={`account-payment-state ${payment.className}`}>
                  {payment.label}
                </span>
              </dd>
            </div>

            <div>
              <dt>Mã giao dịch</dt>

              <dd>{order.transaction_code || "--"}</dd>
            </div>

            <div>
              <dt>Thời gian thanh toán</dt>

              <dd>
                {order.paid_at ? formatOrderDateTime(order.paid_at) : "--"}
              </dd>
            </div>
          </dl>
        </article>
      </div>

      {/* ====================================================
          PRODUCTS
      ==================================================== */}

      <article className="account-order-products-card">
        <div className="account-order-products-heading">
          <div>
            <h2>Sản phẩm trong đơn</h2>

            <p>{order.items.length} dòng sản phẩm</p>
          </div>
        </div>

        <div className="account-order-products-list">
          {order.items.map((item) => {
            const imageUrl = resolveOrderImageUrl(item.product_image);

            const reviewItem = reviewMap.get(Number(item.id)) || null;

            return (
              <div className="account-order-product" key={item.id}>
                {/* IMAGE */}

                <div className="account-order-product-image">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={item.product_name}
                      onError={(event) => {
                        event.currentTarget.style.display = "none";

                        event.currentTarget.nextElementSibling?.removeAttribute(
                          "hidden",
                        );
                      }}
                    />
                  ) : null}

                  <span hidden={Boolean(imageUrl)}>
                    <i className="bi bi-image" />
                  </span>
                </div>

                {/* INFO */}

                <div className="account-order-product-info">
                  <strong>{item.product_name}</strong>

                  {item.variant_name && (
                    <small>Phiên bản: {item.variant_name}</small>
                  )}

                  <small>Đơn giá: {formatOrderCurrency(item.price)}</small>

                  {/* =====================================
                        REVIEW ACTION
                    ===================================== */}

                  {isCompleted && !reviewLoading && reviewItem && (
                    <div
                      style={{
                        display: "flex",

                        alignItems: "center",

                        flexWrap: "wrap",

                        gap: "8px",

                        marginTop: "10px",
                      }}
                    >
                      {reviewItem.can_review && (
                        <button
                          type="button"
                          className="account-order-action-button reorder"
                          onClick={() => handleGoToReview(reviewItem)}
                        >
                          <i className="bi bi-star" />
                          Đánh giá sản phẩm
                        </button>
                      )}

                      {reviewItem.has_review && (
                        <>
                          <button
                            type="button"
                            className="account-order-action-button reorder"
                            onClick={() => handleGoToReview(reviewItem)}
                          >
                            <i className="bi bi-pencil-square" />
                            Xem / sửa đánh giá
                          </button>

                          <span
                            style={{
                              display: "inline-flex",

                              alignItems: "center",

                              gap: "3px",
                            }}
                          >
                            {[1, 2, 3, 4, 5].map((star) => (
                              <i
                                key={star}
                                className={`bi ${
                                  star <= Number(reviewItem.review_rating || 0)
                                    ? "bi-star-fill"
                                    : "bi-star"
                                }`}
                                style={{
                                  color: "#f59e0b",
                                }}
                              />
                            ))}
                          </span>
                        </>
                      )}

                      {!reviewItem.product_slug && (
                        <small>Sản phẩm hiện không còn hiển thị.</small>
                      )}
                    </div>
                  )}
                </div>

                {/* QUANTITY */}

                <div className="account-order-product-quantity">
                  <span>Số lượng</span>

                  <strong>{item.quantity}</strong>
                </div>

                {/* TOTAL */}

                <div className="account-order-product-total">
                  <span>Thành tiền</span>

                  <strong>{formatOrderCurrency(item.total_price)}</strong>
                </div>
              </div>
            );
          })}
        </div>

        {/* SUMMARY */}

        <div className="account-order-summary">
          <div>
            <span>Tạm tính sản phẩm</span>

            <strong>{formatOrderCurrency(itemSubtotal)}</strong>
          </div>

          <div className="grand-total">
            <span>Tổng giá trị đơn hàng</span>

            <strong>{formatOrderCurrency(order.total_amount)}</strong>
          </div>
        </div>
      </article>

      {/* ====================================================
          NOTE
      ==================================================== */}

      {order.note && (
        <article className="account-order-note-card">
          <i className="bi bi-chat-left-text-fill" />

          <div>
            <h2>Ghi chú đơn hàng</h2>

            <p>{order.note}</p>
          </div>
        </article>
      )}

      {/* ====================================================
          CANCEL INFO
      ==================================================== */}

      {normalizedStatus === "CANCELLED" && order.cancel_reason && (
        <article className="account-order-cancelled-card">
          <i className="bi bi-x-octagon-fill" />

          <div>
            <h2>Thông tin hủy đơn</h2>

            <p>{order.cancel_reason}</p>

            {order.cancelled_at && (
              <small>Hủy lúc {formatOrderDateTime(order.cancelled_at)}</small>
            )}
          </div>
        </article>
      )}

      {/* ====================================================
          CANCEL MODAL
      ==================================================== */}

      <CancelOrderModal
        isOpen={cancelModalOpen}
        order={order}
        loading={cancelling}
        onClose={() => {
          if (!cancelling) {
            setCancelModalOpen(false);
          }
        }}
        onConfirm={handleCancelOrder}
      />
    </section>
  );
}

export default AccountOrderDetail;
