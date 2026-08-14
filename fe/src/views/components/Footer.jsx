function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-container">
        <div className="footer-grid">
          <div className="footer-col">
            <h4 className="footer-brand">BuildPC</h4>
            <p className="footer-desc">
              Build PC theo ý bạn - Linh kiện chính hãng, giá tốt nhất.
            </p>
          </div>

          <div className="footer-col">
            <h6 className="footer-title">Chính sách</h6>
            <ul className="footer-list">
              <li>Bảo hành</li>
              <li>Đổi trả</li>
              <li>Thanh toán</li>
            </ul>
          </div>

          <div className="footer-col">
            <h6 className="footer-title">Hỗ trợ</h6>
            <ul className="footer-list">
              <li>Tra cứu đơn hàng</li>
              <li>Tư vấn build PC</li>
              <li>Liên hệ</li>
            </ul>
          </div>

          <div className="footer-col">
            <h6 className="footer-title">Nhận ưu đãi</h6>

            <div className="footer-newsletter">
              <input type="email" placeholder="Email của bạn..." />
              <button>Đăng ký</button>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© 2026 BuildPC. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
