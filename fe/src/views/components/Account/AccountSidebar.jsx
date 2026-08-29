import { useState } from "react";

import { NavLink, useNavigate } from "react-router-dom";

import useAuth from "../../../hooks/useAuth";

import { getInitials } from "../../../models/UserModel";

import ForgotPasswordModal from "./ForgotPasswordModal";

function AccountSidebar() {
  const navigate = useNavigate();

  const { currentUser, logout } = useAuth();

  const [forgotPasswordModalOpen, setForgotPasswordModalOpen] = useState(false);

  const displayName =
    currentUser?.fullName || currentUser?.name || "Người dùng";

  const handleLogout = () => {
    const confirmed = window.confirm("Bạn có chắc chắn muốn đăng xuất không?");

    if (!confirmed) return;

    logout();

    navigate("/", {
      replace: true,
    });
  };

  return (
    <>
      <aside className="client-account-sidebar">
        <div className="client-account-summary">
          <div className="client-account-summary-avatar">
            {currentUser?.avatar ? (
              <img
                src={currentUser.avatar}
                alt={`Ảnh đại diện của ${displayName}`}
              />
            ) : (
              <span>{getInitials(displayName)}</span>
            )}
          </div>

          <h2>{displayName}</h2>

          <p>{currentUser?.email}</p>
        </div>

        <div className="client-account-sidebar-divider" />

        <nav className="client-account-nav" aria-label="Menu tài khoản">
          <NavLink
            to="/account/profile"
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            <i className="bi bi-person-vcard" />

            <span>Thông tin tài khoản</span>
          </NavLink>

          <NavLink
            to="/account/change-password"
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            <i className="bi bi-shield-lock" />

            <span>Đổi mật khẩu</span>
          </NavLink>

          <NavLink
            to="/account/orders"
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            <i className="bi bi-box-seam" />

            <span>Đơn hàng</span>
          </NavLink>

          {/* ==================================================
              MY BUILDS
          ================================================== */}

          <NavLink
            to="/account/builds"
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            <i className="bi bi-pc-display-horizontal" />

            <span>Cấu hình của tôi</span>
          </NavLink>

          <button
            type="button"
            onClick={() => setForgotPasswordModalOpen(true)}
          >
            <i className="bi bi-question-circle" />

            <span>Quên mật khẩu</span>
          </button>

          <button type="button" className="logout" onClick={handleLogout}>
            <i className="bi bi-box-arrow-right" />

            <span>Đăng xuất</span>
          </button>
        </nav>
      </aside>

      <ForgotPasswordModal
        isOpen={forgotPasswordModalOpen}
        email={currentUser?.email}
        onClose={() => setForgotPasswordModalOpen(false)}
      />
    </>
  );
}

export default AccountSidebar;
