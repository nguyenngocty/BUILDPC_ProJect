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
// NORMALIZE
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
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
};

const normalizeNullableId = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
};

// ============================================================
// USER
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
// RESPONSE NORMALIZE
// ============================================================

const getCartItemsFromResponse = (resData) => {
  const items =
    resData?.data?.items ||
    resData?.items ||
    resData?.cart?.items ||
    resData?.data?.cart?.items ||
    [];

  return Array.isArray(items) ? items : [];
};

const getCartSummaryFromResponse = (resData, items = []) => {
  const data = resData?.data || resData || {};

  const cart = data.cart || data;

  const quantity =
    cart.quantity ??
    cart.cart_count ??
    data.quantity ??
    data.total_quantity ??
    data.cart_count ??
    items.reduce((sum, item) => {
      return sum + normalizeNumber(item.quantity);
    }, 0);

  const totalPrice =
    cart.total_price ??
    cart.cart_total ??
    data.total_price ??
    data.total_amount ??
    data.cart_total ??
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
// PROVIDER
// ============================================================

export function CartProvider({ children }) {
  const { currentUser, isAuthLoading } = useAuth();

  const userId = useMemo(() => {
    return getUserIdFromCurrentUser(currentUser);
  }, [currentUser]);

  // ==========================================================
  // CART STATE
  // ==========================================================

  const [cartItems, setCartItems] = useState([]);

  const [cartCount, setCartCount] = useState(0);

  const [cartTotal, setCartTotal] = useState(0);

  const [cartLoading, setCartLoading] = useState(false);

  const [cartError, setCartError] = useState("");

  // ==========================================================
  // COUPON
  //
  // CART -> CHECKOUT
  // ==========================================================

  const [appliedCoupon, setAppliedCouponState] = useState(null);

  const getCouponStorageKey = useCallback(() => {
    if (!userId) {
      return null;
    }

    return `cart_applied_coupon_${userId}`;
  }, [userId]);

  const setAppliedCoupon = useCallback(
    (coupon) => {
      setAppliedCouponState(coupon || null);

      const key = getCouponStorageKey();

      if (!key) {
        return;
      }

      if (coupon) {
        sessionStorage.setItem(key, JSON.stringify(coupon));
      } else {
        sessionStorage.removeItem(key);
      }
    },
    [getCouponStorageKey],
  );

  const clearAppliedCoupon = useCallback(() => {
    setAppliedCouponState(null);

    const key = getCouponStorageKey();

    if (key) {
      sessionStorage.removeItem(key);
    }
  }, [getCouponStorageKey]);

  // ==========================================================
  // LOAD SAVED COUPON
  // ==========================================================

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!userId) {
      setAppliedCouponState(null);

      return;
    }

    const key = `cart_applied_coupon_${userId}`;

    try {
      const saved = sessionStorage.getItem(key);

      if (!saved) {
        setAppliedCouponState(null);

        return;
      }

      const coupon = JSON.parse(saved);

      setAppliedCouponState(coupon || null);
    } catch {
      sessionStorage.removeItem(key);

      setAppliedCouponState(null);
    }
  }, [userId, isAuthLoading]);

  // ==========================================================
  // RESET CART
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

        const res = await cartService.getCart();

        const resData = res?.data || {};

        const items = getCartItemsFromResponse(resData);

        const summary = getCartSummaryFromResponse(resData, items);

        setCartItems(items);

        setCartCount(summary.quantity);

        setCartTotal(summary.totalPrice);

        if (items.length === 0) {
          clearAppliedCoupon();
        }
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
    [userId, isAuthLoading, resetCartState, clearAppliedCoupon],
  );

  // ==========================================================
  // LOAD CART WHEN AUTH CHANGES
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
  // HỖ TRỢ:
  //
  // addToCart(productId, 1)
  //
  // hoặc:
  //
  // addToCart({
  //   product_id: 66,
  //   variant_id: 81,
  //   quantity: 1,
  // })
  // ==========================================================

  const addToCart = useCallback(
    async (productOrId, quantity = 1) => {
      requireLogin();

      // ====================================================
      // PRODUCT ID
      // ====================================================

      const rawProductId =
        typeof productOrId === "object"
          ? (productOrId?.product_id ??
            productOrId?.productId ??
            productOrId?.id)
          : productOrId;

      const productId = normalizePositiveId(rawProductId);

      if (!productId) {
        throw new Error("Không tìm thấy sản phẩm cần thêm vào giỏ");
      }

      // ====================================================
      // VARIANT ID
      //
      // Đây chính là phần file cũ làm mất.
      // ====================================================

      const rawVariantId =
        typeof productOrId === "object"
          ? (productOrId?.variant_id ?? productOrId?.variantId ?? null)
          : null;

      const variantId = normalizeNullableId(rawVariantId);

      if (
        rawVariantId !== undefined &&
        rawVariantId !== null &&
        rawVariantId !== "" &&
        !variantId
      ) {
        throw new Error("Biến thể sản phẩm không hợp lệ");
      }

      // ====================================================
      // QUANTITY
      // ====================================================

      const rawQuantity =
        typeof productOrId === "object"
          ? (productOrId?.quantity ?? quantity)
          : quantity;

      const itemQuantity = normalizeQuantity(rawQuantity);

      if (itemQuantity === null || itemQuantity <= 0) {
        throw new Error("Số lượng sản phẩm phải là số nguyên lớn hơn 0");
      }

      // ====================================================
      // REQUEST
      // ====================================================

      await cartService.addToCart({
        product_id: productId,

        variant_id: variantId,

        quantity: itemQuantity,
      });

      // ====================================================
      // REFRESH
      // ====================================================

      await fetchCart({
        silent: true,
      });
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

      if (!normalizedItemId) {
        throw new Error("Không tìm thấy sản phẩm trong giỏ hàng");
      }

      const nextQuantity = normalizeQuantity(quantity);

      if (nextQuantity === null) {
        throw new Error("Số lượng sản phẩm phải là số nguyên");
      }

      // ====================================================
      // QUANTITY <= 0 => REMOVE
      // ====================================================

      if (nextQuantity <= 0) {
        await cartService.removeCartItem({
          item_id: normalizedItemId,
        });

        await fetchCart({
          silent: true,
        });

        return;
      }

      // ====================================================
      // UPDATE
      // ====================================================

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
  // REMOVE ITEM
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
  // CLEAR CART
  // ==========================================================

  const clearCart = useCallback(async () => {
    requireLogin();

    await cartService.clearCart();

    resetCartState();

    clearAppliedCoupon();
  }, [requireLogin, resetCartState, clearAppliedCoupon]);

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

      appliedCoupon,

      setAppliedCoupon,

      clearAppliedCoupon,
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

      appliedCoupon,

      setAppliedCoupon,

      clearAppliedCoupon,
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
