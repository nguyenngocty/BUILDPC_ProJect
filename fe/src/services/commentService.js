import api from "./api";

// ======================================
// LẤY DANH SÁCH BÌNH LUẬN
// ======================================
export const getComments = (params = {}) => {
  return api.get("/admin/comments", { params });
};

// ======================================
// THỐNG KÊ
// ======================================
export const getCommentStatistics = () => {
  return api.get("/admin/comments/statistics");
};

// ======================================
// CHI TIẾT BÌNH LUẬN
// ======================================
export const getCommentById = (id) => {
  return api.get(`/admin/comments/${id}`);
};

// ======================================
// DUYỆT
// ======================================
export const approveComment = (id) => {
  return api.patch(`/admin/comments/${id}/approve`);
};

// ======================================
// TỪ CHỐI
// ======================================
export const rejectComment = (id) => {
  return api.patch(`/admin/comments/${id}/reject`);
};

// ======================================
// XÓA
// ======================================
export const deleteComment = (id) => {
  return api.delete(`/admin/comments/${id}`);
};

// ======================================
// XÓA NHIỀU
// ======================================
export const deleteManyComments = (ids) => {
  return api.delete("/admin/comments/multiple", {
    data: { ids },
  });
};

// ======================================
// DANH SÁCH SẢN PHẨM
// ======================================
export const getProducts = () => {
  return api.get("/admin/comments/products");
};

// ======================================
// DANH SÁCH NGƯỜI DÙNG
// ======================================
export const getUsers = () => {
  return api.get("/admin/comments/users");
};