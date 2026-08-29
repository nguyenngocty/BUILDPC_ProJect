import React from "react";

import { Link } from "react-router-dom";

import "./Footer.css";

// ============================================================
// COMPONENT
// ============================================================

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="client-footer">
      {/* ======================================================
          CTA
      ====================================================== */}

      <div className="client-footer-cta">
        <div className="client-footer-container client-footer-cta__inner">
          <div className="client-footer-cta__content">
            <span className="client-footer-cta__icon">
              <i className="bi bi-pc-display-horizontal" />
            </span>

            <div>
              <strong>Chưa biết nên chọn linh kiện nào?</strong>

              <p>
                Sử dụng PC Builder để tự xây dựng cấu hình phù hợp với nhu cầu
                và ngân sách.
              </p>
            </div>
          </div>

          <div className="client-footer-cta__actions">
            <Link to="/build-pc" className="client-footer-cta__primary">
              <i className="bi bi-tools" />
              Bắt đầu Build PC
              <i className="bi bi-arrow-right" />
            </Link>

            <Link to="/contact" className="client-footer-cta__secondary">
              <i className="bi bi-headset" />
              Liên hệ tư vấn
            </Link>
          </div>
        </div>
      </div>

      {/* ======================================================
          MAIN FOOTER
      ====================================================== */}

      <div className="client-footer-main">
        <div className="client-footer-container">
          <div className="client-footer-grid">
            {/* BRAND */}

            <div className="client-footer-brand">
              <Link to="/" className="client-footer-brand__logo">
                <span>
                  <i className="bi bi-cpu-fill" />
                </span>

                <strong>
                  Build<em>PC</em>
                </strong>
              </Link>

              <p>
                Website thương mại điện tử linh kiện máy tính tích hợp công cụ
                xây dựng cấu hình PC, giúp người dùng lựa chọn sản phẩm thuận
                tiện và trực quan.
              </p>

              <div className="client-footer-contact-list">
                <a href="tel:19001234">
                  <span>
                    <i className="bi bi-telephone" />
                  </span>

                  <div>
                    <small>Hotline hỗ trợ</small>

                    <strong>1900 1234</strong>
                  </div>
                </a>

                <Link to="/contact">
                  <span>
                    <i className="bi bi-chat-dots" />
                  </span>

                  <div>
                    <small>Cần hỗ trợ?</small>

                    <strong>Liên hệ BuildPC</strong>
                  </div>
                </Link>
              </div>
            </div>

            {/* PRODUCTS */}

            <div className="client-footer-column">
              <h3>Sản phẩm</h3>

              <nav>
                <Link to="/products?category=cpu">CPU</Link>

                <Link to="/products?category=mainboard">Mainboard</Link>

                <Link to="/products?category=vga">Card đồ họa</Link>

                <Link to="/products?category=ram">RAM</Link>

                <Link to="/products?category=storage">Ổ cứng</Link>

                <Link to="/products">Xem tất cả</Link>
              </nav>
            </div>

            {/* CUSTOMER */}

            <div className="client-footer-column">
              <h3>Khách hàng</h3>

              <nav>
                <Link to="/cart">Giỏ hàng</Link>

                <Link to="/account/orders">Đơn hàng của tôi</Link>

                <Link to="/account/builds">Cấu hình đã lưu</Link>

                <Link to="/build-pc">Build PC</Link>

                <Link to="/contact">Liên hệ hỗ trợ</Link>
              </nav>
            </div>

            {/* INFORMATION */}

            <div className="client-footer-column">
              <h3>Thông tin</h3>

              <nav>
                <Link to="/about">Giới thiệu</Link>

                <Link to="/blog">Tin tức & hướng dẫn</Link>

                <Link to="/contact">Liên hệ</Link>
              </nav>

              <div className="client-footer-service">
                <span>
                  <i className="bi bi-shield-check" />
                </span>

                <div>
                  <strong>Mua hàng thuận tiện</strong>

                  <small>
                    Sản phẩm, biến thể và tồn kho được quản lý trên cùng hệ
                    thống.
                  </small>
                </div>
              </div>
            </div>
          </div>

          {/* ==================================================
              FEATURES
          ================================================== */}

          <div className="client-footer-features">
            <div>
              <span>
                <i className="bi bi-shield-check" />
              </span>

              <div>
                <strong>Thông tin minh bạch</strong>

                <small>Giá và tồn kho sản phẩm</small>
              </div>
            </div>

            <div>
              <span>
                <i className="bi bi-layers" />
              </span>

              <div>
                <strong>Hỗ trợ biến thể</strong>

                <small>Lựa chọn đúng phiên bản</small>
              </div>
            </div>

            <div>
              <span>
                <i className="bi bi-pc-display" />
              </span>

              <div>
                <strong>PC Builder</strong>

                <small>Xây dựng cấu hình trực tuyến</small>
              </div>
            </div>

            <div>
              <span>
                <i className="bi bi-cart-check" />
              </span>

              <div>
                <strong>Mua hàng online</strong>

                <small>Giỏ hàng và thanh toán</small>
              </div>
            </div>
          </div>

          {/* ==================================================
              BOTTOM
          ================================================== */}

          <div className="client-footer-bottom">
            <p>© {currentYear} BuildPC. All rights reserved.</p>

            <div>
              <span>
                <i className="bi bi-shield-lock" />
                Bảo mật thông tin
              </span>

              <span>
                <i className="bi bi-credit-card" />
                Thanh toán tiện lợi
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
