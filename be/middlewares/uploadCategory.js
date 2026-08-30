const multer = require("multer");

const path = require("path");

const fs = require("fs");

// ============================================================
// UPLOAD DIRECTORY
// ============================================================

const uploadPath = path.join(__dirname, "../uploads/categories");

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, {
    recursive: true,
  });
}

// ============================================================
// ALLOWED IMAGE TYPES
// ============================================================

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const EXTENSION_BY_MIME = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

// ============================================================
// STORAGE
// ============================================================

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadPath);
  },

  filename(req, file, cb) {
    const extension = EXTENSION_BY_MIME[file.mimetype] || ".jpg";

    const uniqueName = [
      "category",
      Date.now(),
      Math.round(Math.random() * 1e9),
    ].join("-");

    cb(null, `${uniqueName}${extension}`);
  },
});

// ============================================================
// FILE FILTER
// ============================================================

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    const error = new Error("Ảnh danh mục chỉ hỗ trợ JPG, PNG hoặc WEBP.");

    error.statusCode = 422;

    return cb(error);
  }

  return cb(null, true);
}

// ============================================================
// MULTER
// ============================================================

const uploadCategory = multer({
  storage,

  fileFilter,

  limits: {
    fileSize: 5 * 1024 * 1024,

    files: 1,
  },
});

module.exports = uploadCategory;
