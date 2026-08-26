const express = require("express");

const controller = require("../../controllers/client/productController");

const { requireAuth } = require("../../middlewares/authMiddleware");

const router = express.Router();

// ============================================================
// CLIENT PRODUCTS
// ============================================================

// ------------------------------------------------------------
// GET /api/client/products
// Danh sách sản phẩm
// ------------------------------------------------------------

router.get("/", controller.getAllProducts);

// ------------------------------------------------------------
// GET /api/client/products/search-suggestions?q=...
//
// QUAN TRỌNG:
// Route cố định phải đứng trước /:slug.
// ------------------------------------------------------------

router.get("/search-suggestions", controller.getSearchSuggestions);

// ------------------------------------------------------------
// GET /api/client/products/top-sellers
// ------------------------------------------------------------

router.get("/top-sellers", controller.getTopSellingProducts);

// ============================================================
// COMMENTS
// ============================================================

// ------------------------------------------------------------
// GET /api/client/products/comments/:id
// ------------------------------------------------------------

router.get("/comments/:id(\\d+)", controller.getProductComments);

// ------------------------------------------------------------
// POST /api/client/products/comments
// Yêu cầu đăng nhập.
// ------------------------------------------------------------

router.post("/comments", requireAuth, controller.createProductComment);

// ============================================================
// PRODUCT DETAIL
//
// PHẢI ĐỂ CUỐI.
// Nếu đặt /:slug phía trên:
//
// /search-suggestions
// /top-sellers
//
// có thể bị hiểu thành slug.
// ============================================================

router.get("/:slug", controller.getProductBySlug);

module.exports = router;
