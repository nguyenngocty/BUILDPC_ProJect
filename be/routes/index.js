const express = require("express");
const healthRoutes = require("./healthRoutes");
const clientRoutes = require("./client");
const adminRoutes = require("./admin");

const router = express.Router();

router.use("/health", healthRoutes);
router.use("/client", clientRoutes);
router.use("/admin", adminRoutes);

module.exports = router;
