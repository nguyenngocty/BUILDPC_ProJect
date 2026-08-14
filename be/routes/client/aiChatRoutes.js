const express = require("express");

const controller = require(
    "../../controllers/client/aiChatController"
);

const router = express.Router();


router.get(
    "/status",
    controller.getAIStatus
);

router.post(
    "/chat",
    controller.chat
);

module.exports = router;