const multer = require("multer");
const path = require("path");

// =========================
// Storage
// =========================
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, "uploads/products");
  },

  filename(req, file, cb) {
    const ext = path.extname(file.originalname);

    const fileName = Date.now() + "-" + Math.round(Math.random() * 1e9) + ext;

    cb(null, fileName);
  },
});

// =========================
// Chỉ cho phép upload ảnh
// =========================
const fileFilter = (req, file, cb) => {
  const allowTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

  if (allowTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Chỉ được upload file ảnh."));
  }
};

// =========================
// Upload
// =========================
const uploadProduct = multer({
  storage,

  fileFilter,

  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

module.exports = uploadProduct;
