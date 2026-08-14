const express = require("express");
const controller = require("../../controllers/client/productController");

const router = express.Router();

router.get("/", controller.getAllProducts);
router.get("/:slug", controller.getProductBySlug);

module.exports = router;
