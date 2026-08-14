import { useCallback, useEffect, useMemo, useState } from "react";

import { useSearchParams } from "react-router-dom";

import ProductService from "../services/productService";

const DEFAULT_LIMIT = 12;

const getNumberParam = (searchParams, name, fallback = "") => {
  const value = searchParams.get(name);

  if (value === null || value === "") {
    return fallback;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : fallback;
};

function useClientProducts() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState([]);

  const [filterData, setFilterData] = useState({
    categories: [],
    socket: [],
    ramType: [],
    price: {
      min: 0,
      max: 0,
    },
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: DEFAULT_LIMIT,
    total: 0,
    totalPages: 0,
    hasPreviousPage: false,
    hasNextPage: false,
  });

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  /*
   * Search input local để debounce.
   */
  const [searchInput, setSearchInput] = useState(
    searchParams.get("search") || "",
  );

  /*
   * Toàn bộ filter được đọc từ URL.
   *
   * Nhờ vậy:
   * - refresh trang không mất filter
   * - back/forward browser hoạt động
   * - copy URL gửi người khác vẫn giữ bộ lọc
   */
  const filters = useMemo(() => {
    return {
      page: getNumberParam(searchParams, "page", 1) || 1,

      limit:
        getNumberParam(searchParams, "limit", DEFAULT_LIMIT) || DEFAULT_LIMIT,

      search: searchParams.get("search") || "",

      category: searchParams.get("category") || "",

      sort: searchParams.get("sort") || "newest",

      price_min: getNumberParam(searchParams, "price_min", ""),

      price_max: getNumberParam(searchParams, "price_max", ""),

      socket: searchParams.get("socket") || "",

      ram: searchParams.get("ram") || "",

      stock: searchParams.get("stock") || "",

      sale: searchParams.get("sale") === "1",
    };
  }, [searchParams]);

  /*
   * Update một hay nhiều filter.
   */
  const updateFilters = useCallback(
    (changes, { resetPage = true } = {}) => {
      const next = new URLSearchParams(searchParams);

      Object.entries(changes).forEach(([key, value]) => {
        const isEmpty =
          value === "" ||
          value === null ||
          value === undefined ||
          value === false;

        if (isEmpty) {
          next.delete(key);
        } else {
          next.set(key, String(value));
        }
      });

      if (resetPage) {
        next.delete("page");
      }

      setSearchParams(next);
    },
    [searchParams, setSearchParams],
  );

  const setPage = useCallback(
    (page) => {
      const safePage = Math.max(Number(page) || 1, 1);

      updateFilters(
        {
          page: safePage,
        },
        {
          resetPage: false,
        },
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    },
    [updateFilters],
  );

  const clearFilters = useCallback(() => {
    setSearchInput("");

    const next = new URLSearchParams();

    next.set("sort", "newest");

    setSearchParams(next);
  }, [setSearchParams]);

  /*
   * Đồng bộ khi browser Back/Forward
   * làm search trong URL thay đổi.
   */
  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

  /*
   * Debounce search 450ms.
   */
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const normalized = searchInput.trim();

      if (normalized !== filters.search) {
        updateFilters({
          search: normalized,
        });
      }
    }, 450);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [searchInput, filters.search, updateFilters]);

  /*
   * Load product từ BE.
   */
  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = {
        page: filters.page,
        limit: filters.limit,
        sort: filters.sort,
      };

      if (filters.search) {
        params.search = filters.search;
      }

      if (filters.category) {
        params.category = filters.category;
      }

      if (filters.price_min !== "") {
        params.price_min = filters.price_min;
      }

      if (filters.price_max !== "") {
        params.price_max = filters.price_max;
      }

      if (filters.socket) {
        params.socket = filters.socket;
      }

      if (filters.ram) {
        params.ram = filters.ram;
      }

      if (filters.stock) {
        params.stock = filters.stock;
      }

      if (filters.sale) {
        params.sale = 1;
      }

      const response = await ProductService.getClientProducts(params);

      if (!response?.success) {
        throw new Error(response?.message || "Không thể tải sản phẩm.");
      }

      setProducts(Array.isArray(response.data) ? response.data : []);

      setFilterData({
        categories: response.filters?.categories || [],

        socket: response.filters?.socket || [],

        ramType: response.filters?.ramType || [],

        price: response.filters?.price || {
          min: 0,
          max: 0,
        },
      });

      setPagination({
        page: Number(response.pagination?.page) || 1,

        limit: Number(response.pagination?.limit) || DEFAULT_LIMIT,

        total: Number(response.pagination?.total) || 0,

        totalPages: Number(response.pagination?.totalPages) || 0,

        hasPreviousPage: Boolean(response.pagination?.hasPreviousPage),

        hasNextPage: Boolean(response.pagination?.hasNextPage),
      });
    } catch (err) {
      console.error("Load client products:", err);

      setProducts([]);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Không thể kết nối máy chủ.",
      );
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  return {
    products,
    filters,
    filterData,
    pagination,

    searchInput,
    setSearchInput,

    loading,
    error,

    updateFilters,
    setPage,
    clearFilters,

    refresh: loadProducts,
  };
}

export default useClientProducts;
