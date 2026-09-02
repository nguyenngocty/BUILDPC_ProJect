import api from "./api";

// ============================================================
// ADMIN
// ============================================================

export const getComments = (params = {}) => {
  return api.get("/admin/comments", {
    params,
  });
};

export const getCommentStatistics = () => {
  return api.get("/admin/comments/statistics");
};

export const getCommentById = (id) => {
  return api.get(`/admin/comments/${id}`);
};

export const approveComment = (id) => {
  return api.patch(`/admin/comments/${id}/approve`);
};

export const rejectComment = (id) => {
  return api.patch(`/admin/comments/${id}/reject`);
};

export const deleteComment = (id) => {
  return api.delete(`/admin/comments/${id}`);
};

export const deleteManyComments = (ids) => {
  return api.delete("/admin/comments/multiple", {
    data: {
      ids,
    },
  });
};

export const getProducts = () => {
  return api.get("/admin/comments/products");
};

export const getUsers = () => {
  return api.get("/admin/comments/users");
};

// ============================================================
// CLIENT REVIEWS
// ============================================================

export const getProductComments = (productId, params = {}) => {
  return api.get(`/client/comments/products/${productId}`, {
    params,
  });
};

export const getMyProductReview = (productId) => {
  return api.get(`/client/comments/products/${productId}/me`);
};

export const createProductComment = (productId, data) => {
  return api.post(`/client/comments/products/${productId}`, data);
};

export const updateProductComment = (id, data) => {
  return api.patch(`/client/comments/${id}`, data);
};

export const deleteProductComment = (id) => {
  return api.delete(`/client/comments/${id}`);
};

// ============================================================
// ORDER → REVIEW
// ============================================================

export const getOrderReviewItems = (orderId) => {
  return api.get(`/client/comments/orders/${orderId}/items`);
};
