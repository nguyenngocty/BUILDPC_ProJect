import api from "./api";

/* ================= CLIENT ================= */

export const getBlogs = (params) => {
  return api.get("/client/posts", { params });
};

export const getBlogById = (id) => {
  return api.get(`/client/posts/${id}`);
};

/* ================= ADMIN ================= */

const ADMIN_API = "/admin/posts";

const postService = {
  getPosts: (params) => api.get(ADMIN_API, { params }),

  getPost: (id) => api.get(`${ADMIN_API}/${id}`),

  uploadThumbnail: (file) => {
    const formData = new FormData();

    formData.append("thumbnail", file);

    return api.post(`${ADMIN_API}/upload`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  createPost: (data) => api.post(ADMIN_API, data),

  updatePost: (id, data) => api.patch(`${ADMIN_API}/${id}`, data),

  deletePost: (id) => api.delete(`${ADMIN_API}/${id}`),
};

export default postService;
