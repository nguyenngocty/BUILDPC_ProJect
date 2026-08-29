import api from "./api";

// ============================================================
// HOME SERVICE
//
// Chỉ chứa những API public cần cho Trang chủ.
// Không sử dụng API Admin.
// ============================================================

const homeService = {
  // ==========================================================
  // CLIENT CATEGORIES
  //
  // GET /api/client/categories
  // ==========================================================

  async getCategories() {
    return api.get("/client/categories");
  },

  // ==========================================================
  // CLIENT TOP SELLERS
  //
  // GET /api/client/products/top-sellers
  // ==========================================================

  async getTopSellingProducts(limit = 8) {
    const normalizedLimit = Number(limit);

    return api.get("/client/products/top-sellers", {
      params: {
        limit:
          Number.isInteger(normalizedLimit) && normalizedLimit > 0
            ? normalizedLimit
            : 8,
      },
    });
  },
};

export default homeService;
