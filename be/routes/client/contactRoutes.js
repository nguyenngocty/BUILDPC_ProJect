const express = require("express");

const controller = require(
  "../../controllers/client/contactController"
);

const router = express.Router();
router.get(
  "/options",
  controller.getContactOptions
);

router.post(
  "/",
  controller.createContactRequest
);

module.exports = router;