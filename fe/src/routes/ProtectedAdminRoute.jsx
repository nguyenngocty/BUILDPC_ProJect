import { Navigate, Outlet, useLocation } from "react-router-dom";
import useAuth from "../hooks/useAuth";

function ProtectedAdminRoute() {
  const location = useLocation();
  const { isAuthLoading, isAuthenticated, isAdmin } = useAuth();

  if (isAuthLoading) {
    return <div className="auth-route-loading">Đang kiểm tra phiên đăng nhập...</div>;
  }

  if (!isAuthenticated || !isAdmin) {
    return <Navigate to="/" replace state={{ from: location.pathname, authRequired: true }} />;
  }

  return <Outlet />;
}

export default ProtectedAdminRoute;