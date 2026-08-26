import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import cartService from "../services/cartService";

import { useAuth } from "./AuthContext";

export const CartContext = createContext(null);

// ============================================================
// NORMALIZE HELPERS
// ============================================================

const normalizeNumber = (value, defaultValue = 0) => {
  const numberValue = Number(value);

  return Number.isNaN(numberValue) ? defaultValue : numberValue;
};

const normalizeQuantity = (value) => {
  const quantity = Number(value);

  return Number.isInteger(quantity) ? quantity : null;
};

const normalizePositiveId = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
};

// ============================================================
// GET USER ID
// ============================================================

const getUserIdFromCurrentUser = (currentUser) => {
  if (!currentUser) {
    return null;
  }

  const rawId =
    currentUser.user_id ||
    currentUser.userId ||
    currentUser.customer_id ||
    currentUser.customerId ||
    currentUser.user?.id ||
    currentUser.data?.user?.id ||
    currentUser.id;

  return normalizePositiveId(rawId);
};

// ============================================================
// CART RESPONSE
// ============================================================

const getCartItemsFromResponse = (resData) => {
  const items =
    resData?.data?.items ||
    resData?.items ||
    resData?.cart?.items ||
    resData?.data?.cart?.items ||
    [];

  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) => ({
    ...item,

    id: normalizePositiveId(item.id),

    cart_id: normalizePositiveId(item.cart_id),

    product_id: normalizePositiveId(item.product_id),

    variant_id: normalizePositiveId(item.variant_id),

    quantity: normalizeNumber(item.quantity),

    price: normalizeNumber(item.price),

    total_price: normalizeNumber(item.total_price),

    regular_price: normalizeNumber(item.regular_price ?? item.price),

    sale_price:
      item.sale_price !== null && item.sale_price !== undefined
        ? normalizeNumber(item.sale_price)
        : null,

    final_price: normalizeNumber(item.final_price ?? item.price),

    available_stock: normalizeNumber(
      item.available_stock ??
        item.variant_stock ??
        item.product_stock ??
        item.product_total_stock,
    ),

    has_variant: Boolean(item.has_variant || item.variant_id),

    variant_options: Array.isArray(item.variant_options)
      ? item.variant_options
      : [],
  }));
};

const getCartSummaryFromResponse = (resData, items = []) => {
  const data = resData?.data || resData || {};

  const cart = data.cart || data;

  const quantity =
    cart.quantity ??
    cart.cart_count ??
    data.quantity ??
    data.cart_count ??
    data.total_quantity ??
    items.reduce((sum, item) => {
      return sum + normalizeNumber(item.quantity);
    }, 0);

  const totalPrice =
    cart.total_price ??
    cart.cart_total ??
    data.total_price ??
    data.cart_total ??
    data.total_amount ??
    items.reduce((sum, item) => {
      const itemTotal = normalizeNumber(item.total_price);

      if (itemTotal > 0) {
        return sum + itemTotal;
      }

      return (
        sum +
        normalizeNumber(item.final_price || item.price) *
          normalizeNumber(item.quantity)
      );
    }, 0);

  return {
    quantity: normalizeNumber(quantity),

    totalPrice: normalizeNumber(totalPrice),
  };
};

// ============================================================
// NORMALIZE ADD-TO-CART INPUT
//
// Hỗ trợ đồng thời:
//
// addToCart(productId, quantity)
//
// addToCart(productId, quantity, variantId)
//
// addToCart({
//   product_id,
//   variant_id,
//   quantity
// })
//
// addToCart({
//   id,
//   selectedVariantId,
//   quantity
// })
// ============================================================

const normalizeAddToCartPayload = (
  productOrId,
  quantity = 1,
  variantId = null,
) => {
  if (productOrId && typeof productOrId === "object") {
    const productId = normalizePositiveId(
      productOrId.product_id ?? productOrId.productId ?? productOrId.id,
    );

    const selectedVariantId = normalizePositiveId(
      productOrId.variant_id ??
        productOrId.variantId ??
        productOrId.selected_variant_id ??
        productOrId.selectedVariantId ??
        productOrId.variant?.id,
    );

    const itemQuantity = normalizeQuantity(productOrId.quantity ?? quantity);

    return {
      productId,

      variantId: selectedVariantId,

      quantity: itemQuantity,
    };
  }

  return {
    productId: normalizePositiveId(productOrId),

    variantId: normalizePositiveId(variantId),

    quantity: normalizeQuantity(quantity),
  };
};

// ============================================================
// PROVIDER
// ============================================================

export function CartProvider({ children }) {
  const { currentUser, isAuthLoading } = useAuth();

  const userId = useMemo(() => {
    return getUserIdFromCurrentUser(currentUser);
  }, [currentUser]);

  // ==========================================================
  // STATE
  // ==========================================================

  const [cartItems, setCartItems] = useState([]);

  const [cartCount, setCartCount] = useState(0);

  const [cartTotal, setCartTotal] = useState(0);

  const [cartLoading, setCartLoading] = useState(false);

  const [cartError, setCartError] = useState("");

  // ==========================================================
  // RESET
  // ==========================================================

  const resetCartState = useCallback(() => {
    setCartItems([]);

    setCartCount(0);

    setCartTotal(0);

    setCartError("");
  }, []);

  // ==========================================================
  // FETCH CART
  // ==========================================================

  const fetchCart = useCallback(
    async ({ silent = false } = {}) => {
      if (isAuthLoading) {
        return;
      }

      if (!userId) {
        resetCartState();

        setCartLoading(false);

        return;
      }

      try {
        if (!silent) {
          setCartLoading(true);
        }

        setCartError("");

        const response = await cartService.getCart();

        const responseData = response?.data || {};

        const items = getCartItemsFromResponse(responseData);

        const summary = getCartSummaryFromResponse(responseData, items);

        setCartItems(items);

        setCartCount(summary.quantity);

        setCartTotal(summary.totalPrice);
      } catch (error) {
        console.error("Lỗi lấy giỏ hàng:", error);

        const message =
          error?.response?.data?.message ||
          error?.message ||
          "Lỗi lấy giỏ hàng";

        setCartItems([]);

        setCartCount(0);

        setCartTotal(0);

        setCartError(message);
      } finally {
        if (!silent) {
          setCartLoading(false);
        }
      }
    },
    [userId, isAuthLoading, resetCartState],
  );

  // ==========================================================
  // AUTO LOAD CART
  // ==========================================================

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // ==========================================================
  // REQUIRE LOGIN
  // ==========================================================

  const requireLogin = useCallback(() => {
    if (!userId) {
      throw new Error("Vui lòng đăng nhập để sử dụng giỏ hàng");
    }

    return userId;
  }, [userId]);

  // ==========================================================
  // ADD TO CART
  //
  // CÁCH 1 - PRODUCT KHÔNG VARIANT
  //
  // addToCart(product.id, 1)
  //
  //
  // CÁCH 2 - PRODUCT VARIANT
  //
  // addToCart({
  //   product_id: product.id,
  //   variant_id: selectedVariant.id,
  //   quantity: 1,
  // })
  //
  //
  // CÁCH 3
  //
  // addToCart(
  //   product.id,
  //   1,
  //   selectedVariant.id
  // )
  // ==========================================================

  const addToCart = useCallback(
    async (productOrId, quantity = 1, variantId = null) => {
      requireLogin();

      const payload = normalizeAddToCartPayload(
        productOrId,
        quantity,
        variantId,
      );

      if (!payload.productId) {
        throw new Error("Không tìm thấy sản phẩm cần thêm vào giỏ");
      }

      if (payload.quantity === null || payload.quantity <= 0) {
        throw new Error("Số lượng sản phẩm phải là số nguyên lớn hơn 0");
      }

      /*
       * Backend tự quyết định:
       *
       * - Product không variant:
       *   variant_id có thể null.
       *
       * - Product có nhiều variant:
       *   backend yêu cầu variant_id.
       *
       * Vì vậy Context KHÔNG tự đoán variant ở đây.
       *
       * Product Detail sẽ chịu trách nhiệm gửi variant
       * mà người dùng thực sự chọn.
       */

      const response = await cartService.addToCart({
        product_id: payload.productId,

        variant_id: payload.variantId,

        quantity: payload.quantity,
      });

      /*
       * API add-to-cart của Backend đã trả về toàn bộ
       * Cart mới.
       *
       * Tuy nhiên vẫn fetch lại để đảm bảo Header,
       * Cart page và các component khác đồng bộ.
       */
      await fetchCart({
        silent: true,
      });

      return response?.data || response;
    },
    [requireLogin, fetchCart],
  );

  // ==========================================================
  // UPDATE QUANTITY
  // ==========================================================

  const updateQuantity = useCallback(
    async (itemId, quantity) => {
      requireLogin();

      const normalizedItemId = normalizePositiveId(itemId);

      const nextQuantity = normalizeQuantity(quantity);

      if (!normalizedItemId) {
        throw new Error("Không tìm thấy sản phẩm trong giỏ hàng");
      }

      if (nextQuantity === null) {
        throw new Error("Số lượng sản phẩm phải là số nguyên");
      }

      /*
       * Quantity <= 0:
       * xóa item.
       */
      if (nextQuantity <= 0) {
        await cartService.removeCartItem({
          item_id: normalizedItemId,
        });

        await fetchCart({
          silent: true,
        });

        return;
      }

      await cartService.updateCartItem({
        item_id: normalizedItemId,

        quantity: nextQuantity,
      });

      await fetchCart({
        silent: true,
      });
    },
    [requireLogin, fetchCart],
  );

  // ==========================================================
  // REMOVE
  // ==========================================================

  const removeItem = useCallback(
    async (itemId) => {
      requireLogin();

      const normalizedItemId = normalizePositiveId(itemId);

      if (!normalizedItemId) {
        throw new Error("Không tìm thấy sản phẩm cần xóa");
      }

      await cartService.removeCartItem({
        item_id: normalizedItemId,
      });

      await fetchCart({
        silent: true,
      });
    },
    [requireLogin, fetchCart],
  );

  // ==========================================================
  // CLEAR
  // ==========================================================

  const clearCart = useCallback(async () => {
    requireLogin();

    await cartService.clearCart();

    resetCartState();
  }, [requireLogin, resetCartState]);

  // ==========================================================
  // GET CART ITEM HELPER
  //
  // Có thể dùng ở Product Detail sau này để biết:
  //
  // Variant hiện tại đã có bao nhiêu trong Cart.
  // ==========================================================

  const findCartItem = useCallback(
    (productId, variantId = null) => {
      const normalizedProductId = normalizePositiveId(productId);

      const normalizedVariantId = normalizePositiveId(variantId);

      if (!normalizedProductId) {
        return null;
      }

      return (
        cartItems.find((item) => {
          if (Number(item.product_id) !== Number(normalizedProductId)) {
            return false;
          }

          /*
           * Có variant:
           * phải đúng cả variant.
           */
          if (normalizedVariantId) {
            return Number(item.variant_id) === Number(normalizedVariantId);
          }

          /*
           * Product không variant.
           */
          return item.variant_id === null || item.variant_id === undefined;
        }) || null
      );
    },
    [cartItems],
  );

  // ==========================================================
  // CONTEXT VALUE
  // ==========================================================

  const value = useMemo(
    () => ({
      userId,

      cartItems,

      cartLoading,

      cartError,

      cartCount,

      cartTotal,

      fetchCart,

      refreshCart: fetchCart,

      addToCart,

      updateQuantity,

      removeItem,

      clearCart,

      findCartItem,
    }),
    [
      userId,

      cartItems,

      cartLoading,

      cartError,

      cartCount,

      cartTotal,

      fetchCart,

      addToCart,

      updateQuantity,

      removeItem,

      clearCart,

      findCartItem,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// ============================================================
// HOOK
// ============================================================

export const useCart = () => {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart phải được dùng bên trong CartProvider");
  }

  return context;
};
