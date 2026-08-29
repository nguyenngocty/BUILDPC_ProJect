import api from "./api";

const API = "/client/builds";

const buildPcService = {
  // ==========================================================
  // PUBLIC BUILD PC
  // ==========================================================

  getPartTypes: () => {
    return api.get(`${API}/part-types`);
  },

  getParts: (params = {}) => {
    return api.get(`${API}/parts`, {
      params,
    });
  },

  getPartsByType: (typeId) => {
    return api.get(`${API}/parts/type/${typeId}`);
  },

  getPartById: (partId) => {
    return api.get(`${API}/parts/${partId}`);
  },

  validateBuild: (items = []) => {
    return api.post(`${API}/validate`, {
      items,
    });
  },

  // ==========================================================
  // SMART AUTO BUILD
  // Dùng ở phase tiếp theo
  // ==========================================================

  getAutoBuildOptions: () => {
    return api.get(`${API}/auto-build/options`);
  },

  autoBuild: ({ usage, budget }) => {
    return api.post(`${API}/auto-build`, {
      usage,
      budget,
    });
  },

  // ==========================================================
  // MY BUILDS
  // ==========================================================

  saveBuild: (payload) => {
    return api.post(`${API}/my-builds`, payload);
  },

  getMyBuilds: (params = {}) => {
    return api.get(`${API}/my-builds`, {
      params,
    });
  },

  getMyBuildById: (id) => {
    return api.get(`${API}/my-builds/${id}`);
  },

  updateMyBuild: (id, payload) => {
    return api.put(`${API}/my-builds/${id}`, payload);
  },

  deleteMyBuild: (id) => {
    return api.delete(`${API}/my-builds/${id}`);
  },

  // ==========================================================
  // BUILD → CART
  // ==========================================================

  addBuildToCart: (items = []) => {
    return api.post(`${API}/cart`, {
      items,
    });
  },

  addSavedBuildToCart: (id) => {
    return api.post(`${API}/my-builds/${id}/cart`);
  },
};

export default buildPcService;
