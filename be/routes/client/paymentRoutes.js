const express = require("express");

const router = express.Router();

const paymentController = require(
    "../../controllers/client/paymentController",
);

// =========================
// MOMO
// =========================

router.get(
    "/momo-return",
    paymentController.momoReturn,
);

router.post(
    "/momo-ipn",
    paymentController.momoIpn,
);

// =========================
// ZALOPAY
// =========================

router.get(
    "/zalopay-return",
    paymentController.zalopayReturn,
);

router.post(
    "/zalopay-callback",
    paymentController.zalopayCallback,
);

module.exports = router;