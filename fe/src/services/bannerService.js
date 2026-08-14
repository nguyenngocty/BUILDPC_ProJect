import api from "./api";

const bannerService = {
  // ================= ADMIN =================

  getAll: (params = {}) => {
    return api.get("/admin/banners", { params });
  },

  getById: (id) => {
    return api.get(`/admin/banners/${id}`);
  },

  create: (data) => {
    return api.post("/admin/banners", data, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  update: (id, data) => {
    return api.put(`/admin/banners/${id}`, data, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  toggleStatus: (id) => {
    return api.patch(`/admin/banners/${id}/toggle-status`);
  },

  updateSortOrder: (items) => {
    return api.patch("/admin/banners/sort-order/bulk", { items });
  },

  delete: (id) => {
    return api.delete(`/admin/banners/${id}`);
  },

  // ================= CLIENT =================

  getActive: (params = {}) => {
    return api.get("/client/banners", { params });
  },
};

export default bannerService;
