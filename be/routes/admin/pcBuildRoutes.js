const express = require("express");
const router = express.Router();
const pcBuildController = require("../../controllers/admin/pcBuildController");

// ==========================================
// ĐƯA ROUTE NÀY LÊN ĐẦU TIÊN ĐỂ TRÁNH BỊ ĐÈ
// ==========================================
router.get("/components", pcBuildController.getProductsByCategory);
// GET: http://localhost:5000/api/admin/pc-builds/categories
router.get("/categories", pcBuildController.getBuildCategories);

// Các routes còn lại giữ nguyên bên dưới
router.get("/", pcBuildController.getAllBuilds);
router.post("/", pcBuildController.createBuild);
router.put("/:id", pcBuildController.updateBuild);
router.delete("/:id", pcBuildController.deleteBuild);

module.exports = router;