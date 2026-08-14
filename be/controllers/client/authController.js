// V5: validate hồ sơ, tuổi tối thiểu 15 và địa chỉ hành chính 2 cấp.
const bcrypt = require("bcryptjs");

const User = require("../../models/User");
const PasswordResetToken = require("../../models/PasswordResetToken");

const { createAccessToken } = require("../../utils/jwt");
const { formatAuthUser } = require("../../utils/authUser");
const {
  sendPasswordResetMail,
} = require("../../utils/mailer");

const {
  generatePasswordResetToken,
  hashPasswordResetToken,
  getPasswordResetExpiresAt,
  getPasswordResetExpiresMinutes,
  getPasswordResetCooldownSeconds,
  buildPasswordResetUrl,
} = require("../../utils/passwordReset");
const {
  validateAdministrativeAddress,
} = require("../../utils/location");

const EMAIL_REGEX =
  /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,63}$/i;

const PHONE_REGEX = /^0[35789]\d{8}$/;
const MINIMUM_AGE = 15;

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(value) {
  const email = normalizeEmail(value);

  return (
    email.length <= 255 &&
    !email.includes("..") &&
    EMAIL_REGEX.test(email)
  );
}

function normalizePhone(value) {
  let phone = String(value || "")
    .trim()
    .replace(/[\s.\-()]/g, "");

  if (phone.startsWith("+84")) {
    phone = `0${phone.slice(3)}`;
  }

  return phone;
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
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

function maximumBirthDate(minimumAge = MINIMUM_AGE) {
  const today = new Date();
  const date = new Date(
    Date.UTC(
      today.getUTCFullYear() - minimumAge,
      today.getUTCMonth(),
      today.getUTCDate()
    )
  );

  return date.toISOString().slice(0, 10);
}

function validateBirthDate(value) {
  if (!value) {
    return null;
  }

  if (!isValidDate(value)) {
    return "Ngày sinh không hợp lệ.";
  }

  if (value > maximumBirthDate()) {
    return `Bạn phải từ đủ ${MINIMUM_AGE} tuổi trở lên.`;
  }

  return null;
}

function composeAddress({
  streetAddress,
  wardName,
  provinceName,
}) {
  return [
    streetAddress,
    wardName,
    provinceName,
  ]
    .filter(Boolean)
    .join(", ");
}

async function register(req, res, next) {
  try {
    const fullName = String(
      req.body.fullName || req.body.name || ""
    ).trim();

    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");

    if (
      fullName.length < 2 ||
      fullName.length > 255
    ) {
      return res.status(422).json({
        success: false,
        message:
          "Họ tên phải có từ 2 đến 255 ký tự.",
      });
    }

    if (!isValidEmail(email)) {
      return res.status(422).json({
        success: false,
        message:
          "Email không hợp lệ. Đuôi tên miền phải có ít nhất 2 ký tự.",
      });
    }

    if (
      password.length < 8 ||
      password.length > 72
    ) {
      return res.status(422).json({
        success: false,
        message:
          "Mật khẩu phải có từ 8 đến 72 ký tự.",
      });
    }

    if (await User.findByEmail(email)) {
      return res.status(409).json({
        success: false,
        message:
          "Email này đã tồn tại trong hệ thống.",
      });
    }

    const customerRole =
      await User.findRoleByCode("CUSTOMER");

    if (!customerRole) {
      return res.status(500).json({
        success: false,
        message:
          "Hệ thống chưa cấu hình vai trò CUSTOMER.",
      });
    }

    const passwordHash = await bcrypt.hash(
      password,
      12
    );

    const user = await User.createUser({
      roleId: customerRole.id,
      fullName,
      email,
      phone: null,
      passwordHash,
      avatar: null,
      address: null,
      birthDate: null,
      gender: null,
      status: 1,
    });

    return res.status(201).json({
      success: true,
      message:
        "Đăng ký tài khoản thành công. Bạn có thể đăng nhập ngay.",
      data: {
        user: formatAuthUser(user),
      },
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message:
          "Email này đã tồn tại trong hệ thống.",
      });
    }

    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(422).json({
        success: false,
        message:
          "Vui lòng nhập email và mật khẩu.",
      });
    }

    if (!isValidEmail(email)) {
      return res.status(422).json({
        success: false,
        message: "Email không hợp lệ.",
      });
    }

    const user =
      await User.findByEmailForLogin(email);

    const passwordMatches = user
      ? await bcrypt.compare(password, user.password)
      : false;

    if (!user || !passwordMatches) {
      return res.status(401).json({
        success: false,
        message:
          "Email hoặc mật khẩu không chính xác.",
      });
    }

    if (
      Number(user.status) !== 1 ||
      Number(user.role_status) !== 1
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Tài khoản đã bị khóa hoặc vai trò không còn hoạt động.",
      });
    }

    await User.updateLastLogin(user.id);

    const refreshedUser = await User.findById(
      user.id
    );

    const accessToken =
      createAccessToken(refreshedUser);

    return res.status(200).json({
      success: true,
      message: "Đăng nhập thành công.",
      data: {
        accessToken,
        user: formatAuthUser(refreshedUser),
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function forgotPassword(
  req,
  res,
  next
) {
  try {
    const email = normalizeEmail(
      req.body.email
    );

    if (!isValidEmail(email)) {
      return res.status(422).json({
        success: false,
        message:
          "Email không đúng định dạng.",
      });
    }

    const owner = await User.findByEmail(
      email
    );

    if (!owner) {
      return res.status(404).json({
        success: false,
        message:
          "Không tìm thấy tài khoản với email này.",
      });
    }

    const user = await User.findById(
      owner.id
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "Không tìm thấy tài khoản với email này.",
      });
    }

    if (
      Number(user.status) !== 1 ||
      Number(user.role_status) !== 1
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Tài khoản này hiện đang bị khóa hoặc ngừng hoạt động.",
      });
    }

    const cooldownSeconds =
      getPasswordResetCooldownSeconds();

    const recentlyRequested =
      await PasswordResetToken.hasRecentRequest(
        user.id,
        cooldownSeconds
      );

    if (recentlyRequested) {
      return res.status(200).json({
        success: true,
        message:
          `Liên kết đặt lại mật khẩu đã được gửi đến Gmail ${user.email}. ` +
          "Vui lòng kiểm tra Hộp thư đến hoặc Thư rác.",
      });
    }

    const plainToken =
      generatePasswordResetToken();

    const tokenHash =
      hashPasswordResetToken(plainToken);

    const expiresAt =
      getPasswordResetExpiresAt();

    await PasswordResetToken.invalidateUnusedTokens(
      user.id
    );

    const tokenRecord =
      await PasswordResetToken.createToken({
        userId: user.id,
        tokenHash,
        expiresAt,
      });

    const resetUrl =
      buildPasswordResetUrl(plainToken);

    try {
      const sent =
        await sendPasswordResetMail({
          toEmail: user.email,
          fullName: user.full_name,
          resetUrl,
          expiresInMinutes:
            getPasswordResetExpiresMinutes(),
        });

      if (!sent) {
        await PasswordResetToken.markUsedById(
          tokenRecord.id
        );

        return res.status(500).json({
          success: false,
          message:
            "Không thể gửi email đặt lại mật khẩu. Vui lòng kiểm tra cấu hình Gmail.",
        });
      }
    } catch (mailError) {
      await PasswordResetToken.markUsedById(
        tokenRecord.id
      );

      console.error(
        "[forgot-password] Gửi email thất bại:",
        mailError
      );

      return res.status(502).json({
        success: false,
        message:
          "Không thể gửi email đặt lại mật khẩu. Vui lòng thử lại sau.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        `Đã gửi liên kết đặt lại mật khẩu đến Gmail ${user.email}. ` +
        "Vui lòng kiểm tra Hộp thư đến hoặc Thư rác.",
    });
  } catch (error) {
    return next(error);
  }
}


async function forgotPasswordForCurrentUser(
  req,
  res,
  next
) {
  try {
    const user = req.user;

    if (
      !user ||
      Number(user.status) !== 1 ||
      Number(user.role_status) !== 1
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Tài khoản không có quyền thực hiện thao tác này.",
      });
    }

    const cooldownSeconds =
      getPasswordResetCooldownSeconds();

    const recentlyRequested =
      await PasswordResetToken.hasRecentRequest(
        user.id,
        cooldownSeconds
      );

    const successMessage =
      `Đã gửi liên kết đặt lại mật khẩu đến Gmail ${user.email}. ` +
      "Vui lòng kiểm tra Hộp thư đến hoặc Thư rác.";

    if (recentlyRequested) {
      return res.status(200).json({
        success: true,
        message: successMessage,
      });
    }

    const plainToken =
      generatePasswordResetToken();

    const tokenHash =
      hashPasswordResetToken(plainToken);

    const expiresAt =
      getPasswordResetExpiresAt();

    await PasswordResetToken.invalidateUnusedTokens(
      user.id
    );

    const tokenRecord =
      await PasswordResetToken.createToken({
        userId: user.id,
        tokenHash,
        expiresAt,
      });

    const resetUrl =
      buildPasswordResetUrl(plainToken);

    try {
      const sent =
        await sendPasswordResetMail({
          toEmail: user.email,
          fullName: user.full_name,
          resetUrl,
          expiresInMinutes:
            getPasswordResetExpiresMinutes(),
        });

      if (!sent) {
        await PasswordResetToken.markUsedById(
          tokenRecord.id
        );

        return res.status(500).json({
          success: false,
          message:
            "Không thể gửi email đặt lại mật khẩu. Vui lòng kiểm tra cấu hình Gmail.",
        });
      }
    } catch (mailError) {
      await PasswordResetToken.markUsedById(
        tokenRecord.id
      );

      console.error(
        "[forgot-password-account] Gửi email thất bại:",
        mailError
      );

      return res.status(502).json({
        success: false,
        message:
          "Không thể gửi email đặt lại mật khẩu. Vui lòng thử lại sau.",
      });
    }

    return res.status(200).json({
      success: true,
      message: successMessage,
    });
  } catch (error) {
    return next(error);
  }
}

async function resetPassword(
  req,
  res,
  next
) {
  try {
    const token = String(
      req.body.token || ""
    ).trim();

    const newPassword = String(
      req.body.newPassword || ""
    );

    const confirmPassword = String(
      req.body.confirmPassword || ""
    );

    if (!/^[a-f0-9]{64}$/i.test(token)) {
      return res.status(422).json({
        success: false,
        message:
          "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.",
      });
    }

    if (
      !newPassword ||
      !confirmPassword
    ) {
      return res.status(422).json({
        success: false,
        message:
          "Vui lòng nhập đầy đủ mật khẩu mới.",
      });
    }

    if (
      newPassword.length < 8 ||
      newPassword.length > 72
    ) {
      return res.status(422).json({
        success: false,
        message:
          "Mật khẩu mới phải có từ 8 đến 72 ký tự.",
      });
    }

    if (
      newPassword !== confirmPassword
    ) {
      return res.status(422).json({
        success: false,
        message:
          "Xác nhận mật khẩu mới không khớp.",
      });
    }

    const tokenHash =
      hashPasswordResetToken(token);

    const tokenRecord =
      await PasswordResetToken.findValidByHash(
        tokenHash
      );

    if (
      !tokenRecord ||
      Number(tokenRecord.status) !== 1 ||
      Number(tokenRecord.role_status) !== 1
    ) {
      return res.status(422).json({
        success: false,
        message:
          "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.",
      });
    }

    const sameAsCurrent =
      await bcrypt.compare(
        newPassword,
        tokenRecord.password
      );

    if (sameAsCurrent) {
      return res.status(422).json({
        success: false,
        message:
          "Mật khẩu mới phải khác mật khẩu hiện tại.",
      });
    }

    const passwordHash =
      await bcrypt.hash(
        newPassword,
        12
      );

    const updated =
      await PasswordResetToken.consumeAndUpdatePassword({
        tokenId: tokenRecord.id,
        tokenHash,
        userId: tokenRecord.user_id,
        passwordHash,
      });

    if (!updated) {
      return res.status(422).json({
        success: false,
        message:
          "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.",
    });
  } catch (error) {
    return next(error);
  }
}

function getProfile(req, res) {
  return res.status(200).json({
    success: true,
    message:
      "Lấy hồ sơ người dùng thành công.",
    data: {
      user: formatAuthUser(req.user),
    },
  });
}

async function updateProfile(req, res, next) {
  try {
    const fullName = String(
      req.body.fullName ?? req.user.full_name
    ).trim();

    const email = normalizeEmail(
      req.body.email ?? req.user.email
    );

    const phone = normalizePhone(
      req.body.phone ?? req.user.phone ?? ""
    );

    const avatar = String(
      req.user.avatar || ""
    ).trim();

    const birthDate = String(
      req.body.birthDate ??
        req.user.birth_date_value ??
        ""
    ).trim();

    const provinceCode = String(
      req.body.provinceCode ??
        req.user.province_code ??
        ""
    ).trim();

    const provinceName = String(
      req.body.provinceName ??
        req.user.province_name ??
        ""
    ).trim();

    const wardCode = String(
      req.body.wardCode ??
        req.user.ward_code ??
        ""
    ).trim();

    const wardName = String(
      req.body.wardName ??
        req.user.ward_name ??
        ""
    ).trim();

    const streetAddress = String(
      req.body.streetAddress ??
        req.user.street_address ??
        ""
    ).trim();

    if (
      fullName.length < 2 ||
      fullName.length > 255
    ) {
      return res.status(422).json({
        success: false,
        message:
          "Họ tên phải có từ 2 đến 255 ký tự.",
      });
    }

    if (!isValidEmail(email)) {
      return res.status(422).json({
        success: false,
        message:
          "Email không hợp lệ. Đuôi tên miền phải có ít nhất 2 ký tự.",
      });
    }

    if (!phone) {
      return res.status(422).json({
        success: false,
        message: "Vui lòng nhập số điện thoại.",
      });
    }

    if (!PHONE_REGEX.test(phone)) {
      return res.status(422).json({
        success: false,
        message:
          "Số điện thoại Việt Nam phải có 10 số và bắt đầu bằng 03, 05, 07, 08 hoặc 09.",
      });
    }

    const birthDateError =
      validateBirthDate(birthDate);

    if (birthDateError) {
      return res.status(422).json({
        success: false,
        message: birthDateError,
      });
    }

    if (
      !provinceCode ||
      !provinceName ||
      !wardCode ||
      !wardName
    ) {
      return res.status(422).json({
        success: false,
        message:
          "Vui lòng chọn đầy đủ Tỉnh/Thành phố và Phường/Xã.",
      });
    }

    if (
      !/^\d{1,10}$/.test(provinceCode) ||
      !/^\d{1,10}$/.test(wardCode)
    ) {
      return res.status(422).json({
        success: false,
        message:
          "Mã Tỉnh/Thành phố hoặc Phường/Xã không hợp lệ.",
      });
    }

    if (
      streetAddress.length < 3 ||
      streetAddress.length > 255
    ) {
      return res.status(422).json({
        success: false,
        message:
          "Đường và số nhà phải có từ 3 đến 255 ký tự.",
      });
    }

    if (avatar.length > 255) {
      return res.status(422).json({
        success: false,
        message:
          "Đường dẫn ảnh đại diện vượt quá 255 ký tự.",
      });
    }

    const owner = await User.findByEmail(email);

    if (
      owner &&
      Number(owner.id) !== Number(req.user.id)
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Email này đã được tài khoản khác sử dụng.",
      });
    }

    const verifiedLocation =
      await validateAdministrativeAddress({
        provinceCode,
        provinceName,
        wardCode,
        wardName,
      });

    if (!verifiedLocation.valid) {
      return res.status(422).json({
        success: false,
        message: verifiedLocation.message,
      });
    }

    const address = composeAddress({
      streetAddress,
      wardName: verifiedLocation.wardName,
      provinceName:
        verifiedLocation.provinceName,
    });

    const user = await User.updateUserProfile({
      userId: req.user.id,
      fullName,
      email,
      phone,
      avatar,
      address,
      birthDate: birthDate || null,
      provinceCode:
        verifiedLocation.provinceCode,
      provinceName:
        verifiedLocation.provinceName,
      wardCode: verifiedLocation.wardCode,
      wardName: verifiedLocation.wardName,
      streetAddress,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "Không tìm thấy tài khoản cần cập nhật.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Cập nhật hồ sơ thành công.",
      data: {
        user: formatAuthUser(user),
      },
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message:
          "Email này đã tồn tại trong hệ thống.",
      });
    }

    if (
      error.code ===
      "LOCATION_SERVICE_UNAVAILABLE"
    ) {
      return res.status(503).json({
        success: false,
        message:
          "Dịch vụ địa chỉ hành chính đang bận. Vui lòng thử lại sau.",
      });
    }

    return next(error);
  }
}

async function updateAvatar(req, res, next) {
  try {
    if (!req.file) {
      return res.status(422).json({
        success: false,
        message:
          "Vui lòng chọn ảnh đại diện.",
      });
    }

    const avatarUrl =
      `${req.protocol}://${req.get("host")}` +
      `/uploads/avatars/${req.file.filename}`;

    const user = await User.updateAvatar(
      req.user.id,
      avatarUrl
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "Không tìm thấy tài khoản cần cập nhật ảnh đại diện.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Cập nhật ảnh đại diện thành công.",
      data: {
        user: formatAuthUser(user),
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function changePassword(req, res, next) {
  try {
    const currentPassword = String(
      req.body.currentPassword || ""
    );

    const newPassword = String(
      req.body.newPassword || ""
    );

    const confirmPassword = String(
      req.body.confirmPassword || ""
    );

    if (
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      return res.status(422).json({
        success: false,
        message:
          "Vui lòng nhập đầy đủ thông tin đổi mật khẩu.",
      });
    }

    if (
      newPassword.length < 8 ||
      newPassword.length > 72
    ) {
      return res.status(422).json({
        success: false,
        message:
          "Mật khẩu mới phải có từ 8 đến 72 ký tự.",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(422).json({
        success: false,
        message:
          "Xác nhận mật khẩu mới không khớp.",
      });
    }

    const userWithPassword =
      await User.findByEmailForLogin(
        req.user.email
      );

    const currentPasswordMatches =
      userWithPassword
        ? await bcrypt.compare(
            currentPassword,
            userWithPassword.password
          )
        : false;

    if (!currentPasswordMatches) {
      return res.status(422).json({
        success: false,
        message:
          "Mật khẩu hiện tại không chính xác.",
      });
    }

    const sameAsCurrent = await bcrypt.compare(
      newPassword,
      userWithPassword.password
    );

    if (sameAsCurrent) {
      return res.status(422).json({
        success: false,
        message:
          "Mật khẩu mới phải khác mật khẩu hiện tại.",
      });
    }

    const passwordHash = await bcrypt.hash(
      newPassword,
      12
    );

    const updated = await User.updatePassword(
      req.user.id,
      passwordHash
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message:
          "Không tìm thấy tài khoản cần đổi mật khẩu.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Đổi mật khẩu thành công.",
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  register,
  login,
  forgotPassword,
  forgotPasswordForCurrentUser,
  resetPassword,
  getProfile,
  updateProfile,
  updateAvatar,
  changePassword,
};