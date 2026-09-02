const express = require("express");

const controller = require("../../controllers/client/productController");

const router = express.Router();

// ============================================================
// CLIENT PRODUCTS
// ============================================================

// ------------------------------------------------------------
// GET /api/client/products
//
// Danh sách sản phẩm.
// ------------------------------------------------------------

router.get("/", controller.getAllProducts);

// ------------------------------------------------------------
// GET /api/client/products/search-suggestions?q=...
//
// Route cố định phải đứng trước /:slug.
// ------------------------------------------------------------

router.get("/search-suggestions", controller.getSearchSuggestions);

// ------------------------------------------------------------
// GET /api/client/products/top-sellers
// ------------------------------------------------------------

router.get("/top-sellers", controller.getTopSellingProducts);

// ============================================================
// PRODUCT DETAIL
//
// PHẢI ĐỂ CUỐI.
//
// Nếu đặt /:slug phía trên các route cố định:
//
// /search-suggestions
// /top-sellers
//
// Express có thể hiểu chúng thành slug.
// ============================================================

router.get("/:slug", controller.getProductBySlug);

module.exports = router;
