const express = require(
    "express",
);

const controller = require(
    "../../controllers/client/couponController",
);

const router =
    express.Router();

// Danh sách coupon để user xem
router.get(
    "/available",
    controller.getAvailableCoupons,
);

// Kiểm tra và áp dụng coupon
router.post(
    "/validate",
    controller.validateCoupon,
);

module.exports = router;