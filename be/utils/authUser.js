// ============================================================
// FORMAT AUTH USER
//
// Đây là object user chuẩn trả về:
// - Admin Login
// - Client Login nếu dùng chung
// - /auth/me
//
// Không bao giờ trả:
// - password
// - password hash
// - JWT secret
// ============================================================

function formatAuthUser(user) {
  if (!user) {
    return null;
  }

  // ==========================================================
  // STRUCTURED ADDRESS
  // ==========================================================

  const structuredAddress = [
    user.street_address,
    user.ward_name,
    user.province_name,
  ]
    .filter(Boolean)
    .join(", ");

  // ==========================================================
  // ROLE
  // ==========================================================

  const roleCode = String(user.role_code || "CUSTOMER")
    .trim()
    .toUpperCase();

  // ==========================================================
  // USER
  // ==========================================================

  return {
    id: Number(user.id),

    fullName: user.full_name || "",

    // Giữ compatibility với FE cũ.
    name: user.full_name || "",

    email: user.email || "",

    phone: user.phone || null,

    avatar: user.avatar || null,

    address: structuredAddress || user.address || null,

    provinceCode:
      user.province_code !== null && user.province_code !== undefined
        ? String(user.province_code)
        : "",

    provinceName: user.province_name || "",

    wardCode:
      user.ward_code !== null && user.ward_code !== undefined
        ? String(user.ward_code)
        : "",

    wardName: user.ward_name || "",

    streetAddress: user.street_address || "",

    birthDate: user.birth_date_value || null,

    gender: user.gender || null,

    status: Number(user.status) === 1 ? "active" : "blocked",

    statusValue: Number(user.status),

    role: roleCode.toLowerCase(),

    roleCode,

    roleName: user.role_name || null,

    lastLoginAt: user.last_login_at || null,

    createdAt: user.created_at || null,
  };
}

// ============================================================
// EXPORT
// ============================================================

module.exports = {
  formatAuthUser,
};
