const express = require("express");

const controller = require("../../controllers/client/commentController");

const { requireAuth } = require("../../middlewares/authMiddleware");

const router = express.Router();

// ======================================================
// PUBLIC
// ======================================================

// Danh sách review sản phẩm
router.get("/products/:productId", controller.getProductReviews);

// ======================================================
// AUTHENTICATED
// ======================================================

// Tạo review
router.post("/products/:productId", requireAuth, controller.createReview);

// Sửa review của chính mình
router.patch("/:id", requireAuth, controller.updateReview);

// Xóa review của chính mình
router.delete("/:id", requireAuth, controller.deleteReview);

module.exports = router;
