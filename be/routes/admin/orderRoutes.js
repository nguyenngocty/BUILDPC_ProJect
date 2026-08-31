const express = require("express");

const orderController = require("../../controllers/admin/orderController");

const router = express.Router();

// ============================================================
// ADMIN ORDERS
//
// Auth + Admin middleware đã được áp dụng ở:
// routes/admin/index.js
// ============================================================

// ============================================================
// LIST
//
// GET /api/admin/orders
//
// Query:
// ?page=1
// ?limit=10
// ?keyword=...
// ?status=PENDING
// ?payment_method=cod
// ?payment_status=0
// ?from_date=2026-09-01
// ?to_date=2026-09-30
// ============================================================

router.get("/", orderController.getOrders);

// ============================================================
// INVOICE
//
// GET /api/admin/orders/:id/invoice
//
// Phải đứng trước /:id.
// ============================================================

router.get("/:id/invoice", orderController.getInvoice);

// ============================================================
// UPDATE STATUS
//
// PATCH /api/admin/orders/:id/status
// ============================================================

router.patch("/:id/status", orderController.updateOrderStatus);

// ============================================================
// UPDATE PAYMENT STATUS
//
// PATCH /api/admin/orders/:id/payment-status
// ============================================================

router.patch("/:id/payment-status", orderController.updatePaymentStatus);

// ============================================================
// DETAIL
//
// GET /api/admin/orders/:id
//
// Route động để cuối.
// ============================================================

router.get("/:id", orderController.getOrderById);

module.exports = router;
