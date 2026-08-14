import { Route, Routes } from "react-router-dom";

import ProtectedAccountRoute from "./ProtectedAccountRoute";
import OrderSuccess from "../views/pages/OrderSuccess/OrderSuccess";
import Home from "../views/pages/Home/Home";
import Cart from "../views/pages/Cart/Cart";
import About from "../views/pages/About/About";
import Checkout from "../views/pages/Checkout/Checkout";
import ReorderCheckout from "../views/pages/Checkout/ReorderCheckout";
import AdminRoutes from "./AdminRoutes";
import Blog from "../views/pages/Blog/Blog";
import BlogDetail from "../views/pages/Blog/BlogDetail";
import Contact from "../views/pages/Contact/Contact";
import Products from "../views/pages/Product/Product";
import ProductDetail from "../views/pages/ProductDetail/ProductDetail";
import AccountProfile from "../views/pages/Account/AccountProfile";
import AccountChangePassword from "../views/pages/Account/AccountChangePassword";
import AccountLayout from "../views/pages/Account/AccountLayout";
import AccountOrders from "../views/pages/Account/AccountOrders";
import AccountOrderDetail from "../views/pages/Account/AccountOrderDetail";
import ResetPassword from "../views/pages/Auth/ResetPassword";
import BuildPC from "../views/pages/BuildPC/BuildPC";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />

      <Route path="/order-success" element={<OrderSuccess />} />

      <Route path="/cart" element={<Cart />} />

      <Route path="/about" element={<About />} />

      <Route path="/checkout" element={<Checkout />} />

      <Route path="/blog" element={<Blog />} />

      <Route path="/blog/:id" element={<BlogDetail />} />

      <Route path="/contact" element={<Contact />} />

      <Route path="/products" element={<Products />} />

      <Route path="/products/:slug" element={<ProductDetail />} />

      <Route path="/build-pc" element={<BuildPC />} />

      <Route path="/reset-password" element={<ResetPassword />} />

      <Route element={<ProtectedAccountRoute />}>
        <Route path="/checkout/reorder/:id" element={<ReorderCheckout />} />

        <Route element={<AccountLayout />}>
          <Route path="/account/profile" element={<AccountProfile />} />

          <Route
            path="/account/change-password"
            element={<AccountChangePassword />}
          />

          <Route path="/account/orders" element={<AccountOrders />} />

          <Route path="/account/orders/:id" element={<AccountOrderDetail />} />
        </Route>
      </Route>

      <Route path="/admin/*" element={<AdminRoutes />} />

      <Route path="*" element={<Home />} />
    </Routes>
  );
}

export default AppRoutes;
