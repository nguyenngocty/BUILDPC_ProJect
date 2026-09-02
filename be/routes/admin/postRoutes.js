const express = require("express");

const controller = require("../../controllers/admin/postController");

const upload = require("../../middlewares/uploadPost");

const router = express.Router();

// ============================================================
// UPLOAD
//
// Phải đặt trước /:id
// ============================================================

router.post("/upload", upload.single("thumbnail"), controller.uploadThumbnail);

router.post("/upload-image", upload.single("image"), controller.uploadImage);

// ============================================================
// TRASH
// ============================================================

router.get("/trash", controller.getTrashPosts);

// ============================================================
// LIST
// ============================================================

router.get("/", controller.getAllPosts);

// ============================================================
// DETAIL
// ============================================================

router.get("/:id", controller.getPostById);

// ============================================================
// CREATE
// ============================================================

router.post("/", controller.createPost);

// ============================================================
// UPDATE
// ============================================================

router.put("/:id", controller.updatePost);

router.patch("/:id", controller.updatePost);

// ============================================================
// STATUS
// ============================================================

router.patch("/:id/toggle-status", controller.togglePostStatus);

// ============================================================
// FEATURED
// ============================================================

router.patch("/:id/toggle-featured", controller.togglePostFeatured);

// ============================================================
// RESTORE
// ============================================================

router.patch("/:id/restore", controller.restorePost);

// ============================================================
// DELETE
// ============================================================

router.delete("/:id", controller.deletePost);

module.exports = router;
