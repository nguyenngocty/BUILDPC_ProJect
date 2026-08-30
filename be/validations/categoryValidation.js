const { pool } = require("../config/database");

// ============================================================
// CONSTANTS
// ============================================================

const NAME_MAX_LENGTH = 100;

const SLUG_MAX_LENGTH = 150;

const DESCRIPTION_MAX_LENGTH = 5000;

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// ============================================================
// CHECK DUPLICATE NAME
//
// Kiểm tra cả Trash.
// Không để tạo category mới trùng category đang soft-delete.
// ============================================================

async function findDuplicateName(name, excludeId = null) {
  const params = [name];

  let sql = `
    SELECT
      id,
      deleted_at

    FROM categories

    WHERE name = ?
  `;

  if (excludeId) {
    sql += `
      AND id <> ?
    `;

    params.push(excludeId);
  }

  sql += `
    LIMIT 1
  `;

  const [rows] = await pool.execute(sql, params);

  return rows[0] || null;
}

// ============================================================
// CHECK DUPLICATE SLUG
//
// categories.slug đang UNIQUE ở database.
// Vì vậy phải kiểm tra cả record nằm trong Trash.
// ============================================================

async function findDuplicateSlug(slug, excludeId = null) {
  const params = [slug];

  let sql = `
    SELECT
      id,
      deleted_at

    FROM categories

    WHERE slug = ?
  `;

  if (excludeId) {
    sql += `
      AND id <> ?
    `;

    params.push(excludeId);
  }

  sql += `
    LIMIT 1
  `;

  const [rows] = await pool.execute(sql, params);

  return rows[0] || null;
}

// ============================================================
// VALIDATE COMMON
// ============================================================

async function validateCommon(data, excludeId = null) {
  const errors = {};

  const name = String(data.name || "").trim();

  const slug = String(data.slug || "")
    .trim()
    .toLowerCase();

  const description = String(data.description || "").trim();

  // ----------------------------------------------------------
  // NAME
  // ----------------------------------------------------------

  if (!name) {
    errors.name = "Tên danh mục không được để trống.";
  } else if (name.length > NAME_MAX_LENGTH) {
    errors.name = `Tên danh mục tối đa ${NAME_MAX_LENGTH} ký tự.`;
  }

  // ----------------------------------------------------------
  // SLUG
  // ----------------------------------------------------------

  if (!slug) {
    errors.slug = "Slug không được để trống.";
  } else if (slug.length > SLUG_MAX_LENGTH) {
    errors.slug = `Slug tối đa ${SLUG_MAX_LENGTH} ký tự.`;
  } else if (!SLUG_REGEX.test(slug)) {
    errors.slug =
      "Slug chỉ được chứa chữ thường không dấu, số và dấu gạch ngang.";
  }

  // ----------------------------------------------------------
  // STATUS
  // ----------------------------------------------------------

  if (
    data.status === undefined ||
    data.status === null ||
    !["0", "1", 0, 1].includes(data.status)
  ) {
    errors.status = "Trạng thái không hợp lệ.";
  }

  // ----------------------------------------------------------
  // DESCRIPTION
  // ----------------------------------------------------------

  if (description && description.length > DESCRIPTION_MAX_LENGTH) {
    errors.description = `Mô tả tối đa ${DESCRIPTION_MAX_LENGTH} ký tự.`;
  }

  // ----------------------------------------------------------
  // DUPLICATE NAME
  // ----------------------------------------------------------

  if (!errors.name) {
    const duplicate = await findDuplicateName(name, excludeId);

    if (duplicate) {
      errors.name = duplicate.deleted_at
        ? "Tên danh mục đã tồn tại trong thùng rác. Hãy khôi phục danh mục cũ."
        : "Tên danh mục đã tồn tại.";
    }
  }

  // ----------------------------------------------------------
  // DUPLICATE SLUG
  // ----------------------------------------------------------

  if (!errors.slug) {
    const duplicate = await findDuplicateSlug(slug, excludeId);

    if (duplicate) {
      errors.slug = duplicate.deleted_at
        ? "Slug đã tồn tại trong thùng rác. Hãy khôi phục danh mục cũ."
        : "Slug đã tồn tại.";
    }
  }

  return errors;
}

// ============================================================
// CREATE
// ============================================================

async function validateCreateCategory(data) {
  return validateCommon(data);
}

// ============================================================
// UPDATE
// ============================================================

async function validateUpdateCategory(data, id) {
  return validateCommon(data, id);
}

// ============================================================
// EXPORT
// ============================================================

module.exports = {
  validateCreateCategory,
  validateUpdateCategory,
};
