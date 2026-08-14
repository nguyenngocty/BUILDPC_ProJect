const express = require("express");
const controller = require("../../controllers/admin/userController");
const { requireSuperAdmin } = require("../../middlewares/adminMiddleware");

const router = express.Router();

router.get("/", controller.getUsers);
router.get("/:id", controller.getUserById);
router.post("/", controller.createUser);
router.put("/:id", controller.updateUser);
router.patch("/:id/role", requireSuperAdmin, controller.updateUserRole);
router.patch("/:id/status", controller.updateUserStatus);
router.delete("/:id", controller.deleteUser);

module.exports = router;