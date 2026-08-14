import "./css/CategoryDashboard.css";

function CategoryDashboard({ statistics }) {
  const dashboard = [
    {
      title: "Tổng danh mục",
      value: statistics?.total || 0,
      icon: "bi-grid-3x3-gap-fill",
      color: "blue",
    },
    {
      title: "Đang hoạt động",
      value: statistics?.active || 0,
      icon: "bi-check-circle-fill",
      color: "green",
    },
    {
      title: "Trong thùng rác",
      value: statistics?.trash || 0,
      icon: "bi-trash3-fill",
      color: "red",
    },
  ];

  return (
    <div className="category-dashboard">
      {dashboard.map((item) => (
        <div className="category-card" key={item.title}>
          <div className={`category-card-icon ${item.color}`}>
            <i className={item.icon}></i>
          </div>

          <div className="category-card-content">
            <span>{item.title}</span>
            <h3>{item.value}</h3>
          </div>
        </div>
      ))}
    </div>
  );
}

export default CategoryDashboard;
