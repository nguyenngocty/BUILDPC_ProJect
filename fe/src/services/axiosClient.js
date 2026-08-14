import axios from "axios";

/**
 * Axios Client
 * Dùng chung cho toàn bộ Admin & Client
 */

const axiosClient = axios.create({
  baseURL: "http://localhost:5000/api",

  timeout: 10000,

  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Request Interceptor
 */
axiosClient.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("accessToken") ||
      sessionStorage.getItem("accessToken");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);
/**
 * Response Interceptor
 */
axiosClient.interceptors.response.use(
  (response) => response,

  (error) => {
    if (error.response) {
      switch (error.response.status) {
        case 401:
          console.warn("Unauthorized");
          break;

        case 403:
          console.warn("Forbidden");
          break;

        case 404:
          console.warn("Not Found");
          break;

        case 500:
          console.warn("Internal Server Error");
          break;

        default:
          break;
      }
    }

    return Promise.reject(error);
  },
);

export default axiosClient;
