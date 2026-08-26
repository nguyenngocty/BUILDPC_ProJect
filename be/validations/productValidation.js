const Product = require("../models/Product");
const ProductVariant = require("../models/ProductVariant");
const Category = require("../models/Category");

// ============================================================
// HELPERS
// ============================================================

const parseJsonField = (value, fallback = null) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const normalizeBoolean = (value) => {
  if (
    value === true ||
    value === 1 ||
    value === "1" ||
    String(value).toLowerCase() === "true"
  ) {
    return true;
  }

  return false;
};

const normalizeOptions = (data) => {
  const parsed = parseJsonField(data.options, []);

  return Array.isArray(parsed) ? parsed : null;
};

const normalizeVariants = (data) => {
  const parsed = parseJsonField(data.variants, []);

  return Array.isArray(parsed) ? parsed : null;
};

// ============================================================
// BASE PRODUCT VALIDATION
// ============================================================

const validateBaseProduct = async (
  data,
  { isUpdate = false, productId = null } = {},
) => {
  const errors = {};

  // ==========================================================
  // CATEGORY
  // ==========================================================

  if (!Number(data.category_id)) {
    errors.category_id = "Danh mục không được để trống.";
  } else {
    const exists = await Category.exists(data.category_id);

    if (!exists) {
      errors.category_id = "Danh mục không tồn tại.";
    }
  }

  // ==========================================================
  // NAME
  // ==========================================================

  if (!data.name || !String(data.name).trim()) {
    errors.name = "Tên sản phẩm không được để trống.";
  } else if (String(data.name).trim().length < 3) {
    errors.name = "Tên sản phẩm tối thiểu 3 ký tự.";
  } else if (String(data.name).trim().length > 255) {
    errors.name = "Tên sản phẩm tối đa 255 ký tự.";
  }

  // ==========================================================
  // SKU PRODUCT
  //
  // products.sku vẫn được giữ làm SKU đại diện/default.
  // ==========================================================

  if (!data.sku || !String(data.sku).trim()) {
    errors.sku = "SKU sản phẩm không được để trống.";
  } else {
    const sku = String(data.sku).trim();

    let exists = false;

    if (isUpdate) {
      exists = await Product.isSkuExistsExceptId(sku, productId);
    } else {
      exists = await Product.isSkuExists(sku);
    }

    if (exists) {
      errors.sku = "SKU sản phẩm đã tồn tại.";
    }
  }

  // ==========================================================
  // PRICE
  // ==========================================================

  const price = Number(data.price);

  if (!Number.isFinite(price) || price <= 0) {
    errors.price = "Giá bán không hợp lệ.";
  }

  // ==========================================================
  // SALE PRICE
  // ==========================================================

  if (
    data.sale_price !== "" &&
    data.sale_price !== null &&
    data.sale_price !== undefined
  ) {
    const salePrice = Number(data.sale_price);

    if (!Number.isFinite(salePrice) || salePrice < 0) {
      errors.sale_price = "Giá khuyến mãi không hợp lệ.";
    } else if (Number.isFinite(price) && salePrice >= price) {
      errors.sale_price = "Giá khuyến mãi phải nhỏ hơn giá bán.";
    }
  }

  // ==========================================================
  // QUANTITY
  // ==========================================================

  const quantity = Number(data.quantity);

  if (!Number.isInteger(quantity) || quantity < 0) {
    errors.quantity = "Số lượng phải là số nguyên không âm.";
  }

  // ==========================================================
  // DESCRIPTION
  // ==========================================================

  if (data.short_description && String(data.short_description).length > 1000) {
    errors.short_description = "Mô tả ngắn quá dài.";
  }

  if (data.description && String(data.description).length > 10000) {
    errors.description = "Mô tả quá dài.";
  }

  // ==========================================================
  // STATUS
  // ==========================================================

  if (![0, 1].includes(Number(data.status))) {
    errors.status = "Trạng thái không hợp lệ.";
  }

  return errors;
};

// ============================================================
// SPECIFICATIONS VALIDATION
// ============================================================

const validateSpecifications = (data) => {
  const errors = {};

  if (
    data.specifications === undefined ||
    data.specifications === null ||
    data.specifications === ""
  ) {
    return errors;
  }

  const specifications = parseJsonField(data.specifications, []);

  if (!Array.isArray(specifications)) {
    errors.specifications = "Thông số kỹ thuật không hợp lệ.";

    return errors;
  }

  for (let i = 0; i < specifications.length; i++) {
    const item = specifications[i];

    if (!item || typeof item !== "object") {
      errors.specifications = `Thông số kỹ thuật thứ ${i + 1} không hợp lệ.`;

      return errors;
    }

    if (!item.spec_key || !String(item.spec_key).trim()) {
      errors.specifications = `Tên thông số thứ ${i + 1} không được để trống.`;

      return errors;
    }

    if (!item.spec_value || !String(item.spec_value).trim()) {
      errors.specifications = `Giá trị thông số thứ ${i + 1} không được để trống.`;

      return errors;
    }
  }

  return errors;
};

// ============================================================
// OPTIONS VALIDATION
// ============================================================

const validateOptions = (data) => {
  const errors = {};

  const options = normalizeOptions(data);

  if (options === null) {
    errors.options = "Danh sách thuộc tính biến thể không hợp lệ.";

    return {
      errors,
      options: [],
    };
  }

  const seenCodes = new Set();

  for (let i = 0; i < options.length; i++) {
    const option = options[i];

    if (!option || typeof option !== "object") {
      errors.options = `Thuộc tính thứ ${i + 1} không hợp lệ.`;

      break;
    }

    const name = String(option.name || "").trim();

    const code = ProductVariant.normalizeCode(option.code || name);

    if (!name) {
      errors.options = `Tên thuộc tính thứ ${i + 1} không được để trống.`;

      break;
    }

    if (!code) {
      errors.options = `Mã thuộc tính "${name}" không hợp lệ.`;

      break;
    }

    if (seenCodes.has(code)) {
      errors.options = `Thuộc tính "${code}" bị khai báo trùng.`;

      break;
    }

    seenCodes.add(code);

    const displayType = String(option.display_type || "button").toLowerCase();

    if (!["button", "select", "color"].includes(displayType)) {
      errors.options = `Kiểu hiển thị của thuộc tính "${name}" không hợp lệ.`;

      break;
    }

    if (!Array.isArray(option.values) || option.values.length === 0) {
      errors.options = `Thuộc tính "${name}" phải có ít nhất một giá trị.`;

      break;
    }

    const seenValues = new Set();

    for (let j = 0; j < option.values.length; j++) {
      const valueItem = option.values[j];

      const value = String(
        typeof valueItem === "string" ? valueItem : valueItem?.value || "",
      ).trim();

      if (!value) {
        errors.options = `Giá trị thứ ${j + 1} của thuộc tính "${name}" không hợp lệ.`;

        break;
      }

      const normalizedValue = value.toLowerCase();

      if (seenValues.has(normalizedValue)) {
        errors.options = `Giá trị "${value}" của thuộc tính "${name}" bị trùng.`;

        break;
      }

      seenValues.add(normalizedValue);

      if (
        displayType === "color" &&
        typeof valueItem === "object" &&
        valueItem.color_code
      ) {
        const colorCode = String(valueItem.color_code).trim();

        if (!/^#[0-9a-fA-F]{6}$/.test(colorCode)) {
          errors.options = `Mã màu "${colorCode}" của thuộc tính "${name}" không hợp lệ.`;

          break;
        }
      }
    }

    if (errors.options) {
      break;
    }
  }

  return {
    errors,
    options,
  };
};

// ============================================================
// VARIANTS VALIDATION
// ============================================================

const validateVariants = async (
  data,
  { isUpdate = false, productId = null } = {},
) => {
  const errors = {};

  const variants = normalizeVariants(data);

  if (variants === null) {
    errors.variants = "Danh sách biến thể không hợp lệ.";

    return {
      errors,
      variants: [],
    };
  }

  const { errors: optionErrors, options } = validateOptions(data);

  if (Object.keys(optionErrors).length > 0) {
    return {
      errors: optionErrors,
      variants,
    };
  }

  // ==========================================================
  // Không gửi variants
  //
  // Hệ thống sẽ tự tạo 1 default variant từ product.
  // ==========================================================

  if (variants.length === 0) {
    return {
      errors,
      variants,
    };
  }

  const optionMap = {};

  for (const option of options) {
    const code = ProductVariant.normalizeCode(option.code || option.name);

    optionMap[code] = {
      name: String(option.name || "").trim(),

      values: new Set(
        option.values.map((item) =>
          String(typeof item === "string" ? item : item.value)
            .trim()
            .toLowerCase(),
        ),
      ),
    };
  }

  const optionCodes = Object.keys(optionMap);

  const seenSkus = new Set();

  const seenCombinations = new Set();

  let defaultCount = 0;

  for (let i = 0; i < variants.length; i++) {
    const variant = variants[i];

    if (!variant || typeof variant !== "object") {
      errors.variants = `Biến thể thứ ${i + 1} không hợp lệ.`;

      break;
    }

    // ========================================================
    // SKU
    // ========================================================

    const sku = String(variant.sku || "").trim();

    if (!sku) {
      errors.variants = `SKU biến thể thứ ${i + 1} không được để trống.`;

      break;
    }

    const normalizedSku = sku.toLowerCase();

    if (seenSkus.has(normalizedSku)) {
      errors.variants = `SKU "${sku}" bị trùng trong danh sách biến thể.`;

      break;
    }

    seenSkus.add(normalizedSku);

    // ========================================================
    // Kiểm tra DB
    // ========================================================

    const variantId = variant.id ? Number(variant.id) : null;

    const exists = await ProductVariant.isSkuUsedAnywhere(sku, {
      excludeProductId: isUpdate ? productId : null,

      excludeVariantId: isUpdate && variantId ? variantId : null,
    });

    if (exists) {
      errors.variants = `SKU biến thể "${sku}" đã tồn tại.`;

      break;
    }

    // ========================================================
    // NAME
    // ========================================================

    if (
      variant.variant_name &&
      String(variant.variant_name).trim().length > 255
    ) {
      errors.variants = `Tên biến thể "${sku}" quá dài.`;

      break;
    }

    // ========================================================
    // PRICE
    // ========================================================

    const price = Number(variant.price);

    if (!Number.isFinite(price) || price <= 0) {
      errors.variants = `Giá của biến thể "${sku}" không hợp lệ.`;

      break;
    }

    // ========================================================
    // SALE PRICE
    // ========================================================

    if (
      variant.sale_price !== "" &&
      variant.sale_price !== null &&
      variant.sale_price !== undefined
    ) {
      const salePrice = Number(variant.sale_price);

      if (!Number.isFinite(salePrice) || salePrice < 0) {
        errors.variants = `Giá khuyến mãi của biến thể "${sku}" không hợp lệ.`;

        break;
      }

      if (salePrice >= price) {
        errors.variants = `Giá khuyến mãi của biến thể "${sku}" phải nhỏ hơn giá bán.`;

        break;
      }
    }

    // ========================================================
    // QUANTITY
    // ========================================================

    const quantity = Number(variant.quantity);

    if (!Number.isInteger(quantity) || quantity < 0) {
      errors.variants = `Số lượng của biến thể "${sku}" phải là số nguyên không âm.`;

      break;
    }

    // ========================================================
    // STATUS
    // ========================================================

    if (
      variant.status !== undefined &&
      ![0, 1].includes(Number(variant.status))
    ) {
      errors.variants = `Trạng thái của biến thể "${sku}" không hợp lệ.`;

      break;
    }

    // ========================================================
    // DEFAULT
    // ========================================================

    if (normalizeBoolean(variant.is_default)) {
      defaultCount++;
    }

    // ========================================================
    // VALUES
    // ========================================================

    let values = variant.values || {};

    if (Array.isArray(values)) {
      const normalizedValues = {};

      for (const item of values) {
        const code = ProductVariant.normalizeCode(
          item.option_code || item.code,
        );

        if (code) {
          normalizedValues[code] = item.value ?? item.option_value ?? "";
        }
      }

      values = normalizedValues;
    }

    if (typeof values !== "object" || Array.isArray(values)) {
      errors.variants = `Giá trị thuộc tính của biến thể "${sku}" không hợp lệ.`;

      break;
    }

    // ========================================================
    // Nếu có options thì mỗi variant phải chọn đủ.
    // ========================================================

    const combinationParts = [];

    if (optionCodes.length > 0) {
      for (const optionCode of optionCodes) {
        const selectedValue = String(values[optionCode] ?? "").trim();

        if (!selectedValue) {
          errors.variants = `Biến thể "${sku}" chưa chọn giá trị cho "${optionMap[optionCode].name}".`;

          break;
        }

        const normalizedValue = selectedValue.toLowerCase();

        if (!optionMap[optionCode].values.has(normalizedValue)) {
          errors.variants = `Giá trị "${selectedValue}" không thuộc thuộc tính "${optionMap[optionCode].name}".`;

          break;
        }

        combinationParts.push(`${optionCode}:${normalizedValue}`);
      }

      if (errors.variants) {
        break;
      }

      // Không cho gửi option lạ.
      for (const receivedCode of Object.keys(values)) {
        const code = ProductVariant.normalizeCode(receivedCode);

        if (!optionMap[code]) {
          errors.variants = `Thuộc tính "${receivedCode}" của biến thể "${sku}" không tồn tại.`;

          break;
        }
      }

      if (errors.variants) {
        break;
      }

      const combinationKey = combinationParts.sort().join("|");

      if (seenCombinations.has(combinationKey)) {
        errors.variants = `Tổ hợp thuộc tính của biến thể "${sku}" bị trùng.`;

        break;
      }

      seenCombinations.add(combinationKey);
    } else if (Object.keys(values).length > 0) {
      errors.variants = `Biến thể "${sku}" có values nhưng sản phẩm không khai báo options.`;

      break;
    }

    // ========================================================
    // IMAGE DATA
    // ========================================================

    if (variant.images !== undefined && !Array.isArray(variant.images)) {
      errors.variants = `Danh sách ảnh của biến thể "${sku}" không hợp lệ.`;

      break;
    }
  }

  if (defaultCount > 1) {
    errors.variants = "Mỗi sản phẩm chỉ được có một biến thể mặc định.";
  }

  return {
    errors,
    variants,
  };
};

// ============================================================
// CREATE
// ============================================================

const validateCreateProduct = async (data) => {
  const errors = {
    ...(await validateBaseProduct(data, {
      isUpdate: false,
    })),

    ...validateSpecifications(data),
  };

  const { errors: variantErrors } = await validateVariants(data, {
    isUpdate: false,
  });

  Object.assign(errors, variantErrors);

  return errors;
};

// ============================================================
// UPDATE
// ============================================================

const validateUpdateProduct = async (id, data) => {
  const errors = {
    ...(await validateBaseProduct(data, {
      isUpdate: true,

      productId: Number(id),
    })),

    ...validateSpecifications(data),
  };

  const { errors: variantErrors } = await validateVariants(data, {
    isUpdate: true,

    productId: Number(id),
  });

  Object.assign(errors, variantErrors);

  return errors;
};

// ============================================================
// EXPORT HELPERS
//
// Controller sẽ dùng lại để tránh JSON.parse nhiều lần.
// ============================================================

const parseProductOptions = (data) => {
  const options = normalizeOptions(data);

  return Array.isArray(options) ? options : [];
};

const parseProductVariants = (data) => {
  const variants = normalizeVariants(data);

  return Array.isArray(variants) ? variants : [];
};

const parseProductSpecifications = (data) => {
  const specifications = parseJsonField(data.specifications, []);

  return Array.isArray(specifications) ? specifications : [];
};

module.exports = {
  validateCreateProduct,
  validateUpdateProduct,

  parseProductOptions,
  parseProductVariants,
  parseProductSpecifications,
};
