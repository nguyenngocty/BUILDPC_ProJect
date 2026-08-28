import axiosClient from "./axiosClient";

const API = "/admin/pc-builds";

const pcBuildAdminService = {
  // =========================================================
  // CATEGORIES
  // =========================================================

  async getCategories() {
    const response = await axiosClient.get(`${API}/categories`);

    return response.data;
  },

  // =========================================================
  // COMPONENTS
  // =========================================================

  async getComponents(params = {}) {
    const response = await axiosClient.get(`${API}/components`, {
      params,
    });

    return response.data;
  },

  // =========================================================
  // VALIDATE BUILD
  // =========================================================

  async validateBuild(items = []) {
    const response = await axiosClient.post(`${API}/validate`, {
      items,
    });

    return response.data;
  },

  // =========================================================
  // GET BUILDS
  // =========================================================

  async getBuilds(params = {}) {
    const response = await axiosClient.get(API, {
      params,
    });

    return response.data;
  },

  // =========================================================
  // GET TRASH
  // =========================================================

  async getTrash(params = {}) {
    const response = await axiosClient.get(`${API}/trash`, {
      params,
    });

    return response.data;
  },

  // =========================================================
  // DETAIL
  // =========================================================

  async getBuildById(id) {
    const response = await axiosClient.get(`${API}/${id}`);

    return response.data;
  },

  // =========================================================
  // CREATE
  // =========================================================

  async createBuild(payload) {
    const response = await axiosClient.post(API, payload);

    return response.data;
  },

  // =========================================================
  // UPDATE
  // =========================================================

  async updateBuild(id, payload) {
    const response = await axiosClient.put(`${API}/${id}`, payload);

    return response.data;
  },

  // =========================================================
  // STATUS
  // =========================================================

  async updateStatus(id, status) {
    const response = await axiosClient.patch(`${API}/${id}/status`, {
      status,
    });

    return response.data;
  },

  // =========================================================
  // FEATURED
  // =========================================================

  async updateFeatured(id, isFeatured) {
    const response = await axiosClient.patch(`${API}/${id}/featured`, {
      is_featured: isFeatured,
    });

    return response.data;
  },

  // =========================================================
  // DELETE
  // =========================================================

  async deleteBuild(id) {
    const response = await axiosClient.delete(`${API}/${id}`);

    return response.data;
  },

  // =========================================================
  // RESTORE
  // =========================================================

  async restoreBuild(id) {
    const response = await axiosClient.patch(`${API}/${id}/restore`);

    return response.data;
  },
};

export default pcBuildAdminService;
