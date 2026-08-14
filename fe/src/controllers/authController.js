// V4: bổ sung quên mật khẩu và đặt lại mật khẩu.
import authService from "../services/authService";

import {
  createLoginPayload,
  createRegisterPayload,
  createForgotPasswordPayload,
  createResetPasswordPayload,
  createProfilePayload,
  createChangePasswordPayload,
} from "../models/UserModel";

function messageOf(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}

export async function login(formData) {
  try {
    return await authService.login(
      createLoginPayload(formData)
    );
  } catch (error) {
    throw new Error(
      messageOf(error, "Không thể đăng nhập.")
    );
  }
}

export async function register(formData) {
  try {
    return await authService.register(
      createRegisterPayload(formData)
    );
  } catch (error) {
    throw new Error(
      messageOf(
        error,
        "Không thể đăng ký tài khoản."
      )
    );
  }
}

export async function forgotPassword(formData) {
  try {
    const payload =
      createForgotPasswordPayload(formData);

    return await authService.forgotPassword(
      payload.email
    );
  } catch (error) {
    throw new Error(
      messageOf(
        error,
        "Không thể gửi hướng dẫn đặt lại mật khẩu."
      )
    );
  }
}

export async function forgotPasswordForCurrentUser() {
  try {
    return await authService.forgotPasswordForCurrentUser();
  } catch (error) {
    throw new Error(
      messageOf(
        error,
        "Không thể gửi liên kết đặt lại mật khẩu."
      )
    );
  }
}

export async function resetPassword(formData) {
  try {
    return await authService.resetPassword(
      createResetPasswordPayload(formData)
    );
  } catch (error) {
    throw new Error(
      messageOf(
        error,
        "Không thể đặt lại mật khẩu."
      )
    );
  }
}

export async function getCurrentUser() {
  try {
    return await authService.getCurrentUser();
  } catch (error) {
    authService.logout();

    throw new Error(
      messageOf(
        error,
        "Phiên đăng nhập không còn hợp lệ."
      )
    );
  }
}

export async function updateProfile(formData) {
  try {
    const response =
      await authService.updateProfile(
        createProfilePayload(formData)
      );

    return {
      ...response,
      user: response?.data?.user || null,
    };
  } catch (error) {
    const normalizedError = new Error(
      messageOf(
        error,
        "Không thể cập nhật hồ sơ."
      )
    );

    if (error?.fieldErrors) {
      normalizedError.fieldErrors =
        error.fieldErrors;
    }

    throw normalizedError;
  }
}

export async function updateAvatar(file) {
  try {
    if (!file) {
      throw new Error(
        "Vui lòng chọn ảnh đại diện."
      );
    }

    const response =
      await authService.updateAvatar(file);

    return {
      ...response,
      user: response?.data?.user || null,
    };
  } catch (error) {
    throw new Error(
      messageOf(
        error,
        "Không thể cập nhật ảnh đại diện."
      )
    );
  }
}

export async function changePassword(formData) {
  try {
    return await authService.changePassword(
      createChangePasswordPayload(formData)
    );
  } catch (error) {
    throw new Error(
      messageOf(
        error,
        "Không thể đổi mật khẩu."
      )
    );
  }
}

export function logout() {
  authService.logout();
}

export function hasToken() {
  return authService.hasToken();
}