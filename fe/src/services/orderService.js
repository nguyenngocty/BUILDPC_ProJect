import api from "./api";

const orderService = {
  // ================= ADMIN ORDERS =================
  getAll: (params = {}) => {
    return api.get(
      "/admin/orders",
      {
        params,
      }
    );
  },

  getById: (id) => {
    return api.get(
      `/admin/orders/${id}`
    );
  },

  updateStatus: (
    id,
    status,
    reason = ""
  ) => {
    return api.patch(
      `/admin/orders/${id}/status`,
      {
        status,
        ...(reason
          ? {
              reason,
            }
          : {}),
      }
    );
  },

  getInvoice: (id) => {
    return api.get(
      `/admin/orders/${id}/invoice`
    );
  },

  // ================= CLIENT ORDERS / CHECKOUT =================
  createOrder: (data) => {
    return api.post(
      "/client/orders",
      data
    );
  },

  getClientOrders: (
    params = {}
  ) => {
    return api.get(
      "/client/orders",
      {
        params,
      }
    );
  },

  getClientOrderById: (id) => {
    return api.get(
      `/client/orders/${id}`
    );
  },

  cancelClientOrder: (
    id,
    reason
  ) => {
    return api.patch(
      `/client/orders/${id}/cancel`,
      {
        reason,
      }
    );
  },

  getReorderCheckout: (id) => {
    return api.get(
      `/client/orders/${id}/reorder-checkout`
    );
  },

  createReorderCheckout: (
    id,
    data
  ) => {
    return api.post(
      `/client/orders/${id}/reorder-checkout`,
      data
    );
  },
};

export default orderService;