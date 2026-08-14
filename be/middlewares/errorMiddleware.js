function errorMiddleware(error, req, res, next) {
  console.error("❌ API Error:", error.message);

  const statusCode = error.statusCode || 500;

  return res.status(statusCode).json({
    success: false,
    message: error.message || "Đã có lỗi xảy ra trên server.",
  });
}

module.exports = errorMiddleware;
