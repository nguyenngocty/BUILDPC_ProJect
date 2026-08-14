import "./css/CategoryBulkToolbar.css";

function CategoryBulkToolbar({
  selectedCount,
  viewMode,
  onDelete,
  onRestore,
  onForceDelete,
  onToggleStatus,
  onClear,
}) {
  if (selectedCount === 0) return null;

  return (
    <div className="cbt-wrapper">
      <div className="cbt-left">
        <div className="cbt-selected">
          <i className="bi bi-check2-square"></i>

          <span>
            Đã chọn <strong>{selectedCount}</strong> danh mục
          </span>
        </div>
      </div>

      <div className="cbt-right">
        {viewMode === "trash" ? (
          <>
            <button className="cbt-btn cbt-success" onClick={onRestore}>
              <i className="bi bi-arrow-counterclockwise"></i>

              <span>Khôi phục</span>
            </button>

            <button className="cbt-btn cbt-danger" onClick={onForceDelete}>
              <i className="bi bi-trash3-fill"></i>

              <span>Xóa vĩnh viễn</span>
            </button>
          </>
        ) : (
          <>
            <button className="cbt-btn cbt-warning" onClick={onToggleStatus}>
              <i className="bi bi-arrow-repeat"></i>

              <span>Đổi trạng thái</span>
            </button>

            <button className="cbt-btn cbt-danger" onClick={onDelete}>
              <i className="bi bi-trash"></i>

              <span>Xóa</span>
            </button>
          </>
        )}

        <button className="cbt-btn cbt-light" onClick={onClear}>
          <i className="bi bi-x-circle"></i>

          <span>Bỏ chọn</span>
        </button>
      </div>
    </div>
  );
}

export default CategoryBulkToolbar;
