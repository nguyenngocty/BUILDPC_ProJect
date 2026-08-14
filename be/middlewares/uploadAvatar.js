// V3: middleware tải avatar client/admin JPG/PNG/WebP tối đa 2 MB.
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const avatarDirectory = path.join(__dirname, "../uploads/avatars");
fs.mkdirSync(avatarDirectory, { recursive: true });

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const storage = multer.diskStorage({
  destination(req, file, callback) {
    callback(null, avatarDirectory);
  },
  filename(req, file, callback) {
    const extension = path.extname(file.originalname).toLowerCase();
    const safeExtension = [".jpg", ".jpeg", ".png", ".webp"].includes(extension)
      ? extension
      : ".jpg";

    callback(
      null,
      `avatar-${Number(req.user.id)}-${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExtension}`
    );
  },
});

const uploader = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter(req, file, callback) {
    if (!allowedMimeTypes.has(file.mimetype)) {
      const error = new Error("Ảnh đại diện chỉ nhận JPG, PNG hoặc WebP.");
      error.statusCode = 422;
      return callback(error);
    }

    return callback(null, true);
  },
});

function uploadAvatar(req, res, next) {
  uploader.single("avatar")(req, res, (error) => {
    if (!error) return next();

    if (error.code === "LIMIT_FILE_SIZE") {
      error.message = "Ảnh đại diện không được vượt quá 2 MB.";
      error.statusCode = 422;
    }

    return next(error);
  });
}

module.exports = { uploadAvatar };