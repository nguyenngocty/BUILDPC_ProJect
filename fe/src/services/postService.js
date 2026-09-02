import api from "./api";

/* ============================================================
   CLIENT POST
============================================================ */

const CLIENT_API = "/client/posts";

// ============================================================
// CLIENT - LIST
// ============================================================

export const getBlogs = (params = {}) => {
  return api.get(CLIENT_API, {
    params,
  });
};

// ============================================================
// CLIENT - CATEGORIES
// ============================================================

export const getBlogCategories = () => {
  return api.get(`${CLIENT_API}/categories`);
};

// ============================================================
// CLIENT - DETAIL BY ID
// ============================================================

export const getBlogById = (id) => {
  return api.get(`${CLIENT_API}/${id}`);
};

// ============================================================
// CLIENT - DETAIL BY SLUG
// ============================================================

export const getBlogBySlug = (slug) => {
  return api.get(`${CLIENT_API}/slug/${encodeURIComponent(slug)}`);
};

/* ============================================================
   ADMIN POST
============================================================ */

const ADMIN_API = "/admin/posts";

const postService = {
  // ============================================================
  // LIST
  // ============================================================

  getPosts: (params = {}) => {
    return api.get(ADMIN_API, {
      params,
    });
  },

  // ============================================================
  // DETAIL
  // ============================================================

  getPost: (id) => {
    return api.get(`${ADMIN_API}/${id}`);
  },

  // ============================================================
  // CREATE
  // ============================================================

  createPost: (data) => {
    return api.post(ADMIN_API, data);
  },

  // ============================================================
  // UPDATE
  // ============================================================

  updatePost: (id, data) => {
    return api.patch(`${ADMIN_API}/${id}`, data);
  },

  // ============================================================
  // DELETE
  // ============================================================

  deletePost: (id) => {
    return api.delete(`${ADMIN_API}/${id}`);
  },

  // ============================================================
  // TRASH
  // ============================================================

  getTrash: (params = {}) => {
    return api.get(`${ADMIN_API}/trash`, {
      params,
    });
  },

  // ============================================================
  // RESTORE
  // ============================================================

  restorePost: (id) => {
    return api.patch(`${ADMIN_API}/${id}/restore`);
  },

  // ============================================================
  // TOGGLE STATUS
  // ============================================================

  toggleStatus: (id) => {
    return api.patch(`${ADMIN_API}/${id}/toggle-status`);
  },

  // ============================================================
  // TOGGLE FEATURED
  // ============================================================

  toggleFeatured: (id) => {
    return api.patch(`${ADMIN_API}/${id}/toggle-featured`);
  },

  // ============================================================
  // UPLOAD THUMBNAIL
  // ============================================================

  uploadThumbnail: (file) => {
    const formData = new FormData();

    formData.append("thumbnail", file);

    return api.post(`${ADMIN_API}/upload`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  // ============================================================
  // CKEDITOR IMAGE
  // ============================================================

  uploadContentImage: (file) => {
    const formData = new FormData();

    formData.append("image", file);

    return api.post(`${ADMIN_API}/upload-image`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },
};

export default postService;
