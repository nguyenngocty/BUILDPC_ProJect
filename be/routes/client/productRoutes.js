const express = require("express");
const controller = require("../../controllers/client/productController");
const { requireAuth } = require("../../middlewares/authMiddleware"); 
const router = express.Router();

router.get("/", controller.getAllProducts);

// 2. Lấy bình luận theo ID (Dùng Regex để chắc chắn chỉ nhận ID là số)
router.get("/comments/:id(\\d+)", controller.getProductComments);

// 3. THÊM BÌNH LUẬN MỚI (POST) - Bắt buộc đăng nhập
router.post("/comments", requireAuth, controller.createProductComment);

router.get("/top-sellers", controller.getTopSellingProducts);

router.get("/:slug", controller.getProductBySlug);

module.exports = router;    