const express = require("express");
const controller = require("../../controllers/admin/pcPartController");

const router = express.Router();

router.get("/", controller.getAllPcParts);
router.get("/:id", controller.getPcPartById);
router.post("/", controller.createPcPart);
router.patch("/:id", controller.updatePcPart);
router.delete("/:id", controller.deletePcPart);

module.exports = router;