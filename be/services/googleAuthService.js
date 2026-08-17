const {
  OAuth2Client,
} = require("google-auth-library");

function getGoogleClientId() {
  const clientId = String(
    process.env.GOOGLE_CLIENT_ID || ""
  ).trim();

  if (!clientId) {
    const error = new Error(
      "GOOGLE_CLIENT_ID chưa được cấu hình trên server."
    );

    error.statusCode = 500;
    throw error;
  }

  return clientId;
}

const googleClient = new OAuth2Client();

/**
 * Xác minh Google ID Token do frontend gửi lên.
 *
 * credential chính là response.credential được trả về
 * từ Google Identity Services.
 */
async function verifyGoogleCredential(
  credential
) {
  const token = String(
    credential || ""
  ).trim();

  if (!token) {
    const error = new Error(
      "Thiếu thông tin xác thực Google."
    );

    error.statusCode = 422;
    throw error;
  }

  try {
    const clientId = getGoogleClientId();

    const ticket =
      await googleClient.verifyIdToken({
        idToken: token,
        audience: clientId,
      });

    const payload = ticket.getPayload();

    if (!payload) {
      const error = new Error(
        "Không lấy được thông tin tài khoản Google."
      );

      error.statusCode = 401;
      throw error;
    }

    const googleId = String(
      payload.sub || ""
    ).trim();

    const email = String(
      payload.email || ""
    )
      .trim()
      .toLowerCase();

    const fullName = String(
      payload.name || ""
    ).trim();

    const avatar = String(
      payload.picture || ""
    ).trim();

    const emailVerified =
      payload.email_verified === true;

    if (!googleId) {
      const error = new Error(
        "Tài khoản Google không có mã định danh hợp lệ."
      );

      error.statusCode = 401;
      throw error;
    }

    if (!email) {
      const error = new Error(
        "Không lấy được email từ tài khoản Google."
      );

      error.statusCode = 401;
      throw error;
    }

    if (!emailVerified) {
      const error = new Error(
        "Email Google chưa được xác minh."
      );

      error.statusCode = 401;
      throw error;
    }

    return {
      googleId,
      email,
      fullName:
        fullName || email.split("@")[0],
      avatar: avatar || null,

      // Một số thông tin giữ lại để controller
      // có thể dùng khi cần kiểm tra liên kết tài khoản.
      hostedDomain: String(
        payload.hd || ""
      ).trim(),

      issuer: String(
        payload.iss || ""
      ).trim(),
    };
  } catch (error) {
    /*
     * Giữ nguyên các lỗi do chúng ta chủ động tạo.
     */
    if (error.statusCode) {
      throw error;
    }

    console.error(
      "[Google Auth] Verify token thất bại:",
      error
    );

    const verifyError = new Error(
      "Phiên đăng nhập Google không hợp lệ hoặc đã hết hạn. Vui lòng thử lại."
    );

    verifyError.statusCode = 401;

    throw verifyError;
  }
}

module.exports = {
  verifyGoogleCredential,
};