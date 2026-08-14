const express = require("express");
const controller = require("../../controllers/admin/dashboardController");

const router = express.Router();

/*
  GET /api/admin/dashboard/summary
  Ví dụ:
  /api/admin/dashboard/summary
  /api/admin/dashboard/summary?range=30d
  /api/admin/dashboard/summary?range=90d
*/
router.get("/summary", controller.getDashboardSummary);

module.exports = router;