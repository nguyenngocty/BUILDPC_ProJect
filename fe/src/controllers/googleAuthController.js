import googleAuthService from "../services/googleAuthService";

function messageOf(
  error,
  fallback
) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}

/**
 * Đăng nhập bằng Google.
 *
 * Nhận credential từ Google Identity Services,
 * sau đó chuyển xuống service để gọi backend.
 */
export async function loginWithGoogle(
  credential
) {
  try {
    const normalizedCredential = String(
      credential || ""
    ).trim();

    if (!normalizedCredential) {
      throw new Error(
        "Không nhận được thông tin xác thực từ Google."
      );
    }

    return await googleAuthService.loginWithGoogle({
      credential: normalizedCredential,
      remember: true,
    });
  } catch (error) {
    throw new Error(
      messageOf(
        error,
        "Không thể đăng nhập bằng Google."
      )
    );
  }
}