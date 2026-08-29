import { Link } from "react-router-dom";

// ============================================================
// COMPONENT GROUPS
// ============================================================

const componentGroups = [
  {
    code: "CPU",
    name: "CPU",
    icon: "bi-cpu",
  },
  {
    code: "MAINBOARD",
    name: "Mainboard",
    icon: "bi-motherboard",
  },
  {
    code: "RAM",
    name: "RAM",
    icon: "bi-memory",
  },
  {
    code: "VGA",
    name: "Card đồ họa",
    icon: "bi-gpu-card",
  },
  {
    code: "COOLING",
    name: "Tản nhiệt",
    icon: "bi-fan",
  },
  {
    code: "PSU",
    name: "Nguồn",
    icon: "bi-lightning-charge",
  },
  {
    code: "STORAGE",
    name: "Lưu trữ",
    icon: "bi-device-ssd",
  },
  {
    code: "CASE",
    name: "Vỏ máy",
    icon: "bi-pc-display",
  },
];

// ============================================================
// COMPONENT
// ============================================================

function BuildPCSection() {
  return (
    <section className="client-home-build">
      <div className="client-home-build__content">
        <div className="client-home-build__intro">
          <span className="client-home-build__eyebrow">
            <i className="bi bi-stars" />
            BUILD PC
          </span>

          <h2 className="client-home-build__title">
            Tự xây dựng bộ PC phù hợp với nhu cầu của bạn
          </h2>

          <p className="client-home-build__description">
            Chọn linh kiện theo từng nhóm, theo dõi tổng giá và để hệ thống hỗ
            trợ kiểm tra khả năng tương thích trước khi hoàn tất cấu hình.
          </p>

          <div className="client-home-build__features">
            <div className="client-home-build__feature">
              <span className="client-home-build__feature-icon">
                <i className="bi bi-check2-circle" />
              </span>

              <div>
                <strong>Kiểm tra tương thích</strong>
                <span>
                  Hỗ trợ kiểm tra CPU, Mainboard, RAM, PSU và các linh kiện liên
                  quan.
                </span>
              </div>
            </div>

            <div className="client-home-build__feature">
              <span className="client-home-build__feature-icon">
                <i className="bi bi-currency-dollar" />
              </span>

              <div>
                <strong>Theo dõi ngân sách</strong>
                <span>
                  Giá cấu hình được cập nhật dựa trên linh kiện bạn thực sự lựa
                  chọn.
                </span>
              </div>
            </div>

            <div className="client-home-build__feature">
              <span className="client-home-build__feature-icon">
                <i className="bi bi-bookmark-check" />
              </span>

              <div>
                <strong>Lưu cấu hình</strong>
                <span>
                  Đăng nhập để lưu, chỉnh sửa lại cấu hình hoặc đưa toàn bộ linh
                  kiện vào giỏ hàng.
                </span>
              </div>
            </div>
          </div>

          <div className="client-home-build__actions">
            <Link to="/build-pc" className="client-home-build__primary-action">
              <i className="bi bi-pc-display-horizontal" />

              <span>Bắt đầu Build PC</span>

              <i className="bi bi-arrow-right" />
            </Link>

            <Link
              to="/products"
              className="client-home-build__secondary-action"
            >
              <i className="bi bi-grid" />

              <span>Xem linh kiện</span>
            </Link>
          </div>
        </div>

        <div className="client-home-build__visual">
          <div className="client-home-build__visual-header">
            <div>
              <span className="client-home-build__visual-label">
                PC BUILDER
              </span>

              <h3>8 nhóm linh kiện</h3>
            </div>

            <span className="client-home-build__visual-status">
              <span className="client-home-build__visual-status-dot" />
              Sẵn sàng
            </span>
          </div>

          <div className="client-home-build__component-grid">
            {componentGroups.map((component, index) => (
              <div
                className="client-home-build__component"
                key={component.code}
              >
                <span className="client-home-build__component-number">
                  {String(index + 1).padStart(2, "0")}
                </span>

                <span className="client-home-build__component-icon">
                  <i className={`bi ${component.icon}`} />
                </span>

                <span className="client-home-build__component-name">
                  {component.name}
                </span>

                <i className="bi bi-plus-lg client-home-build__component-add" />
              </div>
            ))}
          </div>

          <div className="client-home-build__visual-footer">
            <div>
              <i className="bi bi-shield-check" />

              <span>
                Kiểm tra tương thích được xử lý trong công cụ Build PC
              </span>
            </div>

            <Link to="/build-pc" aria-label="Mở công cụ Build PC">
              <i className="bi bi-arrow-up-right" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default BuildPCSection;
