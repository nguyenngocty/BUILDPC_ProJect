function formatAuthUser(user) {
  const structuredAddress = [
    user.street_address,
    user.ward_name,
    user.province_name,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    id: Number(user.id),
    fullName: user.full_name,
    name: user.full_name,
    email: user.email,
    phone: user.phone || null,
    avatar: user.avatar || null,

    address:
      structuredAddress ||
      user.address ||
      null,

    provinceCode:
      user.province_code !== null &&
      user.province_code !== undefined
        ? String(user.province_code)
        : "",

    provinceName: user.province_name || "",
    wardCode:
      user.ward_code !== null &&
      user.ward_code !== undefined
        ? String(user.ward_code)
        : "",

    wardName: user.ward_name || "",
    streetAddress: user.street_address || "",

    birthDate: user.birth_date_value || null,

    // Giữ lại để không ảnh hưởng các màn hình admin cũ.
    gender: user.gender || null,

    status:
      Number(user.status) === 1
        ? "active"
        : "blocked",

    statusValue: Number(user.status),

    role: String(
      user.role_code || "CUSTOMER"
    ).toLowerCase(),

    roleCode: String(
      user.role_code || "CUSTOMER"
    ).toUpperCase(),

    roleName: user.role_name || null,
    lastLoginAt: user.last_login_at || null,
    createdAt: user.created_at || null,
  };
}

module.exports = {
  formatAuthUser,
};