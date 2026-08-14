const Cart = require(
  "../../models/Cart"
);

const getAuthenticatedUserId = (
  req
) => {
  const userId =
    Number.parseInt(
      req.user?.id,
      10
    );

  return (
    Number.isInteger(userId) &&
    userId > 0
  )
    ? userId
    : null;
};

exports.getCart = async (
  req,
  res,
  next
) => {
  try {
    const userId =
      getAuthenticatedUserId(
        req
      );

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          "Bạn cần đăng nhập để sử dụng giỏ hàng.",
      });
    }

    const cart =
      await Cart.getCart(
        userId
      );

    return res.json({
      success: true,
      message:
        "Lấy giỏ hàng thành công",
      data: cart,
    });
  } catch (error) {
    return next(error);
  }
};

exports.addToCart = async (
  req,
  res,
  next
) => {
  try {
    const userId =
      getAuthenticatedUserId(
        req
      );

    const {
      product_id,
      quantity,
    } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          "Bạn cần đăng nhập để sử dụng giỏ hàng.",
      });
    }

    if (!product_id) {
      return res.status(400).json({
        success: false,
        message:
          "Thiếu product_id",
      });
    }

    const cart =
      await Cart.addItem({
        user_id: userId,
        product_id,
        quantity,
      });

    return res.status(201).json({
      success: true,
      message:
        "Thêm sản phẩm vào giỏ hàng thành công",
      data: cart,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Lỗi thêm sản phẩm vào giỏ hàng",
    });
  }
};

exports.updateCartItem = async (
  req,
  res,
  next
) => {
  try {
    const userId =
      getAuthenticatedUserId(
        req
      );

    const {
      quantity,
    } = req.body;

    const {
      itemId,
    } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          "Bạn cần đăng nhập để sử dụng giỏ hàng.",
      });
    }

    if (
      quantity === undefined ||
      quantity === null
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Thiếu quantity",
      });
    }

    const cart =
      await Cart.updateItemQuantity({
        user_id: userId,
        item_id: itemId,
        quantity,
      });

    return res.json({
      success: true,
      message:
        "Cập nhật giỏ hàng thành công",
      data: cart,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Lỗi cập nhật giỏ hàng",
    });
  }
};

exports.removeCartItem = async (
  req,
  res,
  next
) => {
  try {
    const userId =
      getAuthenticatedUserId(
        req
      );

    const {
      itemId,
    } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          "Bạn cần đăng nhập để sử dụng giỏ hàng.",
      });
    }

    const cart =
      await Cart.removeItem({
        user_id: userId,
        item_id: itemId,
      });

    return res.json({
      success: true,
      message:
        "Xóa sản phẩm khỏi giỏ hàng thành công",
      data: cart,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Lỗi xóa sản phẩm khỏi giỏ hàng",
    });
  }
};

exports.clearCart = async (
  req,
  res,
  next
) => {
  try {
    const userId =
      getAuthenticatedUserId(
        req
      );

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          "Bạn cần đăng nhập để sử dụng giỏ hàng.",
      });
    }

    const cart =
      await Cart.clearCart(
        userId
      );

    return res.json({
      success: true,
      message:
        "Xóa toàn bộ giỏ hàng thành công",
      data: cart,
    });
  } catch (error) {
    return next(error);
  }
};