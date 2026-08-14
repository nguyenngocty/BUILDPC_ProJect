const express = require("express");

const controller = require(
  "../../controllers/client/shippingController",
);

const router = express.Router();

// ======================================================
// CLIENT SHIPPING ROUTES
// ======================================================

// GET /client/shipping/rates
// Lấy danh sách tỉnh/thành đang hỗ trợ giao hàng
router.get(
  "/rates",
  controller.getActiveShippingRates,
);

// POST /client/shipping/calculate
// Tính phí vận chuyển theo tỉnh/thành + subtotal
router.post(
  "/calculate",
  controller.calculateShippingFee,
);

module.exports = router;