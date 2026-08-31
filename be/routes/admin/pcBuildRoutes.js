const express = require("express");

const pcBuildController = require("../../controllers/admin/pcBuildController");
const uploadBuildImage = require("../../middlewares/uploadBuildImage");

const router = express.Router();

// ============================================================
// BUILD FORM SUPPORT
// ============================================================

// Danh sách nhóm linh kiện
router.get("/categories", pcBuildController.getBuildCategories);

// Danh sách linh kiện
router.get("/components", pcBuildController.getAllComponents);

// Validate cấu hình nhưng không lưu
router.post("/validate", pcBuildController.validateBuild);

// ============================================================
// BUILD LIST
// ============================================================

// Danh sách build đang hoạt động
router.get("/", pcBuildController.getAllBuilds);

// Thùng rác
// QUAN TRỌNG: phải nằm trước /:id
router.get("/trash", pcBuildController.getTrashBuilds);

// ============================================================
// CREATE
// ============================================================

router.post("/upload-image", uploadBuildImage.single("image"), pcBuildController.uploadImage);

router.post("/", pcBuildController.createBuild);

// ============================================================
// SPECIAL ACTIONS
// Các route cụ thể nên đặt trước /:id
// ============================================================

// Cập nhật trạng thái
router.patch("/:id/status", pcBuildController.updateBuildStatus);

// Bật / tắt cấu hình nổi bật
router.patch("/:id/featured", pcBuildController.updateBuildFeatured);

// Khôi phục cấu hình
router.patch("/:id/restore", pcBuildController.restoreBuild);

// ============================================================
// DETAIL
// ============================================================

router.get("/:id", pcBuildController.getBuildById);

// ============================================================
// UPDATE
// ============================================================

router.put("/:id", pcBuildController.updateBuild);

router.patch("/:id", pcBuildController.updateBuild);

// ============================================================
// DELETE
// ============================================================

router.delete("/:id", pcBuildController.deleteBuild);

module.exports = router;
