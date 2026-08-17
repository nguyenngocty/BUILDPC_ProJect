import api from "./api";

function payloadOf(response) {
  return response?.data?.data || {};
}

function saveAccessToken(token, remember = true) {
  localStorage.removeItem("accessToken");
  sessionStorage.removeItem("accessToken");

  const storage = remember
    ? localStorage
    : sessionStorage;

  storage.setItem("accessToken", token);
}

/**
 * Gửi Google ID Token lên backend.
 *
 * credential chính là response.credential
 * được Google Identity Services trả về.
 */
async function loginWithGoogle({
  credential,
  remember = true,
}) {
  const response = await api.post(
    "/client/auth/google",
    {
      credential,
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
    remember
  );

  return {
    ...response.data,
    user: payload.user,
    accessToken: payload.accessToken,
  };
}

const googleAuthService = {
  loginWithGoogle,
};

export default googleAuthService;