const express = require("express");
const orderController = require("../../controllers/admin/orderController");

const router = express.Router();

// Lấy danh sách đơn hàng admin
router.get("/", orderController.getOrders);

// Xuất / in hóa đơn
router.get("/:id/invoice", orderController.getInvoice);

// Lấy chi tiết đơn hàng
router.get("/:id", orderController.getOrderById);

// Cập nhật trạng thái đơn hàng
router.patch("/:id/status", orderController.updateOrderStatus);

module.exports = router;