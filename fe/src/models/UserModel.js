export const PAGE_SIZE = 5;

export const PROFILE_MIN_AGE = 15;

export const EMPTY_STATISTICS = {
  total: 0,
  active: 0,
  admin: 0,
  superAdmin: 0,
  blocked: 0,
};

export const EMPTY_PAGINATION = {
  page: 1,
  limit: PAGE_SIZE,
  total: 0,
  totalPages: 1,
  startResult: 0,
  endResult: 0,
};

export const EMPTY_ADD_FORM = {
  fullName: "",
  email: "",
  password: "",
  confirmPassword: "",
  phone: "",
  address: "",
  birthDate: "",
  gender: "",
  role: "customer",
  status: "active",
};

export const EMPTY_PROFILE_FORM = {
  fullName: "",
  email: "",
  phone: "",
  birthDate: "",
  provinceCode: "",
  provinceName: "",
  wardCode: "",
  wardName: "",
  streetAddress: "",
};

export const EMPTY_CHANGE_PASSWORD_FORM = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export const EMPTY_FORGOT_PASSWORD_FORM = {
  email: "",
};

export const EMPTY_RESET_PASSWORD_FORM = {
  token: "",
  newPassword: "",
  confirmPassword: "",
};

export function createProfileForm(user = {}) {
  const source = user || {};

  return {
    fullName:
      source.fullName || source.name || "",

    email: source.email || "",
    phone: source.phone || "",
    birthDate: source.birthDate || "",

    provinceCode: String(
      source.provinceCode ||
        source.province_code ||
        ""
    ),

    provinceName:
      source.provinceName ||
      source.province_name ||
      "",

    wardCode: String(
      source.wardCode ||
        source.ward_code ||
        ""
    ),

    wardName:
      source.wardName ||
      source.ward_name ||
      "",

    streetAddress:
      source.streetAddress ||
      source.street_address ||
      source.address ||
      "",
  };
}

export function getMaximumBirthDate(
  minimumAge = PROFILE_MIN_AGE
) {
  const today = new Date();

  const maximumDate = new Date(
    today.getFullYear() - Number(minimumAge),
    today.getMonth(),
    today.getDate()
  );

  return [
    maximumDate.getFullYear(),
    String(
      maximumDate.getMonth() + 1
    ).padStart(2, "0"),
    String(maximumDate.getDate()).padStart(
      2,
      "0"
    ),
  ].join("-");
}

export function normalizeVietnamPhone(
  value = ""
) {
  let phone = String(value)
    .trim()
    .replace(/[\s.\-()]/g, "");

  if (phone.startsWith("+84")) {
    phone = `0${phone.slice(3)}`;
  }

  return phone;
}

export function validateProfileForm(
  formData = {}
) {
  const errors = {};

  const fullName = String(
    formData.fullName || ""
  ).trim();

  const email = normalizeEmail(
    formData.email
  );

  const phone = normalizeVietnamPhone(
    formData.phone
  );

  const birthDate = String(
    formData.birthDate || ""
  ).trim();

  const provinceCode = String(
    formData.provinceCode || ""
  ).trim();

  const provinceName = String(
    formData.provinceName || ""
  ).trim();

  const wardCode = String(
    formData.wardCode || ""
  ).trim();

  const wardName = String(
    formData.wardName || ""
  ).trim();

  const streetAddress = String(
    formData.streetAddress || ""
  ).trim();

  if (
    fullName.length < 2 ||
    fullName.length > 255
  ) {
    errors.fullName =
      "Họ tên phải có từ 2 đến 255 ký tự.";
  }

  if (
    !isValidEmail(email) ||
    email.length > 255
  ) {
    errors.email =
      "Email không hợp lệ. Đuôi tên miền phải có ít nhất 2 ký tự.";
  }

  if (!phone) {
    errors.phone =
      "Vui lòng nhập số điện thoại.";
  } else if (!/^0[35789]\d{8}$/.test(phone)) {
    errors.phone =
      "Số điện thoại Việt Nam phải có 10 số và bắt đầu bằng 03, 05, 07, 08 hoặc 09.";
  }

  if (birthDate) {
    if (!isValidDateString(birthDate)) {
      errors.birthDate =
        "Ngày sinh không hợp lệ.";
    } else if (
      birthDate > getMaximumBirthDate()
    ) {
      errors.birthDate =
        `Bạn phải từ đủ ${PROFILE_MIN_AGE} tuổi trở lên.`;
    }
  }

  if (!provinceCode || !provinceName) {
    errors.provinceCode =
      "Vui lòng chọn Tỉnh/Thành phố.";
  }

  if (!wardCode || !wardName) {
    errors.wardCode =
      "Vui lòng chọn Phường/Xã/Đặc khu.";
  }

  if (!streetAddress) {
    errors.streetAddress =
      "Vui lòng nhập đường và số nhà.";
  } else if (
    streetAddress.length < 3 ||
    streetAddress.length > 255
  ) {
    errors.streetAddress =
      "Đường và số nhà phải có từ 3 đến 255 ký tự.";
  }

  return errors;
}

export function createProfilePayload(
  formData = {}
) {
  const normalizedForm = {
    fullName: String(
      formData.fullName || ""
    ).trim(),

    email: normalizeEmail(
      formData.email
    ),

    phone: normalizeVietnamPhone(
      formData.phone
    ),

    birthDate: String(
      formData.birthDate || ""
    ).trim(),

    provinceCode: String(
      formData.provinceCode || ""
    ).trim(),

    provinceName: String(
      formData.provinceName || ""
    ).trim(),

    wardCode: String(
      formData.wardCode || ""
    ).trim(),

    wardName: String(
      formData.wardName || ""
    ).trim(),

    streetAddress: String(
      formData.streetAddress || ""
    ).trim(),
  };

  const fieldErrors =
    validateProfileForm(normalizedForm);

  if (
    Object.keys(fieldErrors).length > 0
  ) {
    const error = new Error(
      Object.values(fieldErrors)[0]
    );

    error.fieldErrors = fieldErrors;

    throw error;
  }

  return {
    ...normalizedForm,
    birthDate:
      normalizedForm.birthDate || null,
  };
}

export function createChangePasswordPayload(
  formData = {}
) {
  const currentPassword = String(
    formData.currentPassword || ""
  );

  const newPassword = String(
    formData.newPassword || ""
  );

  const confirmPassword = String(
    formData.confirmPassword || ""
  );

  if (
    !currentPassword ||
    !newPassword ||
    !confirmPassword
  ) {
    throw new Error(
      "Vui lòng nhập đầy đủ thông tin đổi mật khẩu."
    );
  }

  if (
    newPassword.length < 8 ||
    newPassword.length > 72
  ) {
    throw new Error(
      "Mật khẩu mới phải có từ 8 đến 72 ký tự."
    );
  }

  if (newPassword === currentPassword) {
    throw new Error(
      "Mật khẩu mới phải khác mật khẩu hiện tại."
    );
  }

  if (newPassword !== confirmPassword) {
    throw new Error(
      "Xác nhận mật khẩu mới không khớp."
    );
  }

  return {
    currentPassword,
    newPassword,
    confirmPassword,
  };
}

export function createForgotPasswordPayload(
  formData = {}
) {
  const input =
    typeof formData === "string"
      ? formData
      : formData.email;

  const email = normalizeEmail(input);

  if (!email) {
    throw new Error(
      "Vui lòng nhập email tài khoản."
    );
  }

  if (!isValidEmail(email)) {
    throw new Error(
      "Email không đúng định dạng."
    );
  }

  return {
    email,
  };
}

export function createResetPasswordPayload(
  formData = {}
) {
  const token = String(
    formData.token || ""
  ).trim();

  const newPassword = String(
    formData.newPassword || ""
  );

  const confirmPassword = String(
    formData.confirmPassword || ""
  );

  if (!token) {
    throw new Error(
      "Liên kết đặt lại mật khẩu không hợp lệ."
    );
  }

  if (token.length > 512) {
    throw new Error(
      "Mã đặt lại mật khẩu không hợp lệ."
    );
  }

  if (
    !newPassword ||
    !confirmPassword
  ) {
    throw new Error(
      "Vui lòng nhập đầy đủ mật khẩu mới."
    );
  }

  if (
    newPassword.length < 8 ||
    newPassword.length > 72
  ) {
    throw new Error(
      "Mật khẩu mới phải có từ 8 đến 72 ký tự."
    );
  }

  if (newPassword !== confirmPassword) {
    throw new Error(
      "Xác nhận mật khẩu mới không khớp."
    );
  }

  return {
    token,
    newPassword,
    confirmPassword,
  };
}

export function getInitials(
  fullName = ""
) {
  const words = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "US";
  }

  return words
    .slice(-2)
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase();
}

export function getRoleLabel(role) {
  const labels = {
    customer: "Khách hàng",
    admin: "Quản trị viên",
    super_admin: "Quản trị viên cấp cao",
  };

  return (
    labels[
      String(role || "").toLowerCase()
    ] || "Khách hàng"
  );
}

export const ROLE_LEVEL = Object.freeze({
  CUSTOMER: 1,
  ADMIN: 2,
  SUPER_ADMIN: 3,
});

export function canManageUser(
  currentUser,
  targetUser
) {
  if (
    !currentUser ||
    !targetUser ||
    Number(currentUser.id) ===
      Number(targetUser.id)
  ) {
    return false;
  }

  const actorLevel =
    ROLE_LEVEL[
      String(
        currentUser.roleCode || ""
      ).toUpperCase()
    ] || 0;

  const targetLevel =
    ROLE_LEVEL[
      String(
        targetUser.roleCode || ""
      ).toUpperCase()
    ] || 0;

  return actorLevel > targetLevel;
}

export function canChangeUserRole(
  currentUser,
  targetUser
) {
  return (
    String(
      currentUser?.roleCode || ""
    ).toUpperCase() ===
      "SUPER_ADMIN" &&
    canManageUser(
      currentUser,
      targetUser
    )
  );
}

export function getStatusLabel(status) {
  return status === "active"
    ? "Hoạt động"
    : "Đã khóa";
}

export function formatCurrency(value) {
  return (
    `${Number(value || 0).toLocaleString(
      "vi-VN"
    )} ₫`
  );
}

export function createOptimisticRoleUser(
  user,
  nextRole
) {
  const normalizedRole = String(
    nextRole || "customer"
  ).toLowerCase();

  const roleCode =
    normalizedRole === "admin"
      ? "ADMIN"
      : "CUSTOMER";

  return {
    ...user,
    role: normalizedRole,
    roleCode,
    roleName:
      getRoleLabel(normalizedRole),

    roleLabel:
      getRoleLabel(normalizedRole),
  };
}

export function createOptimisticStatusUser(
  user,
  nextStatus
) {
  const isActive =
    nextStatus === "active";

  return {
    ...user,
    status: nextStatus,
    statusValue: isActive ? 1 : 0,
    statusLabel: isActive
      ? "Hoạt động"
      : "Đã khóa",
  };
}

function normalizeEmail(email = "") {
  return String(email)
    .trim()
    .toLowerCase();
}

function isValidEmail(email) {
  const emailRegex =
    /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,63}$/i;

  return (
    email.length <= 255 &&
    !email.includes("..") &&
    emailRegex.test(email)
  );
}

function isValidDateString(value) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false;
  }

  const [year, month, day] = value
    .split("-")
    .map(Number);

  const date = new Date(
    Date.UTC(year, month - 1, day)
  );

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function createLoginPayload(
  loginData = {}
) {
  const email = normalizeEmail(
    loginData.email
  );

  const password =
    loginData.password || "";

  if (!email || !password.trim()) {
    throw new Error(
      "Vui lòng nhập đầy đủ email và mật khẩu."
    );
  }

  if (!isValidEmail(email)) {
    throw new Error(
      "Email không đúng định dạng."
    );
  }

  return {
    email,
    password,
    remember:
      Boolean(loginData.remember),
  };
}

export function createRegisterPayload(
  registerData = {}
) {
  const fullName =
    registerData.name?.trim() || "";

  const email = normalizeEmail(
    registerData.email
  );

  const password =
    registerData.password || "";

  const confirmPassword =
    registerData.confirmPassword || "";

  if (
    !fullName ||
    !email ||
    !password.trim() ||
    !confirmPassword.trim()
  ) {
    throw new Error(
      "Vui lòng nhập đầy đủ thông tin đăng ký."
    );
  }

  if (fullName.length < 2) {
    throw new Error(
      "Họ và tên phải có ít nhất 2 ký tự."
    );
  }

  if (!isValidEmail(email)) {
    throw new Error(
      "Email không đúng định dạng."
    );
  }

  if (
    password.length < 8 ||
    password.length > 72
  ) {
    throw new Error(
      "Mật khẩu phải có từ 8 đến 72 ký tự."
    );
  }

  if (password !== confirmPassword) {
    throw new Error(
      "Mật khẩu nhập lại không khớp."
    );
  }

  return {
    fullName,
    email,
    password,
  };
}