const express = require("express");

const controller = require("../../controllers/client/commentController");

const { requireAuth } = require("../../middlewares/authMiddleware");

const router = express.Router();

// ============================================================
// ORDER REVIEW
// ============================================================

router.get(
  "/orders/:orderId/items",

  requireAuth,

  controller.getOrderReviewItems,
);

// ============================================================
// MY PRODUCT REVIEW
// ============================================================

router.get(
  "/products/:productId/me",

  requireAuth,

  controller.getMyProductReview,
);

// ============================================================
// PUBLIC REVIEWS
// ============================================================

router.get(
  "/products/:productId",

  controller.getProductReviews,
);

// ============================================================
// CREATE
// ============================================================

router.post(
  "/products/:productId",

  requireAuth,

  controller.createReview,
);

// ============================================================
// UPDATE
// ============================================================

router.patch(
  "/:id",

  requireAuth,

  controller.updateReview,
);

// ============================================================
// DELETE
// ============================================================

router.delete(
  "/:id",

  requireAuth,

  controller.deleteReview,
);

module.exports = router;
