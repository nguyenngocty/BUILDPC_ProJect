const User = require("../models/User");

const { verifyAccessToken } = require("../utils/jwt");

// ============================================================
// GET BEARER TOKEN
// ============================================================

function getBearerToken(req) {
  const authorization = String(req.headers.authorization || "").trim();

  if (!authorization) {
    return null;
  }

  const parts = authorization.split(/\s+/);

  if (parts.length !== 2) {
    return null;
  }

  const [scheme, token] = parts;

  if (String(scheme).toLowerCase() !== "bearer") {
    return null;
  }

  if (!token) {
    return null;
  }

  return token;
}

// ============================================================
// REQUIRE AUTH
// ============================================================

async function requireAuth(req, res, next) {
  try {
    // --------------------------------------------------------
    // TOKEN
    // --------------------------------------------------------

    const token = getBearerToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,

        message: "Bạn chưa đăng nhập.",
      });
    }

    // --------------------------------------------------------
    // VERIFY JWT
    // --------------------------------------------------------

    let payload;

    try {
      payload = verifyAccessToken(token);
    } catch (error) {
      const isExpired = error?.name === "TokenExpiredError";

      return res.status(401).json({
        success: false,

        message: isExpired
          ? "Phiên đăng nhập đã hết hạn."
          : "Access token không hợp lệ.",
      });
    }

    // --------------------------------------------------------
    // USER ID
    // --------------------------------------------------------

    const userId = Number(payload?.sub);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({
        success: false,

        message: "Access token không hợp lệ.",
      });
    }

    // --------------------------------------------------------
    // LOAD CURRENT USER
    //
    // QUAN TRỌNG:
    // dùng findByIdForAuth()
    // thay vì findById()
    //
    // Không được aggregate orders trong mỗi request.
    // --------------------------------------------------------

    const user = await User.findByIdForAuth(userId);

    if (!user) {
      return res.status(401).json({
        success: false,

        message: "Tài khoản không còn tồn tại.",
      });
    }

    // --------------------------------------------------------
    // USER STATUS
    // --------------------------------------------------------

    if (Number(user.status) !== 1) {
      return res.status(403).json({
        success: false,

        message: "Tài khoản đã bị khóa.",
      });
    }

    // --------------------------------------------------------
    // ROLE STATUS
    // --------------------------------------------------------

    if (Number(user.role_status) !== 1) {
      return res.status(403).json({
        success: false,

        message: "Vai trò của tài khoản không còn hoạt động.",
      });
    }

    // --------------------------------------------------------
    // ATTACH AUTH CONTEXT
    // --------------------------------------------------------

    req.user = user;

    req.auth = {
      userId,

      tokenPayload: payload,
    };

    return next();
  } catch (error) {
    return next(error);
  }
}

// ============================================================
// EXPORT
// ============================================================

module.exports = {
  requireAuth,
};
