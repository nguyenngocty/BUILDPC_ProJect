const express = require("express");

const postController = require("../../controllers/client/postController");

const router = express.Router();

// ============================================================
// CLIENT POST ROUTES
// ============================================================

// ------------------------------------------------------------
// DANH SÁCH BÀI VIẾT
//
// GET /api/client/posts
// ------------------------------------------------------------

router.get("/", postController.getPosts);

// ------------------------------------------------------------
// DANH MỤC BÀI VIẾT
//
// GET /api/client/posts/categories
//
// QUAN TRỌNG:
// Route này phải nằm trước /:id
// ------------------------------------------------------------

router.get("/categories", postController.getPostCategories);

// ------------------------------------------------------------
// CHI TIẾT THEO SLUG
//
// GET /api/client/posts/slug/:slug
//
// Cũng phải nằm trước /:id
// ------------------------------------------------------------

router.get("/slug/:slug", postController.getPostBySlug);

// ------------------------------------------------------------
// CHI TIẾT THEO ID
//
// GET /api/client/posts/:id
//
// Route động để cuối cùng.
// ------------------------------------------------------------

router.get("/:id", postController.getPostById);

module.exports = router;
