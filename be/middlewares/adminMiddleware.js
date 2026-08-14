function getRoleCode(req) {
  return String(req.user?.role_code || "").toUpperCase();
}

function requireAdmin(req, res, next) {
  // if (process.env.SKIP_AUTH === "true") {
  //   return next();
  // } // tạm
  const roleCode = getRoleCode(req);

  if (roleCode !== "ADMIN" && roleCode !== "SUPER_ADMIN") {
    return res.status(403).json({
      success: false,
      message: "Bạn không có quyền truy cập khu vực quản trị.",
    });
  }

  return next();
}

function requireSuperAdmin(req, res, next) {
  // if (process.env.SKIP_AUTH === "true") {
  //   return next();
  // } // tạm
  if (getRoleCode(req) !== "SUPER_ADMIN") {
    return res.status(403).json({
      success: false,
      message: "Chỉ quản trị viên cấp cao được thực hiện thao tác này.",
    });
  }

  return next();
}

module.exports = { requireAdmin, requireSuperAdmin };
