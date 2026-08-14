import api from "./api";

const pcPartService = {
  getAll: (params = {}) => {
    return api.get("/admin/pc-parts", { params });
  },

  getById: (id) => {
    return api.get(`/admin/pc-parts/${id}`);
  },

  create: (data) => {
    return api.post("/admin/pc-parts", data);
  },

  update: (id, data) => {
    return api.patch(`/admin/pc-parts/${id}`, data);
  },

  remove: (id) => {
    return api.delete(`/admin/pc-parts/${id}`);
  },
};

export default pcPartService;