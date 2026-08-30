const express = require("express");

const controller = require("../../controllers/admin/authController");

const { requireAuth } = require("../../middlewares/authMiddleware");

const { requireAdmin } = require("../../middlewares/adminMiddleware");

const router = express.Router();

// ============================================================
// PUBLIC ADMIN AUTH
// ============================================================

router.post("/login", controller.login);

// ============================================================
// PROTECTED ADMIN AUTH
// ============================================================

router.get("/me", requireAuth, requireAdmin, controller.getCurrentAdmin);

module.exports = router;
