import { useState } from "react";
import "./css/CategoryToolbar.css";

function CategoryToolbar({
  viewMode,
  onChangeView,
  filters,
  setFilters,
  refresh,
  onAdd,
}) {
  const [keyword, setKeyword] = useState(filters.search || "");

  const handleSearch = (e) => {
    e.preventDefault();

    setFilters((prev) => ({
      ...prev,
      page: 1,
      search: keyword,
    }));
  };

  return (
    <div className="category-toolbar">
      {/* LEFT */}

      <div className="category-toolbar-left">
        <button
          className={
            viewMode === "all" ? "toolbar-view-btn active" : "toolbar-view-btn"
          }
          onClick={() => onChangeView("all")}
        >
          <i className="bi bi-grid"></i>
          Danh sách
        </button>

        <button
          className={
            viewMode === "trash"
              ? "toolbar-view-btn active"
              : "toolbar-view-btn"
          }
          onClick={() => onChangeView("trash")}
        >
          <i className="bi bi-trash3"></i>
          Thùng rác
        </button>
      </div>

      {/* RIGHT */}

      <div className="category-toolbar-right">
        <form onSubmit={handleSearch}>
          <div className="toolbar-search">
            <i className="bi bi-search"></i>

            <input
              type="text"
              placeholder="Tìm danh mục..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
        </form>

        <button className="toolbar-icon-btn" onClick={refresh}>
          <i className="bi bi-arrow-clockwise"></i>
        </button>

        <button className="toolbar-add-btn" onClick={onAdd}>
          <i className="bi bi-plus-lg"></i>
          Thêm danh mục
        </button>
      </div>
    </div>
  );
}

export default CategoryToolbar;
