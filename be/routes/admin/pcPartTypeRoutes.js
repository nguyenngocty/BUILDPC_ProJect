const express = require("express");

const controller = require("../../controllers/admin/pcPartTypeController");

const router = express.Router();

router.get("/active", controller.getActivePcPartTypes);

router.get("/", controller.getAllPcPartTypes);

router.get("/:id", controller.getPcPartTypeById);

router.post("/", controller.createPcPartType);

router.put("/:id", controller.updatePcPartType);

router.patch("/:id", controller.updatePcPartType);

router.delete("/:id", controller.deletePcPartType);

module.exports = router;
