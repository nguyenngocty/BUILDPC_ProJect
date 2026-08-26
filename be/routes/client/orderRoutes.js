const express = require("express");

const orderController = require("../../controllers/client/orderController");

const { requireAuth } = require("../../middlewares/authMiddleware");

const router = express.Router();

// ============================================================
// CLIENT ORDERS
//
// Toàn bộ nghiệp vụ đơn hàng đều thuộc tài khoản người dùng.
// Vì vậy tất cả route bên dưới đều bắt buộc đăng nhập.
//
// Sau khi requireAuth chạy:
//
// req.user = user;
// req.auth = {
//   userId,
//   tokenPayload
// };
//
// Controller không cần tin user_id do Client gửi lên.
// ============================================================

router.use(requireAuth);

// ============================================================
// CREATE ORDER
//
// POST /api/client/orders
// ============================================================

router.post("/", orderController.createOrder);

// ============================================================
// GET USER ORDERS
//
// GET /api/client/orders
// ============================================================

router.get("/", orderController.getOrders);

// ============================================================
// CANCEL ORDER
//
// PATCH /api/client/orders/:id/cancel
// ============================================================

router.patch("/:id/cancel", orderController.cancelOrder);

// ============================================================
// REORDER CHECKOUT PREVIEW
//
// GET /api/client/orders/:id/reorder-checkout
// ============================================================

router.get("/:id/reorder-checkout", orderController.getReorderCheckout);

// ============================================================
// CREATE REORDER
//
// POST /api/client/orders/:id/reorder-checkout
// ============================================================

router.post("/:id/reorder-checkout", orderController.createReorderCheckout);

// ============================================================
// ORDER DETAIL
//
// GET /api/client/orders/:id
//
// Route động nên để cuối.
// ============================================================

router.get("/:id", orderController.getOrderById);

module.exports = router;
