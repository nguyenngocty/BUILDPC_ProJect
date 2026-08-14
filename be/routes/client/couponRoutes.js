const express = require("express");

const controller = require("../../controllers/client/couponController");

const router = express.Router();

// POST /coupons/validate
router.post("/validate", controller.validateCoupon);

module.exports = router;