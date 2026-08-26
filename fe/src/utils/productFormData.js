const IGNORED_FIELDS = new Set([
  "id",
  "slug",

  "created_at",
  "updated_at",
  "deleted_at",

  "category_name",
  "brand_name",

  "images",

  "remaining",
  "sold",

  "has_variants",
]);

const JSON_FIELDS = new Set(["specifications", "options", "variants"]);

const normalizeSpecification = (item = {}) => ({
  ...(item.id ? { id: item.id } : {}),

  spec_key: String(item.spec_key || "").trim(),

  spec_value: String(
    item.spec_value !== undefined ? item.spec_value : item.value || "",
  ).trim(),
});

const normalizeOption = (option = {}, optionIndex = 0) => ({
  ...(option.id ? { id: option.id } : {}),

  name: String(option.name || "").trim(),

  code: String(option.code || "").trim(),

  display_type: option.display_type || "button",

  sort_order:
    option.sort_order !== undefined
      ? Number(option.sort_order)
      : optionIndex + 1,

  values: (option.values || []).map((value, valueIndex) => ({
    ...(value.id ? { id: value.id } : {}),

    value: String(value.value || "").trim(),

    label: String(value.label || value.value || "").trim(),

    color_code: value.color_code || null,

    sort_order:
      value.sort_order !== undefined
        ? Number(value.sort_order)
        : valueIndex + 1,
  })),
});

const normalizeVariantValues = (values) => {
  if (!values) {
    return {};
  }

  if (Array.isArray(values)) {
    return values.reduce((result, item) => {
      const code = String(item.option_code || item.code || "").trim();

      if (!code) {
        return result;
      }

      result[code] =
        item.value !== undefined
          ? item.value
          : item.option_value !== undefined
            ? item.option_value
            : "";

      return result;
    }, {});
  }

  if (typeof values === "object") {
    return { ...values };
  }

  return {};
};

const normalizeVariant = (variant = {}, index = 0) => ({
  ...(variant.id ? { id: Number(variant.id) } : {}),

  sku: String(variant.sku || "").trim(),

  variant_name: String(variant.variant_name || "").trim(),

  price: Number(variant.price || 0),

  sale_price:
    variant.sale_price === "" ||
    variant.sale_price === null ||
    variant.sale_price === undefined
      ? null
      : Number(variant.sale_price),

  quantity: Number(variant.quantity || 0),

  thumbnail: typeof variant.thumbnail === "string" ? variant.thumbnail : null,

  status: Number(variant.status ?? 1),

  is_default: Number(variant.is_default ?? 0),

  sort_order:
    variant.sort_order !== undefined ? Number(variant.sort_order) : index + 1,

  values: normalizeVariantValues(variant.values),

  /*
   * File ảnh Variant được quản lý bởi API riêng.
   * Không gửi File object trong JSON variants.
   */
  images: (variant.images || [])
    .filter((image) => !(image instanceof File))
    .map((image, imageIndex) => ({
      image_url:
        typeof image === "string"
          ? image
          : image.image_url || image.url || null,

      sort_order:
        image.sort_order !== undefined
          ? Number(image.sort_order)
          : imageIndex + 1,

      is_primary: Number(image.is_primary || 0),
    }))
    .filter((image) => image.image_url),
});

export function createProductFormData(
  product,
  { includeVariants = true } = {},
) {
  const formData = new FormData();

  Object.entries(product || {}).forEach(([key, value]) => {
    if (IGNORED_FIELDS.has(key)) {
      return;
    }

    // =========================================================
    // THUMBNAIL
    // =========================================================

    if (key === "thumbnail") {
      if (value instanceof File) {
        formData.append("thumbnail", value);
      }

      return;
    }

    // =========================================================
    // PRODUCT GALLERY
    // =========================================================

    if (key === "gallery") {
      (value || []).forEach((image) => {
        if (image instanceof File) {
          formData.append("gallery", image);
        }
      });

      return;
    }

    // =========================================================
    // SPECIFICATIONS
    // =========================================================

    if (key === "specifications") {
      const specifications = (value || [])
        .map(normalizeSpecification)
        .filter(
          (item) => item.spec_key.length > 0 || item.spec_value.length > 0,
        );

      formData.append("specifications", JSON.stringify(specifications));

      return;
    }

    // =========================================================
    // OPTIONS
    // =========================================================

    if (key === "options") {
      if (!includeVariants) {
        return;
      }

      const options = (value || [])
        .map(normalizeOption)
        .filter((option) => option.name && option.code);

      formData.append("options", JSON.stringify(options));

      return;
    }

    // =========================================================
    // VARIANTS
    // =========================================================

    if (key === "variants") {
      if (!includeVariants) {
        return;
      }

      const variants = (value || []).map(normalizeVariant);

      formData.append("variants", JSON.stringify(variants));

      return;
    }

    if (JSON_FIELDS.has(key)) {
      formData.append(key, JSON.stringify(value || []));

      return;
    }

    if (value === null || value === undefined) {
      return;
    }

    formData.append(key, value);
  });

  return formData;
}
