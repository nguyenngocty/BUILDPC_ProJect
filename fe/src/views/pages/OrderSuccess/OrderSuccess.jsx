import { Link, useSearchParams } from "react-router-dom";

import "./OrderSuccess.css";

import Header from "../../components/Header";
import Footer from "../../components/Footer";

function OrderSuccess() {
  const [searchParams] = useSearchParams();

  const status = searchParams.get("status");
  const orderId = searchParams.get("order_id");
  const payment = searchParams.get("payment");

  const isQrPayment = payment === "qr";
  const isBankPayment = payment === "bank";

  const isMomoPayment = payment === "momo";
  const isZaloPayPayment = payment === "zalopay";

  const isOnlinePayment = isMomoPayment || isZaloPayPayment;

  const paymentName = isMomoPayment
    ? "MoMo"
    : isZaloPayPayment
      ? "ZaloPay"
      : "";

  const isPaymentSuccess = isOnlinePayment && status === "success";

  const isPaymentFailed =
    isOnlinePayment && ["failed", "error"].includes(status);

  const isPaymentPending = isOnlinePayment && status === "pending";

  const isInvalidSignature = isOnlinePayment && status === "invalid-signature";

  const isNotFound = isOnlinePayment && status === "not-found";

  const getPageState = () => {
    if (isPaymentSuccess) {
      return {
        className: "success",
        icon: "bi-check-circle-fill",
        title: "Thanh toán thành công",
        description: `Giao dịch ${paymentName} đã được xác nhận. Đơn hàng của bạn đang được xử lý.`,
      };
    }

    if (isPaymentPending) {
      return {
        className: "pending",
        icon: "bi-clock-history",
        title: "Đang xác nhận thanh toán",
        description: `Giao dịch ${paymentName} đang được xử lý. Hệ thống chưa nhận được kết quả cuối cùng.`,
      };
    }

    if (isInvalidSignature) {
      return {
        className: "failed",
        icon: "bi-shield-exclamation",
        title: "Không xác thực được giao dịch",
        description: `Thông tin trả về từ ${paymentName} không thể xác thực.`,
      };
    }

    if (isNotFound) {
      return {
        className: "failed",
        icon: "bi-search",
        title: "Không tìm thấy đơn hàng",
        description:
          "Hệ thống không tìm thấy đơn hàng tương ứng với giao dịch này.",
      };
    }

    if (isPaymentFailed) {
      return {
        className: "failed",
        icon: "bi-x-circle-fill",
        title: "Thanh toán chưa thành công",
        description: `Giao dịch ${paymentName} chưa hoàn tất hoặc đã bị hủy.`,
      };
    }

    return {
      className: "success",
      icon: "bi-check-circle-fill",
      title: "Đặt hàng thành công",
      description:
        "Cảm ơn bạn đã đặt hàng tại BuildPC. Đơn hàng của bạn đang chờ xử lý.",
    };
  };

  const pageState = getPageState();

  return (
    <div className="order-success-page">
      <Header />

      <div className="order-success-container">
        <div className={`order-success-card ${pageState.className}`}>
          <div className={`order-success-icon ${pageState.className}`}>
            <i className={`bi ${pageState.icon}`} />
          </div>

          <h1>{pageState.title}</h1>

          <p>{pageState.description}</p>

          {orderId && (
            <div className="order-code-box">
              <span>Mã đơn hàng</span>

              <strong>#{orderId}</strong>
            </div>
          )}

          {/* =========================
              BANK / QR
          ========================= */}

          {(isQrPayment || isBankPayment) && (
            <div className="payment-guide-box">
              <h2>
                {isQrPayment
                  ? "Quét mã QR để thanh toán"
                  : "Thông tin chuyển khoản"}
              </h2>

              {isQrPayment && (
                <div className="payment-qr-box">
                  <img
                    src="/images/payment-qr.png"
                    alt="QR thanh toán"
                    className="payment-qr-img"
                  />
                </div>
              )}

              <div className="bank-info">
                <div>
                  <span>Ngân hàng</span>

                  <strong>MB Bank</strong>
                </div>

                <div>
                  <span>Số tài khoản</span>

                  <strong>0123456789</strong>
                </div>

                <div>
                  <span>Chủ tài khoản</span>

                  <strong>PHAN PHUOC TAN</strong>
                </div>

                <div>
                  <span>Nội dung chuyển khoản</span>

                  <strong>{orderId ? `DH${orderId}` : "Mã đơn hàng"}</strong>
                </div>
              </div>

              <p className="payment-note">
                Sau khi thanh toán, admin sẽ kiểm tra và xác nhận đơn hàng.
              </p>
            </div>
          )}

          {/* =========================
              MOMO
          ========================= */}

          {isMomoPayment && status === "success" && (
            <div className="payment-guide-box payment-result-success">
              <div className="payment-result-icon">
                <i className="bi bi-check-circle-fill" />
              </div>

              <h2>Thanh toán MoMo thành công</h2>

              <p>Đơn hàng của bạn đã được thanh toán và đang được xử lý.</p>
            </div>
          )}

          {isMomoPayment && status === "failed" && (
            <div className="payment-guide-box payment-result-failed">
              <div className="payment-result-icon">
                <i className="bi bi-x-circle-fill" />
              </div>

              <h2>Thanh toán MoMo thất bại</h2>

              <p>Giao dịch chưa hoàn tất hoặc đã bị hủy.</p>
            </div>
          )}

          {isMomoPayment && status === "invalid-signature" && (
            <div className="payment-guide-box payment-result-failed">
              <div className="payment-result-icon">
                <i className="bi bi-shield-exclamation" />
              </div>

              <h2>Không xác thực được giao dịch</h2>

              <p>Chữ ký MoMo không hợp lệ, vui lòng kiểm tra lại.</p>
            </div>
          )}

          {/* =========================
              ZALOPAY
          ========================= */}

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

          {isZaloPayPayment && status === "error" && (
            <div className="payment-guide-box payment-result-failed">
              <div className="payment-result-icon">
                <i className="bi bi-exclamation-triangle-fill" />
              </div>

              <h2>Có lỗi khi xác nhận ZaloPay</h2>

              <p>
                Backend chưa thể xác nhận kết quả giao dịch. Vui lòng kiểm tra
                lại đơn hàng.
              </p>
            </div>
          )}

          <div className="order-success-actions">
            <Link to="/Products" className="btn-primary-success">
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
