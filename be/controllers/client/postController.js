const Post = require("../../models/Post");

// ============================================================
// HELPER
// ============================================================

function normalizeExcerpt(excerpt) {
  if (!excerpt) {
    return excerpt;
  }

  return String(excerpt)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ============================================================
// GET POSTS
//
// GET /api/client/posts
//
// Query:
// ?search=build
// ?post_category_id=1
// ?sort=latest
// ?page=1
// ?limit=6
// ============================================================

exports.getPosts = async (req, res) => {
  try {
    const {
      search = "",

      post_category_id = "",

      /*
       * compatibility với FE cũ
       */
      category_id = "",

      sort = "latest",

      page = 1,

      limit = 6,
    } = req.query;

    // ==========================================================
    // PAGE
    // ==========================================================

    const pageNum = Math.max(1, Number.parseInt(page, 10) || 1);

    // ==========================================================
    // LIMIT
    // ==========================================================

    const limitNum = Math.min(
      50,

      Math.max(
        1,

        Number.parseInt(limit, 10) || 6,
      ),
    );

    // ==========================================================
    // CATEGORY
    // ==========================================================

    const rawCategoryId = post_category_id || category_id || "";

    let postCategoryId = null;

    if (rawCategoryId && rawCategoryId !== "all") {
      const parsed = Number.parseInt(rawCategoryId, 10);

      if (!Number.isInteger(parsed) || parsed <= 0) {
        return res.status(400).json({
          success: false,

          message: "Danh mục bài viết không hợp lệ.",
        });
      }

      postCategoryId = parsed;
    }

    // ==========================================================
    // SORT
    // ==========================================================

    const allowedSort = ["latest", "oldest", "views", "featured"];

    const normalizedSort = allowedSort.includes(sort) ? sort : "latest";

    // ==========================================================
    // SEARCH
    // ==========================================================

    const normalizedSearch = String(search || "").trim();

    // ==========================================================
    // QUERY
    // ==========================================================

    const [rows, total] = await Promise.all([
      Post.getClientList({
        search: normalizedSearch,

        post_category_id: postCategoryId,

        sort: normalizedSort,

        page: pageNum,

        limit: limitNum,
      }),

      Post.countClientList({
        search: normalizedSearch,

        post_category_id: postCategoryId,
      }),
    ]);

    // ==========================================================
    // NORMALIZE
    // ==========================================================

    const posts = rows.map((post) => ({
      ...post,

      excerpt: normalizeExcerpt(post.excerpt),
    }));

    const totalPages = total > 0 ? Math.ceil(total / limitNum) : 0;

    return res.json({
      success: true,

      data: {
        posts,

        pagination: {
          total,

          page: pageNum,

          limit: limitNum,

          totalPages,

          hasPrevPage: pageNum > 1,

          hasNextPage: totalPages > 0 && pageNum < totalPages,
        },
      },
    });
  } catch (error) {
    console.error("[CLIENT POST] getPosts:", error);

    return res.status(500).json({
      success: false,

      message: "Không thể tải danh sách bài viết.",
    });
  }
};

// ============================================================
// GET POST CATEGORIES
//
// GET /api/client/posts/categories
// ============================================================

exports.getPostCategories = async (req, res) => {
  try {
    const categories = await Post.getClientCategories();

    return res.json({
      success: true,

      data: categories,
    });
  } catch (error) {
    console.error("[CLIENT POST] getPostCategories:", error);

    return res.status(500).json({
      success: false,

      message: "Không thể tải danh mục bài viết.",
    });
  }
};

// ============================================================
// GET DETAIL BY SLUG
//
// GET /api/client/posts/slug/:slug
// ============================================================

exports.getPostBySlug = async (req, res) => {
  try {
    const slug = String(req.params.slug || "").trim();

    if (!slug) {
      return res.status(400).json({
        success: false,

        message: "Slug bài viết không hợp lệ.",
      });
    }

    // ========================================================
    // GET POST TRƯỚC
    // ========================================================

    const post = await Post.getClientDetailBySlug(slug);

    if (!post) {
      return res.status(404).json({
        success: false,

        message: "Không tìm thấy bài viết.",
      });
    }

    // ========================================================
    // INCREMENT VIEW
    // ========================================================

    await Post.incrementView(post.id);

    /*
     * Query detail chạy trước increment,
     * nên cộng 1 vào object trả về.
     */
    post.views = Number(post.views || 0) + 1;

    post.excerpt = normalizeExcerpt(post.excerpt);

    return res.json({
      success: true,

      data: post,
    });
  } catch (error) {
    console.error("[CLIENT POST] getPostBySlug:", error);

    return res.status(500).json({
      success: false,

      message: "Không thể tải chi tiết bài viết.",
    });
  }
};

// ============================================================
// GET DETAIL BY ID
//
// GET /api/client/posts/:id
// ============================================================

exports.getPostById = async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,

        message: "ID bài viết không hợp lệ.",
      });
    }

    // ========================================================
    // GET POST TRƯỚC
    // ========================================================

    const post = await Post.getClientDetail(id);

    if (!post) {
      return res.status(404).json({
        success: false,

        message: "Không tìm thấy bài viết.",
      });
    }

    // ========================================================
    // INCREMENT VIEW
    // ========================================================

    await Post.incrementView(id);

    /*
     * Query detail chạy trước increment.
     */
    post.views = Number(post.views || 0) + 1;

    post.excerpt = normalizeExcerpt(post.excerpt);

    return res.json({
      success: true,

      data: post,
    });
  } catch (error) {
    console.error("[CLIENT POST] getPostById:", error);

    return res.status(500).json({
      success: false,

      message: "Không thể tải chi tiết bài viết.",
    });
  }
};
