export function createProductFormData(product) {
  const formData = new FormData();

  Object.entries(product).forEach(([key, value]) => {
    // Không gửi các field chỉ dùng để hiển thị
    if (
      [
        "id",
        "created_at",
        "updated_at",
        "deleted_at",
        "category_name",
        "brand_name",
        "images",
      ].includes(key)
    ) {
      return;
    }

    // Gallery
    if (key === "gallery") {
      value.forEach((image) => {
        if (image instanceof File) {
          formData.append("gallery", image);
        }
      });

      return;
    }

    // Thumbnail
    if (key === "thumbnail") {
      if (value instanceof File) {
        formData.append("thumbnail", value);
      }

      return;
    }

    // Specifications
    if (key === "specifications") {
      formData.append("specifications", JSON.stringify(value || []));

      return;
    }

    // Không gửi null / undefined
    if (value === null || value === undefined) {
      return;
    }

    formData.append(key, value);
  });

  return formData;
}
