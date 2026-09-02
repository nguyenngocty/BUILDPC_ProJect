const express = require("express");

const authRoutes = require("./authRoutes");
const dashboardRoutes = require("./dashboardRoutes");
const productRoutes = require("./productRoutes");
const categoryRoutes = require("./categoryRoutes");
const orderRoutes = require("./orderRoutes");
const userRoutes = require("./userRoutes");

const postRoutes = require("./postRoutes");
const postCategoryRoutes = require("./postCategoryRoutes");

const bannerRoutes = require("./bannerRoutes");
const pcBuildRoutes = require("./pcBuildRoutes");
const commentRoutes = require("./commentRoutes");
const couponRoutes = require("./couponRoutes");
const pcPartTypeRoutes = require("./pcPartTypeRoutes");
const pcPartRoutes = require("./pcPartRoutes");

const { requireAuth } = require("../../middlewares/authMiddleware");

const { requireAdmin } = require("../../middlewares/adminMiddleware");

const router = express.Router();

// ============================================================
// PUBLIC ADMIN AUTH
// ============================================================

router.use("/auth", authRoutes);

// ============================================================
// ADMIN AUTHORIZATION
//
// Tất cả API phía dưới yêu cầu:
// ADMIN hoặc SUPER_ADMIN
// ============================================================

router.use(requireAuth);
router.use(requireAdmin);

// ============================================================
// ADMIN MODULES
// ============================================================

router.use("/dashboard", dashboardRoutes);

router.use("/products", productRoutes);

router.use("/categories", categoryRoutes);

router.use("/orders", orderRoutes);

router.use("/users", userRoutes);

// ============================================================
// POSTS
// ============================================================

router.use("/post-categories", postCategoryRoutes);

router.use("/posts", postRoutes);

// ============================================================
// OTHER MODULES
// ============================================================

router.use("/banners", bannerRoutes);

router.use("/comments", commentRoutes);

router.use("/pc-builds", pcBuildRoutes);

router.use("/coupons", couponRoutes);

router.use("/pc-part-types", pcPartTypeRoutes);

router.use("/pc-parts", pcPartRoutes);

module.exports = router;
