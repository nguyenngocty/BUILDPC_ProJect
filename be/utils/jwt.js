const jwt = require("jsonwebtoken");

// ============================================================
// JWT CONSTANTS
// ============================================================

const JWT_ISSUER = "buildpc-api";

const JWT_AUDIENCE = "buildpc-client";

// ============================================================
// SECRET
// ============================================================

function getJwtSecret() {
  const secret = String(process.env.JWT_SECRET || "").trim();

  if (!secret) {
    const error = new Error("JWT_SECRET chưa được cấu hình trên server.");

    error.statusCode = 500;

    throw error;
  }

  return secret;
}

// ============================================================
// CREATE ACCESS TOKEN
// ============================================================

function createAccessToken(user) {
  const userId = Number(user?.id);

  if (!Number.isInteger(userId) || userId <= 0) {
    const error = new Error(
      "Không thể tạo access token cho người dùng không hợp lệ.",
    );

    error.statusCode = 500;

    throw error;
  }

  return jwt.sign(
    {
      sub: String(userId),
    },

    getJwtSecret(),

    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",

      issuer: JWT_ISSUER,

      audience: JWT_AUDIENCE,
    },
  );
}

// ============================================================
// VERIFY ACCESS TOKEN
// ============================================================

function verifyAccessToken(token) {
  if (!token || typeof token !== "string") {
    const error = new Error("Access token không hợp lệ.");

    error.name = "JsonWebTokenError";

    throw error;
  }

  return jwt.verify(
    token,

    getJwtSecret(),

    {
      issuer: JWT_ISSUER,

      audience: JWT_AUDIENCE,
    },
  );
}

// ============================================================
// EXPORT
// ============================================================

module.exports = {
  createAccessToken,
  verifyAccessToken,
};
