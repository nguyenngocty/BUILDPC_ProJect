import axiosClient from "./axiosClient";

const PRODUCT_API = "/admin/products";
const CLIENT_PRODUCT_API = "/client/products";

const ProductService = {
  // ===========================
  // PRODUCT CRUD
  // ===========================

  async getProducts(params = {}) {
    const { data } = await axiosClient.get(PRODUCT_API, {
      params,
    });
    return data;
  },

  async getProductById(id) {
    const { data } = await axiosClient.get(`${PRODUCT_API}/${id}`);
    return data;
  },

  async createProduct(formData) {
    const { data } = await axiosClient.post(PRODUCT_API, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return data;
  },

  async updateProduct(id, formData) {
    const { data } = await axiosClient.patch(`${PRODUCT_API}/${id}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return data;
  },

  async deleteProduct(id) {
    const { data } = await axiosClient.delete(`${PRODUCT_API}/${id}`);

    return data;
  },

  async bulkForceDeleteProducts(ids) {
    const { data } = await axiosClient.delete(
      `${PRODUCT_API}/bulk-force-delete`,
      {
        data: { ids },
      },
    );

    return data;
  },

  async restoreProduct(id) {
    const { data } = await axiosClient.patch(`${PRODUCT_API}/${id}/restore`);

    return data;
  },

  async forceDeleteProduct(id) {
    const { data } = await axiosClient.delete(`${PRODUCT_API}/${id}/force`);

    return data;
  },

  async duplicateProduct(id) {
    const { data } = await axiosClient.post(`${PRODUCT_API}/${id}/duplicate`);

    return data;
  },

  async toggleStatus(id) {
    const { data } = await axiosClient.patch(
      `${PRODUCT_API}/${id}/toggle-status`,
    );

    return data;
  },

  // ===========================
  // BULK ACTION
  // ===========================

  async bulkDeleteProducts(ids) {
    const { data } = await axiosClient.delete(`${PRODUCT_API}/bulk-delete`, {
      data: {
        ids,
      },
    });

    return data;
  },

  async bulkRestoreProducts(ids) {
    const { data } = await axiosClient.patch(`${PRODUCT_API}/bulk-restore`, {
      ids,
    });

    return data;
  },

  // ===========================
  // STOCK
  // ===========================

  async adjustStock(id, payload) {
    const { data } = await axiosClient.patch(
      `${PRODUCT_API}/${id}/adjust-stock`,
      payload,
    );

    return data;
  },

  async getStockWarning() {
    const { data } = await axiosClient.get(`${PRODUCT_API}/stock-warning`);

    return data;
  },

  async getStockReport() {
    const { data } = await axiosClient.get(`${PRODUCT_API}/stock-report`);

    return data;
  },

  async getStockHistory(id) {
    const { data } = await axiosClient.get(
      `${PRODUCT_API}/${id}/stock-history`,
    );

    return data;
  },

  // ===========================
  // GALLERY
  // ===========================

  async uploadGalleryImages(id, formData) {
    const { data } = await axiosClient.post(
      `${PRODUCT_API}/${id}/gallery`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    return data;
  },

  async deleteGalleryImage(productId, imageId) {
    const { data } = await axiosClient.delete(
      `${PRODUCT_API}/${productId}/gallery/${imageId}`,
    );

    return data;
  },

  // ===========================
  // TRASH
  // ===========================

  async getTrashProducts(params = {}) {
    const { data } = await axiosClient.get(`${PRODUCT_API}/trash`, {
      params,
    });

    return data;
  },

  // ===========================
  // DASHBOARD
  // ===========================

  async getStatistics() {
    const { data } = await axiosClient.get(`${PRODUCT_API}/statistics`);

    return data;
  },

  async getDashboard() {
    const { data } = await axiosClient.get(`${PRODUCT_API}/dashboard`);

    return data;
  },

  // ===========================
  // REPORT
  // ===========================

  async getTopSellingProducts(limit = 10) {
    const { data } = await axiosClient.get(`${PRODUCT_API}/top-selling`, {
      params: {
        limit,
      },
    });

    return data;
  },

  async getNewestProducts(limit = 10) {
    const { data } = await axiosClient.get(`${PRODUCT_API}/newest`, {
      params: {
        limit,
      },
    });

    return data;
  },

  async getFormData() {
    const { data } = await axiosClient.get("/admin/products/form-data");

    return data;
  },

  // ======================================================
  // CLIENT - PRODUCTS
  // ======================================================

  async getClientProducts(params = {}) {
    const { data } = await axiosClient.get(CLIENT_PRODUCT_API, {
      params,
    });

    return data;
  },

  async getClientProductBySlug(slug) {
    if (!slug) {
      throw new Error("Slug sản phẩm không hợp lệ.");
    }

    const { data } = await axiosClient.get(
      `${CLIENT_PRODUCT_API}/${encodeURIComponent(slug)}`,
    );

    return data;
  },
};

export default ProductService;
