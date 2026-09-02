const express = require("express");

const controller = require("../../controllers/client/shippingController");

const router = express.Router();

// ============================================================
// GHN STATUS
//
// GET /api/client/shipping/ghn/status
// ============================================================

router.get("/ghn/status", controller.getGhnStatus);

// ============================================================
// GHN PROVINCES
//
// GET /api/client/shipping/ghn/provinces
// ============================================================

router.get("/ghn/provinces", controller.getGhnProvinces);

// ============================================================
// GHN DISTRICTS
//
// GET /api/client/shipping/ghn/districts/:provinceId
// ============================================================

router.get("/ghn/districts/:provinceId", controller.getGhnDistricts);

// ============================================================
// GHN WARDS
//
// GET /api/client/shipping/ghn/wards/:districtId
// ============================================================

router.get("/ghn/wards/:districtId", controller.getGhnWards);

// ============================================================
// GHN FEE
//
// POST /api/client/shipping/ghn/fee
// ============================================================

router.post("/ghn/fee", controller.calculateGhnFee);

// ============================================================
// GHN LEAD TIME
//
// POST /api/client/shipping/ghn/lead-time
// ============================================================

router.post("/ghn/lead-time", controller.calculateGhnLeadTime);

// ============================================================
// GHN FULL QUOTE
//
// POST /api/client/shipping/ghn/quote
// ============================================================

router.post("/ghn/quote", controller.getGhnQuote);

module.exports = router;
