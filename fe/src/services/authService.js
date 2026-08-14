// V4: bổ sung quên mật khẩu và đặt lại mật khẩu.
import api from "./api";

function payloadOf(response) {
  return response?.data?.data || {};
}

function saveAccessToken(token, remember) {
  localStorage.removeItem("accessToken");
  sessionStorage.removeItem("accessToken");

  const storage = remember
    ? localStorage
    : sessionStorage;

  storage.setItem("accessToken", token);
}

async function login(credentials) {
  const response = await api.post(
    "/client/auth/login",
    {
      email: credentials.email,
      password: credentials.password,
    }
  );

  const payload = payloadOf(response);

  if (!payload.accessToken) {
    throw new Error(
      "Máy chủ không trả về access token."
    );
  }

  saveAccessToken(
    payload.accessToken,
    credentials.remember
  );

  return {
    ...response.data,
    user: payload.user,
    accessToken: payload.accessToken,
  };
}

async function register(data) {
  const response = await api.post(
    "/client/auth/register",
    data
  );

  return response.data;
}

async function forgotPassword(email) {
  const response = await api.post(
    "/client/auth/forgot-password",
    {
      email,
    }
  );

  return response.data;
}

async function forgotPasswordForCurrentUser() {
  const response = await api.post(
    "/client/auth/forgot-password/account"
  );

  return response.data;
}

async function resetPassword(data) {
  const response = await api.post(
    "/client/auth/reset-password",
    {
      token: data.token,
      newPassword: data.newPassword,
      confirmPassword: data.confirmPassword,
    }
  );

  return response.data;
}

async function getCurrentUser() {
  const response = await api.get(
    "/client/auth/profile"
  );

  return payloadOf(response).user;
}

async function updateProfile(data) {
  const response = await api.patch(
    "/client/auth/profile",
    data
  );

  return response.data;
}

async function updateAvatar(file) {
  const formData = new FormData();
  formData.append("avatar", file);

  const response = await api.patch(
    "/client/auth/avatar",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data;
}

async function changePassword(data) {
  const response = await api.patch(
    "/client/auth/password",
    data
  );

  return response.data;
}

function logout() {
  localStorage.removeItem("accessToken");
  sessionStorage.removeItem("accessToken");
}

function hasToken() {
  return Boolean(
    localStorage.getItem("accessToken") ||
      sessionStorage.getItem("accessToken")
  );
}

const authService = {
  login,
  register,
  forgotPassword,
  forgotPasswordForCurrentUser,
  resetPassword,
  getCurrentUser,
  updateProfile,
  updateAvatar,
  changePassword,
  logout,
  hasToken,
};

export default authService;