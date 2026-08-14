const express = require(
  "express"
);

const cartController = require(
  "../../controllers/client/cartController"
);

const {
  requireAuth,
} = require(
  "../../middlewares/authMiddleware"
);

const router =
  express.Router();

router.use(requireAuth);

router.get(
  "/",
  cartController.getCart
);

router.post(
  "/add",
  cartController.addToCart
);

router.put(
  "/items/:itemId",
  cartController.updateCartItem
);

router.delete(
  "/items/:itemId",
  cartController.removeCartItem
);

router.delete(
  "/clear",
  cartController.clearCart
);

module.exports = router;