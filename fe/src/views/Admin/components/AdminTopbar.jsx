import { useEffect, useRef } from "react";

import { NavLink } from "react-router-dom";

import useAuth from "../../../hooks/useAuth";

import { getInitials, getRoleLabel } from "../../../models/UserModel";

const topMenuItems = [];

function AdminTopbar({
  isAccountOpen,
  onToggleSidebar,
  onToggleAccount,
  onCloseAccount,
  onOpenAccountInfo,
  onOpenChangePassword,
  onGoToClient,
  onOpenLogout,
}) {
  const { currentUser } = useAuth();

  const accountMenuRef = useRef(null);

  const displayName =
    currentUser?.fullName || currentUser?.name || "Quản trị viên";

  const avatar = currentUser?.avatar;

  const initials = getInitials(displayName);

  // =========================================================
  // CLICK OUTSIDE ACCOUNT MENU
  // =========================================================

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!isAccountOpen || !accountMenuRef.current) {
        return;
      }

      if (!accountMenuRef.current.contains(event.target)) {
        onCloseAccount();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isAccountOpen, onCloseAccount]);

  return (
    <header className="adm-topbar">
      {/* =====================================================
          LEFT
          ===================================================== */}

      <div className="adm-topbar__left">
        <button
          className="adm-topbar__menu-button"
          type="button"
          onClick={onToggleSidebar}
          aria-label="Ẩn hoặc hiện menu quản trị"
        >
          <i className="bi bi-list" />
        </button>

        <NavLink className="adm-topbar__brand" to="/admin" end>
          <span className="adm-topbar__brand-icon">
            <i className="bi bi-pc-display-horizontal" />
          </span>

          <span className="adm-topbar__brand-content">
            <strong>Admin Panel</strong>

            <small>PC Builder</small>
          </span>
        </NavLink>
      </div>

      {/* =====================================================
          CENTER
          ===================================================== */}

      {topMenuItems.length > 0 && (
        <nav className="adm-topbar__navigation">
          {topMenuItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                [
                  "adm-topbar__nav-link",
                  isActive && "adm-topbar__nav-link--active",
                ]
                  .filter(Boolean)
                  .join(" ")
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      )}

      {/* =====================================================
          RIGHT
          ===================================================== */}

      <div className="adm-topbar__actions">
        <div className="adm-topbar__search">
          <i className="bi bi-search adm-topbar__search-icon" />

          <input
            className="adm-topbar__search-input"
            type="search"
            placeholder="Tìm kiếm..."
            aria-label="Tìm kiếm"
          />
        </div>

        <button
          className="adm-topbar__icon-button"
          type="button"
          aria-label="Thông báo"
        >
          <i className="bi bi-bell" />

          <span className="adm-topbar__notification-dot" />
        </button>

        {/* ===================================================
            ACCOUNT
            =================================================== */}

        <div className="adm-account" ref={accountMenuRef}>
          <button
            className={[
              "adm-account__button",
              isAccountOpen && "adm-account__button--active",
            ]
              .filter(Boolean)
              .join(" ")}
            type="button"
            onClick={onToggleAccount}
            aria-expanded={isAccountOpen}
            aria-haspopup="menu"
          >
            <span className="adm-account__avatar">
              {avatar ? <img src={avatar} alt={displayName} /> : initials}
            </span>

            <span className="adm-account__text">
              <strong>{displayName}</strong>

              <small>{getRoleLabel(currentUser?.role)}</small>
            </span>

            <i
              className={[
                "bi",
                "bi-chevron-down",
                "adm-account__chevron",
                isAccountOpen && "adm-account__chevron--open",
              ]
                .filter(Boolean)
                .join(" ")}
            />
          </button>

          <div
            className={[
              "adm-account-menu",
              isAccountOpen && "adm-account-menu--show",
            ]
              .filter(Boolean)
              .join(" ")}
            role="menu"
          >
            <div className="adm-account-menu__header">
              <span className="adm-account-menu__avatar">
                {avatar ? <img src={avatar} alt={displayName} /> : initials}
              </span>

              <div className="adm-account-menu__info">
                <strong>{displayName}</strong>

                <span>
                  {currentUser?.email || getRoleLabel(currentUser?.role)}
                </span>
              </div>
            </div>

            <div className="adm-account-menu__divider" />

            <button
              className="adm-account-menu__item"
              type="button"
              role="menuitem"
              onClick={onOpenAccountInfo}
            >
              <span className="adm-account-menu__item-icon">
                <i className="bi bi-person-vcard" />
              </span>

              <span>Thông tin tài khoản</span>
            </button>

            <button
              className="adm-account-menu__item"
              type="button"
              role="menuitem"
              onClick={onOpenChangePassword}
            >
              <span className="adm-account-menu__item-icon">
                <i className="bi bi-shield-lock" />
              </span>

              <span>Đổi mật khẩu</span>
            </button>

            <button
              className="adm-account-menu__item"
              type="button"
              role="menuitem"
              onClick={onGoToClient}
            >
              <span className="adm-account-menu__item-icon">
                <i className="bi bi-shop" />
              </span>

              <span>Về trang khách hàng</span>
            </button>

            <div className="adm-account-menu__divider" />

            <button
              className="adm-account-menu__item adm-account-menu__item--logout"
              type="button"
              role="menuitem"
              onClick={onOpenLogout}
            >
              <span className="adm-account-menu__item-icon">
                <i className="bi bi-box-arrow-right" />
              </span>

              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

export default AdminTopbar;
