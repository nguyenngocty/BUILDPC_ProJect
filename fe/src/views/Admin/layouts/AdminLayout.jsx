import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Outlet, useNavigate } from "react-router-dom";

import useAuth from "../../../hooks/useAuth";
import AdminTopbar from "../components/AdminTopbar";
import AdminSidebar from "../components/AdminSidebar";
import LogoutModal from "../components/LogoutModal";

import "../styles/Admin.css";

function AdminLayout() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);

  // =========================================================
  // SIDEBAR
  // =========================================================

  const handleToggleSidebar = () => {
    if (window.innerWidth <= 991.98) {
      setIsSidebarOpen((current) => !current);
      return;
    }

    setIsSidebarCollapsed((current) => !current);
  };

  const handleNavigate = () => {
    if (window.innerWidth <= 991.98) {
      setIsSidebarOpen(false);
    }
  };

  const handleCloseMobileSidebar = () => {
    setIsSidebarOpen(false);
  };

  // =========================================================
  // ACCOUNT
  // =========================================================

  const handleToggleAccount = () => {
    setIsAccountOpen((current) => !current);
  };

  const handleCloseAccount = () => {
    setIsAccountOpen(false);
  };

  const handleOpenAccountInfo = () => {
    setIsAccountOpen(false);
    navigate("/admin/profile");
  };

  const handleOpenChangePassword = () => {
    setIsAccountOpen(false);
    navigate("/admin/change-password");
  };

  const handleGoToClient = () => {
    setIsAccountOpen(false);
    navigate("/");
  };

  // =========================================================
  // LOGOUT
  // =========================================================

  const handleOpenLogout = () => {
    setIsAccountOpen(false);
    setIsLogoutOpen(true);
  };

  const handleCloseLogout = () => {
    setIsLogoutOpen(false);
  };

  const handleConfirmLogout = () => {
    setIsLogoutOpen(false);

    logout();

    navigate("/", {
      replace: true,
    });

    toast.success("Đăng xuất trang quản trị thành công!");
  };

  // =========================================================
  // LOCK BODY WHEN MODAL OPEN
  // =========================================================

  useEffect(() => {
    document.body.classList.toggle("adm-body-modal-open", isLogoutOpen);

    return () => {
      document.body.classList.remove("adm-body-modal-open");
    };
  }, [isLogoutOpen]);

  // =========================================================
  // ESC KEY
  // =========================================================

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key !== "Escape") {
        return;
      }

      if (isLogoutOpen) {
        setIsLogoutOpen(false);
        return;
      }

      if (isAccountOpen) {
        setIsAccountOpen(false);
        return;
      }

      setIsSidebarOpen(false);
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isLogoutOpen, isAccountOpen]);

  // =========================================================
  // RESIZE
  // =========================================================

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 991.98) {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div
      className={[
        "adm-layout",
        isSidebarCollapsed && "adm-layout--sidebar-collapsed",
        isSidebarOpen && "adm-layout--sidebar-open",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <AdminTopbar
        isAccountOpen={isAccountOpen}
        onToggleSidebar={handleToggleSidebar}
        onToggleAccount={handleToggleAccount}
        onCloseAccount={handleCloseAccount}
        onOpenAccountInfo={handleOpenAccountInfo}
        onOpenChangePassword={handleOpenChangePassword}
        onGoToClient={handleGoToClient}
        onOpenLogout={handleOpenLogout}
      />

      <AdminSidebar onNavigate={handleNavigate} />

      <button
        type="button"
        className="adm-sidebar-overlay"
        onClick={handleCloseMobileSidebar}
        aria-label="Đóng menu quản trị"
      />

      <main className="adm-main">
        <div className="adm-content">
          <Outlet />
        </div>
      </main>

      <LogoutModal
        isOpen={isLogoutOpen}
        onClose={handleCloseLogout}
        onConfirm={handleConfirmLogout}
      />
    </div>
  );
}

export default AdminLayout;
