import { Route, Routes } from "react-router-dom";

import ProtectedAdminRoute from "./ProtectedAdminRoute";
import AdminLayout from "../views/Admin/layouts/AdminLayout";
import AdminDashboard from "../views/Admin/pages/Dashboard/AdminDashboard";
import ProductManagement from "../views/Admin/pages/Products/ProductManagement";
import UserManagement from "../views/Admin/pages/Users/UserManagement";
import PostManagement from "../views/Admin/pages/Post/PostManagement";
import PostForm from "../views/Admin/pages/Post/PostForm";
import BannerManagement from "../views/Admin/pages/Banners/BannerManagement";
import OrderManagement from "../views/Admin/pages/Orders/OrderManagement";
import PCBuilderAdmin from "../views/Admin/pages/Builds/PCBuilderAdmin";
import CategoryManagement from "../views/Admin/pages/Categories/CategoryManagement";
import Comments from "../views/Admin/pages/Comments/Comments";
import CouponManagement from "../views/Admin/pages/Coupons/CouponManagement";
import PcPartManagement from "../views/Admin/pages/PcParts/PcPartManagement";
import ShippingManagement from "../views/Admin/pages/Shipping/ShippingManagement";

// Hai trang tài khoản quản trị
import AdminProfile from "../views/Admin/pages/Profile/AdminProfile";
import AdminChangePassword from "../views/Admin/pages/Profile/AdminChangePassword";

function AdminRoutes() {
  return (
    <Routes>
      <Route element={<ProtectedAdminRoute />}>
        <Route element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />

          <Route path="categories" element={<CategoryManagement />} />

          <Route path="products" element={<ProductManagement />} />

          <Route path="users" element={<UserManagement />} />

          <Route path="posts" element={<PostManagement />} />

          <Route path="builds" element={<PCBuilderAdmin />} />

          <Route path="posts/create" element={<PostForm />} />

          <Route path="posts/edit/:id" element={<PostForm isEdit />} />

          <Route path="banners" element={<BannerManagement />} />

          <Route path="orders" element={<OrderManagement />} />

          <Route path="comments" element={<Comments />} />

          {/* /admin/coupons */}
          <Route path="coupons" element={<CouponManagement />} />
          {/* /admin/pc-parts */}
          <Route path="pc-parts" element={<PcPartManagement />} />
          {/* /admin/shipping */}
          <Route path="shipping" element={<ShippingManagement />} />


          {/* Thông tin tài khoản quản trị */}
          <Route path="profile" element={<AdminProfile />} />

          {/* Đổi mật khẩu quản trị */}
          <Route path="change-password" element={<AdminChangePassword />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default AdminRoutes;
