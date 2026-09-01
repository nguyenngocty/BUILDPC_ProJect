import api from "./api";

const orderService = {
  // ============================================================
  // ADMIN ORDERS
  // ============================================================

  getAll: (params = {}) => {
    return api.get("/admin/orders", {
      params,
    });
  },

  getById: (id) => {
    return api.get(`/admin/orders/${id}`);
  },

  updateStatus: (id, status) => {
    return api.patch(`/admin/orders/${id}/status`, {
      status,
    });
  },

  updatePaymentStatus: (
    id,
    { payment_status, transaction_code = null } = {},
  ) => {
    return api.patch(`/admin/orders/${id}/payment-status`, {
      payment_status,

      transaction_code,
    });
  },

  confirmBankPayment: (id, transactionCode = "") => {
    return api.patch(`/admin/orders/${id}/payment-status`, {
      payment_status: 1,

      transaction_code: transactionCode || null,
    });
  },

  getInvoice: (id) => {
    return api.get(`/admin/orders/${id}/invoice`);
  },

  // ============================================================
  // CLIENT ORDERS / CHECKOUT
  // ============================================================

  createOrder: (data) => {
    return api.post("/client/orders", data);
  },

  getClientOrders: (params = {}) => {
    return api.get("/client/orders", {
      params,
    });
  },

  getClientOrderById: (id) => {
    return api.get(`/client/orders/${id}`);
  },

  cancelClientOrder: (id, reason) => {
    return api.patch(`/client/orders/${id}/cancel`, {
      reason,
    });
  },

  getReorderCheckout: (id) => {
    return api.get(`/client/orders/${id}/reorder-checkout`);
  },

  createReorderCheckout: (id, data) => {
    return api.post(`/client/orders/${id}/reorder-checkout`, data);
  },
};

export default orderService;
