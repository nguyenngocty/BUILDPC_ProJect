const { pool } = require("../config/database");

// ============================================================
// ORDER STATISTICS
// Chỉ sử dụng cho màn hình quản lý Users.
// TUYỆT ĐỐI không dùng query này cho middleware authentication.
// ============================================================

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

// ============================================================
// USER SELECT
// Dùng cho Admin User Management.
// Có thống kê đơn hàng nên query tương đối nặng.
// ============================================================

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

    COALESCE(
      order_stats.order_count,
      0
    ) AS order_count,

    COALESCE(
      order_stats.total_spent,
      0
    ) AS total_spent

  FROM users u

  INNER JOIN roles r
    ON r.id = u.role_id

  ${ORDER_STATISTICS_JOIN}
`;

// ============================================================
// AUTH USER SELECT
//
// Query nhẹ dành riêng cho:
// - requireAuth
// - login
// - /auth/me
//
// Không JOIN orders.
// Không COUNT.
// Không GROUP BY.
// ============================================================

const AUTH_USER_SELECT = `
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

    r.name AS role_name,
    r.code AS role_code,
    r.status AS role_status

  FROM users u

  INNER JOIN roles r
    ON r.id = u.role_id
`;

// ============================================================
// BUILD USER FILTERS
// ============================================================

function buildUserFilters({
  search = "",
  searchId = null,
  roleCode = null,
  status = null,
} = {}) {
  const conditions = ["u.deleted_at IS NULL", "r.deleted_at IS NULL"];

  const params = [];

  // ----------------------------------------------------------
  // SEARCH
  // ----------------------------------------------------------

  if (search) {
    const keyword = `%${search}%`;

    const searchConditions = [
      "u.full_name LIKE ?",
      "u.email LIKE ?",
      "COALESCE(u.phone, '') LIKE ?",
    ];

    params.push(keyword, keyword, keyword);

    if (searchId) {
      searchConditions.push("u.id = ?");

      params.push(searchId);
    }

    conditions.push(`(${searchConditions.join(" OR ")})`);
  }

  // ----------------------------------------------------------
  // ROLE
  // ----------------------------------------------------------

  if (roleCode) {
    conditions.push("UPPER(r.code) = ?");

    params.push(String(roleCode).toUpperCase());
  }

  // ----------------------------------------------------------
  // STATUS
  // ----------------------------------------------------------

  if (status !== null && status !== undefined) {
    conditions.push("u.status = ?");

    params.push(Number(status));
  }

  return {
    whereClause: conditions.join(" AND "),

    params,
  };
}

// ============================================================
// GET USERS
// ============================================================

async function getUsers({
  search = "",
  searchId = null,
  roleCode = null,
  status = null,
  page = 1,
  limit = 5,
} = {}) {
  const normalizedPage = Math.max(Number(page) || 1, 1);

  const normalizedLimit = Math.min(Math.max(Number(limit) || 5, 1), 100);

  const offset = (normalizedPage - 1) * normalizedLimit;

  const { whereClause, params } = buildUserFilters({
    search,
    searchId,
    roleCode,
    status,
  });

  // ----------------------------------------------------------
  // COUNT
  // ----------------------------------------------------------

  const [countRows] = await pool.execute(
    `
        SELECT
          COUNT(*) AS total

        FROM users u

        INNER JOIN roles r
          ON r.id = u.role_id

        WHERE ${whereClause}
      `,
    params,
  );

  // ----------------------------------------------------------
  // DATA
  // ----------------------------------------------------------

  const [rows] = await pool.execute(
    `
        ${USER_SELECT}

        WHERE ${whereClause}

        ORDER BY
          u.created_at DESC,
          u.id DESC

        LIMIT ?
        OFFSET ?
      `,
    [...params, normalizedLimit, offset],
  );

  return {
    users: rows,

    total: Number(countRows[0]?.total || 0),
  };
}

// ============================================================
// USER STATISTICS
// ============================================================

async function getUserStatistics() {
  const [rows] = await pool.query(`
      SELECT
        COUNT(*) AS total_users,

        COALESCE(
          SUM(
            CASE
              WHEN u.status = 1
              THEN 1
              ELSE 0
            END
          ),
          0
        ) AS active_users,

        COALESCE(
          SUM(
            CASE
              WHEN UPPER(r.code)
                IN ('ADMIN', 'SUPER_ADMIN')
              THEN 1
              ELSE 0
            END
          ),
          0
        ) AS admin_users,

        COALESCE(
          SUM(
            CASE
              WHEN UPPER(r.code)
                = 'SUPER_ADMIN'
              THEN 1
              ELSE 0
            END
          ),
          0
        ) AS super_admin_users,

        COALESCE(
          SUM(
            CASE
              WHEN u.status = 0
              THEN 1
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

// ============================================================
// FIND USER BY ID
//
// Dùng cho User Management.
// Có order statistics.
// ============================================================

async function findById(userId) {
  const [rows] = await pool.execute(
    `
        ${USER_SELECT}

        WHERE u.id = ?
          AND u.deleted_at IS NULL
          AND r.deleted_at IS NULL

        LIMIT 1
      `,
    [userId],
  );

  return rows[0] || null;
}

// ============================================================
// FIND USER BY ID FOR AUTH
//
// Query nhẹ.
// Đây là hàm requireAuth PHẢI sử dụng.
// ============================================================

async function findByIdForAuth(userId) {
  const [rows] = await pool.execute(
    `
        ${AUTH_USER_SELECT}

        WHERE u.id = ?
          AND u.deleted_at IS NULL
          AND r.deleted_at IS NULL

        LIMIT 1
      `,
    [userId],
  );

  return rows[0] || null;
}

// ============================================================
// FIND BY EMAIL
// ============================================================

async function findByEmail(email) {
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();

  if (!normalizedEmail) {
    return null;
  }

  const [rows] = await pool.execute(
    `
        SELECT
          id,
          email

        FROM users

        WHERE LOWER(email) = ?
          AND deleted_at IS NULL

        LIMIT 1
      `,
    [normalizedEmail],
  );

  return rows[0] || null;
}

// ============================================================
// FIND BY EMAIL FOR LOGIN
//
// Đây là nơi duy nhất trong nhóm Auth cần lấy password hash.
// ============================================================

async function findByEmailForLogin(email) {
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();

  if (!normalizedEmail) {
    return null;
  }

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
          u.updated_at,

          DATE_FORMAT(
            u.birth_date,
            '%Y-%m-%d'
          ) AS birth_date_value,

          r.name AS role_name,
          r.code AS role_code,
          r.status AS role_status

        FROM users u

        INNER JOIN roles r
          ON r.id = u.role_id

        WHERE LOWER(u.email) = ?
          AND u.deleted_at IS NULL
          AND r.deleted_at IS NULL

        LIMIT 1
      `,
    [normalizedEmail],
  );

  return rows[0] || null;
}

// ============================================================
// FIND ROLE BY CODE
// ============================================================

async function findRoleByCode(roleCode) {
  const normalizedRoleCode = String(roleCode || "")
    .trim()
    .toUpperCase();

  if (!normalizedRoleCode) {
    return null;
  }

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
    [normalizedRoleCode],
  );

  return rows[0] || null;
}

// ============================================================
// CREATE USER
// ============================================================

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
          ?
        )
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
    ],
  );

  return findById(result.insertId);
}

// ============================================================
// UPDATE USER PROFILE
// ============================================================

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
  const genderValue = gender === undefined ? null : gender;

  await pool.execute(
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

        gender = COALESCE(
          ?,
          gender
        )

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
    ],
  );

  return findById(userId);
}

// ============================================================
// UPDATE AVATAR
// ============================================================

async function updateAvatar(userId, avatar) {
  const [result] = await pool.execute(
    `
        UPDATE users

        SET avatar = ?

        WHERE id = ?
          AND deleted_at IS NULL
      `,
    [avatar, userId],
  );

  if (result.affectedRows === 0) {
    return null;
  }

  return findById(userId);
}

// ============================================================
// UPDATE PASSWORD
// ============================================================

async function updatePassword(userId, passwordHash) {
  const [result] = await pool.execute(
    `
        UPDATE users

        SET password = ?

        WHERE id = ?
          AND deleted_at IS NULL
      `,
    [passwordHash, userId],
  );

  return result.affectedRows > 0;
}

// ============================================================
// UPDATE ROLE
// ============================================================

async function updateRole(userId, roleId) {
  const [result] = await pool.execute(
    `
        UPDATE users

        SET role_id = ?

        WHERE id = ?
          AND deleted_at IS NULL
      `,
    [roleId, userId],
  );

  if (result.affectedRows === 0) {
    return null;
  }

  return findById(userId);
}

// ============================================================
// UPDATE STATUS
// ============================================================

async function updateStatus(userId, status) {
  const [result] = await pool.execute(
    `
        UPDATE users

        SET status = ?

        WHERE id = ?
          AND deleted_at IS NULL
      `,
    [status, userId],
  );

  if (result.affectedRows === 0) {
    return null;
  }

  return findById(userId);
}

// ============================================================
// SOFT DELETE
// ============================================================

async function softDelete(userId) {
  const [result] = await pool.execute(
    `
        UPDATE users

        SET
          status = 0,
          deleted_at =
            CURRENT_TIMESTAMP

        WHERE id = ?
          AND deleted_at IS NULL
      `,
    [userId],
  );

  return result.affectedRows > 0;
}

// ============================================================
// COUNT ACTIVE ADMINS
//
// ADMIN + SUPER_ADMIN.
// ============================================================

async function countActiveAdmins() {
  const [rows] = await pool.query(`
      SELECT
        COUNT(*) AS total

      FROM users u

      INNER JOIN roles r
        ON r.id = u.role_id

      WHERE u.deleted_at IS NULL
        AND u.status = 1

        AND r.deleted_at IS NULL
        AND r.status = 1

        AND UPPER(r.code)
          IN (
            'ADMIN',
            'SUPER_ADMIN'
          )
    `);

  return Number(rows[0]?.total || 0);
}

// ============================================================
// COUNT ACTIVE SUPER ADMINS
// ============================================================

async function countActiveSuperAdmins() {
  const [rows] = await pool.query(`
      SELECT
        COUNT(*) AS total

      FROM users u

      INNER JOIN roles r
        ON r.id = u.role_id

      WHERE u.deleted_at IS NULL
        AND u.status = 1

        AND r.deleted_at IS NULL
        AND r.status = 1

        AND UPPER(r.code)
          = 'SUPER_ADMIN'
    `);

  return Number(rows[0]?.total || 0);
}

// ============================================================
// UPDATE LAST LOGIN
// ============================================================

async function updateLastLogin(userId) {
  await pool.execute(
    `
      UPDATE users

      SET last_login_at =
        CURRENT_TIMESTAMP

      WHERE id = ?
        AND deleted_at IS NULL
    `,
    [userId],
  );
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  getUsers,

  getUserStatistics,

  findById,

  findByIdForAuth,

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
