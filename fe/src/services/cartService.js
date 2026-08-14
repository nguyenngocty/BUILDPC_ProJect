import api from "./api";

const cartService = {
  getCart: () => {
    return api.get(
      "/client/cart"
    );
  },

  addToCart: ({
    product_id,
    quantity = 1,
  }) => {
    return api.post(
      "/client/cart/add",
      {
        product_id,
        quantity,
      }
    );
  },

  updateCartItem: ({
    item_id,
    quantity,
  }) => {
    return api.put(
      `/client/cart/items/${item_id}`,
      {
        quantity,
      }
    );
  },

  removeCartItem: ({
    item_id,
  }) => {
    return api.delete(
      `/client/cart/items/${item_id}`
    );
  },

  clearCart: () => {
    return api.delete(
      "/client/cart/clear"
    );
  },
};

export default cartService;