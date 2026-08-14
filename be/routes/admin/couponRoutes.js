const express = require("express");
const controller = require("../../controllers/admin/couponController");

const router = express.Router();

router.get("/", controller.getAllCoupons);
router.get("/:id", controller.getCouponById);
router.post("/", controller.createCoupon);
router.patch("/:id", controller.updateCoupon);
router.delete("/:id", controller.deleteCoupon);

module.exports = router;