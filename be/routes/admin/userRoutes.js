const express = require("express");

const controller = require("../../controllers/admin/userController");

const { requireSuperAdmin } = require("../../middlewares/adminMiddleware");

const router = express.Router();

// ============================================================
// ADMIN USER MANAGEMENT
//
// Lưu ý:
// requireAuth + requireAdmin đã được áp dụng tại:
// routes/admin/index.js
// ============================================================

// ------------------------------------------------------------
// GET USERS
//
// GET /api/admin/users
// ------------------------------------------------------------

router.get("/", controller.getUsers);

// ------------------------------------------------------------
// CREATE USER
//
// POST /api/admin/users
//
// ADMIN:
// - tạo CUSTOMER
//
// SUPER_ADMIN:
// - tạo CUSTOMER
// - tạo ADMIN
//
// Controller chịu trách nhiệm kiểm tra role.
// ------------------------------------------------------------

router.post("/", controller.createUser);

// ------------------------------------------------------------
// UPDATE ROLE
//
// PATCH /api/admin/users/:id/role
//
// Chỉ SUPER_ADMIN.
// ------------------------------------------------------------

router.patch("/:id/role", requireSuperAdmin, controller.updateUserRole);

// ------------------------------------------------------------
// UPDATE STATUS
//
// PATCH /api/admin/users/:id/status
//
// Permission hierarchy được kiểm tra trong controller.
// ------------------------------------------------------------

router.patch("/:id/status", controller.updateUserStatus);

// ------------------------------------------------------------
// GET USER DETAIL
//
// GET /api/admin/users/:id
// ------------------------------------------------------------

router.get("/:id", controller.getUserById);

// ------------------------------------------------------------
// UPDATE USER
//
// PUT /api/admin/users/:id
// ------------------------------------------------------------

router.put("/:id", controller.updateUser);

// ------------------------------------------------------------
// DELETE USER
//
// DELETE /api/admin/users/:id
//
// Soft delete.
// ------------------------------------------------------------

router.delete("/:id", controller.deleteUser);

module.exports = router;
