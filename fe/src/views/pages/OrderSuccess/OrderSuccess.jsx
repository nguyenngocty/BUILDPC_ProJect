import { useEffect, useMemo, useState } from "react";

import { Link, useSearchParams } from "react-router-dom";

import Header from "../../components/Header";
import Footer from "../../components/Footer";

import orderService from "../../../services/orderService";

import "./OrderSuccess.css";

// ============================================================
// HELPERS
// ============================================================

const formatMoney = (value) => {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
};

const normalizePaymentMethod = (value) => {
  return String(value || "")
    .trim()
    .toLowerCase();
};

const normalizeStatus = (value) => {
  return String(value || "")
    .trim()
    .toLowerCase();
};

// ============================================================
// ORDER SUCCESS
// ============================================================

function OrderSuccess() {
  const [searchParams] = useSearchParams();

  // ==========================================================
  // QUERY PARAMS
  // ==========================================================

  const orderId = searchParams.get("order_id");

  const paymentParam = normalizePaymentMethod(searchParams.get("payment"));

  const status = normalizeStatus(searchParams.get("status"));

  // ==========================================================
  // STATE
  // ==========================================================

  const [order, setOrder] = useState(null);

  const [loading, setLoading] = useState(Boolean(orderId));

  const [error, setError] = useState("");

  // ==========================================================
  // LOAD ORDER
  // ==========================================================

  useEffect(() => {
    if (!orderId) {
      setLoading(false);

      return undefined;
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

        const data = response?.data?.data || response?.data || null;

        setOrder(data);
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

  // ==========================================================
  // PAYMENT METHOD
  //
  // Ưu tiên query param khi redirect từ cổng thanh toán.
  // Nếu không có thì dùng dữ liệu Order.
  // ==========================================================

  const paymentMethod = useMemo(() => {
    if (paymentParam) {
      return paymentParam;
    }

    return normalizePaymentMethod(order?.payment_method);
  }, [paymentParam, order?.payment_method]);

  const isMomoPayment = paymentMethod === "momo";

  const isZaloPayPayment = paymentMethod === "zalopay";

  const isBankPayment = paymentMethod === "bank";

  const isCodPayment = paymentMethod === "cod";

  const isOnlinePayment = isMomoPayment || isZaloPayPayment;

  const paymentName = isMomoPayment
    ? "MoMo"
    : isZaloPayPayment
      ? "ZaloPay"
      : "";

  // ==========================================================
  // ONLINE PAYMENT STATES
  // ==========================================================

  const isPaymentSuccess = isOnlinePayment && status === "success";

  const isPaymentFailed =
    isOnlinePayment && ["failed", "error"].includes(status);

  const isPaymentPending = isOnlinePayment && status === "pending";

  const isInvalidSignature = isOnlinePayment && status === "invalid-signature";

  const isNotFound = isOnlinePayment && status === "not-found";

  // ==========================================================
  // PAGE STATE
  // ==========================================================

  const pageState = useMemo(() => {
    // ------------------------------------------------------
    // ONLINE SUCCESS
    // ------------------------------------------------------

    if (isPaymentSuccess) {
      return {
        className: "success",

        icon: "bi-check-circle-fill",

        title: `Thanh toán ${paymentName} thành công`,

        description: `Giao dịch ${paymentName} đã được xác nhận. Đơn hàng của bạn đang được xử lý.`,
      };
    }

    // ------------------------------------------------------
    // ONLINE PENDING
    // ------------------------------------------------------

    if (isPaymentPending) {
      return {
        className: "pending",

        icon: "bi-clock-history",

        title: "Đang xác nhận thanh toán",

        description: `Giao dịch ${paymentName} đang được xử lý. Hệ thống chưa nhận được kết quả cuối cùng.`,
      };
    }

    // ------------------------------------------------------
    // INVALID SIGNATURE
    // ------------------------------------------------------

    if (isInvalidSignature) {
      return {
        className: "failed",

        icon: "bi-shield-exclamation",

        title: "Không xác thực được giao dịch",

        description: `Thông tin trả về từ ${paymentName} không thể xác thực.`,
      };
    }

    // ------------------------------------------------------
    // ORDER NOT FOUND
    // ------------------------------------------------------

    if (isNotFound) {
      return {
        className: "failed",

        icon: "bi-search",

        title: "Không tìm thấy đơn hàng",

        description:
          "Hệ thống không tìm thấy đơn hàng tương ứng với giao dịch này.",
      };
    }

    // ------------------------------------------------------
    // ONLINE FAILED
    // ------------------------------------------------------

    if (isPaymentFailed) {
      return {
        className: "failed",

        icon: "bi-x-circle-fill",

        title: `Thanh toán ${paymentName} chưa thành công`,

        description: `Giao dịch ${paymentName} chưa hoàn tất hoặc đã bị hủy.`,
      };
    }

    // ------------------------------------------------------
    // BANK
    // ------------------------------------------------------

    if (isBankPayment) {
      return {
        className: "success",

        icon: "bi-bank",

        title: "Đặt hàng thành công",

        description:
          "Đơn hàng đã được tạo. Vui lòng thực hiện chuyển khoản theo thông tin bên dưới.",
      };
    }

    // ------------------------------------------------------
    // COD / DEFAULT
    // ------------------------------------------------------

    return {
      className: "success",

      icon: "bi-check-circle-fill",

      title: "Đặt hàng thành công",

      description:
        "Cảm ơn bạn đã đặt hàng tại BuildPC. Đơn hàng của bạn đang chờ xử lý.",
    };
  }, [
    isBankPayment,
    isInvalidSignature,
    isNotFound,
    isPaymentFailed,
    isPaymentPending,
    isPaymentSuccess,
    paymentName,
  ]);

  // ==========================================================
  // BANK INFO
  //
  // Lấy từ Backend.
  // Không hard-code thông tin tài khoản ở FE.
  // ==========================================================

  const bankInfo = order?.bank_info || null;

  // ==========================================================
  // DISPLAY ORDER CODE
  // ==========================================================

  const displayOrderCode =
    order?.order_code || (orderId ? `#${orderId}` : null);

  // ==========================================================
  // PAYMENT METHOD LABEL
  // ==========================================================

  const paymentMethodLabel = useMemo(() => {
    switch (paymentMethod) {
      case "momo":
        return "MoMo";

      case "zalopay":
        return "ZaloPay";

      case "bank":
        return "Chuyển khoản";

      case "cod":
        return "COD";

      default:
        return paymentMethod || "Chưa xác định";
    }
  }, [paymentMethod]);

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="order-success-page">
      <Header />

      <main className="order-success-container">
        <div className={`order-success-card ${pageState.className}`}>
          {/* =================================================
              MAIN ICON
          ================================================= */}

          <div className={`order-success-icon ${pageState.className}`}>
            <i className={`bi ${pageState.icon}`} />
          </div>

          <h1>{pageState.title}</h1>

          <p>{pageState.description}</p>

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
            <div className="payment-guide-box payment-result-failed">
              <div className="payment-result-icon">
                <i className="bi bi-exclamation-triangle-fill" />
              </div>

              <h2>Không thể tải đơn hàng</h2>

              <p>{error}</p>
            </div>
          )}

          {/* =================================================
              ORDER CODE
          ================================================= */}

          {!loading && displayOrderCode && (
            <div className="order-code-box">
              <span>Mã đơn hàng</span>

              <strong>{displayOrderCode}</strong>
            </div>
          )}

          {/* =================================================
              ORDER INFORMATION
          ================================================= */}

          {order && (
            <div className="payment-guide-box">
              <div className="bank-info">
                <div>
                  <span>Tổng thanh toán</span>

                  <strong>{formatMoney(order.total_amount)}</strong>
                </div>

                <div>
                  <span>Phương thức</span>

                  <strong>{paymentMethodLabel}</strong>
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
          )}

          {/* =================================================
              BANK TRANSFER
          ================================================= */}

          {isBankPayment && !isPaymentFailed && (
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

                  <strong>
                    {order?.order_code ||
                      (orderId ? `DH${orderId}` : "Mã đơn hàng")}
                  </strong>
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

          {isCodPayment && (
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

          {isMomoPayment && status === "success" && (
            <div className="payment-guide-box payment-result-success">
              <div className="payment-result-icon">
                <i className="bi bi-check-circle-fill" />
              </div>

              <h2>Thanh toán MoMo thành công</h2>

              <p>
                Hệ thống đã ghi nhận thanh toán MoMo. Đơn hàng của bạn đang được
                xử lý.
              </p>
            </div>
          )}

          {/* =================================================
              MOMO PENDING
          ================================================= */}

          {isMomoPayment && status === "pending" && (
            <div className="payment-guide-box payment-result-pending">
              <div className="payment-result-icon">
                <i className="bi bi-clock-history" />
              </div>

              <h2>MoMo đang xử lý giao dịch</h2>

              <p>
                Hệ thống chưa nhận được kết quả thanh toán cuối cùng. Bạn có thể
                kiểm tra lại trạng thái đơn hàng sau.
              </p>
            </div>
          )}

          {/* =================================================
              MOMO FAILED
          ================================================= */}

          {isMomoPayment && ["failed", "error"].includes(status) && (
            <div className="payment-guide-box payment-result-failed">
              <div className="payment-result-icon">
                <i className="bi bi-x-circle-fill" />
              </div>

              <h2>Thanh toán MoMo thất bại</h2>

              <p>
                Giao dịch chưa hoàn tất hoặc đã bị hủy. Bạn có thể kiểm tra lại
                đơn hàng hoặc thực hiện mua hàng mới.
              </p>
            </div>
          )}

          {/* =================================================
              MOMO INVALID SIGNATURE
          ================================================= */}

          {isMomoPayment && status === "invalid-signature" && (
            <div className="payment-guide-box payment-result-failed">
              <div className="payment-result-icon">
                <i className="bi bi-shield-exclamation" />
              </div>

              <h2>Không xác thực được giao dịch MoMo</h2>

              <p>
                Thông tin trả về từ MoMo không vượt qua bước xác thực chữ ký.
              </p>
            </div>
          )}

          {/* =================================================
              MOMO NOT FOUND
          ================================================= */}

          {isMomoPayment && status === "not-found" && (
            <div className="payment-guide-box payment-result-failed">
              <div className="payment-result-icon">
                <i className="bi bi-search" />
              </div>

              <h2>Không tìm thấy đơn hàng</h2>

              <p>
                Hệ thống không tìm thấy đơn hàng tương ứng với giao dịch MoMo.
              </p>
            </div>
          )}

          {/* =================================================
              ZALOPAY SUCCESS
          ================================================= */}

          {isZaloPayPayment && status === "success" && (
            <div className="payment-guide-box payment-result-success">
              <div className="payment-result-icon zalopay">
                <i className="bi bi-check-circle-fill" />
              </div>

              <h2>Thanh toán ZaloPay thành công</h2>

              <p>
                ZaloPay đã xác nhận giao dịch thành công. Đơn hàng của bạn đang
                được xử lý.
              </p>
            </div>
          )}

          {/* =================================================
              ZALOPAY PENDING
          ================================================= */}

          {isZaloPayPayment && status === "pending" && (
            <div className="payment-guide-box payment-result-pending">
              <div className="payment-result-icon">
                <i className="bi bi-clock-history" />
              </div>

              <h2>ZaloPay đang xử lý giao dịch</h2>

              <p>
                Hệ thống chưa nhận được kết quả cuối cùng từ ZaloPay. Bạn có thể
                kiểm tra lại đơn hàng sau.
              </p>
            </div>
          )}

          {/* =================================================
              ZALOPAY FAILED
          ================================================= */}

          {isZaloPayPayment && status === "failed" && (
            <div className="payment-guide-box payment-result-failed">
              <div className="payment-result-icon">
                <i className="bi bi-x-circle-fill" />
              </div>

              <h2>Thanh toán ZaloPay thất bại</h2>

              <p>
                Giao dịch chưa hoàn tất, đã bị hủy hoặc ZaloPay xác nhận thanh
                toán thất bại.
              </p>
            </div>
          )}

          {/* =================================================
              ZALOPAY INVALID SIGNATURE
          ================================================= */}

          {isZaloPayPayment && status === "invalid-signature" && (
            <div className="payment-guide-box payment-result-failed">
              <div className="payment-result-icon">
                <i className="bi bi-shield-exclamation" />
              </div>

              <h2>Không xác thực được ZaloPay</h2>

              <p>
                Thông tin redirect từ ZaloPay không vượt qua bước xác thực
                checksum.
              </p>
            </div>
          )}

          {/* =================================================
              ZALOPAY NOT FOUND
          ================================================= */}

          {isZaloPayPayment && status === "not-found" && (
            <div className="payment-guide-box payment-result-failed">
              <div className="payment-result-icon">
                <i className="bi bi-search" />
              </div>

              <h2>Không tìm thấy đơn hàng</h2>

              <p>
                Hệ thống không tìm thấy đơn hàng tương ứng với giao dịch
                ZaloPay.
              </p>
            </div>
          )}

          {/* =================================================
              ZALOPAY ERROR
          ================================================= */}

          {isZaloPayPayment && status === "error" && (
            <div className="payment-guide-box payment-result-failed">
              <div className="payment-result-icon">
                <i className="bi bi-exclamation-triangle-fill" />
              </div>

              <h2>Có lỗi khi xác nhận ZaloPay</h2>

              <p>
                Backend chưa thể xác nhận kết quả giao dịch. Vui lòng kiểm tra
                lại trạng thái đơn hàng.
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
      </main>

      <Footer />
    </div>
  );
}

export default OrderSuccess;
