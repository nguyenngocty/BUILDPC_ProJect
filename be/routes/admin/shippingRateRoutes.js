const express = require("express");

const controller = require(
    "../../controllers/admin/shippingRateController",
);

const router = express.Router();

// ======================================================
// ADMIN SHIPPING RATE ROUTES
// ======================================================

// GET /admin/shipping-rates
// Lấy danh sách phí vận chuyển
router.get(
    "/",
    controller.getAllShippingRates,
);

// GET /admin/shipping-rates/:id
// Lấy chi tiết một tỉnh/thành
router.get(
    "/:id",
    controller.getShippingRateById,
);

// POST /admin/shipping-rates
// Thêm mới phí vận chuyển
router.post(
    "/",
    controller.createShippingRate,
);

// PATCH /admin/shipping-rates/:id
// Cập nhật phí vận chuyển
router.patch(
    "/:id",
    controller.updateShippingRate,
);

// PATCH /admin/shipping-rates/:id/status
// Bật / tắt khu vực vận chuyển
router.patch(
    "/:id/status",
    controller.updateShippingRateStatus,
);

// DELETE /admin/shipping-rates/:id
// Xóa mềm khu vực vận chuyển
router.delete(
    "/:id",
    controller.deleteShippingRate,
);

module.exports = router;