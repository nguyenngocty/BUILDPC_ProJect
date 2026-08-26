import api from "./api";

const cartService = {
  // ============================================================
  // GET CART
  // ============================================================

  getCart: () => {
    return api.get("/client/cart");
  },

  // ============================================================
  // ADD TO CART
  //
  // PRODUCT THƯỜNG:
  //
  // {
  //   product_id: 10,
  //   quantity: 1
  // }
  //
  // PRODUCT VARIANT:
  //
  // {
  //   product_id: 66,
  //   variant_id: 81,
  //   quantity: 1
  // }
  // ============================================================

  addToCart: ({ product_id, variant_id = null, quantity = 1 }) => {
    const payload = {
      product_id,
      quantity,
    };

    /*
     * Chỉ gửi variant_id khi thực sự có.
     *
     * Điều này giúp:
     *
     * - Product legacy vẫn hoạt động.
     * - Product chỉ có 1 default variant vẫn hoạt động.
     * - Product nhiều variant gửi đúng variant được chọn.
     */
    if (variant_id !== null && variant_id !== undefined && variant_id !== "") {
      payload.variant_id = Number(variant_id);
    }

    return api.post("/client/cart/add", payload);
  },

  // ============================================================
  // UPDATE CART ITEM
  //
  // Backend cập nhật theo cart_item.id.
  // Không cần gửi lại product_id / variant_id.
  // ============================================================

  updateCartItem: ({ item_id, quantity }) => {
    return api.put(`/client/cart/items/${item_id}`, {
      quantity,
    });
  },

  // ============================================================
  // REMOVE ITEM
  // ============================================================

  removeCartItem: ({ item_id }) => {
    return api.delete(`/client/cart/items/${item_id}`);
  },

  // ============================================================
  // CLEAR CART
  // ============================================================

  clearCart: () => {
    return api.delete("/client/cart/clear");
  },
};

export default cartService;
