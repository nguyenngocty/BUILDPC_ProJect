const crypto = require("crypto");

const DEFAULT_EXPIRES_MINUTES = 15;
const DEFAULT_COOLDOWN_SECONDS = 60;

function integerFromEnv(
  value,
  fallback,
  minimum,
  maximum
) {
  const parsed = Number.parseInt(
    String(value || ""),
    10
  );

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(
    Math.max(parsed, minimum),
    maximum
  );
}

function getPasswordResetExpiresMinutes() {
  return integerFromEnv(
    process.env.PASSWORD_RESET_EXPIRES_MINUTES,
    DEFAULT_EXPIRES_MINUTES,
    5,
    60
  );
}

function getPasswordResetCooldownSeconds() {
  return integerFromEnv(
    process.env.PASSWORD_RESET_COOLDOWN_SECONDS,
    DEFAULT_COOLDOWN_SECONDS,
    30,
    600
  );
}

function generatePasswordResetToken() {
  return crypto
    .randomBytes(32)
    .toString("hex");
}

function hashPasswordResetToken(token) {
  return crypto
    .createHash("sha256")
    .update(String(token || ""))
    .digest("hex");
}

function getPasswordResetExpiresAt() {
  const minutes =
    getPasswordResetExpiresMinutes();

  return new Date(
    Date.now() + minutes * 60 * 1000
  );
}

function buildPasswordResetUrl(token) {
  const frontendUrl =
    process.env.FRONTEND_URL ||
    "http://localhost:3000";

  const normalizedBase =
    frontendUrl.endsWith("/")
      ? frontendUrl
      : `${frontendUrl}/`;

  const url = new URL(
    "reset-password",
    normalizedBase
  );

  url.searchParams.set("token", token);

  return url.toString();
}

module.exports = {
  generatePasswordResetToken,
  hashPasswordResetToken,
  getPasswordResetExpiresAt,
  getPasswordResetExpiresMinutes,
  getPasswordResetCooldownSeconds,
  buildPasswordResetUrl,
};