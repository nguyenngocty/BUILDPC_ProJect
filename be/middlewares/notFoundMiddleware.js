function notFoundMiddleware(req, res) {
  return res.status(404).json({
    success: false,
    message: `Không tìm thấy endpoint: ${req.method} ${req.originalUrl}`,
  });
}

module.exports = notFoundMiddleware;
