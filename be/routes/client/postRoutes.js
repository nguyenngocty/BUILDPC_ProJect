const express = require("express");
const router = express.Router();

const postController = require("../../controllers/client/postController");

console.log(">>> postRoutes loaded");
console.log(postController);

router.get("/", postController.getPosts);
router.get("/:id", postController.getPostById);

module.exports = router;