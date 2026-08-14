const Category = require("../../models/Category");

exports.getAllCategories = async (req, res, next) => {
  try {
    const categories = await Category.getClientCategories();

    return res.status(200).json({
      success: true,
      message: "Lấy danh mục sản phẩm thành công.",
      data: categories,
    });
  } catch (error) {
    return next(error);
  }
};
