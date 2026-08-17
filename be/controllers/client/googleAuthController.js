const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const User = require("../../models/User");
const GoogleAuth = require("../../models/GoogleAuth");

const {
  verifyGoogleCredential,
} = require("../../services/googleAuthService");

const {
  createAccessToken,
} = require("../../utils/jwt");

const {
  formatAuthUser,
} = require("../../utils/authUser");

/**
 * Kiểm tra tài khoản và role còn hoạt động hay không.
 */
function isActiveAccount(user) {
  return (
    user &&
    Number(user.status) === 1 &&
    Number(user.role_status) === 1
  );
}

/**
 * Tạo kết quả đăng nhập giống hệt login email/password
 * hiện tại của hệ thống.
 */
async function createLoginResponse(userId) {
  await User.updateLastLogin(userId);

  const refreshedUser =
    await User.findById(userId);

  if (!refreshedUser) {
    const error = new Error(
      "Không tìm thấy tài khoản sau khi đăng nhập Google."
    );

    error.statusCode = 404;
    throw error;
  }

  if (!isActiveAccount(refreshedUser)) {
    const error = new Error(
      "Tài khoản đã bị khóa hoặc vai trò không còn hoạt động."
    );

    error.statusCode = 403;
    throw error;
  }

  const accessToken =
    createAccessToken(refreshedUser);

  return {
    accessToken,
    user: formatAuthUser(refreshedUser),
  };
}

/**
 * POST /api/client/auth/google
 *
 * Body:
 * {
 *   credential: "Google ID Token"
 * }
 */
async function googleLogin(
  req,
  res,
  next
) {
  try {
    const credential = String(
      req.body?.credential || ""
    ).trim();

    if (!credential) {
      return res.status(422).json({
        success: false,
        message:
          "Thiếu thông tin đăng nhập Google.",
      });
    }

    /*
     * Bước 1:
     * Xác minh ID Token trực tiếp với Google.
     */
    const googleProfile =
      await verifyGoogleCredential(
        credential
      );

    const {
      googleId,
      email,
      fullName,
      avatar,
    } = googleProfile;

    /*
     * Bước 2:
     * Nếu google_id đã tồn tại thì đăng nhập
     * đúng tài khoản đó.
     */
    const existingGoogleUser =
      await GoogleAuth.findByGoogleId(
        googleId
      );

    if (existingGoogleUser) {
      if (
        !isActiveAccount(
          existingGoogleUser
        )
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Tài khoản đã bị khóa hoặc vai trò không còn hoạt động.",
        });
      }

      const loginResult =
        await createLoginResponse(
          existingGoogleUser.id
        );

      return res.status(200).json({
        success: true,
        message:
          "Đăng nhập bằng Google thành công.",
        data: loginResult,
      });
    }

    /*
     * Bước 3:
     * Chưa từng liên kết Google.
     *
     * Kiểm tra email Google có trùng với
     * tài khoản BuildPC hiện tại không.
     */
    const existingEmailUser =
      await GoogleAuth.findByEmail(email);

    if (existingEmailUser) {
      if (
        !isActiveAccount(
          existingEmailUser
        )
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Tài khoản sử dụng email này đang bị khóa hoặc vai trò không còn hoạt động.",
        });
      }

      /*
       * Trường hợp tài khoản đã có google_id
       * nhưng google_id khác tài khoản đang
       * đăng nhập thì tuyệt đối không ghi đè.
       */
      if (
        existingEmailUser.google_id &&
        String(
          existingEmailUser.google_id
        ) !== String(googleId)
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Email này đã được liên kết với một tài khoản Google khác.",
        });
      }

      /*
       * Email tồn tại nhưng chưa có Google:
       * liên kết Google vào user cũ.
       *
       * Không tạo user trùng.
       */
      if (
        !existingEmailUser.google_id
      ) {
        try {
          await GoogleAuth.linkGoogleAccount({
            userId:
              existingEmailUser.id,
            googleId,
          });
        } catch (linkError) {
          /*
           * Có thể xảy ra race condition:
           * google_id vừa được liên kết với user
           * khác trong cùng thời điểm.
           */
          if (
            linkError.code ===
            "ER_DUP_ENTRY"
          ) {
            return res.status(409).json({
              success: false,
              message:
                "Tài khoản Google này đã được liên kết với tài khoản khác.",
            });
          }

          throw linkError;
        }
      }

      const loginResult =
        await createLoginResponse(
          existingEmailUser.id
        );

      return res.status(200).json({
        success: true,
        message:
          "Đăng nhập bằng Google thành công.",
        data: loginResult,
      });
    }

    /*
     * Bước 4:
     * Email chưa tồn tại.
     *
     * Tạo CUSTOMER mới.
     */
    const customerRole =
      await User.findRoleByCode(
        "CUSTOMER"
      );

    if (!customerRole) {
      return res.status(500).json({
        success: false,
        message:
          "Hệ thống chưa cấu hình vai trò CUSTOMER.",
      });
    }

    /*
     * Database hiện tại đang để password NOT NULL.
     *
     * Vì tài khoản Google không cần người dùng nhập
     * mật khẩu nên backend tạo một password ngẫu nhiên,
     * sau đó bcrypt hash trước khi lưu DB.
     *
     * Người dùng không biết chuỗi này.
     */
    const randomPassword =
      crypto
        .randomBytes(48)
        .toString("hex");

    const passwordHash =
      await bcrypt.hash(
        randomPassword,
        12
      );

    let newUser;

    try {
      newUser =
        await GoogleAuth.createGoogleUser({
          roleId: customerRole.id,
          googleId,
          fullName,
          email,
          passwordHash,
          avatar,
        });
    } catch (createError) {
      /*
       * Bảo vệ trường hợp hai request Google
       * tạo cùng tài khoản gần như đồng thời.
       */
      if (
        createError.code ===
        "ER_DUP_ENTRY"
      ) {
        /*
         * Kiểm tra lại google_id trước.
         */
        const userByGoogle =
          await GoogleAuth.findByGoogleId(
            googleId
          );

        if (userByGoogle) {
          const loginResult =
            await createLoginResponse(
              userByGoogle.id
            );

          return res.status(200).json({
            success: true,
            message:
              "Đăng nhập bằng Google thành công.",
            data: loginResult,
          });
        }

        /*
         * Nếu duplicate là do email thì kiểm tra
         * tài khoản email vừa được tạo/link.
         */
        const userByEmail =
          await GoogleAuth.findByEmail(
            email
          );

        if (userByEmail) {
          return res.status(409).json({
            success: false,
            message:
              "Email này vừa được sử dụng bởi một tài khoản khác. Vui lòng thử đăng nhập lại.",
          });
        }
      }

      throw createError;
    }

    if (!newUser) {
      return res.status(500).json({
        success: false,
        message:
          "Không thể tạo tài khoản Google.",
      });
    }

    /*
     * Bước 5:
     * Tạo JWT BuildPC như đăng nhập thường.
     */
    const loginResult =
      await createLoginResponse(
        newUser.id
      );

    return res.status(201).json({
      success: true,
      message:
        "Đăng nhập bằng Google thành công.",
      data: loginResult,
    });
  } catch (error) {
    /*
     * googleAuthService có thể chủ động đặt
     * statusCode = 401 / 422 / 500.
     */
    if (error.statusCode) {
      return res
        .status(error.statusCode)
        .json({
          success: false,
          message:
            error.message ||
            "Không thể đăng nhập bằng Google.",
        });
    }

    console.error(
      "[Google Login] Lỗi:",
      error
    );

    return next(error);
  }
}

module.exports = {
  googleLogin,
};