const { pool } = require("../../config/database");

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

function getAuthenticatedUserId(req) {
  return (
    req.user?.id ||
    req.user?.user_id ||
    req.auth?.userId ||
    req.auth?.id ||
    null
  );
}

function normalizeNullableString(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();

  return normalized || null;
}

function normalizeBoolean(value, defaultValue = 0) {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  return value === true ||
    value === 1 ||
    value === "1" ||
    String(value).toLowerCase() === "true"
    ? 1
    : 0;
}

async function generateUniqueSlug(baseValue, excludeId = null) {
  let baseSlug = slugifyVietnamese(baseValue);

  if (!baseSlug) {
    baseSlug = `bai-viet-${Date.now()}`;
  }

  let finalSlug = baseSlug;
  let counter = 1;

  while (true) {
    let sql = `
      SELECT id
      FROM posts
      WHERE slug = ?
    `;

    const params = [finalSlug];

    if (excludeId) {
      sql += `
        AND id != ?
      `;

      params.push(excludeId);
    }

    sql += ` LIMIT 1`;

    const [rows] = await pool.query(sql, params);

    if (rows.length === 0) {
      return finalSlug;
    }

    finalSlug = `${baseSlug}-${counter}`;

    counter += 1;
  }
}

async function postCategoryExists(id) {
  if (id === undefined || id === null || id === "") {
    return true;
  }

  const [rows] = await pool.query(
    `
      SELECT id
      FROM post_categories
      WHERE
        id = ?
        AND deleted_at IS NULL
      LIMIT 1
      `,
    [id],
  );

  return rows.length > 0;
}

async function getPostRawById(id) {
  const [rows] = await pool.query(
    `
      SELECT *
      FROM posts
      WHERE id = ?
      LIMIT 1
      `,
    [id],
  );

  return rows[0] || null;
}

// ============================================================
// GET ALL
//
// GET /api/admin/posts
// ============================================================

exports.getAllPosts = async (req, res) => {
  try {
    const {
      keyword = "",
      status = "",
      post_category_id = "",
      category_id = "",
      is_featured = "",
      sortBy = "created_at",
      order = "DESC",
      page = 1,
      limit = 10,
    } = req.query;

    /*
     * category_id chỉ giữ compatibility tạm thời
     * với FE Admin cũ.
     *
     * FE mới sẽ dùng post_category_id.
     */
    const categoryFilter = post_category_id || category_id || "";

    const pageNum = Math.max(1, parseInt(page, 10) || 1);

    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));

    const offset = (pageNum - 1) * limitNum;

    let whereSql = `
      WHERE p.deleted_at IS NULL
    `;

    const params = [];

    if (keyword) {
      whereSql += `
        AND (
          p.title LIKE ?
          OR p.excerpt LIKE ?
          OR p.tags LIKE ?
          OR p.slug LIKE ?
        )
      `;

      const search = `%${keyword}%`;

      params.push(search, search, search, search);
    }

    if (status !== "") {
      whereSql += `
        AND p.status = ?
      `;

      params.push(normalizeBoolean(status));
    }

    if (categoryFilter) {
      whereSql += `
        AND p.post_category_id = ?
      `;

      params.push(categoryFilter);
    }

    if (is_featured !== "") {
      whereSql += `
        AND p.is_featured = ?
      `;

      params.push(normalizeBoolean(is_featured));
    }

    const allowedSort = [
      "created_at",
      "updated_at",
      "views",
      "title",
      "status",
      "is_featured",
    ];

    const sortColumn = allowedSort.includes(sortBy) ? sortBy : "created_at";

    const sortOrder = String(order).toUpperCase() === "ASC" ? "ASC" : "DESC";

    const [posts] = await pool.query(
      `
        SELECT
          p.*,

          u.full_name AS author,
          u.full_name AS author_name,
          u.avatar AS author_avatar,

          pc.id AS post_category_id_value,
          pc.name AS post_category_name,
          pc.slug AS post_category_slug,

          /*
           * Compatibility với FE cũ.
           */
          pc.id AS category_id,
          pc.name AS category_name

        FROM posts p

        LEFT JOIN users u
          ON p.user_id = u.id

        LEFT JOIN post_categories pc
          ON p.post_category_id = pc.id
          AND pc.deleted_at IS NULL

        ${whereSql}

        ORDER BY
          p.${sortColumn} ${sortOrder},
          p.id DESC

        LIMIT ? OFFSET ?
        `,
      [...params, limitNum, offset],
    );

    const [countRows] = await pool.query(
      `
        SELECT
          COUNT(*) AS total

        FROM posts p

        ${whereSql}
        `,
      params,
    );

    const total = Number(countRows[0]?.total || 0);

    return res.json({
      success: true,
      data: posts,
      total,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("[Post] getAllPosts:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể lấy danh sách bài viết.",
    });
  }
};

// ============================================================
// GET TRASH
//
// GET /api/admin/posts/trash
// ============================================================

exports.getTrashPosts = async (req, res) => {
  try {
    const { keyword = "", page = 1, limit = 10 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);

    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));

    const offset = (pageNum - 1) * limitNum;

    let whereSql = `
      WHERE p.deleted_at IS NOT NULL
    `;

    const params = [];

    if (keyword) {
      whereSql += `
        AND (
          p.title LIKE ?
          OR p.slug LIKE ?
          OR p.excerpt LIKE ?
        )
      `;

      const search = `%${keyword}%`;

      params.push(search, search, search);
    }

    const [rows] = await pool.query(
      `
        SELECT
          p.*,

          u.full_name AS author,
          u.avatar AS author_avatar,

          pc.name AS post_category_name,
          pc.slug AS post_category_slug,

          pc.id AS category_id,
          pc.name AS category_name

        FROM posts p

        LEFT JOIN users u
          ON p.user_id = u.id

        LEFT JOIN post_categories pc
          ON p.post_category_id = pc.id

        ${whereSql}

        ORDER BY
          p.deleted_at DESC,
          p.id DESC

        LIMIT ? OFFSET ?
        `,
      [...params, limitNum, offset],
    );

    const [countRows] = await pool.query(
      `
        SELECT COUNT(*) AS total
        FROM posts p
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
    console.error("[Post] getTrashPosts:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể lấy thùng rác bài viết.",
    });
  }
};

// ============================================================
// GET DETAIL
//
// GET /api/admin/posts/:id
// ============================================================

exports.getPostById = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID bài viết không hợp lệ.",
      });
    }

    const [rows] = await pool.query(
      `
        SELECT
          p.*,

          u.full_name AS author,
          u.full_name AS author_name,
          u.avatar AS author_avatar,

          pc.name AS post_category_name,
          pc.slug AS post_category_slug,

          pc.id AS category_id,
          pc.name AS category_name

        FROM posts p

        LEFT JOIN users u
          ON p.user_id = u.id

        LEFT JOIN post_categories pc
          ON p.post_category_id = pc.id

        WHERE
          p.id = ?
          AND p.deleted_at IS NULL

        LIMIT 1
        `,
      [id],
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bài viết.",
      });
    }

    return res.json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    console.error("[Post] getPostById:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể lấy chi tiết bài viết.",
    });
  }
};

// ============================================================
// CREATE
//
// POST /api/admin/posts
// ============================================================

exports.createPost = async (req, res) => {
  try {
    const {
      post_category_id,
      category_id,

      title,
      slug,
      thumbnail,
      content,
      excerpt,

      meta_title,
      meta_description,
      meta_keywords,

      tags,
      is_featured,
      status,
    } = req.body;

    const finalTitle = String(title || "").trim();

    const finalContent = String(content || "").trim();

    if (!finalTitle) {
      return res.status(400).json({
        success: false,
        message: "Tiêu đề bài viết là bắt buộc.",
      });
    }

    if (!finalContent) {
      return res.status(400).json({
        success: false,
        message: "Nội dung bài viết là bắt buộc.",
      });
    }

    const categoryId = post_category_id || category_id || null;

    if (categoryId && !(await postCategoryExists(categoryId))) {
      return res.status(400).json({
        success: false,
        message: "Danh mục bài viết không tồn tại.",
      });
    }

    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Không xác định được tài khoản quản trị đang đăng nhập.",
      });
    }

    const finalSlug = await generateUniqueSlug(slug || finalTitle);

    const [result] = await pool.query(
      `
        INSERT INTO posts (
          user_id,
          post_category_id,

          title,
          slug,

          excerpt,

          meta_title,
          meta_description,
          meta_keywords,

          thumbnail,
          content,

          status,
          views,
          is_featured,

          tags,

          created_at,
          updated_at
        )
        VALUES (
          ?,
          ?,

          ?,
          ?,

          ?,

          ?,
          ?,
          ?,

          ?,
          ?,

          ?,
          0,
          ?,

          ?,

          NOW(),
          NOW()
        )
        `,
      [
        userId,
        categoryId,

        finalTitle,
        finalSlug,

        normalizeNullableString(excerpt),

        normalizeNullableString(meta_title),
        normalizeNullableString(meta_description),
        normalizeNullableString(meta_keywords),

        normalizeNullableString(thumbnail),
        finalContent,

        normalizeBoolean(status, 1),

        normalizeBoolean(is_featured, 0),

        normalizeNullableString(tags),
      ],
    );

    return res.status(201).json({
      success: true,
      message: "Thêm bài viết thành công.",
      data: {
        id: result.insertId,
        slug: finalSlug,
      },
    });
  } catch (error) {
    console.error("[Post] createPost:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể thêm bài viết.",
    });
  }
};

// ============================================================
// UPDATE
//
// PUT/PATCH /api/admin/posts/:id
// ============================================================

exports.updatePost = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID bài viết không hợp lệ.",
      });
    }

    const current = await getPostRawById(id);

    if (!current || current.deleted_at) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bài viết.",
      });
    }

    const {
      post_category_id,
      category_id,

      title,
      slug,
      thumbnail,
      content,
      excerpt,

      meta_title,
      meta_description,
      meta_keywords,

      tags,
      is_featured,
      status,
    } = req.body;

    const finalTitle =
      title !== undefined ? String(title).trim() : current.title;

    const finalContent =
      content !== undefined ? String(content).trim() : current.content;

    if (!finalTitle) {
      return res.status(400).json({
        success: false,
        message: "Tiêu đề bài viết không được để trống.",
      });
    }

    if (!finalContent) {
      return res.status(400).json({
        success: false,
        message: "Nội dung bài viết không được để trống.",
      });
    }

    let categoryId = current.post_category_id;

    if (post_category_id !== undefined || category_id !== undefined) {
      categoryId = post_category_id ?? category_id ?? null;
    }

    if (categoryId && !(await postCategoryExists(categoryId))) {
      return res.status(400).json({
        success: false,
        message: "Danh mục bài viết không tồn tại.",
      });
    }

    let finalSlug = current.slug;

    if (slug !== undefined || title !== undefined) {
      finalSlug = await generateUniqueSlug(slug || finalTitle, id);
    }

    const finalThumbnail =
      thumbnail !== undefined
        ? normalizeNullableString(thumbnail)
        : current.thumbnail;

    const finalExcerpt =
      excerpt !== undefined
        ? normalizeNullableString(excerpt)
        : current.excerpt;

    const finalMetaTitle =
      meta_title !== undefined
        ? normalizeNullableString(meta_title)
        : current.meta_title;

    const finalMetaDescription =
      meta_description !== undefined
        ? normalizeNullableString(meta_description)
        : current.meta_description;

    const finalMetaKeywords =
      meta_keywords !== undefined
        ? normalizeNullableString(meta_keywords)
        : current.meta_keywords;

    const finalTags =
      tags !== undefined ? normalizeNullableString(tags) : current.tags;

    const finalFeatured =
      is_featured !== undefined
        ? normalizeBoolean(is_featured)
        : current.is_featured;

    const finalStatus =
      status !== undefined ? normalizeBoolean(status) : current.status;

    const [result] = await pool.query(
      `
        UPDATE posts
        SET
          post_category_id = ?,

          title = ?,
          slug = ?,

          excerpt = ?,

          meta_title = ?,
          meta_description = ?,
          meta_keywords = ?,

          thumbnail = ?,
          content = ?,

          status = ?,
          is_featured = ?,

          tags = ?,

          updated_at = NOW()

        WHERE
          id = ?
          AND deleted_at IS NULL
        `,
      [
        categoryId,

        finalTitle,
        finalSlug,

        finalExcerpt,

        finalMetaTitle,
        finalMetaDescription,
        finalMetaKeywords,

        finalThumbnail,
        finalContent,

        finalStatus,
        finalFeatured,

        finalTags,

        id,
      ],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bài viết.",
      });
    }

    return res.json({
      success: true,
      message: "Cập nhật bài viết thành công.",
      data: {
        id,
        slug: finalSlug,
      },
    });
  } catch (error) {
    console.error("[Post] updatePost:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể cập nhật bài viết.",
    });
  }
};

// ============================================================
// TOGGLE STATUS
//
// PATCH /api/admin/posts/:id/toggle-status
// ============================================================

exports.togglePostStatus = async (req, res) => {
  try {
    const id = Number(req.params.id);

    const current = await getPostRawById(id);

    if (!current || current.deleted_at) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bài viết.",
      });
    }

    const newStatus = Number(current.status) === 1 ? 0 : 1;

    await pool.query(
      `
      UPDATE posts
      SET
        status = ?,
        updated_at = NOW()
      WHERE
        id = ?
        AND deleted_at IS NULL
      `,
      [newStatus, id],
    );

    return res.json({
      success: true,
      message: newStatus === 1 ? "Đã hiển thị bài viết." : "Đã ẩn bài viết.",
      data: {
        id,
        status: newStatus,
      },
    });
  } catch (error) {
    console.error("[Post] togglePostStatus:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể thay đổi trạng thái bài viết.",
    });
  }
};

// ============================================================
// TOGGLE FEATURED
//
// PATCH /api/admin/posts/:id/toggle-featured
// ============================================================

exports.togglePostFeatured = async (req, res) => {
  try {
    const id = Number(req.params.id);

    const current = await getPostRawById(id);

    if (!current || current.deleted_at) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bài viết.",
      });
    }

    const newFeatured = Number(current.is_featured) === 1 ? 0 : 1;

    await pool.query(
      `
      UPDATE posts
      SET
        is_featured = ?,
        updated_at = NOW()
      WHERE
        id = ?
        AND deleted_at IS NULL
      `,
      [newFeatured, id],
    );

    return res.json({
      success: true,
      message:
        newFeatured === 1
          ? "Đã đánh dấu bài viết nổi bật."
          : "Đã bỏ đánh dấu bài viết nổi bật.",
      data: {
        id,
        is_featured: newFeatured,
      },
    });
  } catch (error) {
    console.error("[Post] togglePostFeatured:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể thay đổi trạng thái nổi bật.",
    });
  }
};

// ============================================================
// SOFT DELETE
//
// DELETE /api/admin/posts/:id
// ============================================================

exports.deletePost = async (req, res) => {
  try {
    const id = Number(req.params.id);

    const [result] = await pool.query(
      `
        UPDATE posts
        SET
          deleted_at = NOW(),
          updated_at = NOW()
        WHERE
          id = ?
          AND deleted_at IS NULL
        `,
      [id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bài viết hoặc bài viết đã bị xóa.",
      });
    }

    return res.json({
      success: true,
      message: "Đã đưa bài viết vào thùng rác.",
    });
  } catch (error) {
    console.error("[Post] deletePost:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể xóa bài viết.",
    });
  }
};

// ============================================================
// RESTORE
//
// PATCH /api/admin/posts/:id/restore
// ============================================================

exports.restorePost = async (req, res) => {
  try {
    const id = Number(req.params.id);

    const current = await getPostRawById(id);

    if (!current) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bài viết.",
      });
    }

    if (!current.deleted_at) {
      return res.status(400).json({
        success: false,
        message: "Bài viết này chưa bị xóa.",
      });
    }

    await pool.query(
      `
      UPDATE posts
      SET
        deleted_at = NULL,
        updated_at = NOW()
      WHERE id = ?
      `,
      [id],
    );

    return res.json({
      success: true,
      message: "Khôi phục bài viết thành công.",
    });
  } catch (error) {
    console.error("[Post] restorePost:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể khôi phục bài viết.",
    });
  }
};

// ============================================================
// UPLOAD THUMBNAIL
//
// POST /api/admin/posts/upload
// ============================================================

exports.uploadThumbnail = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Chưa chọn ảnh.",
      });
    }

    const thumbnail = `/uploads/posts/${req.file.filename}`;

    return res.json({
      success: true,
      message: "Upload ảnh thành công.",
      thumbnail,
      url: thumbnail,
    });
  } catch (error) {
    console.error("[Post] uploadThumbnail:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể upload ảnh.",
    });
  }
};

// ============================================================
// UPLOAD CKEDITOR IMAGE
//
// POST /api/admin/posts/upload-image
// ============================================================

exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Chưa chọn ảnh.",
      });
    }

    const location = `/uploads/posts/${req.file.filename}`;

    const baseUrl = (
      process.env.BASE_URL || `${req.protocol}://${req.get("host")}`
    ).replace(/\/$/, "");

    const fullUrl = `${baseUrl}${location}`;

    /*
     * Trả cả url và location để tương thích
     * được nhiều editor khác nhau.
     */
    return res.json({
      success: true,
      location: fullUrl,
      url: fullUrl,
    });
  } catch (error) {
    console.error("[Post] uploadImage:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể upload ảnh nội dung.",
    });
  }
};
