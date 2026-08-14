const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Tạo thư mục uploads/posts nếu chưa có
const uploadPath = path.join(__dirname, "../uploads/posts");

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

// Cấu hình nơi lưu ảnh
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadPath);
  },

  filename(req, file, cb) {
    const ext = path.extname(file.originalname);

    cb(null, "post-" + Date.now() + ext);
  },
});

// Chỉ cho upload ảnh
const fileFilter = (req, file, cb) => {
  const allow = ["image/jpeg", "image/png", "image/jpg", "image/webp"];

  if (allow.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Chỉ được upload ảnh"), false);
  }
};

module.exports = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
});