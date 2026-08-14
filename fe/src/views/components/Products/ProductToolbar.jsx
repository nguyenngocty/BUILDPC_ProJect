function ProductToolbar({
  filters,
  pagination,

  searchInput,
  setSearchInput,

  updateFilters,
}) {
  return (
    <div className="products-toolbar">
      <div className="toolbar-left">
        <div className="toolbar-search">
          <i className="bi bi-search"></i>

          <input
            type="search"
            placeholder="Tìm tên sản phẩm hoặc SKU..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </div>

        <div className="toolbar-filter-tags">
          {filters.category && (
            <span>
              Danh mục: {filters.category}
              <button
                type="button"
                onClick={() =>
                  updateFilters({
                    category: "",
                  })
                }
              >
                <i className="bi bi-x"></i>
              </button>
            </span>
          )}

          {filters.socket && (
            <span>
              {filters.socket}

              <button
                type="button"
                onClick={() =>
                  updateFilters({
                    socket: "",
                  })
                }
              >
                <i className="bi bi-x"></i>
              </button>
            </span>
          )}

          {filters.ram && (
            <span>
              {filters.ram}

              <button
                type="button"
                onClick={() =>
                  updateFilters({
                    ram: "",
                  })
                }
              >
                <i className="bi bi-x"></i>
              </button>
            </span>
          )}
        </div>
      </div>

      <div className="toolbar-right">
        <div className="toolbar-count">
          <strong>{pagination.total}</strong> sản phẩm
        </div>

        <select
          className="toolbar-select"
          value={filters.sort}
          onChange={(event) =>
            updateFilters({
              sort: event.target.value,
            })
          }
        >
          <option value="newest">Mới nhất</option>

          <option value="price_asc">Giá tăng dần</option>

          <option value="price_desc">Giá giảm dần</option>

          <option value="name_asc">Tên A-Z</option>

          <option value="name_desc">Tên Z-A</option>
        </select>
      </div>
    </div>
  );
}

export default ProductToolbar;
