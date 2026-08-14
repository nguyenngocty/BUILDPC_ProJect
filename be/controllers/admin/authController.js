const bcrypt = require("bcryptjs");
const User = require("../../models/User");
const { createAccessToken } = require("../../utils/jwt");
const { formatAuthUser } = require("../../utils/authUser");

const ADMIN_ROLES = new Set(["ADMIN", "SUPER_ADMIN"]);

async function login(req, res, next) {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(422).json({ success: false, message: "Vui lòng nhập email và mật khẩu." });
    }

    const user = await User.findByEmailForLogin(email);
    const passwordMatches = user
      ? await bcrypt.compare(password, user.password)
      : false;

    if (!user || !passwordMatches) {
      return res.status(401).json({ success: false, message: "Email hoặc mật khẩu không chính xác." });
    }

    if (Number(user.status) !== 1 || Number(user.role_status) !== 1) {
      return res.status(403).json({ success: false, message: "Tài khoản quản trị đã bị khóa." });
    }

    const roleCode = String(user.role_code || "").toUpperCase();
    if (!ADMIN_ROLES.has(roleCode)) {
      return res.status(403).json({ success: false, message: "Tài khoản không có quyền quản trị." });
    }

    await User.updateLastLogin(user.id);
    const refreshedUser = await User.findById(user.id);
    const accessToken = createAccessToken(refreshedUser);

    return res.status(200).json({
      success: true,
      message: "Đăng nhập quản trị thành công.",
      data: { accessToken, user: formatAuthUser(refreshedUser) },
    });
  } catch (error) {
    return next(error);
  }
}

function getCurrentAdmin(req, res) {
  return res.status(200).json({
    success: true,
    message: "Lấy thông tin quản trị viên thành công.",
    data: { user: formatAuthUser(req.user) },
  });
}

module.exports = { login, getCurrentAdmin };
