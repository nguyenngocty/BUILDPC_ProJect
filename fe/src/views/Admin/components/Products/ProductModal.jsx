import "./css/ProductModal.css";
import ProductForm from "./ProductForm";

function ProductModal({
  open,
  onClose,
  mode = "create",
  product = null,
  onSuccess,
}) {
  if (!open) return null;

  return (
    <div className="product-modal-overlay">
      <div className="product-modal">
        <div className="product-modal-header">
          <div>
            <h2>{mode === "create" ? "Thêm sản phẩm" : "Cập nhật sản phẩm"}</h2>

            <p>
              {mode === "create"
                ? "Nhập thông tin sản phẩm mới"
                : "Chỉnh sửa thông tin sản phẩm"}
            </p>
          </div>

          <button className="modal-close-btn" onClick={onClose} type="button">
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        <div className="product-modal-body">
          <ProductForm
            mode={mode}
            product={product}
            onSuccess={onSuccess}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
}

export default ProductModal;
