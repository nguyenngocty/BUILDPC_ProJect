// V5: bổ sung đăng nhập bằng Google.
const express = require("express");

const controller = require(
  "../../controllers/client/authController"
);

const googleAuthController = require(
  "../../controllers/client/googleAuthController"
);

const {
  requireAuth,
} = require(
  "../../middlewares/authMiddleware"
);

const {
  uploadAvatar,
} = require(
  "../../middlewares/uploadAvatar"
);

const router = express.Router();

router.post(
  "/register",
  controller.register
);

router.post(
  "/login",
  controller.login
);

/*
 * Đăng nhập bằng Google.
 *
 * Frontend gửi:
 * {
 *   credential: "Google ID Token"
 * }
 */
router.post(
  "/google",
  googleAuthController.googleLogin
);

router.post(
  "/forgot-password",
  controller.forgotPassword
);

router.post(
  "/reset-password",
  controller.resetPassword
);

router.post(
  "/forgot-password/account",
  requireAuth,
  controller.forgotPasswordForCurrentUser
);

router.get(
  "/profile",
  requireAuth,
  controller.getProfile
);

router.patch(
  "/profile",
  requireAuth,
  controller.updateProfile
);

router.patch(
  "/avatar",
  requireAuth,
  uploadAvatar,
  controller.updateAvatar
);

router.patch(
  "/password",
  requireAuth,
  controller.changePassword
);

module.exports = router;