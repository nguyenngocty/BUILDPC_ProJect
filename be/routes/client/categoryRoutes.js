const express = require("express");
const controller = require("../../controllers/client/categoryController");

const router = express.Router();

router.get("/", controller.getAllCategories);

module.exports = router;
