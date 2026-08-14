function notImplemented(message) {
  return (req, res) => {
    return res.status(501).json({
      success: false,
      message,
    });
  };
}

module.exports = notImplemented;
