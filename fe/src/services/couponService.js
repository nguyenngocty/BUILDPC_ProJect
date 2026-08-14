import api from "./api";

const couponService = {
  // =========================
  // ADMIN
  // =========================

  getAll: (params = {}) => {
    return api.get("/admin/coupons", {
      params,
    });
  },

  getById: (id) => {
    return api.get(`/admin/coupons/${id}`);
  },

  create: (data) => {
    return api.post("/admin/coupons", data);
  },

  update: (id, data) => {
    return api.patch(`/admin/coupons/${id}`, data);
  },

  remove: (id) => {
    return api.delete(`/admin/coupons/${id}`);
  },

  // =========================
  // CLIENT
  // =========================

  validate: ({ code, subtotal }) => {
    return api.post("/client/coupons/validate", {
      code,
      subtotal,
    });
  },
};

export default couponService;