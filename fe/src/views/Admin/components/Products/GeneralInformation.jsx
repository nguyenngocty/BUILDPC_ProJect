import "./css/GeneralInformation.css";

function GeneralInformation({
  formData,
  setFormData,
  categories,
  // brands,
  errors,
  clearError,
}) {
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="pc-card">
      <h3>Thông tin chung</h3>

      <div className="pc-grid-3">
        {/* Product Name */}

        <div className="pc-field">
          <label>Tên sản phẩm *</label>
          <input
            type="text"
            name="name"
            className={errors?.name ? "input-error" : ""}
            value={formData.name}
            onChange={(e) => {
              clearError("name");

              setFormData({
                ...formData,

                name: e.target.value,
              });
            }}
          />

          {errors?.name && <span className="error-text">{errors.name}</span>}
        </div>

        {/* SKU */}

        <div className="pc-field">
          <label>SKU *</label>

          <input
            type="text"
            name="sku"
            className={errors?.sku ? "input-error" : ""}
            value={formData.sku}
            onChange={(e) => {
              clearError("sku");

              setFormData({
                ...formData,

                sku: e.target.value,
              });
            }}
          />

          {errors?.sku && <span className="error-text">{errors.sku}</span>}
        </div>
        {/* Category */}

        <div className="pc-field">
          <label>Danh mục</label>

          <select
            className={errors?.category_id ? "input-error" : ""}
            value={formData.category_id}
            onChange={(e) => {
              clearError("category_id");

              setFormData({
                ...formData,
                category_id: e.target.value,
              });
            }}
          >
            <option value="">Chọn danh mục</option>

            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          {errors?.category_id && (
            <span className="error-text">{errors.category_id}</span>
          )}
        </div>

        {/* Status */}

        <div className="pc-field">
          <label>Trạng thái</label>

          <select name="status" value={formData.status} onChange={handleChange}>
            <option value={1}>Đang bán</option>

            <option value={0}>Ngừng bán</option>
          </select>
        </div>
      </div>
    </div>
  );
}

export default GeneralInformation;
