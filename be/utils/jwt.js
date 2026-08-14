const jwt = require("jsonwebtoken");

function getJwtSecret() {
  const secret = String(process.env.JWT_SECRET || "").trim();

  if (!secret) {
    const error = new Error("JWT_SECRET chưa được cấu hình trên server.");
    error.statusCode = 500;
    throw error;
  }

  return secret;
}

function createAccessToken(user) {
  return jwt.sign(
    { sub: String(user.id) },
    getJwtSecret(),
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
      issuer: "buildpc-api",
      audience: "buildpc-client",
    }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, getJwtSecret(), {
    issuer: "buildpc-api",
    audience: "buildpc-client",
  });
}

module.exports = { createAccessToken, verifyAccessToken };
