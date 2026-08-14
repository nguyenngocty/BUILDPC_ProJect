import "./css/CategoryFilter.css";

const defaultFilter = {
  page: 1,
  limit: 10,
  search: "",
  status: "",
  sort: "newest",
};

function CategoryFilter({ filters, setFilters, pagination }) {
  const handleChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1,
    }));
  };

  const handleReset = () => {
    setFilters(defaultFilter);
  };

  return (
    <div className="category-filter">

      <div className="category-filter-bottom">
        <select
          value={filters.status}
          onChange={(e) => handleChange("status", e.target.value)}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="1">Đang hoạt động</option>
          <option value="0">Đã khóa</option>
        </select>

        <select
          value={filters.sort}
          onChange={(e) => handleChange("sort", e.target.value)}
        >
          <option value="newest">Mới nhất</option>
          <option value="oldest">Cũ nhất</option>
          <option value="name_asc">Tên A-Z</option>
          <option value="name_desc">Tên Z-A</option>
        </select>

        <div className="category-filter-result">
          <i className="bi bi-folder2-open"></i>

          <span>
            Tổng: <b>{pagination?.total || 0}</b> danh mục
          </span>
        </div>
      </div>
    </div>
  );
}

export default CategoryFilter;
