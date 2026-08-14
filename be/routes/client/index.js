const express = require("express");
const authRoutes = require("./authRoutes");
const productRoutes = require("./productRoutes");
const categoryRoutes = require("./categoryRoutes");
const cartRoutes = require("./cartRoutes");
const orderRoutes = require("./orderRoutes");
const buildRoutes = require("./buildRoutes");
const bannerRoutes = require("./bannerRoutes");
const paymentRoutes = require("./paymentRoutes");
const commentRoutes = require("./commentRoutes");
const couponRoutes = require("./couponRoutes");
const shippingRoutes = require("./shippingRoutes");
const contactRoutes = require("./contactRoutes");
const aiChatRoutes = require("./aiChatRoutes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/products", productRoutes);
router.use("/categories", categoryRoutes);
router.use("/cart", cartRoutes);
router.use("/orders", orderRoutes);
router.use("/builds", buildRoutes);
router.use("/posts", require("./postRoutes"));
router.use("/banners", bannerRoutes);
router.use("/payments", paymentRoutes);
router.use("/comments", commentRoutes);
router.use("/coupons", couponRoutes);
router.use("/shipping", shippingRoutes);
router.use("/contact", contactRoutes);
router.use("/ai", aiChatRoutes);

module.exports = router;
