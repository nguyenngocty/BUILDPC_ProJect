import { useState, useEffect, useCallback } from "react";
import ProductService from "../services/productService";

const defaultFilter = {
  page: 1,
  limit: 10,
  keyword: "",
  category: "",
  status: "",
  stock: "",
  sort: "newest",
};

function useProducts(viewMode = "all") {
  const [products, setProducts] = useState([]);

  const [statistics, setStatistics] = useState({});

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [filters, setFilters] = useState(defaultFilter);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState(null);

  /**
   * ===============================
   * Lấy danh sách sản phẩm
   * ===============================
   */

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);

      setError(null);

      let res;

      if (viewMode === "trash") {
        res = await ProductService.getTrashProducts(filters);
      } else {
        res = await ProductService.getProducts(filters);
      }

      if (res.success) {
        setProducts(res.data || []);

        setPagination(
          res.pagination || {
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 1,
          },
        );
      } else {
        setProducts([]);

        setError(res.message || "Không thể tải danh sách sản phẩm");
      }
    } catch (err) {
      console.error(err);

      setProducts([]);

      setError("Lỗi kết nối Server");
    } finally {
      setLoading(false);
    }
  }, [filters, viewMode]);

  /**
   * ===============================
   * Thống kê Dashboard
   * ===============================
   */

  const loadStatistics = useCallback(async () => {
    console.log("CALL API STATISTICS");
    try {
      const res = await ProductService.getStatistics();

      if (res.success) {
        setStatistics(res.data || {});
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  /**
   * ===============================
   * Refresh toàn bộ
   * ===============================
   */

  const refresh = useCallback(async () => {
    await Promise.all([loadProducts(), loadStatistics()]);
  }, [loadProducts, loadStatistics]);

  /**
   * ===============================
   * Khi Filter thay đổi
   * ===============================
   */

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  /**
   * ===============================
   * Dashboard chỉ load 1 lần
   * ===============================
   */

  useEffect(() => {
    loadStatistics();
  }, [loadStatistics]);

  return {
    products,
    statistics,
    setProducts,
    pagination,
    filters,
    loading,
    error,
    setFilters,
    refresh,
  };
}

export default useProducts;
