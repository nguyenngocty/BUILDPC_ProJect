import { Route, Routes } from "react-router-dom";

import ProtectedAdminRoute from "./ProtectedAdminRoute";

import AdminLayout from "../views/Admin/layouts/AdminLayout";

import AdminDashboard from "../views/Admin/pages/Dashboard/AdminDashboard";

import ProductManagement from "../views/Admin/pages/Products/ProductManagement";

import UserManagement from "../views/Admin/pages/Users/UserManagement";

import PostManagement from "../views/Admin/pages/Post/PostManagement";

import PostForm from "../views/Admin/pages/Post/PostForm";

import PostCategoryManagement from "../views/Admin/pages/Post/PostCategoryManagement";

import BannerManagement from "../views/Admin/pages/Banners/BannerManagement";

import OrderManagement from "../views/Admin/pages/Orders/OrderManagement";

import PCBuilderAdmin from "../views/Admin/pages/Builds/PCBuilderAdmin";

import CategoryManagement from "../views/Admin/pages/Categories/CategoryManagement";

import Comments from "../views/Admin/pages/Comments/Comments";

import CouponManagement from "../views/Admin/pages/Coupons/CouponManagement";

import PcPartManagement from "../views/Admin/pages/PcParts/PcPartManagement";

import AdminProfile from "../views/Admin/pages/Profile/AdminProfile";

import AdminChangePassword from "../views/Admin/pages/Profile/AdminChangePassword";

function AdminRoutes() {
  return (
    <Routes>
      <Route element={<ProtectedAdminRoute />}>
        <Route element={<AdminLayout />}>
          {/* DASHBOARD */}

          <Route index element={<AdminDashboard />} />

          {/* PRODUCT CATEGORY */}

          <Route path="categories" element={<CategoryManagement />} />

          {/* PRODUCTS */}

          <Route path="products" element={<ProductManagement />} />

          {/* USERS */}

          <Route path="users" element={<UserManagement />} />

          {/* =================================================
              POSTS
          ================================================= */}

          <Route path="posts" element={<PostManagement />} />

          <Route path="posts/create" element={<PostForm />} />

          <Route path="posts/edit/:id" element={<PostForm isEdit />} />

          <Route path="post-categories" element={<PostCategoryManagement />} />

          {/* BUILD PC */}

          <Route path="builds" element={<PCBuilderAdmin />} />

          {/* BANNERS */}

          <Route path="banners" element={<BannerManagement />} />

          {/* ORDERS */}

          <Route path="orders" element={<OrderManagement />} />

          {/* COMMENTS */}

          <Route path="comments" element={<Comments />} />

          {/* COUPONS */}

          <Route path="coupons" element={<CouponManagement />} />

          {/* PC PARTS */}

          <Route path="pc-parts" element={<PcPartManagement />} />

          {/* PROFILE */}

          <Route path="profile" element={<AdminProfile />} />

          <Route path="change-password" element={<AdminChangePassword />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default AdminRoutes;
