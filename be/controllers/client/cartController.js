const Cart = require("../../models/Cart");

// ============================================================
// AUTH HELPER
// ============================================================

const getAuthenticatedUserId = (req) => {
  const userId = Number.parseInt(req.user?.id, 10);

  return Number.isInteger(userId) && userId > 0 ? userId : null;
};

// ============================================================
// NORMALIZE
// ============================================================

const normalizePositiveInt = (value, defaultValue = null) => {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return defaultValue;
  }

  return parsed;
};

const normalizeNullableInt = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return null;
  }

  return parsed;
};

// ============================================================
// GET /api/client/cart
// ============================================================

exports.getCart = async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,

        message: "Bạn cần đăng nhập để sử dụng giỏ hàng.",
      });
    }

    const cart = await Cart.getCart(userId);

    return res.status(200).json({
      success: true,

      message: "Lấy giỏ hàng thành công.",

      data: cart,
    });
  } catch (error) {
    return next(error);
  }
};

// ============================================================
// POST /api/client/cart/add
//
// BODY:
//
// Sản phẩm có biến thể:
//
// {
//   "product_id": 66,
//   "variant_id": 81,
//   "quantity": 1
// }
//
// Sản phẩm không có biến thể:
//
// {
//   "product_id": 12,
//   "quantity": 1
// }
// ============================================================

exports.addToCart = async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,

        message: "Bạn cần đăng nhập để sử dụng giỏ hàng.",
      });
    }

    // ========================================================
    // PRODUCT ID
    // ========================================================

    const productId = normalizePositiveInt(req.body.product_id);

    if (!productId) {
      return res.status(400).json({
        success: false,

        message: "product_id không hợp lệ.",
      });
    }

    // ========================================================
    // VARIANT ID
    //
    // Cho phép null vì một số Product legacy
    // có thể chưa dùng biến thể.
    //
    // Cart Model sẽ tự quyết định:
    //
    // - Product có variant thật:
    //   bắt buộc variant_id.
    //
    // - Product không có variant:
    //   variant_id = null.
    // ========================================================

    const variantId = normalizeNullableInt(req.body.variant_id);

    // ========================================================
    // QUANTITY
    // ========================================================

    let quantity = normalizePositiveInt(req.body.quantity, 1);

    if (!quantity) {
      quantity = 1;
    }

    // Giới hạn để tránh request bất thường.
    if (quantity > 9999) {
      return res.status(400).json({
        success: false,

        message: "Số lượng sản phẩm không hợp lệ.",
      });
    }

    // ========================================================
    // ADD
    // ========================================================

    const cart = await Cart.addItem({
      user_id: userId,

      product_id: productId,

      variant_id: variantId,

      quantity,
    });

    return res.status(201).json({
      success: true,

      message: variantId
        ? "Thêm biến thể sản phẩm vào giỏ hàng thành công."
        : "Thêm sản phẩm vào giỏ hàng thành công.",

      data: cart,
    });
  } catch (error) {
    console.error("[CartController.addToCart]", error);

    return res.status(400).json({
      success: false,

      message: error.message || "Không thể thêm sản phẩm vào giỏ hàng.",
    });
  }
};

// ============================================================
// PUT /api/client/cart/items/:itemId
//
// BODY:
//
// {
//   "quantity": 3
// }
//
// Không cần gửi lại product_id / variant_id.
//
// Vì cart_item đã lưu:
// product_id + variant_id.
// ============================================================

exports.updateCartItem = async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,

        message: "Bạn cần đăng nhập để sử dụng giỏ hàng.",
      });
    }

    // ========================================================
    // ITEM ID
    // ========================================================

    const itemId = normalizePositiveInt(req.params.itemId);

    if (!itemId) {
      return res.status(400).json({
        success: false,

        message: "ID sản phẩm trong giỏ hàng không hợp lệ.",
      });
    }

    // ========================================================
    // QUANTITY
    // ========================================================

    if (
      req.body.quantity === undefined ||
      req.body.quantity === null ||
      req.body.quantity === ""
    ) {
      return res.status(400).json({
        success: false,

        message: "Thiếu quantity.",
      });
    }

    const quantity = Number.parseInt(req.body.quantity, 10);

    if (!Number.isInteger(quantity)) {
      return res.status(400).json({
        success: false,

        message: "Số lượng không hợp lệ.",
      });
    }

    /*
     * quantity <= 0:
     *
     * Cart.updateItemQuantity()
     * sẽ chuyển sang removeItem().
     *
     * Ta giữ behavior này để FE có thể:
     *
     * quantity = 0
     *
     * => xóa item.
     */

    if (quantity > 9999) {
      return res.status(400).json({
        success: false,

        message: "Số lượng sản phẩm không hợp lệ.",
      });
    }

    const cart = await Cart.updateItemQuantity({
      user_id: userId,

      item_id: itemId,

      quantity,
    });

    return res.status(200).json({
      success: true,

      message:
        quantity <= 0
          ? "Đã xóa sản phẩm khỏi giỏ hàng."
          : "Cập nhật giỏ hàng thành công.",

      data: cart,
    });
  } catch (error) {
    console.error("[CartController.updateCartItem]", error);

    return res.status(400).json({
      success: false,

      message: error.message || "Không thể cập nhật giỏ hàng.",
    });
  }
};

// ============================================================
// DELETE /api/client/cart/items/:itemId
// ============================================================

exports.removeCartItem = async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,

        message: "Bạn cần đăng nhập để sử dụng giỏ hàng.",
      });
    }

    const itemId = normalizePositiveInt(req.params.itemId);

    if (!itemId) {
      return res.status(400).json({
        success: false,

        message: "ID sản phẩm trong giỏ hàng không hợp lệ.",
      });
    }

    const cart = await Cart.removeItem({
      user_id: userId,

      item_id: itemId,
    });

    return res.status(200).json({
      success: true,

      message: "Xóa sản phẩm khỏi giỏ hàng thành công.",

      data: cart,
    });
  } catch (error) {
    console.error("[CartController.removeCartItem]", error);

    return res.status(400).json({
      success: false,

      message: error.message || "Không thể xóa sản phẩm khỏi giỏ hàng.",
    });
  }
};

// ============================================================
// DELETE /api/client/cart/clear
// ============================================================

exports.clearCart = async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,

        message: "Bạn cần đăng nhập để sử dụng giỏ hàng.",
      });
    }

    const cart = await Cart.clearCart(userId);

    return res.status(200).json({
      success: true,

      message: "Xóa toàn bộ giỏ hàng thành công.",

      data: cart,
    });
  } catch (error) {
    console.error("[CartController.clearCart]", error);

    return next(error);
  }
};
