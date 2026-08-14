import "./css/InventoryInformation.css";

function InventoryInformation({ formData, setFormData, errors, clearError }) {
  const handleChange = (e) => {
    const { name, value } = e.target;

    // Không cho nhập số âm
    if (Number(value) < 0) return;

    clearError?.(name);

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  return (
    <div className="pc-card">
      <h3>Tồn kho</h3>

      <div className="pc-grid-2">
        <div className="pc-field">
          <label>Số lượng</label>

          <input
            type="number"
            min="0"
            name="quantity"
            className={errors?.quantity ? "input-error" : ""}
            value={formData.quantity}
            onChange={(e) => {
              clearError("quantity");

              handleChange(e);
            }}
          />

          {errors?.quantity && (
            <span className="error-text">{errors.quantity}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default InventoryInformation;
