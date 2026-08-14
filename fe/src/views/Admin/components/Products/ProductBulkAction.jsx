import "./css/ProductBulkAction.css";

function ProductBulkAction({
  selectedCount,
  viewMode,
  onDelete,
  onRestore,
  onForceDelete,
  onClear,
}) {
  return (
    <div className="product-bulk-action">
      <div className="bulk-left">
        <div className="bulk-icon">
          <i className="bi bi-check2-square"></i>
        </div>

        <div className="bulk-info">
          <span className="bulk-title">
            Đã chọn <strong>{selectedCount}</strong> sản phẩm
          </span>

          <p className="bulk-description">
            Các thao tác sẽ áp dụng cho toàn bộ sản phẩm đã chọn.
          </p>
        </div>
      </div>

      {/* ================= RIGHT ================= */}

      <div className="bulk-right">
        {viewMode === "trash" ? (
          <>
            <button
              type="button"
              className="bulk-btn bulk-success"
              onClick={onRestore}
            >
              <i className="bi bi-arrow-counterclockwise"></i>
              Khôi phục
            </button>

            <button
              type="button"
              className="bulk-btn bulk-danger"
              onClick={onForceDelete}
            >
              <i className="bi bi-trash3-fill"></i>
              Xóa vĩnh viễn
            </button>
          </>
        ) : (
          <button
            type="button"
            className="bulk-btn bulk-danger"
            onClick={onDelete}
          >
            <i className="bi bi-trash3"></i>
            Xóa
          </button>
        )}

        <button type="button" className="bulk-btn bulk-light" onClick={onClear}>
          <i className="bi bi-x-lg"></i>
          Bỏ chọn
        </button>
      </div>
    </div>
  );
}

export default ProductBulkAction;
