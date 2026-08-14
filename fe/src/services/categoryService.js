import axiosClient from "./axiosClient";

const API = "/admin/categories";

const categoryService = {
  // ===========================
  // CATEGORY CRUD
  // ===========================

  async getCategories(params = {}) {
    const { data } = await axiosClient.get(API, {
      params,
    });

    return data;
  },

  async getCategoryById(id) {
    const { data } = await axiosClient.get(`${API}/${id}`);

    return data;
  },

  async createCategory(formData) {
    const { data } = await axiosClient.post(API, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return data;
  },

  async updateCategory(id, formData) {
    const { data } = await axiosClient.put(`${API}/${id}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return data;
  },

  async deleteCategory(id) {
    const { data } = await axiosClient.delete(`${API}/${id}`);

    return data;
  },

  async restoreCategory(id) {
    const { data } = await axiosClient.patch(`${API}/${id}/restore`);

    return data;
  },

  async forceDeleteCategory(id) {
    const { data } = await axiosClient.delete(`${API}/${id}/force`);

    return data;
  },

  async toggleStatus(id) {
    const { data } = await axiosClient.patch(`${API}/${id}/toggle-status`);

    return data;
  },

  // ===========================
  // TRASH
  // ===========================

  async getTrash(params = {}) {
    const { data } = await axiosClient.get(`${API}/trash`, {
      params,
    });

    return data;
  },

  // ===========================
  // DASHBOARD
  // ===========================

  async getStatistics() {
    const { data } = await axiosClient.get(`${API}/statistics`);

    return data;
  },

  // ===========================
  // BULK ACTION
  // ===========================

  async bulkDelete(ids) {
    const { data } = await axiosClient.delete(`${API}/bulk-delete`, {
      data: { ids },
    });

    return data;
  },

  async bulkRestore(ids) {
    const { data } = await axiosClient.patch(`${API}/bulk-restore`, {
      ids,
    });

    return data;
  },

  async bulkForceDelete(ids) {
    const { data } = await axiosClient.delete(`${API}/bulk-force`, {
      data: { ids },
    });

    return data;
  },

  async bulkToggleStatus(ids) {
    const { data } = await axiosClient.patch(`${API}/bulk-toggle-status`, {
      ids,
    });

    return data;
  },
};

export default categoryService;
