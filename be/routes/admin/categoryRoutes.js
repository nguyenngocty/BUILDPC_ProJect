const express = require("express");

const router = express.Router();

const categoryController = require("../../controllers/admin/categoryController");

const uploadCategory = require("../../middlewares/uploadCategory");

// Dashboard
router.get("/statistics", categoryController.getCategoryStatistics);

// Trash
router.get("/trash", categoryController.getTrashCategories);

// Bulk Delete
router.delete("/bulk-delete", categoryController.bulkDeleteCategories);

// Bulk Restore
router.patch("/bulk-restore", categoryController.bulkRestoreCategories);

// Xoá hàng loạt danh mục

router.delete(
  "/bulk-force-delete",
  categoryController.bulkForceDeleteCategories,
);

// Danh sách
router.get("/", categoryController.getAllCategories);

// Chi tiết
router.get("/:id", categoryController.getCategoryById);

// Thêm
router.post(
  "/",
  uploadCategory.single("image"),
  categoryController.createCategory,
);

// Sửa
router.put(
  "/:id",
  uploadCategory.single("image"),
  categoryController.updateCategory,
);

// Soft Delete
router.delete("/:id", categoryController.deleteCategory);

// Restore
router.patch("/:id/restore", categoryController.restoreCategory);

// Force Delete
router.delete("/:id/force", categoryController.forceDeleteCategory);

// Chuyển đổi trạng thái hàng loạt
router.patch("/bulk-toggle-status", categoryController.bulkToggleStatus);

// Toggle Status
router.patch("/:id/toggle-status", categoryController.toggleCategoryStatus);

module.exports = router;
