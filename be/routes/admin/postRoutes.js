const express = require("express");
const controller = require("../../controllers/admin/postController");
const upload = require("../../middlewares/uploadPost");
const router = express.Router();

router.get("/", controller.getAllPosts);

router.get("/:id", controller.getPostById);

router.post("/", controller.createPost);

router.patch("/:id", controller.updatePost);

router.delete("/:id", controller.deletePost);
router.post(
    "/upload",
    upload.single("thumbnail"),
    controller.uploadThumbnail
);
module.exports = router;