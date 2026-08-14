// V3: cập nhật ảnh đại diện cho mọi tài khoản đã đăng nhập.
const { pool } = require("../config/database");

/*
  Thống kê đơn hàng theo từng người dùng.

  order_count:
  - Tổng số đơn chưa bị xóa mềm.

  total_spent:
  - Tổng tiền của các đơn COMPLETED.
*/
const ORDER_STATISTICS_JOIN = `
  LEFT JOIN (
    SELECT
      o.user_id,
      COUNT(*) AS order_count,

      COALESCE(
        SUM(
          CASE
            WHEN UPPER(COALESCE(o.status, '')) = 'COMPLETED'
            THEN o.total_amount
            ELSE 0
          END
        ),
        0
      ) AS total_spent

    FROM orders o
    WHERE o.deleted_at IS NULL
    GROUP BY o.user_id
  ) AS order_stats
    ON order_stats.user_id = u.id
`;

/*
  Các cột dùng chung khi lấy danh sách hoặc chi tiết người dùng.

  Không lấy password để tránh trả password hash ra API.
*/
const USER_SELECT = `
  SELECT
    u.id,
    u.role_id,
    u.full_name,
    u.email,
    u.phone,
    u.avatar,
    u.address,
    u.province_code,
    u.province_name,
    u.ward_code,
    u.ward_name,
    u.street_address,
    u.birth_date,
    u.gender,
    u.last_login_at,
    u.status,
    u.created_at,
    u.updated_at,

    DATE_FORMAT(
      u.birth_date,
      '%Y-%m-%d'
    ) AS birth_date_value,

    DATE_FORMAT(
      u.birth_date,
      '%d/%m/%Y'
    ) AS birth_date_formatted,

    DATE_FORMAT(
      u.created_at,
      '%d/%m/%Y'
    ) AS joined_date,

    DATE_FORMAT(
      u.last_login_at,
      '%d/%m/%Y, %H:%i'
    ) AS last_login_formatted,

    r.name AS role_name,
    r.code AS role_code,
    r.status AS role_status,

    COALESCE(order_stats.order_count, 0) AS order_count,
    COALESCE(order_stats.total_spent, 0) AS total_spent

  FROM users u

  INNER JOIN roles r
    ON r.id = u.role_id

  ${ORDER_STATISTICS_JOIN}
`;

function buildUserFilters({
  search = "",
  searchId = null,
  roleCode = null,
  status = null,
} = {}) {
  const conditions = [
    "u.deleted_at IS NULL",
    "r.deleted_at IS NULL",
  ];

  const params = [];

  if (search) {
    const keyword = `%${search}%`;

    const searchConditions = [
      "u.full_name LIKE ?",
      "u.email LIKE ?",
      "COALESCE(u.phone, '') LIKE ?",
    ];

    params.push(keyword, keyword, keyword);

    /*
      Khi tìm USR001 hoặc số 1,
      controller sẽ truyền searchId = 1.
    */
    if (searchId) {
      searchConditions.push("u.id = ?");
      params.push(searchId);
    }

    conditions.push(`(${searchConditions.join(" OR ")})`);
  }

  if (roleCode) {
    conditions.push("UPPER(r.code) = ?");
    params.push(String(roleCode).toUpperCase());
  }

  if (status !== null && status !== undefined) {
    conditions.push("u.status = ?");
    params.push(Number(status));
  }

  return {
    whereClause: conditions.join(" AND "),
    params,
  };
}

/*
  Lấy danh sách người dùng có:
  - tìm kiếm
  - lọc role
  - lọc trạng thái
  - phân trang
*/
async function getUsers({
  search = "",
  searchId = null,
  roleCode = null,
  status = null,
  page = 1,
  limit = 5,
} = {}) {
  const offset = (page - 1) * limit;

  const { whereClause, params } = buildUserFilters({
    search,
    searchId,
    roleCode,
    status,
  });

  const [countRows] = await pool.execute(
    `
      SELECT COUNT(*) AS total

      FROM users u

      INNER JOIN roles r
        ON r.id = u.role_id

      WHERE ${whereClause}
    `,
    params
  );

  const [rows] = await pool.execute(
    `
      ${USER_SELECT}

      WHERE ${whereClause}

      ORDER BY u.created_at DESC, u.id DESC
      LIMIT ? OFFSET ?
    `,
    [...params, Number(limit), Number(offset)]
  );

  return {
    users: rows,
    total: Number(countRows[0]?.total || 0),
  };
}

/*
  Thống kê cho 4 ô đầu trang:
  - Tổng người dùng
  - Đang hoạt động
  - Quản trị viên
  - Đã khóa
*/
async function getUserStatistics() {
  const [rows] = await pool.query(`
    SELECT
      COUNT(*) AS total_users,

      COALESCE(
        SUM(
          CASE
            WHEN u.status = 1 THEN 1
            ELSE 0
          END
        ),
        0
      ) AS active_users,

      COALESCE(
        SUM(
          CASE
            WHEN UPPER(r.code) IN ('ADMIN', 'SUPER_ADMIN') THEN 1
            ELSE 0
          END
        ),
        0
      ) AS admin_users,

      COALESCE(
        SUM(
          CASE
            WHEN UPPER(r.code) = 'SUPER_ADMIN' THEN 1
            ELSE 0
          END
        ),
        0
      ) AS super_admin_users,

      COALESCE(
        SUM(
          CASE
            WHEN u.status = 0 THEN 1
            ELSE 0
          END
        ),
        0
      ) AS blocked_users

    FROM users u

    INNER JOIN roles r
      ON r.id = u.role_id

    WHERE u.deleted_at IS NULL
      AND r.deleted_at IS NULL
  `);

  return rows[0] || {};
}

/*
  Lấy chi tiết một người dùng.
*/
async function findById(userId) {
  const [rows] = await pool.execute(
    `
      ${USER_SELECT}

      WHERE u.id = ?
        AND u.deleted_at IS NULL
        AND r.deleted_at IS NULL

      LIMIT 1
    `,
    [userId]
  );

  return rows[0] || null;
}

/*
  Kiểm tra email đã tồn tại hay chưa.
*/
async function findByEmail(email) {
  const [rows] = await pool.execute(
    `
      SELECT
        id,
        email

      FROM users

      WHERE LOWER(email) = LOWER(?)
        AND deleted_at IS NULL

      LIMIT 1
    `,
    [email]
  );

  return rows[0] || null;
}

/*
  Dùng cho chức năng đăng nhập sau này.

  Hàm này có lấy password hash.
*/
async function findByEmailForLogin(email) {
  const [rows] = await pool.execute(
    `
      SELECT
        u.id,
        u.role_id,
        u.full_name,
        u.email,
        u.phone,
        u.password,
        u.avatar,
        u.address,
        u.province_code,
        u.province_name,
        u.ward_code,
        u.ward_name,
        u.street_address,
        u.birth_date,
        u.gender,
        u.last_login_at,
        u.status,
        u.created_at,

        r.name AS role_name,
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
    [email]
  );

  return rows[0] || null;
}

/*
  Tìm role theo code: CUSTOMER hoặc ADMIN.
*/
async function findRoleByCode(roleCode) {
  const [rows] = await pool.execute(
    `
      SELECT
        id,
        name,
        code,
        status

      FROM roles

      WHERE UPPER(code) = ?
        AND status = 1
        AND deleted_at IS NULL

      LIMIT 1
    `,
    [String(roleCode).toUpperCase()]
  );

  return rows[0] || null;
}

/*
  Admin tạo tài khoản người dùng.
*/
async function createUser({
  roleId,
  fullName,
  email,
  phone,
  passwordHash,
  avatar,
  address,
  birthDate,
  gender,
  status,
}) {
  const [result] = await pool.execute(
    `
      INSERT INTO users (
        role_id,
        full_name,
        email,
        phone,
        password,
        avatar,
        address,
        birth_date,
        gender,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      roleId,
      fullName,
      email,
      phone || null,
      passwordHash,
      avatar || null,
      address || null,
      birthDate || null,
      gender || null,
      status,
    ]
  );

  return findById(result.insertId);
}

/*
  Cập nhật thông tin cá nhân.

  Không cập nhật role, status và password tại đây.
*/
async function updateUserProfile({
  userId,
  fullName,
  email,
  phone,
  avatar,
  address,
  birthDate,
  gender,
  provinceCode,
  provinceName,
  wardCode,
  wardName,
  streetAddress,
}) {
  const genderValue =
    gender === undefined ? null : gender;

  const [result] = await pool.execute(
    `
      UPDATE users

      SET
        full_name = ?,
        email = ?,
        phone = ?,
        avatar = ?,
        address = ?,
        province_code = ?,
        province_name = ?,
        ward_code = ?,
        ward_name = ?,
        street_address = ?,
        birth_date = ?,
        gender = COALESCE(?, gender)

      WHERE id = ?
        AND deleted_at IS NULL
    `,
    [
      fullName,
      email,
      phone || null,
      avatar || null,
      address || null,
      provinceCode || null,
      provinceName || null,
      wardCode || null,
      wardName || null,
      streetAddress || null,
      birthDate || null,
      genderValue,
      userId,
    ]
  );

  if (result.affectedRows === 0) {
    return findById(userId);
  }

  return findById(userId);
}

/* Cập nhật riêng ảnh đại diện. */
async function updateAvatar(userId, avatar) {
  const [result] = await pool.execute(
    `
      UPDATE users
      SET avatar = ?
      WHERE id = ?
        AND deleted_at IS NULL
    `,
    [avatar, userId]
  );

  if (result.affectedRows === 0) {
    return null;
  }

  return findById(userId);
}

/*
  Cập nhật mật khẩu đã được bcrypt hash.

  Controller chịu trách nhiệm kiểm tra mật khẩu hiện tại
  và tạo passwordHash trước khi gọi Model.
*/
async function updatePassword(userId, passwordHash) {
  const [result] = await pool.execute(
    `
      UPDATE users
      SET password = ?
      WHERE id = ?
        AND deleted_at IS NULL
    `,
    [passwordHash, userId]
  );

  return result.affectedRows > 0;
}

/*
  Đổi vai trò.
*/
async function updateRole(userId, roleId) {
  const [result] = await pool.execute(
    `
      UPDATE users

      SET role_id = ?

      WHERE id = ?
        AND deleted_at IS NULL
    `,
    [roleId, userId]
  );

  if (result.affectedRows === 0) {
    return null;
  }

  return findById(userId);
}

/*
  Khóa hoặc mở khóa tài khoản.
*/
async function updateStatus(userId, status) {
  const [result] = await pool.execute(
    `
      UPDATE users

      SET status = ?

      WHERE id = ?
        AND deleted_at IS NULL
    `,
    [status, userId]
  );

  if (result.affectedRows === 0) {
    return null;
  }

  return findById(userId);
}

/*
  Xóa mềm tài khoản.
*/
async function softDelete(userId) {
  const [result] = await pool.execute(
    `
      UPDATE users

      SET
        status = 0,
        deleted_at = CURRENT_TIMESTAMP

      WHERE id = ?
        AND deleted_at IS NULL
    `,
    [userId]
  );

  return result.affectedRows > 0;
}

/*
  Đếm số Admin đang hoạt động.

  Dùng để không cho khóa, xóa hoặc hạ quyền
  quản trị viên cuối cùng.
*/
async function countActiveAdmins() {
  const [rows] = await pool.query(`
    SELECT COUNT(*) AS total

    FROM users u

    INNER JOIN roles r
      ON r.id = u.role_id

    WHERE u.deleted_at IS NULL
      AND u.status = 1
      AND r.deleted_at IS NULL
      AND r.status = 1
      AND UPPER(r.code) IN ('ADMIN', 'SUPER_ADMIN')
  `);

  return Number(rows[0]?.total || 0);
}

async function countActiveSuperAdmins() {
  const [rows] = await pool.query(`
    SELECT COUNT(*) AS total
    FROM users u
    INNER JOIN roles r ON r.id = u.role_id
    WHERE u.deleted_at IS NULL
      AND u.status = 1
      AND r.deleted_at IS NULL
      AND r.status = 1
      AND UPPER(r.code) = 'SUPER_ADMIN'
  `);

  return Number(rows[0]?.total || 0);
}

/*
  Cập nhật thời gian đăng nhập gần nhất.

  Gọi hàm này sau khi kiểm tra mật khẩu thành công.
*/
async function updateLastLogin(userId) {
  await pool.execute(
    `
      UPDATE users

      SET last_login_at = CURRENT_TIMESTAMP

      WHERE id = ?
        AND deleted_at IS NULL
    `,
    [userId]
  );
}

module.exports = {
  getUsers,
  getUserStatistics,
  findById,
  findByEmail,
  findByEmailForLogin,
  findRoleByCode,
  createUser,
  updateUserProfile,
  updateAvatar,
  updatePassword,
  updateRole,
  updateStatus,
  softDelete,
  countActiveAdmins,
  countActiveSuperAdmins,
  updateLastLogin,
};