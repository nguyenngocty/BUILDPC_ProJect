import axiosClient from "./axiosClient";

const PRODUCT_API = "/admin/products";
const CLIENT_PRODUCT_API = "/client/products";

const ProductService = {
  // ============================================================
  // PRODUCT CRUD
  // ============================================================

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

  // ============================================================
  // BULK PRODUCT ACTIONS
  // ============================================================

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

  async bulkForceDeleteProducts(ids) {
    const { data } = await axiosClient.delete(
      `${PRODUCT_API}/bulk-force-delete`,
      {
        data: {
          ids,
        },
      },
    );

    return data;
  },

  // ============================================================
  // PRODUCT STOCK
  // Chỉ phù hợp với product không có nhiều variants
  // ============================================================

  async adjustStock(id, payload) {
    const { data } = await axiosClient.patch(
      `${PRODUCT_API}/${id}/adjust-stock`,
      payload,
    );

    return data;
  },

  async getStockWarning(params = {}) {
    const { data } = await axiosClient.get(`${PRODUCT_API}/stock-warning`, {
      params,
    });

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

  // ============================================================
  // PRODUCT GALLERY
  // ============================================================

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

  // ============================================================
  // VARIANT MANAGEMENT
  // ============================================================

  async getVariant(productId, variantId) {
    const { data } = await axiosClient.get(
      `${PRODUCT_API}/${productId}/variants/${variantId}`,
    );

    return data;
  },

  async createVariant(productId, payload) {
    const { data } = await axiosClient.post(
      `${PRODUCT_API}/${productId}/variants`,
      payload,
    );

    return data;
  },

  async updateVariant(productId, variantId, payload) {
    const { data } = await axiosClient.patch(
      `${PRODUCT_API}/${productId}/variants/${variantId}`,
      payload,
    );

    return data;
  },

  async toggleVariantStatus(productId, variantId) {
    const { data } = await axiosClient.patch(
      `${PRODUCT_API}/${productId}/variants/${variantId}/toggle-status`,
    );

    return data;
  },

  async setDefaultVariant(productId, variantId) {
    const { data } = await axiosClient.patch(
      `${PRODUCT_API}/${productId}/variants/${variantId}/set-default`,
    );

    return data;
  },

  async deleteVariant(productId, variantId) {
    const { data } = await axiosClient.delete(
      `${PRODUCT_API}/${productId}/variants/${variantId}`,
    );

    return data;
  },

  async restoreVariant(productId, variantId) {
    const { data } = await axiosClient.patch(
      `${PRODUCT_API}/${productId}/variants/${variantId}/restore`,
    );

    return data;
  },

  // ============================================================
  // VARIANT STOCK
  //
  // payload:
  // {
  //   type: "import" | "export" | "adjust",
  //   quantity: number,
  //   note?: string
  // }
  // ============================================================

  async adjustVariantStock(productId, variantId, payload) {
    const { data } = await axiosClient.patch(
      `${PRODUCT_API}/${productId}/variants/${variantId}/adjust-stock`,
      payload,
    );

    return data;
  },

  // ============================================================
  // VARIANT IMAGES
  // ============================================================

  async getVariantImages(productId, variantId) {
    const { data } = await axiosClient.get(
      `${PRODUCT_API}/${productId}/variants/${variantId}/images`,
    );

    return data;
  },

  async uploadVariantImages(productId, variantId, files) {
    const formData = new FormData();

    const normalizedFiles = Array.isArray(files)
      ? files
      : Array.from(files || []);

    normalizedFiles.forEach((file) => {
      formData.append("images", file);
    });

    const { data } = await axiosClient.post(
      `${PRODUCT_API}/${productId}/variants/${variantId}/images`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    return data;
  },

  async setPrimaryVariantImage(productId, variantId, imageId) {
    const { data } = await axiosClient.patch(
      `${PRODUCT_API}/${productId}/variants/${variantId}/images/${imageId}/primary`,
    );

    return data;
  },

  async deleteVariantImage(productId, variantId, imageId) {
    const { data } = await axiosClient.delete(
      `${PRODUCT_API}/${productId}/variants/${variantId}/images/${imageId}`,
    );

    return data;
  },

  // ============================================================
  // TRASH
  // ============================================================

  async getTrashProducts(params = {}) {
    const { data } = await axiosClient.get(`${PRODUCT_API}/trash`, {
      params,
    });

    return data;
  },

  // ============================================================
  // DASHBOARD / STATISTICS
  // ============================================================

  async getStatistics() {
    const { data } = await axiosClient.get(`${PRODUCT_API}/statistics`);

    return data;
  },

  async getDashboard() {
    const { data } = await axiosClient.get(`${PRODUCT_API}/dashboard`);

    return data;
  },

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

  // ============================================================
  // SYSTEM / FORM DATA
  // ============================================================

  async getFormData() {
    const { data } = await axiosClient.get(`${PRODUCT_API}/form-data`);

    return data;
  },

  async checkSku({ sku, productId = null, variantId = null }) {
    const { data } = await axiosClient.get(`${PRODUCT_API}/check-sku`, {
      params: {
        sku,
        id: productId || undefined,
        variant_id: variantId || undefined,
      },
    });

    return data;
  },

  async searchSuggestion(keyword) {
    const { data } = await axiosClient.get(`${PRODUCT_API}/search-suggestion`, {
      params: {
        q: keyword,
      },
    });

    return data;
  },

  // ============================================================
  // CLIENT PRODUCTS
  // ============================================================

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
