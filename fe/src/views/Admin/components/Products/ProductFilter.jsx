import "./css/ProductFilter.css";
import { useEffect, useState } from "react";
import ProductService from "../../../../services/productService";

function ProductFilter({ filters, setFilters }) {
  const [keyword, setKeyword] = useState(filters.keyword);

  const [categories, setCategories] = useState([]);
  useEffect(() => {
    setKeyword(filters.keyword);
  }, [filters.keyword]);
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => ({
        ...prev,
        page: 1,
        keyword,
      }));
    }, 500);

    return () => clearTimeout(timer);
  }, [keyword, setFilters]);
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await ProductService.getFormData();

        if (res.success) {
          setCategories(res.data.categories || []);
        }
      } catch (err) {
        console.error(err);
      }
    };

    loadCategories();
  }, []);
  const handleChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      page: 1,
      [field]: value,
    }));
  };

  const resetFilter = () => {
    setFilters({
      page: 1,
      limit: 10,
      keyword: "",
      category: "",
      status: "",
      stock: "",
      sort: "newest",
    });
  };

  return (
    <div className="product-filter">
      {/* Search */}
      <div className="filter-search">
        <i className="bi bi-search"></i>

        <input
          type="text"
          value={keyword}
          placeholder="Tìm theo tên hoặc SKU..."
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setFilters((prev) => ({
                ...prev,
                page: 1,
                keyword,
              }));
            }
          }}
        />

        {keyword && (
          <button
            type="button"
            className="filter-search-clear"
            onClick={() => {
              setKeyword("");

              setFilters((prev) => ({
                ...prev,
                page: 1,
                keyword: "",
              }));
            }}
          >
            <i className="bi bi-x-circle-fill"></i>
          </button>
        )}
      </div>

      {/* Category */}

      <select
        value={filters.category}
        onChange={(e) => handleChange("category", e.target.value)}
      >
        <option value="">Tất cả danh mục</option>

        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>

      {/* Status */}

      <select
        value={filters.status}
        onChange={(e) => handleChange("status", e.target.value)}
      >
        <option value="">Trạng thái</option>

        <option value="active">Đang bán</option>

        <option value="inactive">Ngừng bán</option>
      </select>

      {/* Stock */}

      <select
        value={filters.stock}
        onChange={(e) => handleChange("stock", e.target.value)}
      >
        <option value="">Kho</option>

        <option value="instock">Còn hàng</option>

        <option value="low">Sắp hết</option>

        <option value="out">Hết hàng</option>
      </select>

      {/* Sort */}

      <select
        value={filters.sort}
        onChange={(e) => handleChange("sort", e.target.value)}
      >
        <option value="newest">Mới nhất</option>

        <option value="oldest">Cũ nhất</option>

        <option value="price_asc">Giá tăng</option>

        <option value="price_desc">Giá giảm</option>

        <option value="stock_desc">Tồn kho</option>
      </select>

      <button className="btn-reset-filter" onClick={resetFilter}>
        <i className="bi bi-arrow-counterclockwise"></i>
        Reset
      </button>
    </div>
  );
}

export default ProductFilter;
