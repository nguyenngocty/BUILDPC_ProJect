const express = require("express");
const controller = require("../../controllers/admin/pcPartTypeController");

const router = express.Router();

router.get("/", controller.getAllPcPartTypes);
router.get("/:id", controller.getPcPartTypeById);
router.post("/", controller.createPcPartType);
router.patch("/:id", controller.updatePcPartType);
router.delete("/:id", controller.deletePcPartType);

module.exports = router;