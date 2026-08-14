import "./css/PriceInformation.css";

function PriceInformation({ formData, setFormData, errors, clearError }) {
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="pc-card">
      <h3>Giá sản phẩm</h3>

      <div className="pc-grid-3">
        <div className="pc-field">
          <label>Giá bán</label>

          <input
            type="number"
            name="price"
            min="0"
            className={errors?.price ? "input-error" : ""}
            value={formData.price}
            onChange={(e) => {
              clearError("price");

              handleChange(e);
            }}
          />

          {errors?.price && <span className="error-text">{errors.price}</span>}
        </div>

        <div className="pc-field">
          <label>Giá khuyến mãi</label>

          <input
            type="number"
            min="0"
            name="sale_price"
            className={errors?.sale_price ? "input-error" : ""}
            value={formData.sale_price}
            onChange={(e) => {
              clearError("sale_price");

              handleChange(e);
            }}
          />

          {errors?.sale_price && (
            <span className="error-text">{errors.sale_price}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default PriceInformation;
