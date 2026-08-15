const express = require("express");
const router = express.Router();
const pcBuildController = require("../../controllers/admin/pcBuildController");

// Trỏ đúng về hàm getAllComponents thay vì getProductsByCategory
router.get("/components", pcBuildController.getAllComponents);
router.get("/categories", pcBuildController.getBuildCategories);
router.put("/components/:id/visibility", pcBuildController.toggleVisibility);
router.get("/", pcBuildController.getAllBuilds);
router.post("/", pcBuildController.createBuild);
router.put("/:id", pcBuildController.updateBuild);
router.delete("/:id", pcBuildController.deleteBuild);
router.put("/:id/status", pcBuildController.updateBuildStatus);
module.exports = router;