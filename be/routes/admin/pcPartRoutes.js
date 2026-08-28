const express = require("express");

const controller = require("../../controllers/admin/pcPartController");

const router = express.Router();

router.get("/", controller.getAllPcParts);

router.get("/:id", controller.getPcPartById);

router.post("/", controller.createPcPart);

router.put("/:id", controller.updatePcPart);

router.patch("/:id", controller.updatePcPart);

router.patch("/:id/visibility", controller.updateVisibility);

router.patch("/:id/restore", controller.restorePcPart);

router.delete("/:id", controller.deletePcPart);

module.exports = router;
