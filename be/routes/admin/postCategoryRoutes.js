const express = require("express");

const controller = require("../../controllers/admin/postCategoryController");

const router = express.Router();

// ============================================================
// POST CATEGORY ADMIN
// ============================================================

// Dropdown
router.get("/active", controller.getActivePostCategories);

// Trash
router.get("/trash", controller.getTrashPostCategories);

// List
router.get("/", controller.getAllPostCategories);

// Detail
router.get("/:id", controller.getPostCategoryById);

// Create
router.post("/", controller.createPostCategory);

// Update
router.put("/:id", controller.updatePostCategory);

router.patch("/:id", controller.updatePostCategory);

// Toggle status
router.patch("/:id/toggle-status", controller.togglePostCategoryStatus);

// Restore
router.patch("/:id/restore", controller.restorePostCategory);

// Soft delete
router.delete("/:id", controller.deletePostCategory);

module.exports = router;
