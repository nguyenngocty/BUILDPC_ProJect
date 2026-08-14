const express = require(
  "express"
);

const orderController = require(
  "../../controllers/client/orderController"
);

const {
  requireAuth,
} = require(
  "../../middlewares/authMiddleware"
);

const router =
  express.Router();

router.post(
  "/",
  orderController.createOrder
);

router.get(
  "/",
  requireAuth,
  orderController.getOrders
);

router.patch(
  "/:id/cancel",
  requireAuth,
  orderController.cancelOrder
);

router.get(
  "/:id/reorder-checkout",
  requireAuth,
  orderController.getReorderCheckout
);

router.post(
  "/:id/reorder-checkout",
  requireAuth,
  orderController.createReorderCheckout
);

router.get(
  "/:id",
  requireAuth,
  orderController.getOrderById
);

module.exports = router;