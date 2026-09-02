const normalizeRating = (value) => {
  const rating = Number.parseInt(value, 10);

  return Number.isInteger(rating) ? rating : null;
};

const validateReviewData = (data = {}) => {
  const errors = {};

  const rating = normalizeRating(data.rating);

  const content = String(data.content || "").trim();

  // ==========================================================
  // RATING
  // ==========================================================

  if (rating === null) {
    errors.rating = "Vui lòng chọn số sao đánh giá.";
  } else if (rating < 1 || rating > 5) {
    errors.rating = "Số sao đánh giá phải từ 1 đến 5.";
  }

  // ==========================================================
  // CONTENT
  // ==========================================================

  if (!content) {
    errors.content = "Vui lòng nhập nội dung đánh giá.";
  } else if (content.length < 3) {
    errors.content = "Nội dung đánh giá quá ngắn.";
  } else if (content.length > 2000) {
    errors.content = "Nội dung đánh giá tối đa 2000 ký tự.";
  }

  return {
    errors,

    data: {
      rating,
      content,
    },
  };
};

module.exports = {
  validateReviewData,
};
