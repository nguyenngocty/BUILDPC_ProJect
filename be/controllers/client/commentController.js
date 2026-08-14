const Comment = require("../../models/Comment");

const { validateReviewData } = require("../../validations/commentValidation");

// =====================================================
// LẤY USER ID
// =====================================================

const getAuthenticatedUserId = (req) => {
  const userId = Number.parseInt(req.user?.id, 10);

  return Number.isInteger(userId) && userId > 0 ? userId : null;
};

// =====================================================
// GET
// /api/client/comments/products/:productId
// =====================================================

exports.getProductReviews = async (req, res, next) => {
  try {
    const productId = Number.parseInt(req.params.productId, 10);

    if (!Number.isInteger(productId) || productId < 1) {
      return res.status(400).json({
        success: false,

        message: "Sản phẩm không hợp lệ.",
      });
    }

    const product = await Comment.getProductById(productId);

    if (!product || Number(product.status) !== 1) {
      return res.status(404).json({
        success: false,

        message: "Không tìm thấy sản phẩm.",
      });
    }

    const result = await Comment.getProductReviews({
      productId,

      page: req.query.page,

      limit: req.query.limit,

      sort: req.query.sort,

      rating: req.query.rating ?? "",
    });

    return res.status(200).json({
      success: true,

      message: "Lấy đánh giá sản phẩm thành công.",

      data: result.reviews,

      rating: result.rating,

      pagination: result.pagination,
    });
  } catch (error) {
    return next(error);
  }
};

// =====================================================
// POST
// /api/client/comments/products/:productId
// =====================================================

exports.createReview = async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);

    const productId = Number.parseInt(req.params.productId, 10);

    if (!userId) {
      return res.status(401).json({
        success: false,

        message: "Bạn cần đăng nhập để đánh giá sản phẩm.",
      });
    }

    if (!Number.isInteger(productId) || productId < 1) {
      return res.status(400).json({
        success: false,

        message: "Sản phẩm không hợp lệ.",
      });
    }

    // ========================
    // Product
    // ========================

    const product = await Comment.getProductById(productId);

    if (!product || Number(product.status) !== 1) {
      return res.status(404).json({
        success: false,

        message: "Không tìm thấy sản phẩm.",
      });
    }

    // ========================
    // Validate
    // ========================

    const { errors, data } = validateReviewData(req.body);

    if (Object.keys(errors).length > 0) {
      return res.status(422).json({
        success: false,

        message: "Dữ liệu đánh giá không hợp lệ.",

        errors,
      });
    }

    // ========================
    // Kiểm tra mua hàng
    // ========================

    const purchased = await Comment.hasPurchasedProduct(userId, productId);

    if (!purchased) {
      return res.status(403).json({
        success: false,

        message:
          "Bạn chỉ có thể đánh giá sản phẩm sau khi đã mua và hoàn thành đơn hàng.",
      });
    }

    // ========================
    // Mỗi user 1 review
    // ========================

    const existingReview = await Comment.getUserReview(userId, productId);

    if (existingReview) {
      return res.status(409).json({
        success: false,

        message:
          "Bạn đã đánh giá sản phẩm này. Hãy chỉnh sửa đánh giá hiện tại nếu muốn thay đổi.",

        data: existingReview,
      });
    }

    // ========================
    // Create
    // ========================

    const review = await Comment.create({
      userId,
      productId,

      rating: data.rating,

      content: data.content,
    });

    return res.status(201).json({
      success: true,

      message: "Đánh giá sản phẩm thành công.",

      data: review,
    });
  } catch (error) {
    return next(error);
  }
};

// =====================================================
// PATCH
// /api/client/comments/:id
// =====================================================

exports.updateReview = async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);

    const reviewId = Number.parseInt(req.params.id, 10);

    if (!userId) {
      return res.status(401).json({
        success: false,

        message: "Bạn cần đăng nhập.",
      });
    }

    if (!Number.isInteger(reviewId) || reviewId < 1) {
      return res.status(400).json({
        success: false,

        message: "Đánh giá không hợp lệ.",
      });
    }

    const review = await Comment.getById(reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,

        message: "Không tìm thấy đánh giá.",
      });
    }

    // Không cho sửa review người khác.
    if (Number(review.user_id) !== userId) {
      return res.status(403).json({
        success: false,

        message: "Bạn không có quyền chỉnh sửa đánh giá này.",
      });
    }

    const { errors, data } = validateReviewData(req.body);

    if (Object.keys(errors).length > 0) {
      return res.status(422).json({
        success: false,

        message: "Dữ liệu đánh giá không hợp lệ.",

        errors,
      });
    }

    const updated = await Comment.update(reviewId, {
      rating: data.rating,

      content: data.content,
    });

    return res.status(200).json({
      success: true,

      message: "Cập nhật đánh giá thành công.",

      data: updated,
    });
  } catch (error) {
    return next(error);
  }
};

// =====================================================
// DELETE
// /api/client/comments/:id
// =====================================================

exports.deleteReview = async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);

    const reviewId = Number.parseInt(req.params.id, 10);

    if (!userId) {
      return res.status(401).json({
        success: false,

        message: "Bạn cần đăng nhập.",
      });
    }

    if (!Number.isInteger(reviewId) || reviewId < 1) {
      return res.status(400).json({
        success: false,

        message: "Đánh giá không hợp lệ.",
      });
    }

    const review = await Comment.getById(reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,

        message: "Không tìm thấy đánh giá.",
      });
    }

    if (Number(review.user_id) !== userId) {
      return res.status(403).json({
        success: false,

        message: "Bạn không có quyền xóa đánh giá này.",
      });
    }

    await Comment.softDelete(reviewId);

    return res.status(200).json({
      success: true,

      message: "Xóa đánh giá thành công.",
    });
  } catch (error) {
    return next(error);
  }
};
