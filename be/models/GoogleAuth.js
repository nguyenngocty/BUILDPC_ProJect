const { pool } = require("../config/database");

const User = require("./User");

/**
 * Tìm tài khoản theo Google ID.
 *
 * google_id lưu giá trị "sub" lấy từ
 * Google ID Token sau khi backend verify.
 */
async function findByGoogleId(googleId) {
  const normalizedGoogleId = String(
    googleId || ""
  ).trim();

  if (!normalizedGoogleId) {
    return null;
  }

  const [rows] = await pool.execute(
    `
      SELECT
        u.id,
        u.google_id,
        u.email,
        u.status,

        r.code AS role_code,
        r.status AS role_status

      FROM users u

      INNER JOIN roles r
        ON r.id = u.role_id

      WHERE u.google_id = ?
        AND u.deleted_at IS NULL
        AND r.deleted_at IS NULL

      LIMIT 1
    `,
    [normalizedGoogleId]
  );

  return rows[0] || null;
}

/**
 * Tìm tài khoản theo email để phục vụ
 * quá trình liên kết tài khoản Google.
 *
 * Khác User.findByEmail():
 * hàm này lấy thêm google_id, status và role.
 */
async function findByEmail(email) {
  const normalizedEmail = String(
    email || ""
  )
    .trim()
    .toLowerCase();

  if (!normalizedEmail) {
    return null;
  }

  const [rows] = await pool.execute(
    `
      SELECT
        u.id,
        u.google_id,
        u.email,
        u.status,

        r.code AS role_code,
        r.status AS role_status

      FROM users u

      INNER JOIN roles r
        ON r.id = u.role_id

      WHERE LOWER(u.email) = LOWER(?)
        AND u.deleted_at IS NULL
        AND r.deleted_at IS NULL

      LIMIT 1
    `,
    [normalizedEmail]
  );

  return rows[0] || null;
}

/**
 * Liên kết Google vào một tài khoản BuildPC
 * đã tồn tại.
 *
 * Chỉ liên kết nếu:
 * - user chưa bị xóa mềm
 * - google_id hiện đang NULL hoặc rỗng
 *
 * Không ghi đè Google ID đã tồn tại.
 */
async function linkGoogleAccount({
  userId,
  googleId,
}) {
  const normalizedGoogleId = String(
    googleId || ""
  ).trim();

  if (!userId || !normalizedGoogleId) {
    return null;
  }

  const [result] = await pool.execute(
    `
      UPDATE users

      SET google_id = ?

      WHERE id = ?
        AND deleted_at IS NULL
        AND (
          google_id IS NULL
          OR google_id = ''
        )
    `,
    [
      normalizedGoogleId,
      userId,
    ]
  );

  /*
   * affectedRows = 0 có thể xảy ra khi
   * tài khoản đã được liên kết trước đó.
   *
   * Controller sẽ chịu trách nhiệm kiểm tra
   * google_id có đúng với tài khoản Google
   * hiện tại hay không.
   */
  if (result.affectedRows === 0) {
    return findByUserId(userId);
  }

  return findByUserId(userId);
}

/**
 * Tìm thông tin Google của user theo ID.
 */
async function findByUserId(userId) {
  const [rows] = await pool.execute(
    `
      SELECT
        id,
        google_id,
        email,
        status

      FROM users

      WHERE id = ?
        AND deleted_at IS NULL

      LIMIT 1
    `,
    [userId]
  );

  return rows[0] || null;
}

/**
 * Tạo tài khoản CUSTOMER mới từ Google.
 *
 * passwordHash vẫn được lưu vì database
 * hiện tại của BuildPC đang để password NOT NULL.
 *
 * Controller sẽ tạo một mật khẩu ngẫu nhiên,
 * bcrypt hash rồi truyền vào đây.
 */
async function createGoogleUser({
  roleId,
  googleId,
  fullName,
  email,
  passwordHash,
  avatar,
}) {
  const [result] = await pool.execute(
    `
      INSERT INTO users (
        role_id,
        full_name,
        email,
        google_id,
        phone,
        password,
        avatar,
        address,
        birth_date,
        gender,
        status
      )

      VALUES (
        ?,
        ?,
        ?,
        ?,
        NULL,
        ?,
        ?,
        NULL,
        NULL,
        NULL,
        1
      )
    `,
    [
      roleId,
      fullName,
      email,
      googleId,
      passwordHash,
      avatar || null,
    ]
  );

  /*
   * Dùng User.findById() hiện tại để lấy
   * user đầy đủ cùng role_name, role_code...
   * giúp JWT/AuthContext tương thích với
   * đăng nhập email + password.
   */
  return User.findById(result.insertId);
}

module.exports = {
  findByGoogleId,
  findByEmail,
  findByUserId,
  linkGoogleAccount,
  createGoogleUser,
};