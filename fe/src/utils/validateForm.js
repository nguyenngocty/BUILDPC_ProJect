const isEmpty = (value) =>
  value === undefined || value === null || String(value).trim() === "";

const toNumber = (value) => Number(value);

const normalizeValueObject = (values = {}) => {
  if (Array.isArray(values)) {
    return values.reduce((result, item) => {
      const code = String(item.option_code || item.code || "").trim();

      if (code) {
        result[code] =
          item.value !== undefined ? item.value : item.option_value || "";
      }

      return result;
    }, {});
  }

  return values && typeof values === "object" ? values : {};
};

// ============================================================
// PRODUCT
// ============================================================

export const validateProductForm = (product, { mode = "create" } = {}) => {
  const errors = {};

  if (isEmpty(product.name)) {
    errors.name = "Tên sản phẩm không được để trống.";
  }

  if (isEmpty(product.sku)) {
    errors.sku = "SKU không được để trống.";
  }

  if (isEmpty(product.category_id)) {
    errors.category_id = "Vui lòng chọn danh mục.";
  }

  const price = toNumber(product.price);

  if (!Number.isFinite(price) || price <= 0) {
    errors.price = "Giá bán phải lớn hơn 0.";
  }

  if (!isEmpty(product.sale_price)) {
    const salePrice = toNumber(product.sale_price);

    if (!Number.isFinite(salePrice) || salePrice < 0) {
      errors.sale_price = "Giá khuyến mãi không hợp lệ.";
    } else if (Number.isFinite(price) && salePrice >= price) {
      errors.sale_price = "Giá khuyến mãi phải nhỏ hơn giá bán.";
    }
  }

  const quantity = toNumber(product.quantity || 0);

  if (!Number.isInteger(quantity) || quantity < 0) {
    errors.quantity = "Số lượng phải là số nguyên không âm.";
  }

  if (mode === "create" && !product.thumbnail) {
    errors.thumbnail = "Vui lòng chọn ảnh đại diện.";
  }

  return errors;
};

// ============================================================
// VARIANT
// ============================================================

export const validateVariantForm = (
  variant,
  options = [],
  { creating = false } = {},
) => {
  const errors = {};

  if (isEmpty(variant.sku)) {
    errors.sku = "SKU biến thể không được để trống.";
  }

  if (isEmpty(variant.variant_name)) {
    errors.variant_name = "Tên biến thể không được để trống.";
  }

  const price = Number(variant.price);

  if (!Number.isFinite(price) || price <= 0) {
    errors.price = "Giá bán phải lớn hơn 0.";
  }

  if (!isEmpty(variant.sale_price)) {
    const salePrice = Number(variant.sale_price);

    if (!Number.isFinite(salePrice) || salePrice < 0 || salePrice >= price) {
      errors.sale_price = "Giá khuyến mãi phải nhỏ hơn giá bán.";
    }
  }

  /*
   * API sửa Variant không cho quantity.
   * Chỉ Validate quantity khi CREATE.
   */
  if (creating) {
    const quantity = Number(variant.quantity || 0);

    if (!Number.isInteger(quantity) || quantity < 0) {
      errors.quantity = "Tồn kho phải là số nguyên không âm.";
    }
  }

  if (![0, 1].includes(Number(variant.status))) {
    errors.status = "Trạng thái biến thể không hợp lệ.";
  }

  const valueObject = normalizeValueObject(variant.values);

  for (const option of options || []) {
    const code = String(option.code || "").trim();

    if (!code) {
      continue;
    }

    const selectedValue = valueObject[code];

    if (isEmpty(selectedValue)) {
      errors[`value_${code}`] = `Vui lòng chọn ${option.name}.`;

      continue;
    }

    const exists = (option.values || []).some(
      (item) =>
        String(item.value).trim().toLowerCase() ===
        String(selectedValue).trim().toLowerCase(),
    );

    if (!exists) {
      errors[`value_${code}`] =
        `Giá trị "${selectedValue}" không thuộc "${option.name}".`;
    }
  }

  return errors;
};

// ============================================================
// STOCK
// ============================================================

export const validateStockPayload = (type, quantity) => {
  const normalizedType = String(type || "")
    .trim()
    .toLowerCase();

  if (!["import", "export", "adjust"].includes(normalizedType)) {
    return "Loại điều chỉnh tồn kho không hợp lệ.";
  }

  const normalizedQuantity = Number(quantity);

  if (normalizedType === "adjust") {
    if (!Number.isInteger(normalizedQuantity) || normalizedQuantity < 0) {
      return "Tồn kho mới phải là số nguyên không âm.";
    }

    return "";
  }

  if (!Number.isInteger(normalizedQuantity) || normalizedQuantity <= 0) {
    return "Số lượng nhập/xuất phải là số nguyên lớn hơn 0.";
  }

  return "";
};
