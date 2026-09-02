const express = require("express");

const controller = require("../../controllers/client/ghnShippingController");

const router = express.Router();

// ============================================================
// GHN
// ============================================================

router.get("/status", controller.getStatus);

router.get("/provinces", controller.getProvinces);

router.get("/districts/:provinceId", controller.getDistricts);

router.get("/wards/:districtId", controller.getWards);

router.post("/services", controller.getServices);

router.post("/fee", controller.calculateFee);

router.post("/lead-time", controller.calculateLeadTime);

/*
 * Endpoint mới.
 *
 * FE có thể lấy:
 * - validate tỉnh/huyện/xã
 * - service
 * - phí
 * - leadtime
 *
 * bằng một request.
 */
router.post("/quote", controller.getQuote);

module.exports = router;
