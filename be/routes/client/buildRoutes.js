const express = require("express");

const buildController = require("../../controllers/client/buildController");
const pcPartController = require("../../controllers/client/pcPartController");
const pcPartTypeController = require("../../controllers/client/pcPartTypeController");

const router = express.Router();

router.get("/part-types", pcPartTypeController.getPcPartTypes);

router.get("/parts", pcPartController.getPcParts);

router.get(
    "/parts/type/:typeId",
    pcPartController.getPcPartsByType
);

router.post("/", buildController.saveBuild);
router.get("/", buildController.getMyBuilds);

module.exports = router;