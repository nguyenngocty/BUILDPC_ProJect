const Comment = require("../../models/Comment");

const { validateReviewData } = require("../../validations/commentValidation");

// ============================================================
// AUTH USER
// ============================================================

const getAuthenticatedUserId = (req) => {
  const rawUserId =
    req.auth?.userId ??
    req.auth?.id ??
    req.user?.id ??
    req.user?.userId ??
    null;

  const userId = Number.parseInt(rawUserId, 10);

  return Number.isInteger(userId) && userId > 0 ? userId : null;
};

const normalizePositiveInt = (value) => {
  const parsed = Number.parseInt(value, 10);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

// ============================================================
// GET PRODUCT REVIEWS
// ============================================================

exports.getProductReviews = async (req, res, next) => {
  try {
    const productId = normalizePositiveInt(req.params.productId);

    if (!productId) {
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

// ============================================================
// GET MY REVIEW ACCESS
// ============================================================

exports.getMyProductReview = async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);

    const productId = normalizePositiveInt(req.params.productId);

    if (!userId) {
      return res.status(401).json({
        success: false,

        message: "Bạn cần đăng nhập.",
      });
    }

    if (!productId) {
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

    const access = await Comment.getReviewAccess(userId, productId);

    return res.status(200).json({
      success: true,

      data: access,
    });
  } catch (error) {
    return next(error);
  }
};

// ============================================================
// ORDER REVIEW ITEMS
//
// GET /client/comments/orders/:orderId/items
// ============================================================

exports.getOrderReviewItems = async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);

    const orderId = normalizePositiveInt(req.params.orderId);

    if (!userId) {
      return res.status(401).json({
        success: false,

        message: "Bạn cần đăng nhập.",
      });
    }

    if (!orderId) {
      return res.status(400).json({
        success: false,

        message: "Đơn hàng không hợp lệ.",
      });
    }

    const result = await Comment.getOrderReviewItems(userId, orderId);

    if (!result) {
      return res.status(404).json({
        success: false,

        message: "Không tìm thấy đơn hàng.",
      });
    }

    return res.status(200).json({
      success: true,

      message: "Lấy trạng thái đánh giá của đơn hàng thành công.",

      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

// ============================================================
// CREATE
// ============================================================

exports.createReview = async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);

    const productId = normalizePositiveInt(req.params.productId);

    if (!userId) {
      return res.status(401).json({
        success: false,

        message: "Bạn cần đăng nhập để đánh giá sản phẩm.",
      });
    }

    if (!productId) {
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

    const { errors, data } = validateReviewData(req.body);

    if (Object.keys(errors).length > 0) {
      return res.status(422).json({
        success: false,

        message: "Dữ liệu đánh giá không hợp lệ.",

        errors,
      });
    }

    const purchased = await Comment.hasPurchasedProduct(userId, productId);

    if (!purchased) {
      return res.status(403).json({
        success: false,

        message:
          "Bạn chỉ có thể đánh giá sau khi đã mua sản phẩm và đơn hàng đã hoàn tất.",
      });
    }

    const existing = await Comment.getUserReview(userId, productId);

    if (existing) {
      return res.status(409).json({
        success: false,

        message:
          "Bạn đã đánh giá sản phẩm này. Hãy sử dụng chức năng chỉnh sửa.",

        data: existing,
      });
    }

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
    if (error?.code === "COMMENT_ALREADY_EXISTS") {
      return res.status(409).json({
        success: false,

        message: error.message,
      });
    }

    return next(error);
  }
};

// ============================================================
// UPDATE
// ============================================================

exports.updateReview = async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);

    const reviewId = normalizePositiveInt(req.params.id);

    if (!userId) {
      return res.status(401).json({
        success: false,

        message: "Bạn cần đăng nhập.",
      });
    }

    if (!reviewId) {
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

        message: "Bạn không có quyền chỉnh sửa đánh giá này.",
      });
    }

    const purchased = await Comment.hasPurchasedProduct(
      userId,
      review.product_id,
    );

    if (!purchased) {
      return res.status(403).json({
        success: false,

        message: "Tài khoản không đủ điều kiện chỉnh sửa đánh giá này.",
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

    if (!updated) {
      return res.status(404).json({
        success: false,

        message: "Đánh giá không còn tồn tại.",
      });
    }

    return res.status(200).json({
      success: true,

      message: "Cập nhật đánh giá thành công.",

      data: updated,
    });
  } catch (error) {
    return next(error);
  }
};

// ============================================================
// DELETE
// ============================================================

exports.deleteReview = async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);

    const reviewId = normalizePositiveInt(req.params.id);

    if (!userId) {
      return res.status(401).json({
        success: false,

        message: "Bạn cần đăng nhập.",
      });
    }

    if (!reviewId) {
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

    const deleted = await Comment.softDeleteUserProduct(
      userId,
      review.product_id,
    );

    if (!deleted) {
      return res.status(404).json({
        success: false,

        message: "Đánh giá không còn tồn tại.",
      });
    }

    return res.status(200).json({
      success: true,

      message: "Xóa đánh giá thành công.",
    });
  } catch (error) {
    return next(error);
  }
};
