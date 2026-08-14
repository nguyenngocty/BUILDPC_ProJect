import api from "./api";

const pcPartTypeService = {
  getAll: (params = {}) => {
    return api.get("/admin/pc-part-types", { params });
  },

  getById: (id) => {
    return api.get(`/admin/pc-part-types/${id}`);
  },

  create: (data) => {
    return api.post("/admin/pc-part-types", data);
  },

  update: (id, data) => {
    return api.patch(`/admin/pc-part-types/${id}`, data);
  },

  remove: (id) => {
    return api.delete(`/admin/pc-part-types/${id}`);
  },
};

export default pcPartTypeService;