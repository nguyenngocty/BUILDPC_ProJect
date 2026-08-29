import { Link, Outlet, useLocation } from "react-router-dom";

import Header from "../../components/Header";
import Footer from "../../components/Footer";
import AccountSidebar from "../../components/Account/AccountSidebar";

import "./Account.css";

const getCurrentPageLabel = (pathname) => {
  if (/^\/account\/builds\/\d+\/?$/.test(pathname)) {
    return "Chi tiết cấu hình";
  }

  if (pathname.startsWith("/account/builds")) {
    return "Cấu hình của tôi";
  }

  if (/^\/account\/orders\/\d+\/?$/.test(pathname)) {
    return "Chi tiết đơn hàng";
  }

  if (pathname.startsWith("/account/orders")) {
    return "Đơn hàng của tôi";
  }

  if (pathname.includes("change-password")) {
    return "Đổi mật khẩu";
  }

  return "Thông tin tài khoản";
};

function AccountLayout() {
  const location = useLocation();

  const currentPageLabel = getCurrentPageLabel(location.pathname);

  return (
    <>
      <Header />

      <div className="client-account-breadcrumb-bar">
        <div className="client-account-container">
          <nav className="client-account-breadcrumb" aria-label="Breadcrumb">
            <Link to="/">Trang chủ</Link>

            <span className="breadcrumb-separator" aria-hidden="true">
              /
            </span>

            <Link to="/account/profile">Tài khoản</Link>

            <span className="breadcrumb-separator" aria-hidden="true">
              /
            </span>

            <strong>{currentPageLabel}</strong>
          </nav>
        </div>
      </div>

      <main className="account-page client-account-page">
        <div className="client-account-container">
          <div className="client-account-layout">
            <AccountSidebar />

            <section className="client-account-content">
              <Outlet />
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}

export default AccountLayout;
