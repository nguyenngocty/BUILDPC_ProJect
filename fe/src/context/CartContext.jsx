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

const normalizeNumber = (value, defaultValue = 0) => {
  const numberValue = Number(value);
  return Number.isNaN(numberValue) ? defaultValue : numberValue;
};

const normalizeQuantity = (value) => {
  const quantity = Number(value);
  return Number.isInteger(quantity) ? quantity : null;
};

const getUserIdFromCurrentUser = (currentUser) => {
  if (!currentUser) return null;

  const rawId =
    currentUser.user_id ||
    currentUser.userId ||
    currentUser.customer_id ||
    currentUser.customerId ||
    currentUser.user?.id ||
    currentUser.data?.user?.id ||
    currentUser.id;

  const userId = Number(rawId);

  if (!Number.isInteger(userId) || userId <= 0) {
    return null;
  }

  return userId;
};

const getCartItemsFromResponse = (resData) => {
  return (
    resData?.data?.items ||
    resData?.items ||
    resData?.cart?.items ||
    resData?.data?.cart?.items ||
    []
  );
};

const getCartSummaryFromResponse = (resData, items = []) => {
  const data = resData?.data || resData || {};
  const cart = data.cart || data;

  const quantity =
    cart.quantity ??
    cart.cart_count ??
    data.quantity ??
    data.cart_count ??
    items.reduce((sum, item) => {
      return sum + normalizeNumber(item.quantity);
    }, 0);

  const totalPrice =
    cart.total_price ??
    cart.cart_total ??
    data.total_price ??
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

export function CartProvider({ children }) {
  const { currentUser, isAuthLoading } = useAuth();

  const userId = useMemo(() => {
    return getUserIdFromCurrentUser(currentUser);
  }, [currentUser]);

  const [cartItems, setCartItems] = useState([]);
  const [cartCount, setCartCount] = useState(0);
  const [cartTotal, setCartTotal] = useState(0);
  const [cartLoading, setCartLoading] = useState(false);
  const [cartError, setCartError] = useState("");

  const resetCartState = useCallback(() => {
    setCartItems([]);
    setCartCount(0);
    setCartTotal(0);
    setCartError("");
  }, []);

  const fetchCart = useCallback(
    async ({ silent = false } = {}) => {
      if (isAuthLoading) return;

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

        const res = await cartService.getCart(userId);
        const resData = res.data || {};

        const items = getCartItemsFromResponse(resData);
        const summary = getCartSummaryFromResponse(resData, items);

        setCartItems(items);
        setCartCount(summary.quantity);
        setCartTotal(summary.totalPrice);
      } catch (error) {
        console.error("Lỗi lấy giỏ hàng:", error);

        const message =
          error.response?.data?.message || error.message || "Lỗi lấy giỏ hàng";

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

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const requireLogin = useCallback(() => {
    if (!userId) {
      throw new Error("Vui lòng đăng nhập để sử dụng giỏ hàng");
    }

    return userId;
  }, [userId]);

  const addToCart = useCallback(
    async (productOrId, quantity = 1) => {
      const currentUserId = requireLogin();

      const productId =
        typeof productOrId === "object"
          ? productOrId.product_id || productOrId.productId || productOrId.id
          : productOrId;

      const rawQuantity =
        typeof productOrId === "object"
          ? (productOrId.quantity ?? quantity)
          : quantity;

      const itemQuantity = normalizeQuantity(rawQuantity);

      if (!productId) {
        throw new Error("Không tìm thấy sản phẩm cần thêm vào giỏ");
      }

      if (itemQuantity === null || itemQuantity <= 0) {
        throw new Error("Số lượng sản phẩm phải là số nguyên lớn hơn 0");
      }

      await cartService.addToCart({
        user_id: currentUserId,
        product_id: productId,
        quantity: itemQuantity,
      });

      await fetchCart({ silent: true });
    },
    [requireLogin, fetchCart],
  );

  const updateQuantity = useCallback(
    async (itemId, quantity) => {
      const currentUserId = requireLogin();
      const nextQuantity = normalizeQuantity(quantity);

      if (!itemId) {
        throw new Error("Không tìm thấy sản phẩm trong giỏ hàng");
      }

      if (nextQuantity === null) {
        throw new Error("Số lượng sản phẩm phải là số nguyên");
      }

      if (nextQuantity <= 0) {
        await cartService.removeCartItem({
          user_id: currentUserId,
          item_id: itemId,
        });

        await fetchCart({ silent: true });
        return;
      }

      await cartService.updateCartItem({
        user_id: currentUserId,
        item_id: itemId,
        quantity: nextQuantity,
      });

      await fetchCart({ silent: true });
    },
    [requireLogin, fetchCart],
  );

  const removeItem = useCallback(
    async (itemId) => {
      const currentUserId = requireLogin();

      if (!itemId) {
        throw new Error("Không tìm thấy sản phẩm cần xóa");
      }

      await cartService.removeCartItem({
        user_id: currentUserId,
        item_id: itemId,
      });

      await fetchCart({ silent: true });
    },
    [requireLogin, fetchCart],
  );

  const clearCart = useCallback(async () => {
    const currentUserId = requireLogin();

    await cartService.clearCart(currentUserId);
    resetCartState();
  }, [requireLogin, resetCartState]);

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
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart phải được dùng bên trong CartProvider");
  }

  return context;
};
