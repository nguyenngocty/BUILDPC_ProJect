const bcrypt = require("bcryptjs");

const User = require("../../models/User");

// ============================================================
// CONSTANTS
// ============================================================

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PHONE_REGEX = /^(0|\+84)[0-9]{8,10}$/;

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const ROLE_LEVEL = Object.freeze({
  CUSTOMER: 1,
  ADMIN: 2,
  SUPER_ADMIN: 3,
});

/*
  Chủ động không cho tạo / gán SUPER_ADMIN qua User Management.

  SUPER_ADMIN được xem là tài khoản quản trị cấp hệ thống.
*/
const ASSIGNABLE_ROLES = new Set(["CUSTOMER", "ADMIN"]);

const AVATAR_CLASSES = [
  "avatar-blue",
  "avatar-rose",
  "avatar-violet",
  "avatar-orange",
  "avatar-teal",
  "avatar-cyan",
  "avatar-indigo",
];

// ============================================================
// HELPERS
// ============================================================

function roleCodeOf(user) {
  return String(user?.role_code || user?.roleCode || "CUSTOMER")
    .trim()
    .toUpperCase();
}

// ============================================================
// NORMALIZE ROLE
// ============================================================

function normalizeRole(value, allowAll = false) {
  const roleCode = String(value || "")
    .trim()
    .toUpperCase();

  if (allowAll && (!roleCode || roleCode === "ALL")) {
    return null;
  }

  return Object.hasOwn(ROLE_LEVEL, roleCode) ? roleCode : undefined;
}

// ============================================================
// NORMALIZE STATUS
// ============================================================

function normalizeStatus(value, allowAll = false) {
  if (allowAll && (value === undefined || value === null || value === "")) {
    return null;
  }

  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  if (allowAll && normalized === "all") {
    return null;
  }

  if (
    ["active", "1", "true"].includes(normalized) ||
    value === 1 ||
    value === true
  ) {
    return 1;
  }

  if (
    ["blocked", "0", "false"].includes(normalized) ||
    value === 0 ||
    value === false
  ) {
    return 0;
  }

  return undefined;
}

// ============================================================
// PARSE USER ID
//
// Hỗ trợ:
// 7
// "7"
// "USR007"
// ============================================================

function parseUserId(value) {
  const normalized = String(value || "").trim();

  const match = normalized.match(/^USR0*(\d+)$/i);

  if (match) {
    const id = Number(match[1]);

    return Number.isInteger(id) && id > 0 ? id : null;
  }

  if (!/^\d+$/.test(normalized)) {
    return null;
  }

  const id = Number(normalized);

  return Number.isInteger(id) && id > 0 ? id : null;
}

// ============================================================
// NORMALIZE OPTIONAL STRING
// ============================================================

function normalizeOptionalString(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();

  return normalized || null;
}

// ============================================================
// NORMALIZE PHONE
// ============================================================

function normalizePhone(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim().replace(/\s+/g, "");

  return normalized || null;
}

// ============================================================
// NORMALIZE BIRTH DATE
// ============================================================

function normalizeBirthDate(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const normalized = String(value).trim();

  if (!DATE_REGEX.test(normalized)) {
    return undefined;
  }

  const date = new Date(`${normalized}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  const [year, month, day] = normalized.split("-").map(Number);

  if (
    date.getFullYear() !== year ||
    date.getMonth() + 1 !== month ||
    date.getDate() !== day
  ) {
    return undefined;
  }

  /*
    Không cho ngày sinh nằm trong tương lai.
  */
  const today = new Date();

  const todayValue = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  if (date > todayValue) {
    return undefined;
  }

  return normalized;
}

// ============================================================
// NORMALIZE GENDER
//
// DB đang là VARCHAR nên giữ tương thích dữ liệu:
// Nam
// Nữ
// Khác
//
// Đồng thời chấp nhận male/female/other từ FE nếu có.
// ============================================================

function normalizeGender(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const normalized = String(value).trim();

  const map = {
    nam: "Nam",
    male: "Nam",

    nữ: "Nữ",
    nu: "Nữ",
    female: "Nữ",

    khác: "Khác",
    khac: "Khác",
    other: "Khác",
  };

  return map[normalized.toLowerCase()] || undefined;
}

// ============================================================
// PERMISSION
//
// Actor chỉ được quản lý tài khoản có level thấp hơn.
//
// CUSTOMER < ADMIN < SUPER_ADMIN
//
// Ngoài ra không được tự thao tác chính mình ở User Management.
// ============================================================

function canManage(actor, target) {
  if (!actor || !target) {
    return false;
  }

  if (Number(actor.id) === Number(target.id)) {
    return false;
  }

  const actorLevel = ROLE_LEVEL[roleCodeOf(actor)] || 0;

  const targetLevel = ROLE_LEVEL[roleCodeOf(target)] || 0;

  return actorLevel > targetLevel;
}

// ============================================================
// DENY MANAGE
// ============================================================

function denyManage(res) {
  return res.status(403).json({
    success: false,

    message: "Bạn chỉ được quản lý tài khoản có quyền thấp hơn mình.",
  });
}

// ============================================================
// FORMAT USER
// ============================================================

function formatUser(user) {
  if (!user) {
    return null;
  }

  const roleCode = roleCodeOf(user);

  const roleLabels = {
    CUSTOMER: "Khách hàng",

    ADMIN: "Quản trị viên",

    SUPER_ADMIN: "Quản trị viên cấp cao",
  };

  const status = Number(user.status) === 1 ? "active" : "blocked";

  const structuredAddress = [
    user.street_address,
    user.ward_name,
    user.province_name,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    id: Number(user.id),

    userCode: `USR${String(user.id).padStart(3, "0")}`,

    name: user.full_name,

    fullName: user.full_name,

    email: user.email,

    phone: user.phone || null,

    /*
      Ưu tiên địa chỉ có cấu trúc.
      Nếu dữ liệu cũ chưa có GHN address
      thì fallback sang users.address.
    */
    address: structuredAddress || user.address || null,

    legacyAddress: user.address || null,

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

    avatar: user.avatar || null,

    avatarClass:
      AVATAR_CLASSES[Math.abs(Number(user.id) - 1) % AVATAR_CLASSES.length],

    role: roleCode.toLowerCase(),

    roleCode,

    roleName: user.role_name || roleLabels[roleCode] || roleCode,

    roleLabel: roleLabels[roleCode] || roleCode,

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

// ============================================================
// GET USERS
// ============================================================

async function getUsers(req, res, next) {
  try {
    const search = String(req.query.search || "").trim();

    const roleCode = normalizeRole(req.query.role, true);

    const status = normalizeStatus(req.query.status, true);

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);

    const limit = Math.min(
      100,

      Math.max(1, Number.parseInt(req.query.limit, 10) || 5),
    );

    if (roleCode === undefined || status === undefined) {
      return res.status(422).json({
        success: false,

        message: "Bộ lọc người dùng không hợp lệ.",
      });
    }

    const searchId = parseUserId(search);

    const [result, statistics] = await Promise.all([
      User.getUsers({
        search,
        searchId,
        roleCode,
        status,
        page,
        limit,
      }),

      User.getUserStatistics(),
    ]);

    const totalPages = Math.max(
      1,

      Math.ceil(result.total / limit),
    );

    return res.status(200).json({
      success: true,

      message: "Lấy danh sách người dùng thành công.",

      data: {
        /*
            req.user được lấy từ Auth query nhẹ.
            Các field thống kê của currentUser
            không quan trọng cho phân quyền.
          */
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

          endResult: Math.min(
            page * limit,

            result.total,
          ),
        },
      },
    });
  } catch (error) {
    return next(error);
  }
}

// ============================================================
// GET USER BY ID
// ============================================================

async function getUserById(req, res, next) {
  try {
    const userId = parseUserId(req.params.id);

    if (!userId) {
      return res.status(422).json({
        success: false,

        message: "Mã người dùng không hợp lệ.",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,

        message: "Không tìm thấy người dùng.",
      });
    }

    return res.status(200).json({
      success: true,

      message: "Lấy thông tin người dùng thành công.",

      data: {
        user: formatUser(user),
      },
    });
  } catch (error) {
    return next(error);
  }
}

// ============================================================
// CREATE USER
// ============================================================

async function createUser(req, res, next) {
  try {
    // --------------------------------------------------------
    // BASIC DATA
    // --------------------------------------------------------

    const fullName = String(req.body.fullName || "").trim();

    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();

    const password = String(req.body.password || "");

    const phone = normalizePhone(req.body.phone);

    const roleCode = normalizeRole(req.body.role || "CUSTOMER");

    const status = normalizeStatus(req.body.status ?? "active");

    const birthDate = normalizeBirthDate(req.body.birthDate);

    const gender = normalizeGender(req.body.gender);

    // --------------------------------------------------------
    // ROLE
    // --------------------------------------------------------

    if (!ASSIGNABLE_ROLES.has(roleCode)) {
      return res.status(422).json({
        success: false,

        message: "Chỉ được tạo tài khoản CUSTOMER hoặc ADMIN.",
      });
    }

    if (roleCode === "ADMIN" && roleCodeOf(req.user) !== "SUPER_ADMIN") {
      return res.status(403).json({
        success: false,

        message: "Chỉ Super Admin được tạo quản trị viên.",
      });
    }

    // --------------------------------------------------------
    // NAME
    // --------------------------------------------------------

    if (fullName.length < 2 || fullName.length > 255) {
      return res.status(422).json({
        success: false,

        message: "Họ tên phải có từ 2 đến 255 ký tự.",
      });
    }

    // --------------------------------------------------------
    // EMAIL
    // --------------------------------------------------------

    if (!EMAIL_REGEX.test(email)) {
      return res.status(422).json({
        success: false,

        message: "Email không hợp lệ.",
      });
    }

    // --------------------------------------------------------
    // PASSWORD
    // --------------------------------------------------------

    if (password.length < 8 || password.length > 72) {
      return res.status(422).json({
        success: false,

        message: "Mật khẩu phải có từ 8 đến 72 ký tự.",
      });
    }

    // --------------------------------------------------------
    // PHONE
    // --------------------------------------------------------

    if (phone && !PHONE_REGEX.test(phone)) {
      return res.status(422).json({
        success: false,

        message: "Số điện thoại không hợp lệ.",
      });
    }

    // --------------------------------------------------------
    // DATE
    // --------------------------------------------------------

    if (birthDate === undefined) {
      return res.status(422).json({
        success: false,

        message: "Ngày sinh không hợp lệ.",
      });
    }

    // --------------------------------------------------------
    // GENDER
    // --------------------------------------------------------

    if (gender === undefined) {
      return res.status(422).json({
        success: false,

        message: "Giới tính không hợp lệ.",
      });
    }

    // --------------------------------------------------------
    // STATUS
    // --------------------------------------------------------

    if (status === undefined || status === null) {
      return res.status(422).json({
        success: false,

        message: "Trạng thái không hợp lệ.",
      });
    }

    // --------------------------------------------------------
    // EMAIL DUPLICATE
    // --------------------------------------------------------

    const existingUser = await User.findByEmail(email);

    if (existingUser) {
      return res.status(409).json({
        success: false,

        message: "Email này đã tồn tại trong hệ thống.",
      });
    }

    // --------------------------------------------------------
    // ROLE DB
    // --------------------------------------------------------

    const role = await User.findRoleByCode(roleCode);

    if (!role) {
      return res.status(422).json({
        success: false,

        message: `Vai trò ${roleCode} không tồn tại hoặc đã bị vô hiệu hóa.`,
      });
    }

    // --------------------------------------------------------
    // PASSWORD HASH
    // --------------------------------------------------------

    const passwordHash = await bcrypt.hash(password, 12);

    // --------------------------------------------------------
    // CREATE
    // --------------------------------------------------------

    const user = await User.createUser({
      roleId: role.id,

      fullName,

      email,

      phone,

      passwordHash,

      avatar: normalizeOptionalString(req.body.avatar),

      address: normalizeOptionalString(req.body.address),

      birthDate,

      gender,

      status,
    });

    return res.status(201).json({
      success: true,

      message: "Thêm người dùng thành công.",

      data: {
        user: formatUser(user),
      },
    });
  } catch (error) {
    if (error?.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,

        message: "Email đã tồn tại.",
      });
    }

    return next(error);
  }
}

// ============================================================
// UPDATE USER PROFILE
// ============================================================

async function updateUser(req, res, next) {
  try {
    // --------------------------------------------------------
    // TARGET
    // --------------------------------------------------------

    const userId = parseUserId(req.params.id);

    if (!userId) {
      return res.status(422).json({
        success: false,

        message: "Mã người dùng không hợp lệ.",
      });
    }

    const target = await User.findById(userId);

    if (!target) {
      return res.status(404).json({
        success: false,

        message: "Không tìm thấy người dùng.",
      });
    }

    // --------------------------------------------------------
    // PERMISSION
    // --------------------------------------------------------

    if (!canManage(req.user, target)) {
      return denyManage(res);
    }

    // --------------------------------------------------------
    // DATA
    // --------------------------------------------------------

    const fullName = String(req.body.fullName ?? target.full_name ?? "").trim();

    const email = String(req.body.email ?? target.email ?? "")
      .trim()
      .toLowerCase();

    const phone =
      req.body.phone === undefined
        ? target.phone || null
        : normalizePhone(req.body.phone);

    const birthDate =
      req.body.birthDate === undefined
        ? target.birth_date_value || null
        : normalizeBirthDate(req.body.birthDate);

    const gender =
      req.body.gender === undefined
        ? target.gender || null
        : normalizeGender(req.body.gender);

    // --------------------------------------------------------
    // VALIDATION NAME
    // --------------------------------------------------------

    if (fullName.length < 2 || fullName.length > 255) {
      return res.status(422).json({
        success: false,

        message: "Họ tên phải có từ 2 đến 255 ký tự.",
      });
    }

    // --------------------------------------------------------
    // VALIDATION EMAIL
    // --------------------------------------------------------

    if (!EMAIL_REGEX.test(email)) {
      return res.status(422).json({
        success: false,

        message: "Email không hợp lệ.",
      });
    }

    // --------------------------------------------------------
    // VALIDATION PHONE
    // --------------------------------------------------------

    if (phone && !PHONE_REGEX.test(phone)) {
      return res.status(422).json({
        success: false,

        message: "Số điện thoại không hợp lệ.",
      });
    }

    // --------------------------------------------------------
    // VALIDATION BIRTH DATE
    // --------------------------------------------------------

    if (birthDate === undefined) {
      return res.status(422).json({
        success: false,

        message: "Ngày sinh không hợp lệ.",
      });
    }

    // --------------------------------------------------------
    // VALIDATION GENDER
    // --------------------------------------------------------

    if (gender === undefined) {
      return res.status(422).json({
        success: false,

        message: "Giới tính không hợp lệ.",
      });
    }

    // --------------------------------------------------------
    // EMAIL DUPLICATE
    // --------------------------------------------------------

    const owner = await User.findByEmail(email);

    if (owner && Number(owner.id) !== userId) {
      return res.status(409).json({
        success: false,

        message: "Email đã được sử dụng.",
      });
    }

    // --------------------------------------------------------
    // IMPORTANT:
    // Preserve structured address if FE does not send it.
    // --------------------------------------------------------

    const provinceCode =
      req.body.provinceCode === undefined
        ? target.province_code || null
        : normalizeOptionalString(req.body.provinceCode);

    const provinceName =
      req.body.provinceName === undefined
        ? target.province_name || null
        : normalizeOptionalString(req.body.provinceName);

    const wardCode =
      req.body.wardCode === undefined
        ? target.ward_code || null
        : normalizeOptionalString(req.body.wardCode);

    const wardName =
      req.body.wardName === undefined
        ? target.ward_name || null
        : normalizeOptionalString(req.body.wardName);

    const streetAddress =
      req.body.streetAddress === undefined
        ? target.street_address || null
        : normalizeOptionalString(req.body.streetAddress);

    const address =
      req.body.address === undefined
        ? target.address || null
        : normalizeOptionalString(req.body.address);

    const avatar =
      req.body.avatar === undefined
        ? target.avatar || null
        : normalizeOptionalString(req.body.avatar);

    // --------------------------------------------------------
    // UPDATE
    // --------------------------------------------------------

    const user = await User.updateUserProfile({
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
    });

    if (!user) {
      return res.status(404).json({
        success: false,

        message: "Không tìm thấy người dùng.",
      });
    }

    return res.status(200).json({
      success: true,

      message: "Cập nhật người dùng thành công.",

      data: {
        user: formatUser(user),
      },
    });
  } catch (error) {
    if (error?.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,

        message: "Email đã được sử dụng.",
      });
    }

    return next(error);
  }
}

// ============================================================
// UPDATE ROLE
// SUPER_ADMIN only - route đã bảo vệ bằng requireSuperAdmin.
// ============================================================

async function updateUserRole(req, res, next) {
  try {
    const userId = parseUserId(req.params.id);

    if (!userId) {
      return res.status(422).json({
        success: false,

        message: "Mã người dùng không hợp lệ.",
      });
    }

    const roleCode = normalizeRole(req.body.role);

    if (!ASSIGNABLE_ROLES.has(roleCode)) {
      return res.status(422).json({
        success: false,

        message: "Chỉ được đổi vai trò giữa CUSTOMER và ADMIN.",
      });
    }

    const target = await User.findById(userId);

    if (!target) {
      return res.status(404).json({
        success: false,

        message: "Không tìm thấy người dùng.",
      });
    }

    if (!canManage(req.user, target)) {
      return denyManage(res);
    }

    // --------------------------------------------------------
    // NO CHANGE
    // --------------------------------------------------------

    if (roleCodeOf(target) === roleCode) {
      return res.status(200).json({
        success: true,

        message: "Vai trò người dùng không thay đổi.",

        data: {
          user: formatUser(target),
        },
      });
    }

    // --------------------------------------------------------
    // ROLE DB
    // --------------------------------------------------------

    const role = await User.findRoleByCode(roleCode);

    if (!role) {
      return res.status(422).json({
        success: false,

        message: `Vai trò ${roleCode} không tồn tại hoặc đã bị vô hiệu hóa.`,
      });
    }

    // --------------------------------------------------------
    // UPDATE
    // --------------------------------------------------------

    const user = await User.updateRole(userId, role.id);

    if (!user) {
      return res.status(404).json({
        success: false,

        message: "Không tìm thấy người dùng.",
      });
    }

    return res.status(200).json({
      success: true,

      message:
        roleCode === "ADMIN"
          ? "Đã cấp quyền quản trị viên."
          : "Đã chuyển tài khoản về khách hàng.",

      data: {
        user: formatUser(user),
      },
    });
  } catch (error) {
    return next(error);
  }
}

// ============================================================
// UPDATE STATUS
// ============================================================

async function updateUserStatus(req, res, next) {
  try {
    const userId = parseUserId(req.params.id);

    if (!userId) {
      return res.status(422).json({
        success: false,

        message: "Mã người dùng không hợp lệ.",
      });
    }

    const status = normalizeStatus(req.body.status);

    if (status === undefined || status === null) {
      return res.status(422).json({
        success: false,

        message: "Trạng thái không hợp lệ.",
      });
    }

    const target = await User.findById(userId);

    if (!target) {
      return res.status(404).json({
        success: false,

        message: "Không tìm thấy người dùng.",
      });
    }

    if (!canManage(req.user, target)) {
      return denyManage(res);
    }

    // --------------------------------------------------------
    // SAME STATUS
    // --------------------------------------------------------

    if (Number(target.status) === status) {
      return res.status(200).json({
        success: true,

        message:
          status === 1 ? "Tài khoản đang hoạt động." : "Tài khoản đã bị khóa.",

        data: {
          user: formatUser(target),
        },
      });
    }

    const user = await User.updateStatus(userId, status);

    if (!user) {
      return res.status(404).json({
        success: false,

        message: "Không tìm thấy người dùng.",
      });
    }

    return res.status(200).json({
      success: true,

      message: status === 1 ? "Đã mở khóa tài khoản." : "Đã khóa tài khoản.",

      data: {
        user: formatUser(user),
      },
    });
  } catch (error) {
    return next(error);
  }
}

// ============================================================
// DELETE USER
// ============================================================

async function deleteUser(req, res, next) {
  try {
    const userId = parseUserId(req.params.id);

    if (!userId) {
      return res.status(422).json({
        success: false,

        message: "Mã người dùng không hợp lệ.",
      });
    }

    const target = await User.findById(userId);

    if (!target) {
      return res.status(404).json({
        success: false,

        message: "Không tìm thấy người dùng.",
      });
    }

    if (!canManage(req.user, target)) {
      return denyManage(res);
    }

    const deleted = await User.softDelete(userId);

    if (!deleted) {
      return res.status(404).json({
        success: false,

        message: "Không tìm thấy người dùng hoặc tài khoản đã bị xóa.",
      });
    }

    return res.status(200).json({
      success: true,

      message: "Xóa người dùng thành công.",
    });
  } catch (error) {
    return next(error);
  }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  getUsers,

  getUserById,

  createUser,

  updateUser,

  updateUserRole,

  updateUserStatus,

  deleteUser,
};
