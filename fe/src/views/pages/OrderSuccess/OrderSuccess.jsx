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

  return (
    <div className="order-success-page">
      <Header />

      <div className="order-success-container">
        <div className="order-success-card">
          <div className="order-success-icon">
            <i className="bi bi-check-circle-fill"></i>
          </div>

          <h1>Đặt hàng thành công</h1>

          <p>
            Cảm ơn bạn đã đặt hàng tại BuildPC. Đơn hàng của bạn đang chờ xử lý.
          </p>

          {orderId && (
            <div className="order-code-box">
              <span>Mã đơn hàng</span>
              <strong>#{orderId}</strong>
            </div>
          )}

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

          {payment === "momo" && status === "success" && (
            <div className="payment-guide-box">
              <h2>Thanh toán MoMo thành công</h2>
              <p>Đơn hàng của bạn đã được thanh toán và đang được xử lý.</p>
            </div>
          )}

          {payment === "momo" && status === "failed" && (
            <div className="payment-guide-box">
              <h2>Thanh toán MoMo thất bại</h2>
              <p>Giao dịch chưa hoàn tất hoặc đã bị hủy.</p>
            </div>
          )}

          {payment === "momo" && status === "invalid-signature" && (
            <div className="payment-guide-box">
              <h2>Không xác thực được giao dịch</h2>
              <p>Chữ ký MoMo không hợp lệ, vui lòng kiểm tra lại.</p>
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
