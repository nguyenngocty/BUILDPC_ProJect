import { useEffect, useState } from "react";

import { Link, useSearchParams } from "react-router-dom";

import Header from "../../components/Header";
import Footer from "../../components/Footer";

import orderService from "../../../services/orderService";

import "./OrderSuccess.css";

const formatMoney = (value) => {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
};

function OrderSuccess() {
  const [searchParams] = useSearchParams();

  const orderId = searchParams.get("order_id");

  const payment = searchParams.get("payment");

  const status = searchParams.get("status");

  const [order, setOrder] = useState(null);

  const [loading, setLoading] = useState(Boolean(orderId));

  const [error, setError] = useState("");

  // ============================================================
  // LOAD ORDER
  // ============================================================

  useEffect(() => {
    if (!orderId) {
      setLoading(false);

      return;
    }

    let cancelled = false;

    const loadOrder = async () => {
      try {
        setLoading(true);

        setError("");

        const response = await orderService.getClientOrderById(orderId);

        if (cancelled) {
          return;
        }

        setOrder(response?.data?.data || null);
      } catch (requestError) {
        if (cancelled) {
          return;
        }

        console.error("Load order success error:", requestError);

        setError(
          requestError?.response?.data?.message ||
            "Không thể tải thông tin đơn hàng.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadOrder();

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  // ============================================================
  // PAYMENT STATES
  // ============================================================

  const isMomo = payment === "momo";

  const momoSuccess = isMomo && status === "success";

  const momoFailed =
    isMomo &&
    ["failed", "error", "invalid-signature", "not-found"].includes(status);

  const isBank = payment === "bank" || order?.payment_method === "bank";

  const isCod = payment === "cod" || order?.payment_method === "cod";

  const bankInfo = order?.bank_info || null;

  // ============================================================
  // TITLE
  // ============================================================

  let title = "Đặt hàng thành công";

  let description =
    "Cảm ơn bạn đã đặt hàng tại BuildPC. Đơn hàng của bạn đang chờ xử lý.";

  let iconClass = "bi-check-circle-fill";

  if (momoSuccess) {
    title = "Thanh toán MoMo thành công";

    description =
      "Giao dịch đã được xác nhận. Đơn hàng đang được BuildPC xử lý.";
  }

  if (momoFailed) {
    title = "Thanh toán MoMo chưa thành công";

    description =
      "Giao dịch đã thất bại hoặc bị hủy. Đơn hàng liên quan đã được hệ thống xử lý lại tồn kho.";

    iconClass = "bi-x-circle-fill";
  }

  return (
    <div className="order-success-page">
      <Header />

      <div className="order-success-container">
        <div className="order-success-card">
          {/* =================================================
              ICON
          ================================================= */}

          <div className="order-success-icon">
            <i className={`bi ${iconClass}`} />
          </div>

          <h1>{title}</h1>

          <p>{description}</p>

          {/* =================================================
              LOADING
          ================================================= */}

          {loading && (
            <div className="payment-guide-box">
              <p>Đang tải thông tin đơn hàng...</p>
            </div>
          )}

          {/* =================================================
              ERROR
          ================================================= */}

          {!loading && error && (
            <div className="payment-guide-box">
              <p>{error}</p>
            </div>
          )}

          {/* =================================================
              ORDER
          ================================================= */}

          {order && (
            <>
              <div className="order-code-box">
                <span>Mã đơn hàng</span>

                <strong>{order.order_code || `#${order.id}`}</strong>
              </div>

              <div className="payment-guide-box">
                <div className="bank-info">
                  <div>
                    <span>Tổng thanh toán</span>

                    <strong>{formatMoney(order.total_amount)}</strong>
                  </div>

                  <div>
                    <span>Phương thức</span>

                    <strong>
                      {order.payment_method === "momo"
                        ? "MoMo"
                        : order.payment_method === "bank"
                          ? "Chuyển khoản"
                          : "COD"}
                    </strong>
                  </div>

                  <div>
                    <span>Trạng thái đơn</span>

                    <strong>{order.status || "PENDING"}</strong>
                  </div>

                  <div>
                    <span>Thanh toán</span>

                    <strong>
                      {Number(order.payment_status || 0) === 1
                        ? "Đã thanh toán"
                        : "Chưa thanh toán"}
                    </strong>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* =================================================
              BANK
          ================================================= */}

          {isBank && !momoFailed && (
            <div className="payment-guide-box">
              <h2>Thông tin chuyển khoản</h2>

              <div className="bank-info">
                <div>
                  <span>Ngân hàng</span>

                  <strong>{bankInfo?.bank_name || "Đang cập nhật"}</strong>
                </div>

                <div>
                  <span>Số tài khoản</span>

                  <strong>{bankInfo?.account_number || "Đang cập nhật"}</strong>
                </div>

                <div>
                  <span>Chủ tài khoản</span>

                  <strong>{bankInfo?.account_name || "BUILDPC"}</strong>
                </div>

                {bankInfo?.branch && (
                  <div>
                    <span>Chi nhánh</span>

                    <strong>{bankInfo.branch}</strong>
                  </div>
                )}

                <div>
                  <span>Nội dung chuyển khoản</span>

                  <strong>{order?.order_code || `DH${orderId || ""}`}</strong>
                </div>

                {order && (
                  <div>
                    <span>Số tiền</span>

                    <strong>{formatMoney(order.total_amount)}</strong>
                  </div>
                )}
              </div>

              <p className="payment-note">
                Vui lòng nhập chính xác nội dung chuyển khoản để quản trị viên
                có thể xác nhận đơn hàng nhanh chóng.
              </p>
            </div>
          )}

          {/* =================================================
              COD
          ================================================= */}

          {isCod && !momoFailed && (
            <div className="payment-guide-box">
              <h2>Thanh toán khi nhận hàng</h2>

              <p>
                Bạn sẽ thanh toán cho nhân viên giao hàng khi nhận được sản
                phẩm.
              </p>
            </div>
          )}

          {/* =================================================
              MOMO SUCCESS
          ================================================= */}

          {momoSuccess && (
            <div className="payment-guide-box">
              <h2>Giao dịch đã được xác nhận</h2>

              <p>
                Hệ thống đã ghi nhận thanh toán MoMo và chuyển đơn hàng sang
                bước xử lý tiếp theo.
              </p>
            </div>
          )}

          {/* =================================================
              MOMO FAILED
          ================================================= */}

          {momoFailed && (
            <div className="payment-guide-box">
              <h2>Giao dịch không hoàn tất</h2>

              <p>
                Bạn có thể quay lại danh sách sản phẩm để tạo một đơn hàng mới.
              </p>
            </div>
          )}

          {/* =================================================
              ACTIONS
          ================================================= */}

          <div className="order-success-actions">
            {order?.id && (
              <Link
                to={`/account/orders/${order.id}`}
                className="btn-primary-success"
              >
                Xem đơn hàng
              </Link>
            )}

            <Link
              to="/products"
              className={
                order?.id ? "btn-outline-success" : "btn-primary-success"
              }
            >
              Tiếp tục mua hàng
            </Link>

            <Link to="/" className="btn-outline-success">
              Về trang chủ
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default OrderSuccess;
