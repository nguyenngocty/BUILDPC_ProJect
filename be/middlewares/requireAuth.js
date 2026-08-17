const User = require("../models/User");
const { verifyAccessToken } = require("../utils/jwt");

async function requireAuth(req, res, next) {
  try {
    const authorization = String(req.headers.authorization || "");
    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res
        .status(401)
        .json({ success: false, message: "Bạn chưa đăng nhập." });
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (error) {
      const message =
        error.name === "TokenExpiredError"
          ? "Phiên đăng nhập đã hết hạn."
          : "Access token không hợp lệ.";
      return res.status(401).json({ success: false, message });
    }

    const userId = Number(payload.sub);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res
        .status(401)
        .json({ success: false, message: "Access token không hợp lệ." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Tài khoản không còn tồn tại." });
    }

    // ✅ QUAN TRỌNG: Đã xóa điều kiện kiểm tra role_status
    if (Number(user.status) !== 1) {
      return res
        .status(403)
        .json({
          success: false,
          message: "Tài khoản đã bị khóa.",
        });
    }

    req.user = user;
    req.auth = { userId, tokenPayload: payload };
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = { requireAuth };