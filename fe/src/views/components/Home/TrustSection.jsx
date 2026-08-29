// ============================================================
// BENEFITS
// ============================================================

const benefits = [
  {
    icon: "bi-shield-check",
    title: "Sản phẩm rõ nguồn gốc",
    description:
      "Thông tin sản phẩm, phiên bản và giá bán được quản lý tập trung trên hệ thống.",
  },
  {
    icon: "bi-box-seam",
    title: "Tồn kho minh bạch",
    description:
      "Trạng thái còn hàng và tồn kho được đồng bộ theo từng sản phẩm hoặc biến thể.",
  },
  {
    icon: "bi-pc-display-horizontal",
    title: "Hỗ trợ Build PC",
    description:
      "Tự chọn linh kiện, kiểm tra tương thích và quản lý cấu hình ngay trên website.",
  },
  {
    icon: "bi-headset",
    title: "Hỗ trợ khách hàng",
    description:
      "Thông tin sản phẩm và các chức năng mua hàng được tổ chức để người dùng dễ tra cứu.",
  },
];

// ============================================================
// STATS
// ============================================================

const highlights = [
  {
    icon: "bi-grid",
    value: "8",
    label: "Nhóm linh kiện Build PC",
  },
  {
    icon: "bi-check2-circle",
    value: "4",
    label: "Nhóm kiểm tra tương thích",
  },
  {
    icon: "bi-layers",
    value: "Variant",
    label: "Quản lý nhiều phiên bản",
  },
  {
    icon: "bi-cart-check",
    value: "Online",
    label: "Mua hàng trực tuyến",
  },
];

// ============================================================
// COMPONENT
// ============================================================

function TrustSection() {
  return (
    <section className="client-home-trust">
      <div className="client-home-trust__header">
        <span className="client-home-trust__eyebrow">
          <i className="bi bi-patch-check-fill" />
          TRẢI NGHIỆM MUA SẮM
        </span>

        <h2>Từ chọn linh kiện đến hoàn tất đơn hàng trên cùng một hệ thống</h2>

        <p>
          Website kết hợp quản lý sản phẩm, biến thể, tồn kho, Build PC và quy
          trình mua hàng để khách hàng có thể thao tác xuyên suốt mà không cần
          chuyển sang nhiều công cụ khác nhau.
        </p>
      </div>

      <div className="client-home-trust__benefits">
        {benefits.map((item) => (
          <article className="client-home-trust-card" key={item.title}>
            <span className="client-home-trust-card__icon">
              <i className={`bi ${item.icon}`} />
            </span>

            <div>
              <h3>{item.title}</h3>

              <p>{item.description}</p>
            </div>
          </article>
        ))}
      </div>

      <div className="client-home-trust__highlights">
        {highlights.map((item) => (
          <div className="client-home-trust-highlight" key={item.label}>
            <span className="client-home-trust-highlight__icon">
              <i className={`bi ${item.icon}`} />
            </span>

            <div>
              <strong>{item.value}</strong>

              <span>{item.label}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default TrustSection;
