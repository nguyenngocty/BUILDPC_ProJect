const Product = require("../models/Product");
const Category = require("../models/Category");

const validateCreateProduct = async (data) => {
  const errors = {};

  // Category
  if (!Number(data.category_id)) {
    errors.category_id = "Danh mục không được để trống.";
  } else {
    const exists = await Category.exists(data.category_id);

    if (!exists) {
      errors.category_id = "Danh mục không tồn tại.";
    }
  }

  // Name
  if (!data.name || !data.name.trim()) {
    errors.name = "Tên sản phẩm không được để trống.";
  } else if (data.name.trim().length < 3) {
    errors.name = "Tên sản phẩm tối thiểu 3 ký tự.";
  }

  // SKU
  if (!data.sku || !data.sku.trim()) {
    errors.sku = "SKU không được để trống.";
  } else {
    const exists = await Product.isSkuExists(data.sku);

    if (exists) {
      errors.sku = "SKU đã tồn tại.";
    }
  }

  // Price
  if (Number(data.price) <= 0 || Number.isNaN(Number(data.price))) {
    errors.price = "Giá bán không hợp lệ.";
  }

  // Sale Price
  if (
    data.sale_price !== "" &&
    data.sale_price !== null &&
    data.sale_price !== undefined
  ) {
    if (Number(data.sale_price) < 0) {
      errors.sale_price = "Giá khuyến mãi không hợp lệ.";
    }

    if (Number(data.sale_price) > Number(data.price)) {
      errors.sale_price = "Giá khuyến mãi không được lớn hơn giá bán.";
    }
  }

  // Quantity
  if (Number(data.quantity) < 0 || Number.isNaN(Number(data.quantity))) {
    errors.quantity = "Số lượng không hợp lệ.";
  }

  // Description
  if (data.description && data.description.length > 5000) {
    errors.description = "Mô tả quá dài.";
  }

  // Status
  if (![0, 1].includes(Number(data.status))) {
    errors.status = "Trạng thái không hợp lệ.";
  }

  return errors;
};

const validateUpdateProduct = async (id, data) => {
  const errors = {};

  if (!Number(data.category_id)) {
    errors.category_id = "Danh mục không hợp lệ.";
  }

  if (!data.name || !data.name.trim()) {
    errors.name = "Tên sản phẩm không được để trống.";
  }

  if (!data.sku || !data.sku.trim()) {
    errors.sku = "SKU không được để trống.";
  } else {
    const exists = await Product.isSkuExistsExceptId(data.sku, id);

    if (exists) {
      errors.sku = "SKU đã tồn tại.";
    }
  }

  if (Number(data.price) <= 0) {
    errors.price = "Giá bán không hợp lệ.";
  }

  if (data.sale_price && Number(data.sale_price) > Number(data.price)) {
    errors.sale_price = "Giá khuyến mãi không hợp lệ.";
  }

  if (Number(data.quantity) < 0) {
    errors.quantity = "Số lượng không hợp lệ.";
  }

  return errors;
};

module.exports = {
  validateCreateProduct,
  validateUpdateProduct,
};
