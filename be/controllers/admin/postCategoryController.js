const { pool } = require("../../config/database");
const PostCategory = require("../../models/PostCategory");

// ============================================================
// HELPERS
// ============================================================

function slugifyVietnamese(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function generateUniqueSlug(baseValue, excludeId = null) {
  let baseSlug = slugifyVietnamese(baseValue);

  if (!baseSlug) {
    baseSlug = `danh-muc-${Date.now()}`;
  }

  let finalSlug = baseSlug;
  let counter = 1;

  while (await PostCategory.slugExists(finalSlug, excludeId)) {
    finalSlug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  return finalSlug;
}

// ============================================================
// GET ALL
//
// GET /api/admin/post-categories
// ============================================================

exports.getAllPostCategories = async (req, res) => {
  try {
    const { keyword = "", status = "", page = 1, limit = 10 } = req.query;

    const result = await PostCategory.getAll({
      keyword,
      status,
      page,
      limit,
    });

    return res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("[PostCategory] getAllPostCategories:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể lấy danh sách danh mục bài viết.",
    });
  }
};

// ============================================================
// GET ACTIVE
//
// GET /api/admin/post-categories/active
//
// Dùng cho dropdown tạo/sửa Post
// ============================================================

exports.getActivePostCategories = async (req, res) => {
  try {
    const categories = await PostCategory.getActive();

    return res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("[PostCategory] getActivePostCategories:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể lấy danh mục bài viết đang hoạt động.",
    });
  }
};

// ============================================================
// GET TRASH
//
// GET /api/admin/post-categories/trash
// ============================================================

exports.getTrashPostCategories = async (req, res) => {
  try {
    const { keyword = "", page = 1, limit = 10 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);

    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));

    const offset = (pageNum - 1) * limitNum;

    let whereSql = `
      WHERE pc.deleted_at IS NOT NULL
    `;

    const params = [];

    if (keyword) {
      whereSql += `
        AND (
          pc.name LIKE ?
          OR pc.slug LIKE ?
          OR pc.description LIKE ?
        )
      `;

      const search = `%${keyword}%`;

      params.push(search, search, search);
    }

    const [rows] = await pool.query(
      `
      SELECT
        pc.*,

        (
          SELECT COUNT(*)
          FROM posts p
          WHERE
            p.post_category_id = pc.id
            AND p.deleted_at IS NULL
        ) AS post_count

      FROM post_categories pc

      ${whereSql}

      ORDER BY
        pc.deleted_at DESC,
        pc.id DESC

      LIMIT ? OFFSET ?
      `,
      [...params, limitNum, offset],
    );

    const [countRows] = await pool.query(
      `
        SELECT
          COUNT(*) AS total

        FROM post_categories pc

        ${whereSql}
        `,
      params,
    );

    const total = Number(countRows[0]?.total || 0);

    return res.json({
      success: true,
      data: rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("[PostCategory] getTrashPostCategories:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể lấy thùng rác danh mục bài viết.",
    });
  }
};

// ============================================================
// GET BY ID
//
// GET /api/admin/post-categories/:id
// ============================================================

exports.getPostCategoryById = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID danh mục không hợp lệ.",
      });
    }

    const category = await PostCategory.getById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy danh mục bài viết.",
      });
    }

    return res.json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error("[PostCategory] getPostCategoryById:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể lấy chi tiết danh mục bài viết.",
    });
  }
};

// ============================================================
// CREATE
//
// POST /api/admin/post-categories
// ============================================================

exports.createPostCategory = async (req, res) => {
  try {
    const { name, slug, description, image, status } = req.body;

    const finalName = String(name || "").trim();

    if (!finalName) {
      return res.status(400).json({
        success: false,
        message: "Tên danh mục bài viết là bắt buộc.",
      });
    }

    const finalSlug = await generateUniqueSlug(slug || finalName);

    const finalStatus = status === undefined ? 1 : Number(status) === 1 ? 1 : 0;

    const id = await PostCategory.create({
      name: finalName,
      slug: finalSlug,
      description: description?.trim() || null,
      image: image?.trim() || null,
      status: finalStatus,
    });

    const category = await PostCategory.getById(id);

    return res.status(201).json({
      success: true,
      message: "Thêm danh mục bài viết thành công.",
      data: category,
    });
  } catch (error) {
    console.error("[PostCategory] createPostCategory:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể thêm danh mục bài viết.",
    });
  }
};

// ============================================================
// UPDATE
//
// PUT/PATCH /api/admin/post-categories/:id
// ============================================================

exports.updatePostCategory = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID danh mục không hợp lệ.",
      });
    }

    const current = await PostCategory.getById(id);

    if (!current) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy danh mục bài viết.",
      });
    }

    const { name, slug, description, image, status } = req.body;

    const finalName = name !== undefined ? String(name).trim() : current.name;

    if (!finalName) {
      return res.status(400).json({
        success: false,
        message: "Tên danh mục bài viết không được để trống.",
      });
    }

    let finalSlug = current.slug;

    if (slug !== undefined || name !== undefined) {
      finalSlug = await generateUniqueSlug(slug || finalName, id);
    }

    const finalStatus =
      status !== undefined ? (Number(status) === 1 ? 1 : 0) : current.status;

    const updated = await PostCategory.update(id, {
      name: finalName,
      slug: finalSlug,
      description:
        description !== undefined
          ? String(description || "").trim() || null
          : current.description,
      image:
        image !== undefined
          ? String(image || "").trim() || null
          : current.image,
      status: finalStatus,
    });

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy danh mục bài viết.",
      });
    }

    const category = await PostCategory.getById(id);

    return res.json({
      success: true,
      message: "Cập nhật danh mục bài viết thành công.",
      data: category,
    });
  } catch (error) {
    console.error("[PostCategory] updatePostCategory:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể cập nhật danh mục bài viết.",
    });
  }
};

// ============================================================
// TOGGLE STATUS
//
// PATCH /api/admin/post-categories/:id/toggle-status
// ============================================================

exports.togglePostCategoryStatus = async (req, res) => {
  try {
    const id = Number(req.params.id);

    const current = await PostCategory.getById(id);

    if (!current) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy danh mục bài viết.",
      });
    }

    await PostCategory.toggleStatus(id);

    const updated = await PostCategory.getById(id);

    return res.json({
      success: true,
      message:
        updated.status === 1
          ? "Đã kích hoạt danh mục bài viết."
          : "Đã ẩn danh mục bài viết.",
      data: updated,
    });
  } catch (error) {
    console.error("[PostCategory] togglePostCategoryStatus:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể thay đổi trạng thái danh mục.",
    });
  }
};

// ============================================================
// SOFT DELETE
//
// DELETE /api/admin/post-categories/:id
// ============================================================

exports.deletePostCategory = async (req, res) => {
  try {
    const id = Number(req.params.id);

    const current = await PostCategory.getById(id);

    if (!current) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy danh mục bài viết.",
      });
    }

    const postCount = await PostCategory.countPosts(id);

    /*
     * Cho phép xóa mềm category đang có Post.
     * Vì FK là ON DELETE SET NULL chỉ áp dụng
     * khi hard delete, còn ở đây chỉ soft delete.
     *
     * Các Post vẫn giữ post_category_id để có thể
     * phục hồi category sau này.
     */

    await PostCategory.remove(id);

    return res.json({
      success: true,
      message:
        postCount > 0
          ? `Đã đưa danh mục vào thùng rác. Danh mục hiện có ${postCount} bài viết.`
          : "Đã đưa danh mục bài viết vào thùng rác.",
    });
  } catch (error) {
    console.error("[PostCategory] deletePostCategory:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể xóa danh mục bài viết.",
    });
  }
};

// ============================================================
// RESTORE
//
// PATCH /api/admin/post-categories/:id/restore
// ============================================================

exports.restorePostCategory = async (req, res) => {
  try {
    const id = Number(req.params.id);

    const current = await PostCategory.getByIdIncludeDeleted(id);

    if (!current) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy danh mục bài viết.",
      });
    }

    if (!current.deleted_at) {
      return res.status(400).json({
        success: false,
        message: "Danh mục này chưa bị xóa.",
      });
    }

    await PostCategory.restore(id);

    const category = await PostCategory.getById(id);

    return res.json({
      success: true,
      message: "Khôi phục danh mục bài viết thành công.",
      data: category,
    });
  } catch (error) {
    console.error("[PostCategory] restorePostCategory:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể khôi phục danh mục bài viết.",
    });
  }
};
