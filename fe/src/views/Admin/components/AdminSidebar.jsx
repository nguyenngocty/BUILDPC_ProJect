import { NavLink } from "react-router-dom";

const menuItems = [
  {
    label: "Tổng quan",
    to: "/admin",
    icon: "bi-speedometer2",
    end: true,
  },
  {
    label: "Quản lý đơn hàng",
    to: "/admin/orders",
    icon: "bi-cart3",
  },
  {
    label: "Quản lý vận chuyển",
    to: "/admin/shipping",
    icon: "bi-truck",
  },
  {
    label: "Banner / Slider",
    to: "/admin/banners",
    icon: "bi-images",
  },
  {
    label: "Quản lý danh mục",
    to: "/admin/categories",
    icon: "bi-box-seam",
  },
  {
    label: "Quản lý sản phẩm",
    to: "/admin/products",
    icon: "bi-box-seam",
  },
  {
    label: "Quản lý Build-PC",
    to: "/admin/builds",
    icon: "bi-cpu",
  },
  {
    label: "Quản lý người dùng",
    to: "/admin/users",
    icon: "bi-people",
  },
  {
    label: "Quản lý bài viết",
    to: "/admin/posts",
    icon: "bi-people",
  },
  {
    label: "Quản lý mã giảm giá",
    to: "/admin/coupons",
    icon: "bi-ticket-perforated",
  },
  {
    label: "Linh kiện",
    to: "/admin/pc-parts",
    icon: "bi-pc-display",
  },
  {
    label: "Quản lý đánh giá",
    to: "/admin/comments",
    icon: "bi-chat-dots",
  },
  {
    label: "Báo cáo",
    to: "/admin/reports",
    icon: "bi-bar-chart-line",
  },
  {
    label: "Cài đặt",
    to: "/admin/settings",
    icon: "bi-gear",
  },
];

function AdminSidebar({ onNavigate }) {
  return (
    <aside className="admin-sidebar">
      <div className="sidebar-title">Quản trị</div>

      <nav className="sidebar-menu" aria-label="Menu dọc">
        {menuItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            <i className={`bi ${item.icon} menu-icon`} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export default AdminSidebar;
