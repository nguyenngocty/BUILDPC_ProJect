import "./css/ProductToolbar.css";

function ProductToolbar({
  onRefresh,
  onAdd,
  onImport,
  onExport,
  viewMode,
  onChangeView,
}) {
  return (
    <div className="product-toolbar">
      <div className="toolbar-title">
        <h2>Quản lý sản phẩm</h2>

        <p>Quản lý toàn bộ sản phẩm trong hệ thống</p>

        <div className="toolbar-tabs">
          <button
            className={`toolbar-tab ${
              viewMode === "all" ? "toolbar-tab-active" : ""
            }`}
            onClick={() => onChangeView("all")}
          >
            <i className="bi bi-grid"></i>
            Tất cả
          </button>

          <button
            className={`toolbar-tab ${
              viewMode === "trash" ? "toolbar-tab-active" : ""
            }`}
            onClick={() => onChangeView("trash")}
          >
            <i className="bi bi-trash3"></i>
            Thùng rác
          </button>
        </div>
      </div>

      <div className="toolbar-actions">
        <button className="btn-refresh" onClick={onRefresh}>
          <i className="bi bi-arrow-clockwise"></i>
          Làm mới
        </button>

        <button className="btn-import" onClick={onImport}>
          <i className="bi bi-upload"></i>
          Import
        </button>

        <button className="btn-export" onClick={onExport}>
          <i className="bi bi-download"></i>
          Export
        </button>

        <button className="btn-add" onClick={onAdd}>
          <i className="bi bi-plus-lg"></i>
          Thêm sản phẩm
        </button>
      </div>
    </div>
  );
}

export default ProductToolbar;
