const express = require("express");
const controller = require("../../controllers/client/productController");

const router = express.Router();

router.get("/", controller.getAllProducts);

router.get("/top-sellers", controller.getTopSellingProducts);

router.get("/:slug", controller.getProductBySlug);

module.exports = router;    