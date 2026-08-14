const fs = require("fs");

const path = require("path");

const { pool } = require("../../config/database");

const Category = require("../../models/Category");

const {
  validateCreateCategory,
  validateUpdateCategory,
} = require("../../validations/categoryValidation");

const getAllCategories = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;

    const limit = Number(req.query.limit) || 10;

    const search = req.query.search || "";

    const status = req.query.status || "";

    const sort = req.query.sort || "newest";

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
    console.error(error);

    return res.status(500).json({
      success: false,

      message: "Lỗi máy chủ.",

      error: error.message,
    });
  }
};

const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

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
    console.error(error);

    return res.status(500).json({
      success: false,

      message: "Lỗi máy chủ.",
    });
  }
};

const createCategory = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const errors = await validateCreateCategory(req.body);

    if (Object.keys(errors).length) {
      return res.status(422).json({
        success: false,

        errors,
      });
    }
    const image = req.file ? `/uploads/categories/${req.file.filename}` : null;
    const data = {
      ...req.body,

      image,
    };
    await connection.beginTransaction();

    const id = await Category.create(connection, data);

    await connection.commit();
    const category = await Category.getById(id);

    return res.status(201).json({
      success: true,

      message: "Thêm danh mục thành công.",

      data: category,
    });
  } catch (error) {
    await connection.rollback();
    if (req.file) {
      const filePath = path.join(
        __dirname,

        "../../",

        req.file.path,
      );

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    return res.status(500).json({
      success: false,

      message: "Lỗi máy chủ.",

      error: error.message,
    });
  } finally {
    connection.release();
  }
};

const updateCategory = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;
    const category = await Category.getById(id);

    if (!category) {
      return res.status(404).json({
        success: false,

        message: "Không tìm thấy danh mục.",
      });
    }
    const errors = await validateUpdateCategory(req.body, id);

    if (Object.keys(errors).length) {
      return res.status(422).json({
        success: false,

        errors,
      });
    }
    let image = category.image;
    if (req.file) {
      image = `/uploads/categories/${req.file.filename}`;
    }
    const data = {
      ...req.body,

      image,
    };
    await connection.beginTransaction();

    await Category.update(connection, id, data);

    await connection.commit();
    if (req.file && category.image) {
      const oldImage = path.join(
        __dirname,

        "../../",

        category.image.replace(/^\//, ""),
      );

      if (fs.existsSync(oldImage)) {
        fs.unlinkSync(oldImage);
      }
    }
    const newCategory = await Category.getById(id);

    return res.status(200).json({
      success: true,

      message: "Cập nhật thành công.",

      data: newCategory,
    });
  } catch (error) {
    await connection.rollback();
    if (req.file) {
      const filePath = path.join(
        __dirname,

        "../../",

        req.file.path,
      );

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  } finally {
    connection.release();
  }
};

const deleteCategory = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;

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
        message: "Danh mục vẫn còn sản phẩm, không thể xóa.",
      });
    }
    await connection.beginTransaction();

    await Category.softDelete(connection, id);

    await connection.commit();

    return res.status(200).json({
      success: true,

      message: "Xóa thành công.",
    });
  } catch (error) {
    await connection.rollback();

    return res.status(500).json({
      success: false,

      message: "Lỗi máy chủ.",

      error: error.message,
    });
  } finally {
    connection.release();
  }
};

const restoreCategory = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;

    const category = await Category.getDeletedById(id);

    if (!category) {
      return res.status(404).json({
        success: false,

        message: "Không tìm thấy.",
      });
    }

    await connection.beginTransaction();

    await Category.restore(connection, id);

    await connection.commit();

    return res.status(200).json({
      success: true,

      message: "Khôi phục thành công.",
    });
  } catch (error) {
    await connection.rollback();

    return res.status(500).json({
      success: false,

      message: "Lỗi máy chủ.",
    });
  } finally {
    connection.release();
  }
};

const toggleCategoryStatus = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;

    const category = await Category.getById(id);

    if (!category) {
      return res.status(404).json({
        success: false,

        message: "Không tìm thấy.",
      });
    }

    await connection.beginTransaction();

    await Category.toggleStatus(connection, id);

    await connection.commit();

    return res.status(200).json({
      success: true,

      message: "Đổi trạng thái thành công.",
    });
  } catch (error) {
    await connection.rollback();

    return res.status(500).json({
      success: false,

      message: "Lỗi máy chủ.",
    });
  } finally {
    connection.release();
  }
};

const forceDeleteCategory = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;

    const category = await Category.getDeletedById(id);

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
        message: "Danh mục vẫn còn sản phẩm, không thể xóa vĩnh viễn.",
      });
    }

    await connection.beginTransaction();

    await Category.forceDelete(connection, id);

    await connection.commit();

    // Xóa ảnh nếu có
    if (category.image) {
      const imagePath = path.join(
        __dirname,
        "../../",
        category.image.replace(/^\//, ""),
      );

      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Xóa vĩnh viễn thành công.",
    });
  } catch (error) {
    await connection.rollback();

    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ.",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

const getCategoryStatistics = async (req, res) => {
  try {
    const data = await Category.getStatistics();

    return res.status(200).json({
      success: true,

      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,

      message: error.message,
    });
  }
};

const getTrashCategories = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;

    const limit = Number(req.query.limit) || 10;

    const search = req.query.search || "";

    const sort = req.query.sort || "newest";

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
    console.error(error);

    return res.status(500).json({
      success: false,

      message: "Lỗi máy chủ.",

      error: error.message,
    });
  }
};
const bulkDeleteCategories = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { ids } = req.body;

    await connection.beginTransaction();

    for (const id of ids) {
      const hasProducts = await Category.hasProducts(id);

      if (hasProducts) {
        await connection.rollback();

        return res.status(409).json({
          success: false,
          message: `Danh mục ID ${id} vẫn còn sản phẩm.`,
        });
      }
    }

    await Category.bulkDelete(connection, ids);

    await connection.commit();

    return res.json({
      success: true,

      message: "Đã xóa.",
    });
  } catch (error) {
    await connection.rollback();

    return res.status(500).json({
      success: false,

      message: error.message,
    });
  } finally {
    connection.release();
  }
};
const bulkRestoreCategories = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { ids } = req.body;

    await connection.beginTransaction();

    await Category.bulkRestore(connection, ids);

    await connection.commit();

    return res.json({
      success: true,

      message: "Đã khôi phục.",
    });
  } catch (error) {
    await connection.rollback();

    return res.status(500).json({
      success: false,

      message: error.message,
    });
  } finally {
    connection.release();
  }
};
const bulkForceDeleteCategories = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(422).json({
        success: false,
        message: "Danh sách danh mục không hợp lệ.",
      });
    }

    const deleteImages = [];

    await connection.beginTransaction();

    for (const id of ids) {
      const category = await Category.getDeletedById(id);

      if (!category) {
        throw new Error(`Không tìm thấy danh mục ID ${id}`);
      }

      if (await Category.hasProducts(id)) {
        await connection.rollback();

        return res.status(409).json({
          success: false,
          message: `Danh mục ID ${id} vẫn còn sản phẩm.`,
        });
      }

      deleteImages.push(await Category.getImageForDelete(id));

      await Category.forceDelete(connection, id);
    }

    await connection.commit();

    for (const item of deleteImages) {
      if (!item?.image) continue;

      const imagePath = path.join(
        __dirname,
        "../../",
        item.image.replace(/^\//, ""),
      );

      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Xóa vĩnh viễn các danh mục thành công.",
    });
  } catch (error) {
    await connection.rollback();

    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ.",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};


// Đổi trạng thái hàng loạt
const bulkToggleStatus = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(422).json({
        success: false,
        message: "Danh sách danh mục không hợp lệ.",
      });
    }

    await connection.beginTransaction();

    await Category.bulkToggleStatus(connection, ids);

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Đổi trạng thái danh mục thành công.",
    });
  } catch (error) {
    await connection.rollback();

    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ.",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

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
