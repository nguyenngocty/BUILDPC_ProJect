const express = require("express");

const controller = require(
    "../../controllers/client/ghnShippingController"
);

const router = express.Router();

router.get("/status", controller.getStatus);

router.get(
    "/provinces",
    controller.getProvinces
);

router.get(
    "/districts/:provinceId",
    controller.getDistricts
);

router.get(
    "/wards/:districtId",
    controller.getWards
);

router.post(
    "/services",
    controller.getServices
);

router.post(
    "/fee",
    controller.calculateFee
);

router.post(
    "/lead-time",
    controller.calculateLeadTime
);

module.exports = router;