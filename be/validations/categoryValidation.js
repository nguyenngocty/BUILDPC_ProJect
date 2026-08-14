const { pool } = require("../config/database");
const validateCreateCategory = async (data) => {
  const errors = {};
  if (!data.name || !data.name.trim()) {
    errors.name = "Tên danh mục không được để trống.";
  } else if (data.name.length > 150) {
    errors.name = "Tên danh mục tối đa 150 ký tự.";
  }
  if (!data.slug || !data.slug.trim()) {
    errors.slug = "Slug không được để trống.";
  }
  if (data.status === undefined || !["0", "1", 0, 1].includes(data.status)) {
    errors.status = "Trạng thái không hợp lệ.";
  }
  if (data.description && data.description.length > 1000) {
    errors.description = "Mô tả quá dài.";
  }
  if (!errors.name) {
    const [rows] = await pool.execute(
      `
        SELECT id
        FROM categories
        WHERE name=?
        AND deleted_at IS NULL
        `,
      [data.name],
    );

    if (rows.length) {
      errors.name = "Tên danh mục đã tồn tại.";
    }
  }
  if (!errors.slug) {
    const [rows] = await pool.execute(
      `
            SELECT id
            FROM categories
            WHERE slug=?
            AND deleted_at IS NULL
     `,
      [data.slug],
    );

    if (rows.length) {
      errors.slug = "Slug đã tồn tại.";
    }
  }

  return errors;
};

const validateUpdateCategory = async (data, id) => {
  const errors = {};
  if (!data.name || !data.name.trim()) {
    errors.name = "Tên danh mục không được để trống.";
  } else if (data.name.length > 150) {
    errors.name = "Tên danh mục tối đa 150 ký tự.";
  }
  if (!data.slug || !data.slug.trim()) {
    errors.slug = "Slug không được để trống.";
  }
  if (data.status === undefined || !["0", "1", 0, 1].includes(data.status)) {
    errors.status = "Trạng thái không hợp lệ.";
  }
  if (data.description && data.description.length > 1000) {
    errors.description = "Mô tả quá dài.";
  }
  if (!errors.name) {
    const [rows] = await pool.execute(
      `
        SELECT id
        FROM categories
        WHERE name=?
        AND id<>?
        AND deleted_at IS NULL
        `,
      [data.name, id],
    );

    if (rows.length) {
      errors.name = "Tên danh mục đã tồn tại.";
    }
  }
  if (!errors.slug) {
    const [rows] = await pool.execute(
      `
            SELECT id
            FROM categories
            WHERE slug=?
            AND id<>?
            AND deleted_at IS NULL
            `,
      [data.slug, id],
    );

    if (rows.length) {
      errors.slug = "Slug đã tồn tại.";
    }
  }

  return errors;
};
module.exports = {
  validateCreateCategory,
  validateUpdateCategory,
};
