const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bannerController = require('../../controllers/admin/bannerController');

const router = express.Router();

const uploadDir = path.join(process.cwd(), 'uploads', 'banners');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `banner-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, filename);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new Error('Chỉ cho phép upload ảnh JPG, PNG hoặc WEBP'), false);
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

router.get('/', bannerController.getBanners);
router.get('/:id', bannerController.getBannerById);
router.post('/', upload.single('image'), bannerController.createBanner);
router.put('/:id', upload.single('image'), bannerController.updateBanner);
router.patch('/:id/toggle-status', bannerController.toggleBannerStatus);
router.patch('/sort-order/bulk', bannerController.updateBannerSortOrder);
router.delete('/:id', bannerController.deleteBanner);

module.exports = router;