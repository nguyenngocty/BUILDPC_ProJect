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
    icon: "bi-grid",
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
    label: "Linh kiện",
    to: "/admin/pc-parts",
    icon: "bi-pc-display",
  },
  {
    label: "Quản lý người dùng",
    to: "/admin/users",
    icon: "bi-people",
  },
  {
    label: "Quản lý bài viết",
    to: "/admin/posts",
    icon: "bi-file-earmark-text",
  },
  {
    label: "Quản lý mã giảm giá",
    to: "/admin/coupons",
    icon: "bi-ticket-perforated",
  },
  {
    label: "Quản lý đánh giá",
    to: "/admin/comments",
    icon: "bi-chat-left-text",
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
    <aside className="adm-sidebar">
      <div className="adm-sidebar__header">
        <span className="adm-sidebar__eyebrow">Quản trị hệ thống</span>

        <strong className="adm-sidebar__title">PC Builder</strong>
      </div>

      <nav className="adm-sidebar__menu" aria-label="Menu quản trị">
        {menuItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              ["adm-sidebar__link", isActive && "adm-sidebar__link--active"]
                .filter(Boolean)
                .join(" ")
            }
          >
            <span className="adm-sidebar__icon">
              <i className={`bi ${item.icon}`} />
            </span>

            <span className="adm-sidebar__label">{item.label}</span>

            <span className="adm-sidebar__arrow">
              <i className="bi bi-chevron-right" />
            </span>
          </NavLink>
        ))}
      </nav>

      <div className="adm-sidebar__footer">
        <div className="adm-sidebar__footer-icon">
          <i className="bi bi-shield-check" />
        </div>

        <div>
          <strong>Khu vực quản trị</strong>

          <span>Quản lý hệ thống an toàn</span>
        </div>
      </div>
    </aside>
  );
}

export default AdminSidebar;
