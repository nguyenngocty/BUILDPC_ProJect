const express = require("express");
const paymentController = require("../../controllers/client/paymentController");

const router = express.Router();

router.get("/momo-return", paymentController.momoReturn);
router.post("/momo-ipn", paymentController.momoIpn);

module.exports = router;