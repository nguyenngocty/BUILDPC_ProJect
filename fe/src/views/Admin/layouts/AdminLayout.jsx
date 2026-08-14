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

  const handleToggleSidebar = () => {
    if (window.innerWidth <= 991.98) {
      setIsSidebarOpen((current) => !current);
      return;
    }

    setIsSidebarCollapsed((current) => !current);
  };

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

  const handleOpenLogout = () => {
    setIsAccountOpen(false);
    setIsLogoutOpen(true);
  };

  const handleConfirmLogout = () => {
    setIsLogoutOpen(false);
    logout();
    navigate("/", { replace: true });
    toast.success("Đăng xuất trang quản trị thành công!");
  };

  const handleNavigate = () => {
    if (window.innerWidth <= 991.98) {
      setIsSidebarOpen(false);
    }
  };

  useEffect(() => {
    document.body.classList.toggle("logout-modal-open", isLogoutOpen);

    return () => {
      document.body.classList.remove("logout-modal-open");
    };
  }, [isLogoutOpen]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;

      if (isLogoutOpen) {
        setIsLogoutOpen(false);
        return;
      }

      setIsAccountOpen(false);
      setIsSidebarOpen(false);
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isLogoutOpen]);

  return (
    <div
      className={[
        "admin-layout",
        isSidebarCollapsed && "sidebar-collapsed",
        isSidebarOpen && "sidebar-open",
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

      <main className="admin-main">
        <Outlet />
      </main>

      <LogoutModal
        isOpen={isLogoutOpen}
        onClose={() => setIsLogoutOpen(false)}
        onConfirm={handleConfirmLogout}
      />
    </div>
  );
}

export default AdminLayout;