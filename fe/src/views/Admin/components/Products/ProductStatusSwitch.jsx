import "./css/ProductStatusSwitch.css";

function ProductStatusSwitch({ checked, loading = false, onChange }) {
  return (
    <button
      type="button"
      className={`product-status-btn ${
        checked ? "status-active" : "status-inactive"
      }`}
      disabled={loading}
      onClick={onChange}
    >
      <i
        className={checked ? "bi bi-check-circle-fill" : "bi bi-x-circle-fill"}
      />

      <span>{checked ? "Đang bán" : "Ngừng bán"}</span>
    </button>
  );
}

export default ProductStatusSwitch;
