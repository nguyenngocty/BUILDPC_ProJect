const express = require("express");
const router = express.Router();

const commentController = require("../../controllers/admin/commentController");

// ===============================
// Danh sách bình luận
// ===============================
router.get("/", commentController.getAllComments);

// ===============================
// Thống kê
// ===============================
router.get("/statistics", commentController.getCommentStatistics);

// ===============================
// Danh sách sản phẩm
// ===============================
router.get("/products", commentController.getProducts);

// ===============================
// Danh sách người dùng
// ===============================
router.get("/users", commentController.getUsers);

// ===============================
// Chi tiết bình luận
// ===============================
router.get("/:id", commentController.getCommentById);

// ===============================
// Duyệt bình luận
// ===============================
router.patch("/:id/approve", commentController.approveComment);

// ===============================
// Từ chối bình luận
// ===============================
router.patch("/:id/reject", commentController.rejectComment);

// ===============================
// Xóa nhiều bình luận
// ===============================
router.delete("/multiple", commentController.deleteManyComments);

// ===============================
// Xóa 1 bình luận
// ===============================
router.delete("/:id", commentController.deleteComment);

module.exports = router;