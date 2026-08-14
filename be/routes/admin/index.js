const express = require("express");

const authRoutes = require("./authRoutes");
const dashboardRoutes = require("./dashboardRoutes");
const productRoutes = require("./productRoutes");
const categoryRoutes = require("./categoryRoutes");
const orderRoutes = require("./orderRoutes");
const userRoutes = require("./userRoutes");
const postRoutes = require("./postRoutes");
const bannerRoutes = require("./bannerRoutes");
const pcBuildRoutes = require("./pcBuildRoutes");
const commentRoutes = require("./commentRoutes");
const { requireAuth } = require("../../middlewares/authMiddleware");
const { requireAdmin } = require("../../middlewares/adminMiddleware");
const couponRoutes = require("./couponRoutes");
const pcPartTypeRoutes = require("./pcPartTypeRoutes");
const pcPartRoutes = require("./pcPartRoutes");
const shippingRateRoutes = require("./shippingRateRoutes");

const router = express.Router();

router.use("/auth", authRoutes);

// Tất cả API phía dưới đều yêu cầu ADMIN hoặc SUPER_ADMIN.
router.use(requireAuth);
router.use(requireAdmin);

router.use("/dashboard", dashboardRoutes);
router.use("/products", productRoutes);
router.use("/categories", categoryRoutes);
router.use("/orders", orderRoutes);
router.use("/users", userRoutes);
router.use("/posts", postRoutes);
router.use("/banners", bannerRoutes);
router.use("/comments", commentRoutes);
router.use("/pc-builds", pcBuildRoutes);
router.use("/coupons", couponRoutes);
router.use("/pc-part-types", pcPartTypeRoutes);
router.use("/pc-parts", pcPartRoutes);
router.use("/shipping-rates", shippingRateRoutes);

module.exports = router;
