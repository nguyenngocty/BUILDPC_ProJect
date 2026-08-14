const PRICE_OPTIONS = [
  {
    label: "Dưới 1 triệu",
    min: "",
    max: 1000000,
  },
  {
    label: "1 - 3 triệu",
    min: 1000000,
    max: 3000000,
  },
  {
    label: "3 - 5 triệu",
    min: 3000000,
    max: 5000000,
  },
  {
    label: "5 - 10 triệu",
    min: 5000000,
    max: 10000000,
  },
  {
    label: "10 - 20 triệu",
    min: 10000000,
    max: 20000000,
  },
  {
    label: "Trên 20 triệu",
    min: 20000000,
    max: "",
  },
];

function ProductSidebar({ filters, filterData, updateFilters, clearFilters }) {
  const isPriceActive = (option) => {
    return (
      String(filters.price_min) === String(option.min) &&
      String(filters.price_max) === String(option.max)
    );
  };

  return (
    <aside className="products-sidebar">
      <div className="sidebar-card">
        <h3>Danh mục</h3>

        <ul className="sidebar-category-list">
          <li>
            <button
              type="button"
              className={!filters.category ? "is-active" : ""}
              onClick={() =>
                updateFilters({
                  category: "",
                })
              }
            >
              <span>Tất cả sản phẩm</span>
            </button>
          </li>

          {filterData.categories.map((category) => (
            <li key={category.id}>
              <button
                type="button"
                className={
                  filters.category === category.slug ? "is-active" : ""
                }
                onClick={() =>
                  updateFilters({
                    category: category.slug,
                  })
                }
              >
                <span>{category.name}</span>

                <small>{category.product_count}</small>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="sidebar-card">
        <h3>Mức giá</h3>

        <div className="sidebar-filter">
          {PRICE_OPTIONS.map((option) => (
            <label key={option.label}>
              <input
                type="radio"
                name="price"
                checked={isPriceActive(option)}
                onChange={() =>
                  updateFilters({
                    price_min: option.min,

                    price_max: option.max,
                  })
                }
              />

              {option.label}
            </label>
          ))}
        </div>
      </div>

      {filterData.socket.length > 0 && (
        <div className="sidebar-card">
          <h3>Socket</h3>

          <div className="sidebar-filter">
            {filterData.socket.map((socket) => (
              <label key={socket}>
                <input
                  type="radio"
                  name="socket"
                  checked={filters.socket === socket}
                  onChange={() =>
                    updateFilters({
                      socket,
                    })
                  }
                />

                {socket}
              </label>
            ))}
          </div>
        </div>
      )}

      {filterData.ramType.length > 0 && (
        <div className="sidebar-card">
          <h3>Chuẩn RAM</h3>

          <div className="sidebar-filter">
            {filterData.ramType.map((ram) => (
              <label key={ram}>
                <input
                  type="radio"
                  name="ram"
                  checked={filters.ram === ram}
                  onChange={() =>
                    updateFilters({
                      ram,
                    })
                  }
                />

                {ram}
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="sidebar-card">
        <h3>Tình trạng</h3>

        <div className="sidebar-filter">
          <label>
            <input
              type="radio"
              name="stock"
              checked={filters.stock === "in_stock"}
              onChange={() =>
                updateFilters({
                  stock: "in_stock",
                })
              }
            />
            Còn hàng
          </label>

          <label>
            <input
              type="radio"
              name="stock"
              checked={filters.stock === "low_stock"}
              onChange={() =>
                updateFilters({
                  stock: "low_stock",
                })
              }
            />
            Sắp hết hàng
          </label>

          <label>
            <input
              type="radio"
              name="stock"
              checked={filters.stock === "out_of_stock"}
              onChange={() =>
                updateFilters({
                  stock: "out_of_stock",
                })
              }
            />
            Hết hàng
          </label>

          <label>
            <input
              type="checkbox"
              checked={filters.sale}
              onChange={(event) =>
                updateFilters({
                  sale: event.target.checked ? 1 : "",
                })
              }
            />
            Đang khuyến mãi
          </label>
        </div>
      </div>

      <button className="clear-filter" type="button" onClick={clearFilters}>
        <i className="bi bi-arrow-counterclockwise"></i> Xóa tất cả bộ lọc
      </button>
    </aside>
  );
}

export default ProductSidebar;
