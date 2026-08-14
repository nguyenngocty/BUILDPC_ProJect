import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

import toast from "react-hot-toast";

import {
  cancelClientOrder,
  getClientOrderById,
} from "../../../controllers/orderController";

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

  const navigate =
    useNavigate();


  const [
    order,
    setOrder,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    cancelModalOpen,
    setCancelModalOpen,
  ] = useState(false);

  const [
    cancelling,
    setCancelling,
  ] = useState(false);


  const loadOrder =
    useCallback(async () => {
      setLoading(true);
      setError("");

      try {
        const result =
          await getClientOrderById(
            id
          );

        setOrder(result);
      } catch (loadError) {
        setOrder(null);

        setError(
          loadError.message ||
            "Không thể tải chi tiết đơn hàng."
        );
      } finally {
        setLoading(false);
      }
    }, [id]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const itemSubtotal =
    useMemo(() => {
      if (!order?.items) {
        return 0;
      }

      return order.items.reduce(
        (sum, item) =>
          sum +
          Number(
            item.total_price || 0
          ),
        0
      );
    }, [order]);

  const handleCancelOrder =
    async (reason) => {
      if (!order) {
        return;
      }

      try {
        setCancelling(true);

        const result =
          await cancelClientOrder(
            order.id,
            reason
          );

        setOrder(
          result.order
        );

        setCancelModalOpen(false);

        toast.success(
          result.message
        );
      } catch (cancelError) {
        toast.error(
          cancelError.message ||
            "Không thể hủy đơn hàng."
        );
      } finally {
        setCancelling(false);
      }
    };

  const handleReorder = () => {
    if (!order) {
      return;
    }

    navigate(
      `/checkout/reorder/${order.id}`
    );
  };

  if (loading) {
    return (
      <div className="account-orders-loading account-order-detail-loading">
        <i className="bi bi-arrow-repeat" />
        Đang tải chi tiết đơn hàng...
      </div>
    );
  }

  if (error || !order) {
    return (
      <section className="account-order-detail-page">
        <div className="account-orders-state error">
          <i className="bi bi-exclamation-circle" />

          <strong>
            Không thể mở đơn hàng
          </strong>

          <p>
            {error ||
              "Không tìm thấy đơn hàng."}
          </p>

          <Link to="/account/orders">
            Quay lại danh sách
          </Link>
        </div>
      </section>
    );
  }

  const payment =
    getPaymentStatusMeta(
      order.payment_status
    );

  const normalizedStatus =
    String(
      order.status || ""
    ).toUpperCase();

  const canCancel =
    normalizedStatus ===
      "PENDING" &&
    Number(
      order.payment_status
    ) !== 1;

  const canReorder =
    normalizedStatus ===
    "CANCELLED";

  return (
    <section className="account-order-detail-page">
      <Link
        className="account-order-back-link"
        to="/account/orders"
      >
        <i className="bi bi-arrow-left" />
        Quay lại danh sách đơn hàng
      </Link>

      <header className="account-order-detail-header">
        <div>
          <span className="account-orders-kicker">
            Chi tiết đơn hàng
          </span>

          <h1>
            {order.order_code}
          </h1>

          <p>
            Đặt lúc{" "}
            {formatOrderDateTime(
              order.created_at
            )}
          </p>
        </div>

        <OrderStatusBadge
          status={order.status}
        />
      </header>

      {(canCancel ||
        canReorder) && (
        <div className="account-order-detail-actions">
          <div>
            <strong>
              {canCancel
                ? "Bạn vẫn có thể hủy đơn hàng này."
                : "Bạn có thể thêm lại sản phẩm của đơn đã hủy vào giỏ hàng."}
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
              onClick={() =>
                setCancelModalOpen(
                  true
                )
              }
            >
              <i className="bi bi-x-circle" />
              Hủy đơn hàng
            </button>
          )}

          {canReorder && (
            <button
              type="button"
              className="account-order-action-button reorder"
              onClick={
                handleReorder
              }
            >
              <i className="bi bi-arrow-repeat" />
              Mua lại
            </button>
          )}
        </div>
      )}

      <div className="account-order-detail-grid">
        <article className="account-order-detail-card">
          <div className="account-order-detail-card-title">
            <i className="bi bi-geo-alt-fill" />

            <div>
              <h2>
                Thông tin nhận hàng
              </h2>

              <p>
                Địa chỉ và người nhận
              </p>
            </div>
          </div>

          <dl className="account-order-info-list">
            <div>
              <dt>Người nhận</dt>

              <dd>
                {order.shipping_name}
              </dd>
            </div>

            <div>
              <dt>Số điện thoại</dt>

              <dd>
                {order.shipping_phone}
              </dd>
            </div>

            <div>
              <dt>Email</dt>

              <dd>
                {order.shipping_email ||
                  "--"}
              </dd>
            </div>

            <div>
              <dt>Địa chỉ</dt>

              <dd>
                {order.shipping_address}
              </dd>
            </div>
          </dl>
        </article>

        <article className="account-order-detail-card">
          <div className="account-order-detail-card-title">
            <i className="bi bi-credit-card-fill" />

            <div>
              <h2>
                Thông tin thanh toán
              </h2>

              <p>
                Phương thức và trạng thái
              </p>
            </div>
          </div>

          <dl className="account-order-info-list">
            <div>
              <dt>Phương thức</dt>

              <dd>
                {getPaymentMethodLabel(
                  order.payment_method
                )}
              </dd>
            </div>

            <div>
              <dt>Trạng thái</dt>

              <dd>
                <span
                  className={`account-payment-state ${payment.className}`}
                >
                  {payment.label}
                </span>
              </dd>
            </div>

            <div>
              <dt>Mã giao dịch</dt>

              <dd>
                {order.transaction_code ||
                  "--"}
              </dd>
            </div>

            <div>
              <dt>Thời gian thanh toán</dt>

              <dd>
                {order.paid_at
                  ? formatOrderDateTime(
                      order.paid_at
                    )
                  : "--"}
              </dd>
            </div>
          </dl>
        </article>
      </div>

      <article className="account-order-products-card">
        <div className="account-order-products-heading">
          <div>
            <h2>
              Sản phẩm trong đơn
            </h2>

            <p>
              {order.items.length}
              {" "}
              dòng sản phẩm
            </p>
          </div>
        </div>

        <div className="account-order-products-list">
          {order.items.map(
            (item) => {
              const imageUrl =
                resolveOrderImageUrl(
                  item.product_image
                );

              return (
                <div
                  className="account-order-product"
                  key={item.id}
                >
                  <div className="account-order-product-image">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={
                          item.product_name
                        }
                        onError={(event) => {
                          event.currentTarget.style.display =
                            "none";

                          event.currentTarget
                            .nextElementSibling
                            ?.removeAttribute(
                              "hidden"
                            );
                        }}
                      />
                    ) : null}

                    <span
                      hidden={Boolean(
                        imageUrl
                      )}
                    >
                      <i className="bi bi-image" />
                    </span>
                  </div>

                  <div className="account-order-product-info">
                    <strong>
                      {item.product_name}
                    </strong>

                    <small>
                      Đơn giá:{" "}
                      {formatOrderCurrency(
                        item.price
                      )}
                    </small>
                  </div>

                  <div className="account-order-product-quantity">
                    <span>Số lượng</span>

                    <strong>
                      {item.quantity}
                    </strong>
                  </div>

                  <div className="account-order-product-total">
                    <span>Thành tiền</span>

                    <strong>
                      {formatOrderCurrency(
                        item.total_price
                      )}
                    </strong>
                  </div>
                </div>
              );
            }
          )}
        </div>

        <div className="account-order-summary">
          <div>
            <span>
              Tạm tính sản phẩm
            </span>

            <strong>
              {formatOrderCurrency(
                itemSubtotal
              )}
            </strong>
          </div>

          <div className="grand-total">
            <span>
              Tổng giá trị đơn hàng
            </span>

            <strong>
              {formatOrderCurrency(
                order.total_amount
              )}
            </strong>
          </div>
        </div>
      </article>

      {order.note && (
        <article className="account-order-note-card">
          <i className="bi bi-chat-left-text-fill" />

          <div>
            <h2>
              Ghi chú đơn hàng
            </h2>

            <p>{order.note}</p>
          </div>
        </article>
      )}

      {normalizedStatus ===
        "CANCELLED" &&
        order.cancel_reason && (
          <article className="account-order-cancelled-card">
            <i className="bi bi-x-octagon-fill" />

            <div>
              <h2>
                Thông tin hủy đơn
              </h2>

              <p>
                {order.cancel_reason}
              </p>

              {order.cancelled_at && (
                <small>
                  Hủy lúc{" "}
                  {formatOrderDateTime(
                    order.cancelled_at
                  )}
                </small>
              )}
            </div>
          </article>
        )}

      <CancelOrderModal
        isOpen={
          cancelModalOpen
        }
        order={order}
        loading={cancelling}
        onClose={() => {
          if (!cancelling) {
            setCancelModalOpen(
              false
            );
          }
        }}
        onConfirm={
          handleCancelOrder
        }
      />
    </section>
  );
}

export default AccountOrderDetail;