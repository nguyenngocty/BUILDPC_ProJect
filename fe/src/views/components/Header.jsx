import React, { useEffect, useRef, useState } from "react";

import toast from "react-hot-toast";

import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";

import Auth from "../pages/Auth/Auth";

import useAuth from "../../hooks/useAuth";

import { useCart } from "../../context/CartContext";

import { getInitials } from "../../models/UserModel";

import ClientLogoutModal from "./ClientLogoutModal";

function Header() {
  const navigate = useNavigate();

  const location = useLocation();

  const menuRef = useRef(null);

  // =====================================================
  // AUTH
  // =====================================================

  const { currentUser, isAuthenticated, isAdmin, logout } = useAuth();

  // =====================================================
  // CART
  // =====================================================

  const { cartCount } = useCart();

  const displayCartCount = Number(cartCount || 0);

  // =====================================================
  // STATE
  // =====================================================

  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const [authTab, setAuthTab] = useState("login");

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const [isLogoutOpen, setIsLogoutOpen] = useState(false);

  // =====================================================
  // CLOSE USER MENU WHEN ROUTE CHANGES
  // =====================================================

  useEffect(() => {
    setIsUserMenuOpen(false);
    setIsLogoutOpen(false);
  }, [location.pathname]);

  // =====================================================
  // CLOSE USER MENU WHEN CLICK OUTSIDE / ESC
  // =====================================================

  useEffect(() => {
    function handleDocument(event) {
      if (event.type === "keydown" && event.key === "Escape") {
        setIsUserMenuOpen(false);
      }

      if (
        event.type === "mousedown" &&
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setIsUserMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleDocument);

    document.addEventListener("keydown", handleDocument);

    return () => {
      document.removeEventListener("mousedown", handleDocument);

      document.removeEventListener("keydown", handleDocument);
    };
  }, []);

  // =====================================================
  // AUTH MODAL
  // =====================================================

  const openAuthModal = (tabName) => {
    setAuthTab(tabName);
    setIsAuthOpen(true);
  };

  // =====================================================
  // NAVIGATE
  // =====================================================

  const goTo = (path) => {
    setIsUserMenuOpen(false);
    navigate(path);
  };

  // =====================================================
  // LOGOUT
  // =====================================================

  const handleOpenLogout = () => {
    setIsUserMenuOpen(false);
    setIsLogoutOpen(true);
  };

  const handleCloseLogout = () => {
    setIsLogoutOpen(false);
  };

  const handleConfirmLogout = () => {
    setIsLogoutOpen(false);

    logout();

    toast.success("Đăng xuất thành công!");

    navigate("/", {
      replace: true,
    });
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 1030,
          width: "100%",
        }}
      >
        {/* =================================================
            TOP BAR
        ================================================= */}

        <div className="topbar">
          <div className="container topbar-inner">
            {/* LEFT */}

            <div className="topbar-left">
              <i className="bi bi-telephone-fill" />

              <span>Hotline: 1900 1234</span>
            </div>

            {/* RIGHT */}

            <div className="topbar-right">
              {!isAuthenticated ? (
                <>
                  <i className="bi bi-person-circle" />

                  <button
                    className="topbar-auth-button login-btn"
                    type="button"
                    onClick={() => openAuthModal("login")}
                  >
                    Đăng nhập
                  </button>

                  <button
                    className="topbar-auth-button register-btn"
                    type="button"
                    onClick={() => openAuthModal("register")}
                  >
                    Đăng ký
                  </button>
                </>
              ) : (
                <div className="client-account-dropdown" ref={menuRef}>
                  {/* USER BUTTON */}

                  <button
                    className={`client-account-button ${
                      isUserMenuOpen ? "active" : ""
                    }`}
                    type="button"
                    onClick={() => setIsUserMenuOpen((value) => !value)}
                    aria-expanded={isUserMenuOpen}
                  >
                    {/* AVATAR */}

                    <span className="client-account-avatar">
                      {currentUser?.avatar ? (
                        <img src={currentUser.avatar} alt="" />
                      ) : (
                        getInitials(currentUser?.fullName || currentUser?.name)
                      )}
                    </span>

                    {/* NAME */}

                    <span className="client-account-name">
                      {currentUser?.fullName || currentUser?.name}
                    </span>

                    <i className="bi bi-chevron-down" />
                  </button>

                  {/* USER MENU */}

                  <div
                    className={`client-account-menu ${
                      isUserMenuOpen ? "show" : ""
                    }`}
                  >
                    <div className="client-account-menu-header">
                      <strong>
                        {currentUser?.fullName || currentUser?.name}
                      </strong>

                      <small>{currentUser?.email}</small>
                    </div>

                    {/* PROFILE */}

                    <button
                      type="button"
                      onClick={() => goTo("/account/profile")}
                    >
                      <i className="bi bi-person-vcard" />
                      Thông tin của tôi
                    </button>

                    {/* CHANGE PASSWORD */}

                    <button
                      type="button"
                      onClick={() => goTo("/account/change-password")}
                    >
                      <i className="bi bi-shield-lock" />
                      Đổi mật khẩu
                    </button>

                    {/* ADMIN */}

                    {isAdmin && (
                      <button type="button" onClick={() => goTo("/admin")}>
                        <i className="bi bi-speedometer2" />
                        Trang quản trị
                      </button>
                    )}

                    <div className="client-account-divider" />

                    {/* LOGOUT */}

                    <button
                      className="client-logout-item"
                      type="button"
                      onClick={handleOpenLogout}
                    >
                      <i className="bi bi-box-arrow-right" />
                      Đăng xuất
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* =================================================
            NAVBAR
        ================================================= */}

        <nav className="navbar">
          <div className="container navbar-inner">
            {/* ===============================================
                LOGO
            =============================================== */}

            <Link className="brand" to="/">
              <span className="brand-icon">
                <i className="bi bi-cpu-fill" />
              </span>

              <span className="brand-text">
                Build<span>PC</span>
              </span>
            </Link>

            {/* ===============================================
                SEARCH
            =============================================== */}

            <div className="pc-search">
              <div className="pc-search__filter">
                <select className="pc-search__select" defaultValue="all">
                  <option value="all">Tất cả</option>

                  <option>CPU</option>

                  <option>VGA</option>

                  <option>RAM</option>

                  <option>Mainboard</option>

                  <option>SSD</option>
                </select>
              </div>

              <input
                name="search"
                type="text"
                className="pc-search__input"
                placeholder="Tìm CPU Intel i5, VGA RTX 5060..."
              />

              <button className="pc-search__btn" type="button">
                <i className="bi bi-search" />
              </button>
            </div>

            {/* ===============================================
                MENU
            =============================================== */}

            <ul className="menu">
              {/* HOME */}

              <li>
                <NavLink to="/" className="nav-link">
                  Trang chủ
                </NavLink>
              </li>

              {/* PRODUCTS */}

              <li className="dropdown">
                <NavLink to="/products" className="nav-link">
                  Sản phẩm
                </NavLink>

                <div className="dropdown-menu">
                  {[
                    "CPU",
                    "Mainboard",
                    "VGA",
                    "RAM",
                    "SSD",
                    "Nguồn",
                    "Case",
                    "Tản nhiệt",
                    "Màn hình",
                    "Gaming Gear",
                  ].map((item) => (
                    <NavLink
                      key={item}
                      to={`/categories/${item}`}
                      className="dropdown-item"
                    >
                      {item}
                    </NavLink>
                  ))}
                </div>
              </li>

              {/* BLOG */}

              <li>
                <NavLink to="/blog" className="nav-link">
                  Tin tức
                </NavLink>
              </li>

              {/* ABOUT */}

              <li>
                <NavLink to="/about" className="nav-link">
                  Giới thiệu
                </NavLink>
              </li>

              {/* CONTACT */}

              <li>
                <NavLink to="/contact" className="nav-link">
                  Liên hệ
                </NavLink>
              </li>

              {/* BUILD PC */}

              <li>
                <NavLink to="/build-pc" className="build-btn">
                  <i className="bi bi-pc-display" />

                  <span>Build PC</span>
                </NavLink>
              </li>

              {/* =============================================
                  CART
              ============================================= */}

              <li>
                <NavLink to="/cart" className="cart">
                  <i className="bi bi-cart3" />

                  {displayCartCount > 0 && (
                    <span className="cart-count">{displayCartCount}</span>
                  )}
                </NavLink>
              </li>
            </ul>
          </div>
        </nav>
      </header>

      {/* =================================================
          AUTH MODAL
      ================================================= */}

      <Auth
        isOpen={isAuthOpen}
        initialTab={authTab}
        onClose={() => setIsAuthOpen(false)}
      />

      {/* =================================================
          LOGOUT MODAL
      ================================================= */}

      <ClientLogoutModal
        isOpen={isLogoutOpen}
        onClose={handleCloseLogout}
        onConfirm={handleConfirmLogout}
      />
    </>
  );
}

export default Header;
