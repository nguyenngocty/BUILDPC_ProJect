const fs = require("fs");

const path = require("path");

const { pool } = require("../../config/database");

const Category = require("../../models/Category");

const {
  validateCreateCategory,
  validateUpdateCategory,
} = require("../../validations/categoryValidation");

// ============================================================
// HELPERS
// ============================================================

function parseCategoryId(value) {
  const id = Number(value);

  return Number.isInteger(id) && id > 0 ? id : null;
}

// ============================================================
// PARSE IDS
// ============================================================

function parseCategoryIds(value) {
  if (!Array.isArray(value)) {
    return null;
  }

  const ids = [
    ...new Set(
      value.map(Number).filter((id) => Number.isInteger(id) && id > 0),
    ),
  ];

  return ids.length > 0 ? ids : null;
}

// ============================================================
// NORMALIZE SLUG
// ============================================================

function normalizeSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

// ============================================================
// NORMALIZE CATEGORY PAYLOAD
// ============================================================

function normalizeCategoryPayload(body = {}) {
  const name = String(body.name || "").trim();

  return {
    name,

    slug: normalizeSlug(body.slug || name),

    description: String(body.description || "").trim() || null,

    status: body.status === undefined ? 1 : Number(body.status),
  };
}

// ============================================================
// DELETE FILE SAFELY
// ============================================================

function safeUnlink(filePath) {
  if (!filePath) {
    return;
  }

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.warn("[Category] Không thể xóa file:", filePath, error.message);
  }
}

// ============================================================
// DELETE UPLOADED REQUEST FILE
// ============================================================

function cleanupUploadedFile(file) {
  if (!file?.path) {
    return;
  }

  safeUnlink(path.resolve(file.path));
}

// ============================================================
// DELETE STORED CATEGORY IMAGE
// ============================================================

function cleanupStoredImage(image) {
  if (!image) {
    return;
  }

  const relativePath = String(image).replace(/^\/+/, "");

  const absolutePath = path.join(__dirname, "../../", relativePath);

  safeUnlink(absolutePath);
}

// ============================================================
// GET ALL
// ============================================================

const getAllCategories = async (req, res, next) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);

    const limit = Math.min(
      Math.max(Number.parseInt(req.query.limit, 10) || 10, 1),
      100,
    );

    const search = String(req.query.search || "").trim();

    const sort = String(req.query.sort || "newest").trim();

    let status = null;

    if (req.query.status !== undefined && req.query.status !== "") {
      if (!["0", "1", 0, 1].includes(req.query.status)) {
        return res.status(422).json({
          success: false,

          message: "Trạng thái danh mục không hợp lệ.",
        });
      }

      status = Number(req.query.status);
    }

    const result = await Category.getAll({
      page,
      limit,
      search,
      status,
      sort,
    });

    return res.status(200).json({
      success: true,

      message: "Lấy danh sách danh mục thành công.",

      data: result.categories,

      pagination: result.pagination,
    });
  } catch (error) {
    return next(error);
  }
};

// ============================================================
// GET BY ID
// ============================================================

const getCategoryById = async (req, res, next) => {
  try {
    const id = parseCategoryId(req.params.id);

    if (!id) {
      return res.status(422).json({
        success: false,

        message: "Mã danh mục không hợp lệ.",
      });
    }

    const category = await Category.getById(id);

    if (!category) {
      return res.status(404).json({
        success: false,

        message: "Không tìm thấy danh mục.",
      });
    }

    return res.status(200).json({
      success: true,

      data: category,
    });
  } catch (error) {
    return next(error);
  }
};

// ============================================================
// CREATE
// ============================================================

const createCategory = async (req, res, next) => {
  let connection;

  try {
    const payload = normalizeCategoryPayload(req.body);

    const errors = await validateCreateCategory(payload);

    // --------------------------------------------------------
    // VALIDATION FAIL
    //
    // Multer đã lưu file trước controller.
    // Nếu validation fail phải xóa file vừa upload.
    // --------------------------------------------------------

    if (Object.keys(errors).length) {
      cleanupUploadedFile(req.file);

      return res.status(422).json({
        success: false,

        message: "Dữ liệu danh mục không hợp lệ.",

        errors,
      });
    }

    const image = req.file ? `/uploads/categories/${req.file.filename}` : null;

    connection = await pool.getConnection();

    await connection.beginTransaction();

    const id = await Category.create(connection, {
      ...payload,
      image,
    });

    await connection.commit();

    const category = await Category.getById(id);

    return res.status(201).json({
      success: true,

      message: "Thêm danh mục thành công.",

      data: category,
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (_) {}
    }

    cleanupUploadedFile(req.file);

    if (error?.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,

        message: "Tên hoặc slug danh mục đã tồn tại.",
      });
    }

    return next(error);
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// ============================================================
// UPDATE
// ============================================================

const updateCategory = async (req, res, next) => {
  let connection;

  try {
    const id = parseCategoryId(req.params.id);

    if (!id) {
      cleanupUploadedFile(req.file);

      return res.status(422).json({
        success: false,

        message: "Mã danh mục không hợp lệ.",
      });
    }

    const category = await Category.getById(id);

    if (!category) {
      cleanupUploadedFile(req.file);

      return res.status(404).json({
        success: false,

        message: "Không tìm thấy danh mục.",
      });
    }

    const payload = normalizeCategoryPayload({
      name: req.body.name ?? category.name,

      slug: req.body.slug ?? category.slug,

      description: req.body.description ?? category.description,

      status: req.body.status ?? category.status,
    });

    const errors = await validateUpdateCategory(payload, id);

    if (Object.keys(errors).length) {
      cleanupUploadedFile(req.file);

      return res.status(422).json({
        success: false,

        message: "Dữ liệu danh mục không hợp lệ.",

        errors,
      });
    }

    const image = req.file
      ? `/uploads/categories/${req.file.filename}`
      : category.image;

    connection = await pool.getConnection();

    await connection.beginTransaction();

    const updated = await Category.update(connection, id, {
      ...payload,
      image,
    });

    if (!updated) {
      await connection.rollback();

      cleanupUploadedFile(req.file);

      return res.status(404).json({
        success: false,

        message: "Không tìm thấy danh mục.",
      });
    }

    await connection.commit();

    // --------------------------------------------------------
    // DB commit thành công mới xóa ảnh cũ.
    // --------------------------------------------------------

    if (req.file && category.image && category.image !== image) {
      cleanupStoredImage(category.image);
    }

    const newCategory = await Category.getById(id);

    return res.status(200).json({
      success: true,

      message: "Cập nhật danh mục thành công.",

      data: newCategory,
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (_) {}
    }

    cleanupUploadedFile(req.file);

    if (error?.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,

        message: "Tên hoặc slug danh mục đã tồn tại.",
      });
    }

    // BẢN CŨ BỊ THIẾU RESPONSE Ở ĐÂY.
    return next(error);
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// ============================================================
// SOFT DELETE
// ============================================================

const deleteCategory = async (req, res, next) => {
  let connection;

  try {
    const id = parseCategoryId(req.params.id);

    if (!id) {
      return res.status(422).json({
        success: false,

        message: "Mã danh mục không hợp lệ.",
      });
    }

    const category = await Category.getById(id);

    if (!category) {
      return res.status(404).json({
        success: false,

        message: "Không tìm thấy danh mục.",
      });
    }

    const hasProducts = await Category.hasProducts(id);

    if (hasProducts) {
      return res.status(409).json({
        success: false,

        message:
          "Danh mục vẫn còn sản phẩm. Hãy chuyển hoặc xóa các sản phẩm trước.",
      });
    }

    connection = await pool.getConnection();

    await connection.beginTransaction();

    await Category.softDelete(connection, id);

    await connection.commit();

    return res.status(200).json({
      success: true,

      message: "Đã chuyển danh mục vào thùng rác.",
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (_) {}
    }

    return next(error);
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// ============================================================
// RESTORE
// ============================================================

const restoreCategory = async (req, res, next) => {
  let connection;

  try {
    const id = parseCategoryId(req.params.id);

    if (!id) {
      return res.status(422).json({
        success: false,

        message: "Mã danh mục không hợp lệ.",
      });
    }

    const category = await Category.getDeletedById(id);

    if (!category) {
      return res.status(404).json({
        success: false,

        message: "Không tìm thấy danh mục trong thùng rác.",
      });
    }

    connection = await pool.getConnection();

    await connection.beginTransaction();

    const restored = await Category.restore(connection, id);

    if (!restored) {
      await connection.rollback();

      return res.status(409).json({
        success: false,

        message: "Không thể khôi phục danh mục.",
      });
    }

    await connection.commit();

    const restoredCategory = await Category.getById(id);

    return res.status(200).json({
      success: true,

      message: "Khôi phục danh mục thành công.",

      data: restoredCategory,
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (_) {}
    }

    return next(error);
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// ============================================================
// TOGGLE STATUS
// ============================================================

const toggleCategoryStatus = async (req, res, next) => {
  let connection;

  try {
    const id = parseCategoryId(req.params.id);

    if (!id) {
      return res.status(422).json({
        success: false,

        message: "Mã danh mục không hợp lệ.",
      });
    }

    const category = await Category.getById(id);

    if (!category) {
      return res.status(404).json({
        success: false,

        message: "Không tìm thấy danh mục.",
      });
    }

    connection = await pool.getConnection();

    await connection.beginTransaction();

    await Category.toggleStatus(connection, id);

    await connection.commit();

    const updated = await Category.getById(id);

    return res.status(200).json({
      success: true,

      message:
        updated.status === 1 ? "Đã bật hiển thị danh mục." : "Đã ẩn danh mục.",

      data: updated,
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (_) {}
    }

    return next(error);
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// ============================================================
// FORCE DELETE
//
// Chỉ category nằm trong Trash mới được force delete.
// ============================================================

const forceDeleteCategory = async (req, res, next) => {
  let connection;

  try {
    const id = parseCategoryId(req.params.id);

    if (!id) {
      return res.status(422).json({
        success: false,

        message: "Mã danh mục không hợp lệ.",
      });
    }

    const category = await Category.getDeletedById(id);

    if (!category) {
      return res.status(404).json({
        success: false,

        message: "Không tìm thấy danh mục trong thùng rác.",
      });
    }

    /*
      Force delete phải kiểm tra CẢ product soft deleted.
      Vì các record đó vẫn còn category_id.
    */
    const hasAnyProducts = await Category.hasAnyProducts(id);

    if (hasAnyProducts) {
      return res.status(409).json({
        success: false,

        message:
          "Danh mục vẫn đang được sản phẩm tham chiếu nên không thể xóa vĩnh viễn.",
      });
    }

    connection = await pool.getConnection();

    await connection.beginTransaction();

    const deleted = await Category.forceDelete(connection, id);

    if (!deleted) {
      await connection.rollback();

      return res.status(404).json({
        success: false,

        message: "Không tìm thấy danh mục trong thùng rác.",
      });
    }

    await connection.commit();

    cleanupStoredImage(category.image);

    return res.status(200).json({
      success: true,

      message: "Xóa vĩnh viễn danh mục thành công.",
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (_) {}
    }

    return next(error);
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// ============================================================
// STATISTICS
// ============================================================

const getCategoryStatistics = async (req, res, next) => {
  try {
    const data = await Category.getStatistics();

    return res.status(200).json({
      success: true,

      message: "Lấy thống kê danh mục thành công.",

      data,
    });
  } catch (error) {
    return next(error);
  }
};

// ============================================================
// TRASH
// ============================================================

const getTrashCategories = async (req, res, next) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);

    const limit = Math.min(
      Math.max(Number.parseInt(req.query.limit, 10) || 10, 1),
      100,
    );

    const search = String(req.query.search || "").trim();

    const sort = String(req.query.sort || "newest").trim();

    const result = await Category.getTrash({
      page,
      limit,
      search,
      sort,
    });

    return res.status(200).json({
      success: true,

      message: "Lấy danh sách thùng rác thành công.",

      data: result.categories,

      pagination: result.pagination,
    });
  } catch (error) {
    return next(error);
  }
};

// ============================================================
// BULK DELETE
// ============================================================

const bulkDeleteCategories = async (req, res, next) => {
  let connection;

  try {
    const ids = parseCategoryIds(req.body.ids);

    if (!ids) {
      return res.status(422).json({
        success: false,

        message: "Danh sách danh mục không hợp lệ.",
      });
    }

    for (const id of ids) {
      const category = await Category.getById(id);

      if (!category) {
        return res.status(404).json({
          success: false,

          message: `Không tìm thấy danh mục ID ${id}.`,
        });
      }

      if (await Category.hasProducts(id)) {
        return res.status(409).json({
          success: false,

          message: `Danh mục ID ${id} vẫn còn sản phẩm.`,
        });
      }
    }

    connection = await pool.getConnection();

    await connection.beginTransaction();

    await Category.bulkDelete(connection, ids);

    await connection.commit();

    return res.status(200).json({
      success: true,

      message: "Đã chuyển các danh mục vào thùng rác.",
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (_) {}
    }

    return next(error);
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// ============================================================
// BULK RESTORE
// ============================================================

const bulkRestoreCategories = async (req, res, next) => {
  let connection;

  try {
    const ids = parseCategoryIds(req.body.ids);

    if (!ids) {
      return res.status(422).json({
        success: false,

        message: "Danh sách danh mục không hợp lệ.",
      });
    }

    for (const id of ids) {
      const category = await Category.getDeletedById(id);

      if (!category) {
        return res.status(404).json({
          success: false,

          message: `Danh mục ID ${id} không nằm trong thùng rác.`,
        });
      }
    }

    connection = await pool.getConnection();

    await connection.beginTransaction();

    await Category.bulkRestore(connection, ids);

    await connection.commit();

    return res.status(200).json({
      success: true,

      message: "Khôi phục các danh mục thành công.",
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (_) {}
    }

    return next(error);
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// ============================================================
// BULK FORCE DELETE
// ============================================================

const bulkForceDeleteCategories = async (req, res, next) => {
  let connection;

  try {
    const ids = parseCategoryIds(req.body.ids);

    if (!ids) {
      return res.status(422).json({
        success: false,

        message: "Danh sách danh mục không hợp lệ.",
      });
    }

    const categories = [];

    for (const id of ids) {
      const category = await Category.getDeletedById(id);

      if (!category) {
        return res.status(404).json({
          success: false,

          message: `Danh mục ID ${id} không nằm trong thùng rác.`,
        });
      }

      if (await Category.hasAnyProducts(id)) {
        return res.status(409).json({
          success: false,

          message: `Danh mục ID ${id} vẫn đang được sản phẩm tham chiếu.`,
        });
      }

      categories.push(category);
    }

    connection = await pool.getConnection();

    await connection.beginTransaction();

    for (const category of categories) {
      await Category.forceDelete(connection, category.id);
    }

    await connection.commit();

    for (const category of categories) {
      cleanupStoredImage(category.image);
    }

    return res.status(200).json({
      success: true,

      message: "Xóa vĩnh viễn các danh mục thành công.",
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (_) {}
    }

    return next(error);
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// ============================================================
// BULK TOGGLE STATUS
// ============================================================

const bulkToggleStatus = async (req, res, next) => {
  let connection;

  try {
    const ids = parseCategoryIds(req.body.ids);

    if (!ids) {
      return res.status(422).json({
        success: false,

        message: "Danh sách danh mục không hợp lệ.",
      });
    }

    for (const id of ids) {
      const category = await Category.getById(id);

      if (!category) {
        return res.status(404).json({
          success: false,

          message: `Không tìm thấy danh mục ID ${id}.`,
        });
      }
    }

    connection = await pool.getConnection();

    await connection.beginTransaction();

    await Category.bulkToggleStatus(connection, ids);

    await connection.commit();

    return res.status(200).json({
      success: true,

      message: "Đổi trạng thái các danh mục thành công.",
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (_) {}
    }

    return next(error);
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// ============================================================
// EXPORT
// ============================================================

module.exports = {
  getAllCategories,

  getCategoryById,

  createCategory,

  updateCategory,

  deleteCategory,

  restoreCategory,

  forceDeleteCategory,

  toggleCategoryStatus,

  getCategoryStatistics,

  getTrashCategories,

  bulkDeleteCategories,

  bulkRestoreCategories,

  bulkForceDeleteCategories,

  bulkToggleStatus,
};
