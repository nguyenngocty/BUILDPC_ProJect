const bcrypt = require("bcryptjs");
const User = require("../../models/User");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLE_LEVEL = Object.freeze({ CUSTOMER: 1, ADMIN: 2, SUPER_ADMIN: 3 });
const ASSIGNABLE_ROLES = new Set(["CUSTOMER", "ADMIN"]);
const AVATAR_CLASSES = ["avatar-blue", "avatar-rose", "avatar-violet", "avatar-orange", "avatar-teal", "avatar-cyan", "avatar-indigo"];

function roleCodeOf(user) {
  return String(user?.role_code || user?.roleCode || "CUSTOMER").toUpperCase();
}

function normalizeRole(value, allowAll = false) {
  const roleCode = String(value || "").trim().toUpperCase();
  if (allowAll && (!roleCode || roleCode === "ALL")) return null;
  return Object.hasOwn(ROLE_LEVEL, roleCode) ? roleCode : undefined;
}

function normalizeStatus(value, allowAll = false) {
  if (allowAll && (value === undefined || value === null || value === "")) return null;
  const status = String(value ?? "").trim().toLowerCase();
  if (allowAll && status === "all") return null;
  if (["active", "1", "true"].includes(status) || value === 1 || value === true) return 1;
  if (["blocked", "0", "false"].includes(status) || value === 0 || value === false) return 0;
  return undefined;
}

function parseUserId(value) {
  const normalized = String(value || "").trim();
  const match = normalized.match(/^USR0*(\d+)$/i);
  if (match) return Number(match[1]);
  return /^\d+$/.test(normalized) ? Number(normalized) : null;
}

function canManage(actor, target) {
  if (!actor || !target || Number(actor.id) === Number(target.id)) return false;
  return (ROLE_LEVEL[roleCodeOf(actor)] || 0) > (ROLE_LEVEL[roleCodeOf(target)] || 0);
}

function denyManage(res) {
  return res.status(403).json({
    success: false,
    message: "Bạn chỉ được quản lý tài khoản có quyền thấp hơn mình.",
  });
}

function formatUser(user) {
  const roleCode = roleCodeOf(user);
  const roleLabels = {
    CUSTOMER: "Khách hàng",
    ADMIN: "Quản trị viên",
    SUPER_ADMIN: "Quản trị viên cấp cao",
  };
  const status = Number(user.status) === 1 ? "active" : "blocked";

  return {
    id: Number(user.id),
    userCode: `USR${String(user.id).padStart(3, "0")}`,
    name: user.full_name,
    fullName: user.full_name,
    email: user.email,
    phone: user.phone || null,
    address: user.address || null,
    avatar: user.avatar || null,
    avatarClass: AVATAR_CLASSES[(Number(user.id) - 1) % AVATAR_CLASSES.length],
    role: roleCode.toLowerCase(),
    roleCode,
    roleName: user.role_name || roleLabels[roleCode],
    roleLabel: roleLabels[roleCode],
    status,
    statusValue: Number(user.status),
    statusLabel: status === "active" ? "Hoạt động" : "Đã khóa",
    birthDate: user.birth_date_formatted || null,
    birthDateValue: user.birth_date_value || null,
    gender: user.gender || null,
    joinedDate: user.joined_date || null,
    createdAt: user.created_at || null,
    updatedAt: user.updated_at || null,
    lastLogin: user.last_login_formatted || null,
    lastLoginAt: user.last_login_at || null,
    orderCount: Number(user.order_count || 0),
    totalSpent: Number(user.total_spent || 0),
  };
}

async function getUsers(req, res, next) {
  try {
    const search = String(req.query.search || "").trim();
    const roleCode = normalizeRole(req.query.role, true);
    const status = normalizeStatus(req.query.status, true);
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 5));

    if (roleCode === undefined || status === undefined) {
      return res.status(422).json({ success: false, message: "Bộ lọc người dùng không hợp lệ." });
    }

    const searchId = parseUserId(search);
    const [result, statistics] = await Promise.all([
      User.getUsers({ search, searchId, roleCode, status, page, limit }),
      User.getUserStatistics(),
    ]);
    const totalPages = Math.max(1, Math.ceil(result.total / limit));

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách người dùng thành công.",
      data: {
        currentUser: formatUser(req.user),
        statistics: {
          total: Number(statistics.total_users || 0),
          active: Number(statistics.active_users || 0),
          admin: Number(statistics.admin_users || 0),
          superAdmin: Number(statistics.super_admin_users || 0),
          blocked: Number(statistics.blocked_users || 0),
        },
        users: result.users.map(formatUser),
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages,
          startResult: result.total ? (page - 1) * limit + 1 : 0,
          endResult: Math.min(page * limit, result.total),
        },
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function getUserById(req, res, next) {
  try {
    const userId = parseUserId(req.params.id);
    if (!userId) return res.status(422).json({ success: false, message: "Mã người dùng không hợp lệ." });
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "Không tìm thấy người dùng." });
    return res.status(200).json({ success: true, data: { user: formatUser(user) } });
  } catch (error) {
    return next(error);
  }
}

async function createUser(req, res, next) {
  try {
    const fullName = String(req.body.fullName || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const roleCode = normalizeRole(req.body.role || "CUSTOMER");
    const status = normalizeStatus(req.body.status ?? "active");

    if (!ASSIGNABLE_ROLES.has(roleCode)) {
      return res.status(422).json({ success: false, message: "Chỉ được tạo CUSTOMER hoặc ADMIN." });
    }
    if (roleCode === "ADMIN" && roleCodeOf(req.user) !== "SUPER_ADMIN") {
      return res.status(403).json({ success: false, message: "Chỉ Super Admin được tạo quản trị viên." });
    }
    if (fullName.length < 2 || fullName.length > 255 || !EMAIL_REGEX.test(email)) {
      return res.status(422).json({ success: false, message: "Họ tên hoặc email không hợp lệ." });
    }
    if (password.length < 8 || password.length > 72) {
      return res.status(422).json({ success: false, message: "Mật khẩu phải có từ 8 đến 72 ký tự." });
    }
    if (status === undefined || status === null) {
      return res.status(422).json({ success: false, message: "Trạng thái không hợp lệ." });
    }
    if (await User.findByEmail(email)) {
      return res.status(409).json({ success: false, message: "Email này đã tồn tại trong hệ thống." });
    }

    const role = await User.findRoleByCode(roleCode);
    if (!role) return res.status(422).json({ success: false, message: `Không tìm thấy vai trò ${roleCode}.` });
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.createUser({
      roleId: role.id,
      fullName,
      email,
      phone: String(req.body.phone || "").trim(),
      passwordHash,
      avatar: String(req.body.avatar || "").trim(),
      address: String(req.body.address || "").trim(),
      birthDate: req.body.birthDate || null,
      gender: req.body.gender || null,
      status,
    });

    return res.status(201).json({ success: true, message: "Thêm người dùng thành công.", data: { user: formatUser(user) } });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ success: false, message: "Email đã tồn tại." });
    return next(error);
  }
}

async function updateUser(req, res, next) {
  try {
    const userId = parseUserId(req.params.id);
    const target = userId ? await User.findById(userId) : null;
    if (!target) return res.status(404).json({ success: false, message: "Không tìm thấy người dùng." });
    if (!canManage(req.user, target)) return denyManage(res);

    const fullName = String(req.body.fullName ?? target.full_name).trim();
    const email = String(req.body.email ?? target.email).trim().toLowerCase();
    const owner = await User.findByEmail(email);
    if (owner && Number(owner.id) !== userId) return res.status(409).json({ success: false, message: "Email đã được sử dụng." });

    const user = await User.updateUserProfile({
      userId,
      fullName,
      email,
      phone: String(req.body.phone ?? target.phone ?? "").trim(),
      avatar: String(req.body.avatar ?? target.avatar ?? "").trim(),
      address: String(req.body.address ?? target.address ?? "").trim(),
      birthDate: req.body.birthDate ?? target.birth_date_value ?? null,
      gender: req.body.gender ?? target.gender ?? null,
    });
    return res.status(200).json({ success: true, message: "Cập nhật người dùng thành công.", data: { user: formatUser(user) } });
  } catch (error) {
    return next(error);
  }
}

async function updateUserRole(req, res, next) {
  try {
    const userId = parseUserId(req.params.id);
    const roleCode = normalizeRole(req.body.role);
    const target = userId ? await User.findById(userId) : null;
    if (!target) return res.status(404).json({ success: false, message: "Không tìm thấy người dùng." });
    if (!canManage(req.user, target)) return denyManage(res);
    if (!ASSIGNABLE_ROLES.has(roleCode)) {
      return res.status(422).json({ success: false, message: "Chỉ được đổi giữa CUSTOMER và ADMIN." });
    }

    const role = await User.findRoleByCode(roleCode);
    if (!role) return res.status(422).json({ success: false, message: `Không tìm thấy vai trò ${roleCode}.` });
    const user = await User.updateRole(userId, role.id);
    return res.status(200).json({ success: true, message: "Cập nhật vai trò thành công.", data: { user: formatUser(user) } });
  } catch (error) {
    return next(error);
  }
}

async function updateUserStatus(req, res, next) {
  try {
    const userId = parseUserId(req.params.id);
    const status = normalizeStatus(req.body.status);
    const target = userId ? await User.findById(userId) : null;
    if (!target) return res.status(404).json({ success: false, message: "Không tìm thấy người dùng." });
    if (!canManage(req.user, target)) return denyManage(res);
    if (status === undefined || status === null) return res.status(422).json({ success: false, message: "Trạng thái không hợp lệ." });

    const user = await User.updateStatus(userId, status);
    return res.status(200).json({
      success: true,
      message: status ? "Đã mở khóa tài khoản." : "Đã khóa tài khoản.",
      data: { user: formatUser(user) },
    });
  } catch (error) {
    return next(error);
  }
}

async function deleteUser(req, res, next) {
  try {
    const userId = parseUserId(req.params.id);
    const target = userId ? await User.findById(userId) : null;
    if (!target) return res.status(404).json({ success: false, message: "Không tìm thấy người dùng." });
    if (!canManage(req.user, target)) return denyManage(res);
    await User.softDelete(userId);
    return res.status(200).json({ success: true, message: "Xóa người dùng thành công." });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  updateUserRole,
  updateUserStatus,
  deleteUser,
};
