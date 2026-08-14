import { useState, useEffect, useCallback } from "react";
import categoryService from "../services/categoryService";

const defaultFilter = {
  page: 1,
  limit: 10,
  search: "",
  status: "",
  sort: "newest",
};

function useCategories(viewMode = "all") {
  const [categories, setCategories] = useState([]);

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
   * Lấy danh sách danh mục
   * ===============================
   */
  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);

      setError(null);

      let res;

      if (viewMode === "trash") {
        res = await categoryService.getTrash(filters);
      } else {
        res = await categoryService.getCategories(filters);
      }

      if (res.success) {
        setCategories(res.data || []);

        setPagination(
          res.pagination || {
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 1,
          },
        );
      } else {
        setCategories([]);

        setError(res.message || "Không thể tải danh sách danh mục");
      }
    } catch (err) {
      console.error(err);

      setCategories([]);

      setError("Lỗi kết nối Server");
    } finally {
      setLoading(false);
    }
  }, [filters, viewMode]);

  /**
   * ===============================
   * Dashboard Statistics
   * ===============================
   */
  const loadStatistics = useCallback(async () => {
    try {
      const res = await categoryService.getStatistics();

      if (res.success) {
        setStatistics(res.data || {});
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  /**
   * ===============================
   * Refresh
   * ===============================
   */
  const refresh = useCallback(async () => {
    await Promise.all([loadCategories(), loadStatistics()]);
  }, [loadCategories, loadStatistics]);

  /**
   * ===============================
   * Khi filter thay đổi
   * ===============================
   */
  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  /**
   * ===============================
   * Dashboard chỉ load 1 lần
   * ===============================
   */
  useEffect(() => {
    loadStatistics();
  }, [loadStatistics]);

  return {
    categories,
    setCategories,

    statistics,
    setStatistics,

    pagination,

    filters,
    setFilters,

    loading,
    error,

    refresh,
  };
}

export default useCategories;
