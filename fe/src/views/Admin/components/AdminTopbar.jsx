import { useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";
import useAuth from "../../../hooks/useAuth";
import { getInitials, getRoleLabel } from "../../../models/UserModel";

const topMenuItems = [
  
];

function AdminTopbar({ isAccountOpen, onToggleSidebar, onToggleAccount, onCloseAccount, onOpenAccountInfo, onOpenChangePassword, onGoToClient, onOpenLogout }) {
  const { currentUser } = useAuth();
  const accountMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isAccountOpen && accountMenuRef.current && !accountMenuRef.current.contains(event.target)) onCloseAccount();
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isAccountOpen, onCloseAccount]);

  return <header className="admin-topbar">
    <div className="topbar-left"><button className="sidebar-toggle" type="button" onClick={onToggleSidebar}><i className="bi bi-list" /></button><NavLink className="admin-brand" to="/admin" end><span className="brand-mark"><i className="bi bi-speedometer2" /></span><span>Admin</span></NavLink></div>
    <nav className="top-menu">{topMenuItems.map((item) => <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => isActive ? "active" : ""}>{item.label}</NavLink>)}</nav>
    <div className="topbar-actions"><div className="admin-search"><input type="search" placeholder="Tìm kiếm..." /></div><button className="icon-btn" type="button"><i className="bi bi-bell-fill" /></button>
      <div className="account-dropdown" ref={accountMenuRef}>
        <button className={`admin-user ${isAccountOpen ? "active" : ""}`} type="button" onClick={onToggleAccount} aria-expanded={isAccountOpen}>
          <span className="admin-avatar">{currentUser?.avatar ? <img src={currentUser.avatar} alt="" /> : getInitials(currentUser?.fullName || currentUser?.name)}</span><strong>{currentUser?.fullName || currentUser?.name}</strong><i className="bi bi-chevron-down user-chevron" />
        </button>
        <div className={`account-menu ${isAccountOpen ? "show" : ""}`}>
          <div className="account-menu-header"><span className="account-menu-avatar">{currentUser?.avatar ? <img src={currentUser.avatar} alt="" /> : getInitials(currentUser?.fullName || currentUser?.name)}</span><div><strong>{currentUser?.fullName || currentUser?.name}</strong><small>{getRoleLabel(currentUser?.role)}</small></div></div>
          <div className="account-menu-divider" />
          <button className="account-menu-item" type="button" onClick={onOpenAccountInfo}><i className="bi bi-person-vcard" /><span>Thông tin tài khoản</span></button>
          <button className="account-menu-item" type="button" onClick={onOpenChangePassword}><i className="bi bi-shield-lock" /><span>Đổi mật khẩu</span></button>
          <button className="account-menu-item" type="button" onClick={onGoToClient}><i className="bi bi-shop" /><span>Về trang khách hàng</span></button>
          <button className="account-menu-item logout-item" type="button" onClick={onOpenLogout}><i className="bi bi-box-arrow-right" /><span>Đăng xuất</span></button>
        </div>
      </div>
    </div>
  </header>;
}

export default AdminTopbar;