const express = require("express");

const categoryController = require("../../controllers/admin/categoryController");

const uploadCategory = require("../../middlewares/uploadCategory");

const router = express.Router();

// ============================================================
// CATEGORY STATISTICS
// ============================================================

router.get("/statistics", categoryController.getCategoryStatistics);

// ============================================================
// TRASH
// ============================================================

router.get("/trash", categoryController.getTrashCategories);

// ============================================================
// BULK ACTIONS
// ============================================================

router.delete("/bulk-delete", categoryController.bulkDeleteCategories);

router.patch("/bulk-restore", categoryController.bulkRestoreCategories);

router.delete(
  "/bulk-force-delete",
  categoryController.bulkForceDeleteCategories,
);

router.patch("/bulk-toggle-status", categoryController.bulkToggleStatus);

// ============================================================
// LIST
// ============================================================

router.get("/", categoryController.getAllCategories);

// ============================================================
// CREATE
// ============================================================

router.post(
  "/",
  uploadCategory.single("image"),
  categoryController.createCategory,
);

// ============================================================
// DETAIL
// ============================================================

router.get("/:id", categoryController.getCategoryById);

// ============================================================
// UPDATE
// ============================================================

router.put(
  "/:id",
  uploadCategory.single("image"),
  categoryController.updateCategory,
);

// ============================================================
// RESTORE
// ============================================================

router.patch("/:id/restore", categoryController.restoreCategory);

// ============================================================
// TOGGLE STATUS
// ============================================================

router.patch("/:id/toggle-status", categoryController.toggleCategoryStatus);

// ============================================================
// FORCE DELETE
// ============================================================

router.delete("/:id/force", categoryController.forceDeleteCategory);

// ============================================================
// SOFT DELETE
// ============================================================

router.delete("/:id", categoryController.deleteCategory);

module.exports = router;
