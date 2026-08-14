import "./css/ProductDashboard.css";

function ProductDashboard({ statistics }) {
  const cards = [
    {
      title: "Tổng sản phẩm",
      value: statistics?.total_active || 0,
      icon: "bi-box-seam",
      color: "#4F46E5",
      bg: "#EEF2FF",
    },
    {
      title: "Đang bán",
      value: statistics?.published || 0,
      icon: "bi-check-circle",
      color: "#16A34A",
      bg: "#DCFCE7",
    },
    {
      title: "Sắp hết",
      value: statistics?.low_stock || 0,
      icon: "bi-exclamation-triangle",
      color: "#F59E0B",
      bg: "#FEF3C7",
    },
    {
      title: "Hết hàng",
      value: statistics?.out_of_stock || 0,
      icon: "bi-x-circle",
      color: "#DC2626",
      bg: "#FEE2E2",
    },
    {
      title: "Thùng rác",
      value: statistics?.trash || 0,
      icon: "bi-trash3",
      color: "#6B7280",
      bg: "#F3F4F6",
    },
  ];

  return (
    <div className="product-dashboard">
      {cards.map((card, index) => (
        <div className="dashboard-card" key={index}>
          <div
            className="dashboard-icon"
            style={{
              background: card.bg,
              color: card.color,
            }}
          >
            <i className={`bi ${card.icon}`}></i>
          </div>

          <div className="dashboard-content">
            <h3>{card.title}</h3>

            <h2>{card.value}</h2>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ProductDashboard;
