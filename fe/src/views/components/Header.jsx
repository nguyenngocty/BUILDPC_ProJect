import React, { useEffect, useRef, useState } from "react";

import toast from "react-hot-toast";

import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";

import Auth from "../pages/Auth/Auth";

import useAuth from "../../hooks/useAuth";

import { useCart } from "../../context/CartContext";

import { getInitials } from "../../models/UserModel";

import ClientLogoutModal from "./ClientLogoutModal";

import "./Header.css";

// ============================================================
// PRODUCT MENU
// ============================================================

const PRODUCT_MENU_ITEMS = [
  {
    label: "CPU",
    icon: "bi-cpu",
    category: "cpu",
  },
  {
    label: "Mainboard",
    icon: "bi-motherboard",
    category: "mainboard",
  },
  {
    label: "Card đồ họa",
    icon: "bi-gpu-card",
    category: "vga",
  },
  {
    label: "RAM",
    icon: "bi-memory",
    category: "ram",
  },
  {
    label: "Ổ cứng",
    icon: "bi-device-ssd",
    category: "storage",
  },
  {
    label: "Nguồn",
    icon: "bi-lightning-charge",
    category: "psu",
  },
  {
    label: "Case",
    icon: "bi-pc-display",
    category: "case",
  },
  {
    label: "Tản nhiệt",
    icon: "bi-fan",
    category: "cooling",
  },
];

// ============================================================
// COMPONENT
// ============================================================

function Header() {
  const navigate = useNavigate();

  const location = useLocation();

  const accountMenuRef = useRef(null);

  // ==========================================================
  // AUTH
  // ==========================================================

  const { currentUser, isAuthenticated, isAdmin, logout } = useAuth();

  // ==========================================================
  // CART
  // ==========================================================

  const { cartCount } = useCart();

  const displayCartCount = Math.max(Number(cartCount || 0), 0);

  // ==========================================================
  // STATE
  // ==========================================================

  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const [authTab, setAuthTab] = useState("login");

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const [isLogoutOpen, setIsLogoutOpen] = useState(false);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [isMobileProductOpen, setIsMobileProductOpen] = useState(false);

  const [searchValue, setSearchValue] = useState("");

  // ==========================================================
  // ROUTE CHANGE
  // ==========================================================

  useEffect(() => {
    setIsUserMenuOpen(false);
    setIsLogoutOpen(false);
    setIsMobileMenuOpen(false);
    setIsMobileProductOpen(false);
  }, [location.pathname, location.search]);

  // ==========================================================
  // LOCK BODY WHEN MOBILE MENU OPEN
  // ==========================================================

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileMenuOpen]);

  // ==========================================================
  // CLICK OUTSIDE / ESC
  // ==========================================================

  useEffect(() => {
    const handleDocument = (event) => {
      if (event.type === "keydown" && event.key === "Escape") {
        setIsUserMenuOpen(false);
        setIsMobileMenuOpen(false);
        setIsMobileProductOpen(false);

        return;
      }

      if (
        event.type === "mousedown" &&
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target)
      ) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleDocument);

    document.addEventListener("keydown", handleDocument);

    return () => {
      document.removeEventListener("mousedown", handleDocument);

      document.removeEventListener("keydown", handleDocument);
    };
  }, []);

  // ==========================================================
  // AUTH MODAL
  // ==========================================================

  const openAuthModal = (tabName) => {
    setAuthTab(tabName);

    setIsAuthOpen(true);

    setIsMobileMenuOpen(false);
  };

  // ==========================================================
  // NAVIGATE
  // ==========================================================

  const goTo = (path) => {
    setIsUserMenuOpen(false);

    setIsMobileMenuOpen(false);

    navigate(path);
  };

  // ==========================================================
  // SEARCH
  // ==========================================================

  const handleSearch = (event) => {
    event?.preventDefault();

    const keyword = searchValue.trim();

    if (!keyword) {
      navigate("/products");

      setIsMobileMenuOpen(false);

      return;
    }

    navigate(`/products?search=${encodeURIComponent(keyword)}`);

    setIsMobileMenuOpen(false);
  };

  // ==========================================================
  // LOGOUT
  // ==========================================================

  const handleOpenLogout = () => {
    setIsUserMenuOpen(false);

    setIsMobileMenuOpen(false);

    setIsLogoutOpen(true);
  };

  const handleCloseLogout = () => {
    setIsLogoutOpen(false);
  };

  const handleConfirmLogout = async () => {
    try {
      setIsLogoutOpen(false);

      await Promise.resolve(logout());

      toast.success("Đăng xuất thành công!");

      navigate("/", {
        replace: true,
      });
    } catch (error) {
      console.error("Lỗi đăng xuất:", error);

      toast.error("Không thể đăng xuất. Vui lòng thử lại.");
    }
  };

  // ==========================================================
  // USER DISPLAY
  // ==========================================================

  const displayUserName =
    currentUser?.fullName ||
    currentUser?.name ||
    currentUser?.username ||
    "Tài khoản";

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <>
      <header className="client-header">
        {/* ====================================================
            TOPBAR
        ==================================================== */}

        <div className="client-header-topbar">
          <div className="client-header-container client-header-topbar__inner">
            <div className="client-header-topbar__left">
              <span>
                <i className="bi bi-telephone-fill" />
                Hotline: 1900 1234
              </span>

              <span className="client-header-topbar__desktop-only">
                <i className="bi bi-shield-check" />
                Linh kiện chính hãng
              </span>

              <span className="client-header-topbar__desktop-only">
                <i className="bi bi-truck" />
                Hỗ trợ giao hàng toàn quốc
              </span>
            </div>

            <div className="client-header-topbar__right">
              {!isAuthenticated ? (
                <div className="client-header-auth">
                  <button type="button" onClick={() => openAuthModal("login")}>
                    <i className="bi bi-person" />
                    Đăng nhập
                  </button>

                  <span />

                  <button
                    type="button"
                    onClick={() => openAuthModal("register")}
                  >
                    Đăng ký
                  </button>
                </div>
              ) : (
                <div className="client-header-account" ref={accountMenuRef}>
                  <button
                    type="button"
                    className={`client-header-account__button ${
                      isUserMenuOpen
                        ? "client-header-account__button--active"
                        : ""
                    }`}
                    onClick={() => setIsUserMenuOpen((value) => !value)}
                    aria-expanded={isUserMenuOpen}
                    aria-label="Mở menu tài khoản"
                  >
                    <span className="client-header-account__avatar">
                      {currentUser?.avatar ? (
                        <img src={currentUser.avatar} alt={displayUserName} />
                      ) : (
                        getInitials(displayUserName)
                      )}
                    </span>

                    <span className="client-header-account__info">
                      <small>Tài khoản</small>

                      <strong>{displayUserName}</strong>
                    </span>

                    <i
                      className={`bi bi-chevron-down client-header-account__chevron ${
                        isUserMenuOpen
                          ? "client-header-account__chevron--open"
                          : ""
                      }`}
                    />
                  </button>

                  <div
                    className={`client-header-account-menu ${
                      isUserMenuOpen ? "client-header-account-menu--show" : ""
                    }`}
                  >
                    <div className="client-header-account-menu__header">
                      <span className="client-header-account-menu__avatar">
                        {currentUser?.avatar ? (
                          <img src={currentUser.avatar} alt={displayUserName} />
                        ) : (
                          getInitials(displayUserName)
                        )}
                      </span>

                      <div>
                        <strong>{displayUserName}</strong>

                        {currentUser?.email && (
                          <small>{currentUser.email}</small>
                        )}
                      </div>
                    </div>

                    <div className="client-header-account-menu__body">
                      <button
                        type="button"
                        onClick={() => goTo("/account/profile")}
                      >
                        <span>
                          <i className="bi bi-person-vcard" />
                        </span>

                        <div>
                          <strong>Thông tin của tôi</strong>

                          <small>Quản lý hồ sơ cá nhân</small>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => goTo("/account/orders")}
                      >
                        <span>
                          <i className="bi bi-box-seam" />
                        </span>

                        <div>
                          <strong>Đơn hàng</strong>

                          <small>Theo dõi lịch sử mua hàng</small>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => goTo("/account/builds")}
                      >
                        <span>
                          <i className="bi bi-pc-display-horizontal" />
                        </span>

                        <div>
                          <strong>Cấu hình của tôi</strong>

                          <small>Các bộ PC đã lưu</small>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => goTo("/account/change-password")}
                      >
                        <span>
                          <i className="bi bi-shield-lock" />
                        </span>

                        <div>
                          <strong>Đổi mật khẩu</strong>

                          <small>Bảo mật tài khoản</small>
                        </div>
                      </button>

                      {isAdmin && (
                        <button type="button" onClick={() => goTo("/admin")}>
                          <span>
                            <i className="bi bi-speedometer2" />
                          </span>

                          <div>
                            <strong>Trang quản trị</strong>

                            <small>Quản lý hệ thống</small>
                          </div>
                        </button>
                      )}
                    </div>

                    <div className="client-header-account-menu__footer">
                      <button type="button" onClick={handleOpenLogout}>
                        <i className="bi bi-box-arrow-right" />
                        Đăng xuất
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ====================================================
            MAIN HEADER
        ==================================================== */}

        <div className="client-header-main">
          <div className="client-header-container client-header-main__inner">
            {/* LOGO */}

            <Link
              className="client-header-brand"
              to="/"
              aria-label="BuildPC - Trang chủ"
            >
              <span className="client-header-brand__icon">
                <i className="bi bi-cpu-fill" />
              </span>

              <span className="client-header-brand__text">
                Build<span>PC</span>
              </span>
            </Link>

            {/* SEARCH */}

            <form className="client-header-search" onSubmit={handleSearch}>
              <i className="bi bi-search client-header-search__icon" />

              <input
                type="search"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Tìm CPU, VGA, RAM, Mainboard..."
                aria-label="Tìm kiếm sản phẩm"
              />

              {searchValue && (
                <button
                  className="client-header-search__clear"
                  type="button"
                  onClick={() => setSearchValue("")}
                  aria-label="Xóa từ khóa tìm kiếm"
                >
                  <i className="bi bi-x-lg" />
                </button>
              )}

              <button className="client-header-search__submit" type="submit">
                <span>Tìm kiếm</span>

                <i className="bi bi-search" />
              </button>
            </form>

            {/* ACTIONS */}

            <div className="client-header-main__actions">
              <Link to="/build-pc" className="client-header-build-action">
                <span className="client-header-action-icon">
                  <i className="bi bi-pc-display-horizontal" />
                </span>

                <div>
                  <small>PC Builder</small>

                  <strong>Build PC</strong>
                </div>
              </Link>

              <Link
                to="/cart"
                className="client-header-cart-action"
                aria-label={`Giỏ hàng, ${displayCartCount} sản phẩm`}
              >
                <span className="client-header-cart-action__icon">
                  <i className="bi bi-cart3" />

                  {displayCartCount > 0 && (
                    <strong>
                      {displayCartCount > 99 ? "99+" : displayCartCount}
                    </strong>
                  )}
                </span>

                <div>
                  <small>Giỏ hàng</small>

                  <strong>{displayCartCount} sản phẩm</strong>
                </div>
              </Link>

              <button
                type="button"
                className="client-header-mobile-toggle"
                onClick={() => setIsMobileMenuOpen((value) => !value)}
                aria-label="Mở menu"
                aria-expanded={isMobileMenuOpen}
              >
                <i
                  className={`bi ${isMobileMenuOpen ? "bi-x-lg" : "bi-list"}`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* ====================================================
            NAVIGATION
        ==================================================== */}

        <nav className="client-header-nav">
          <div className="client-header-container client-header-nav__inner">
            <ul className="client-header-nav__menu">
              <li>
                <NavLink
                  to="/"
                  end
                  className={({ isActive }) =>
                    `client-header-nav__link ${
                      isActive ? "client-header-nav__link--active" : ""
                    }`
                  }
                >
                  <i className="bi bi-house" />
                  Trang chủ
                </NavLink>
              </li>

              <li className="client-header-products-menu">
                <NavLink
                  to="/products"
                  className={({ isActive }) =>
                    `client-header-nav__link ${
                      isActive ? "client-header-nav__link--active" : ""
                    }`
                  }
                >
                  <i className="bi bi-grid" />
                  Sản phẩm
                  <i className="bi bi-chevron-down client-header-nav__chevron" />
                </NavLink>

                <div className="client-header-products-dropdown">
                  <div className="client-header-products-dropdown__header">
                    <div>
                      <span>DANH MỤC LINH KIỆN</span>

                      <strong>Khám phá sản phẩm</strong>
                    </div>

                    <Link to="/products">
                      Xem tất cả
                      <i className="bi bi-arrow-right" />
                    </Link>
                  </div>

                  <div className="client-header-products-dropdown__grid">
                    {PRODUCT_MENU_ITEMS.map((item) => (
                      <Link
                        key={item.category}
                        to={`/products?category=${encodeURIComponent(
                          item.category,
                        )}`}
                      >
                        <span>
                          <i className={`bi ${item.icon}`} />
                        </span>

                        <strong>{item.label}</strong>

                        <i className="bi bi-arrow-up-right" />
                      </Link>
                    ))}
                  </div>
                </div>
              </li>

              <li>
                <NavLink
                  to="/build-pc"
                  className={({ isActive }) =>
                    `client-header-nav__link ${
                      isActive ? "client-header-nav__link--active" : ""
                    }`
                  }
                >
                  <i className="bi bi-pc-display-horizontal" />
                  Build PC
                </NavLink>
              </li>

              <li>
                <NavLink
                  to="/blog"
                  className={({ isActive }) =>
                    `client-header-nav__link ${
                      isActive ? "client-header-nav__link--active" : ""
                    }`
                  }
                >
                  <i className="bi bi-newspaper" />
                  Tin tức
                </NavLink>
              </li>

              <li>
                <NavLink
                  to="/about"
                  className={({ isActive }) =>
                    `client-header-nav__link ${
                      isActive ? "client-header-nav__link--active" : ""
                    }`
                  }
                >
                  <i className="bi bi-info-circle" />
                  Giới thiệu
                </NavLink>
              </li>

              <li>
                <NavLink
                  to="/contact"
                  className={({ isActive }) =>
                    `client-header-nav__link ${
                      isActive ? "client-header-nav__link--active" : ""
                    }`
                  }
                >
                  <i className="bi bi-chat-dots" />
                  Liên hệ
                </NavLink>
              </li>
            </ul>

            <div className="client-header-nav__support">
              <span className="client-header-nav__support-icon">
                <i className="bi bi-headset" />
              </span>

              <div>
                <small>Cần tư vấn?</small>

                <strong>1900 1234</strong>
              </div>
            </div>
          </div>
        </nav>

        {/* ====================================================
            MOBILE MENU
        ==================================================== */}

        <div
          className={`client-header-mobile ${
            isMobileMenuOpen ? "client-header-mobile--open" : ""
          }`}
        >
          <div
            className="client-header-mobile__backdrop"
            onClick={() => setIsMobileMenuOpen(false)}
            role="presentation"
          />

          <div className="client-header-mobile__panel">
            <div className="client-header-mobile__header">
              <Link to="/" className="client-header-brand">
                <span className="client-header-brand__icon">
                  <i className="bi bi-cpu-fill" />
                </span>

                <span className="client-header-brand__text">
                  Build<span>PC</span>
                </span>
              </Link>

              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label="Đóng menu"
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <form
              className="client-header-mobile__search"
              onSubmit={handleSearch}
            >
              <i className="bi bi-search" />

              <input
                type="search"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Tìm sản phẩm..."
              />

              <button type="submit">Tìm</button>
            </form>

            <div className="client-header-mobile__menu">
              <NavLink to="/">
                <i className="bi bi-house" />
                Trang chủ
              </NavLink>

              <div className="client-header-mobile__products">
                <button
                  type="button"
                  onClick={() => setIsMobileProductOpen((value) => !value)}
                >
                  <span>
                    <i className="bi bi-grid" />
                    Sản phẩm
                  </span>

                  <i
                    className={`bi bi-chevron-down ${
                      isMobileProductOpen
                        ? "client-header-mobile__chevron--open"
                        : ""
                    }`}
                  />
                </button>

                {isMobileProductOpen && (
                  <div className="client-header-mobile__categories">
                    <Link to="/products">
                      <i className="bi bi-grid-3x3-gap" />
                      Tất cả sản phẩm
                    </Link>

                    {PRODUCT_MENU_ITEMS.map((item) => (
                      <Link
                        key={item.category}
                        to={`/products?category=${encodeURIComponent(
                          item.category,
                        )}`}
                      >
                        <i className={`bi ${item.icon}`} />

                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <NavLink to="/build-pc">
                <i className="bi bi-pc-display-horizontal" />
                Build PC
              </NavLink>

              <NavLink to="/blog">
                <i className="bi bi-newspaper" />
                Tin tức
              </NavLink>

              <NavLink to="/about">
                <i className="bi bi-info-circle" />
                Giới thiệu
              </NavLink>

              <NavLink to="/contact">
                <i className="bi bi-chat-dots" />
                Liên hệ
              </NavLink>

              <NavLink to="/cart">
                <i className="bi bi-cart3" />
                Giỏ hàng
                {displayCartCount > 0 && <span>{displayCartCount}</span>}
              </NavLink>
            </div>

            <div className="client-header-mobile__footer">
              {!isAuthenticated ? (
                <div className="client-header-mobile__auth">
                  <button type="button" onClick={() => openAuthModal("login")}>
                    Đăng nhập
                  </button>

                  <button
                    type="button"
                    onClick={() => openAuthModal("register")}
                  >
                    Đăng ký
                  </button>
                </div>
              ) : (
                <>
                  <div className="client-header-mobile__user">
                    <span>
                      {currentUser?.avatar ? (
                        <img src={currentUser.avatar} alt={displayUserName} />
                      ) : (
                        getInitials(displayUserName)
                      )}
                    </span>

                    <div>
                      <strong>{displayUserName}</strong>

                      <small>{currentUser?.email}</small>
                    </div>
                  </div>

                  <div className="client-header-mobile__account-links">
                    <button
                      type="button"
                      onClick={() => goTo("/account/profile")}
                    >
                      <i className="bi bi-person" />
                      Tài khoản
                    </button>

                    <button
                      type="button"
                      onClick={() => goTo("/account/orders")}
                    >
                      <i className="bi bi-box-seam" />
                      Đơn hàng
                    </button>

                    <button
                      type="button"
                      onClick={() => goTo("/account/builds")}
                    >
                      <i className="bi bi-pc-display" />
                      Cấu hình
                    </button>

                    <button type="button" onClick={handleOpenLogout}>
                      <i className="bi bi-box-arrow-right" />
                      Đăng xuất
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ======================================================
          HEADER SPACER
      ====================================================== */}

      <div className="client-header-spacer" aria-hidden="true" />

      {/* ======================================================
          AUTH MODAL
      ====================================================== */}

      <Auth
        isOpen={isAuthOpen}
        initialTab={authTab}
        onClose={() => setIsAuthOpen(false)}
      />

      {/* ======================================================
          LOGOUT MODAL
      ====================================================== */}

      <ClientLogoutModal
        isOpen={isLogoutOpen}
        onClose={handleCloseLogout}
        onConfirm={handleConfirmLogout}
      />
    </>
  );
}

export default Header;
