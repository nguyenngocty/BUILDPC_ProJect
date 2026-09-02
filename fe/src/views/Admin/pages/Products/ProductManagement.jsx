import { useEffect, useMemo, useRef, useState } from "react";

import toast from "react-hot-toast";

import useProducts from "../../../../hooks/useProducts";

import productService from "../../../../services/productService";

import { defaultProduct } from "../../../../constants/productDefault";

import { createProductFormData } from "../../../../utils/productFormData";

import VariantManager from "./components/VariantManager";

import RichTextEditor from "../../../components/RichText/RichTextEditor";

import {
  sanitizeRichTextHtml,
  isRichTextEmpty,
} from "../../../../utils/richText";

import "./ProductManagement.css";

const UPLOAD_URL = process.env.REACT_APP_UPLOAD_URL || "http://localhost:5000";

const DEFAULT_FILTERS = {
  page: 1,
  limit: 10,
  keyword: "",
  category: "",
  status: "",
  stock: "",
  sort: "newest",
};

// =========================================================
// HELPERS
// =========================================================

const getImageUrl = (image) => {
  if (!image) {
    return "/images/no-image.png";
  }

  if (image instanceof File) {
    return URL.createObjectURL(image);
  }

  if (typeof image === "string") {
    if (image.startsWith("http://") || image.startsWith("https://")) {
      return image;
    }

    return `${UPLOAD_URL}${image}`;
  }

  if (image?.image_url) {
    return image.image_url.startsWith("http")
      ? image.image_url
      : `${UPLOAD_URL}${image.image_url}`;
  }

  if (image?.path) {
    return image.path.startsWith("http")
      ? image.path
      : `${UPLOAD_URL}${image.path}`;
  }

  if (image?.url) {
    return image.url.startsWith("http")
      ? image.url
      : `${UPLOAD_URL}${image.url}`;
  }

  return "/images/no-image.png";
};

const formatMoney = (value) => {
  return `${Number(value || 0).toLocaleString("vi-VN")} ₫`;
};

const formatDate = (value) => {
  if (!value) {
    return "--";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return date.toLocaleDateString("vi-VN");
};

const formatDateTime = (value) => {
  if (!value) {
    return "--";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return date.toLocaleString("vi-VN");
};

const getStockMeta = (remaining) => {
  const quantity = Number(remaining || 0);

  if (quantity <= 0) {
    return {
      type: "out",
      label: "Hết hàng",
      value: 0,
      icon: "bi-x-circle-fill",
    };
  }

  if (quantity <= 5) {
    return {
      type: "low",
      label: "Sắp hết",
      value: quantity,
      icon: "bi-exclamation-triangle-fill",
    };
  }

  return {
    type: "normal",
    label: "Còn hàng",
    value: quantity,
    icon: "bi-check-circle-fill",
  };
};

// =========================================================
// ACTION MENU
// =========================================================

function ProductActionMenu({
  viewMode,
  product,
  onView,
  onEdit,
  onDuplicate,
  onStock,
  onStockHistory,
  onDelete,
  onRestore,
  onForceDelete,
}) {
  const [open, setOpen] = useState(false);

  const menuRef = useRef(null);

  useEffect(() => {
    const handleClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);

    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, []);

  const runAction = (callback) => {
    callback?.(product);

    setOpen(false);
  };

  return (
    <div className="adm-product-action" ref={menuRef}>
      <button
        type="button"
        className="adm-product-action__trigger"
        onClick={() => setOpen((current) => !current)}
        aria-label="Thao tác sản phẩm"
      >
        <i className="bi bi-three-dots-vertical" />
      </button>

      {open && (
        <div className="adm-product-action__menu">
          {viewMode === "trash" ? (
            <>
              <button
                type="button"
                className="adm-product-action__item adm-product-action__item--restore"
                onClick={() => runAction(onRestore)}
              >
                <i className="bi bi-arrow-counterclockwise" />

                <span>Khôi phục</span>
              </button>

              <button
                type="button"
                className="adm-product-action__item adm-product-action__item--danger"
                onClick={() => runAction(onForceDelete)}
              >
                <i className="bi bi-trash3-fill" />

                <span>Xóa vĩnh viễn</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="adm-product-action__item"
                onClick={() => runAction(onView)}
              >
                <i className="bi bi-eye" />

                <span>Xem chi tiết</span>
              </button>

              <button
                type="button"
                className="adm-product-action__item"
                onClick={() => runAction(onEdit)}
              >
                <i className="bi bi-pencil-square" />

                <span>Chỉnh sửa</span>
              </button>

              <button
                type="button"
                className="adm-product-action__item"
                onClick={() => runAction(onDuplicate)}
              >
                <i className="bi bi-files" />

                <span>Nhân bản</span>
              </button>

              <button
                type="button"
                className="adm-product-action__item adm-product-action__item--stock"
                onClick={() => runAction(onStock)}
              >
                <i className="bi bi-box-seam" />

                <span>Điều chỉnh kho</span>
              </button>

              <button
                type="button"
                className="adm-product-action__item"
                onClick={() => runAction(onStockHistory)}
              >
                <i className="bi bi-clock-history" />

                <span>Lịch sử kho</span>
              </button>

              <button
                type="button"
                className="adm-product-action__item adm-product-action__item--danger"
                onClick={() => runAction(onDelete)}
              >
                <i className="bi bi-trash" />

                <span>Xóa</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// =========================================================
// PRODUCT MANAGEMENT
// =========================================================

function ProductManagement() {
  const [viewMode, setViewMode] = useState("all");

  const {
    products,
    setProducts,
    statistics,
    loading,
    refresh,
    filters,
    setFilters,
    pagination,
  } = useProducts(viewMode);

  // =======================================================
  // GENERAL STATE
  // =======================================================

  const [selectedProducts, setSelectedProducts] = useState([]);

  const [categories, setCategories] = useState([]);

  const [categoryLoading, setCategoryLoading] = useState(false);

  const [keyword, setKeyword] = useState(filters.keyword || "");

  const [duplicatingId, setDuplicatingId] = useState(null);

  // =======================================================
  // PRODUCT MODAL
  // =======================================================

  const [productModalOpen, setProductModalOpen] = useState(false);

  const [productModalMode, setProductModalMode] = useState("create");

  const [selectedProduct, setSelectedProduct] = useState(null);

  const [productSaving, setProductSaving] = useState(false);

  const [productForm, setProductForm] = useState({
    ...defaultProduct,
  });

  const [productFormErrors, setProductFormErrors] = useState({});

  const [fileInputKey, setFileInputKey] = useState(Date.now());

  // =======================================================
  // VIEW MODAL
  // =======================================================

  const [viewModalOpen, setViewModalOpen] = useState(false);

  const [activeViewImage, setActiveViewImage] = useState("");

  // =======================================================
  // CONFIRM
  // =======================================================

  const [confirmOpen, setConfirmOpen] = useState(false);

  const [confirmType, setConfirmType] = useState("delete");

  const [confirmProduct, setConfirmProduct] = useState(null);

  const [confirmLoading, setConfirmLoading] = useState(false);

  const [bulkAction, setBulkAction] = useState(null);

  // =======================================================
  // STOCK
  // =======================================================

  const [stockModalOpen, setStockModalOpen] = useState(false);

  const [stockProduct, setStockProduct] = useState(null);

  const [stockType, setStockType] = useState("import");

  const [stockQuantity, setStockQuantity] = useState("");

  const [stockNote, setStockNote] = useState("");

  const [stockSaving, setStockSaving] = useState(false);

  // =======================================================
  // STOCK HISTORY
  // =======================================================

  const [historyOpen, setHistoryOpen] = useState(false);

  const [historyProduct, setHistoryProduct] = useState(null);

  const [historyLoading, setHistoryLoading] = useState(false);

  const [stockHistory, setStockHistory] = useState([]);

  // =======================================================
  // RESET SELECTION
  // =======================================================

  useEffect(() => {
    setSelectedProducts([]);
  }, [products]);

  // =======================================================
  // FILTER KEYWORD
  // =======================================================

  useEffect(() => {
    setKeyword(filters.keyword || "");
  }, [filters.keyword]);

  // =======================================================
  // SEARCH DEBOUNCE
  // =======================================================

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (keyword === filters.keyword) {
        return;
      }

      setFilters((previous) => ({
        ...previous,

        page: 1,

        keyword,
      }));
    }, 500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [keyword, filters.keyword, setFilters]);

  // =======================================================
  // LOAD CATEGORIES
  // =======================================================

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setCategoryLoading(true);

        const res = await productService.getFormData();

        if (res?.success) {
          setCategories(res.data?.categories || []);

          return;
        }

        setCategories([]);
      } catch (error) {
        console.error(error);

        setCategories([]);
      } finally {
        setCategoryLoading(false);
      }
    };

    loadCategories();
  }, []);

  // =======================================================
  // ESC
  // =======================================================

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key !== "Escape") {
        return;
      }

      if (confirmOpen) {
        closeConfirm();

        return;
      }

      if (historyOpen) {
        closeStockHistory();

        return;
      }

      if (stockModalOpen) {
        closeStockModal();

        return;
      }

      if (viewModalOpen) {
        closeViewModal();

        return;
      }

      if (productModalOpen) {
        closeProductModal();
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => document.removeEventListener("keydown", handleEscape);
  });

  // =======================================================
  // VIEW MODE
  // =======================================================

  const handleChangeView = (mode) => {
    setSelectedProducts([]);

    setViewMode(mode);

    setFilters((previous) => ({
      ...previous,

      page: 1,
    }));
  };

  // =======================================================
  // SELECT
  // =======================================================

  const handleSelectProduct = (id) => {
    setSelectedProducts((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id],
    );
  };

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelectedProducts(products.map((item) => item.id));

      return;
    }

    setSelectedProducts([]);
  };

  // =======================================================
  // FILTER
  // =======================================================

  const handleFilterChange = (field, value) => {
    setFilters((previous) => ({
      ...previous,

      page: 1,

      [field]: value,
    }));
  };

  const handleResetFilter = () => {
    setKeyword("");

    setFilters({
      ...DEFAULT_FILTERS,
    });
  };

  // =======================================================
  // PRODUCT FORM HELPERS
  // =======================================================

  const resetProductForm = () => {
    setProductForm({
      ...defaultProduct,
    });

    setProductFormErrors({});

    setFileInputKey(Date.now());
  };

  const clearProductError = (field) => {
    setProductFormErrors((previous) => ({
      ...previous,

      [field]: "",
    }));
  };

  const handleProductFieldChange = (event) => {
    const { name, value } = event.target;

    clearProductError(name);

    setProductForm((previous) => ({
      ...previous,

      [name]: value,
    }));
  };

  // =======================================================
  // CREATE
  // =======================================================

  const handleAddProduct = () => {
    setProductModalMode("create");

    setSelectedProduct(null);

    resetProductForm();

    setProductModalOpen(true);
  };

  // =======================================================
  // EDIT
  // =======================================================

  const handleEditProduct = async (product) => {
    try {
      const res = await productService.getProductById(product.id);

      const data = res.data;

      setProductModalMode("edit");

      setSelectedProduct(data);

      setProductForm({
        ...defaultProduct,

        ...data,

        gallery: data.gallery || [],
      });

      setProductFormErrors({});

      setFileInputKey(Date.now());

      setProductModalOpen(true);
    } catch (error) {
      console.error(error);

      toast.error("Không tải được thông tin sản phẩm.");
    }
  };

  // =======================================================
  // CLOSE PRODUCT MODAL
  // =======================================================

  const closeProductModal = () => {
    setProductModalOpen(false);

    setSelectedProduct(null);

    setProductModalMode("create");

    resetProductForm();
  };

  // =======================================================
  // VALIDATE
  // =======================================================

  const validateProductForm = () => {
    const errors = {};

    if (!(productForm.name || "").trim()) {
      errors.name = "Tên sản phẩm không được để trống.";
    }

    if (!(productForm.sku || "").trim()) {
      errors.sku = "SKU không được để trống.";
    }

    if (!productForm.category_id) {
      errors.category_id = "Vui lòng chọn danh mục.";
    }

    if (!productForm.price || Number(productForm.price) <= 0) {
      errors.price = "Giá bán phải lớn hơn 0.";
    }

    if (
      productForm.sale_price &&
      Number(productForm.sale_price) >= Number(productForm.price)
    ) {
      errors.sale_price = "Giá khuyến mãi phải nhỏ hơn giá bán.";
    }

    if (Number(productForm.quantity) < 0) {
      errors.quantity = "Số lượng không hợp lệ.";
    }

    if (String(productForm.description || "").length > 10000) {
      errors.description = "Mô tả chi tiết không được vượt quá 10.000 ký tự.";
    }

    if (productModalMode === "create" && !productForm.thumbnail) {
      errors.thumbnail = "Vui lòng chọn ảnh đại diện.";
    }

    setProductFormErrors(errors);

    return Object.keys(errors).length === 0;
  };

  // =======================================================
  // SUBMIT PRODUCT
  // =======================================================

  const handleProductSubmit = async (event) => {
    event.preventDefault();

    if (!validateProductForm()) {
      toast.error("Vui lòng kiểm tra lại thông tin sản phẩm.");

      return;
    }

    try {
      setProductSaving(true);

      const safeProduct = {
        ...productForm,

        description: sanitizeRichTextHtml(productForm.description || ""),
      };

      const submitData = createProductFormData(safeProduct);

      if (productModalMode === "create") {
        await productService.createProduct(submitData);

        toast.success("Thêm sản phẩm thành công.");
      } else {
        await productService.updateProduct(selectedProduct.id, submitData);

        toast.success("Cập nhật sản phẩm thành công.");
      }

      closeProductModal();

      setSelectedProducts([]);

      await refresh();
    } catch (error) {
      console.error(error);

      if (
        error.response?.status === 400 &&
        error.response?.data?.field === "sku"
      ) {
        setProductFormErrors((previous) => ({
          ...previous,

          sku: error.response.data.message,
        }));

        return;
      }

      if (error.response?.status === 422) {
        setProductFormErrors(error.response.data?.errors || {});
      }

      toast.error(
        error.response?.data?.message || "Có lỗi xảy ra khi lưu sản phẩm.",
      );
    } finally {
      setProductSaving(false);
    }
  };

  // =======================================================
  // THUMBNAIL
  // =======================================================

  const thumbnailPreview = useMemo(() => {
    if (!productForm.thumbnail) {
      return "";
    }

    return getImageUrl(productForm.thumbnail);
  }, [productForm.thumbnail]);

  const handleThumbnail = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chọn file ảnh.");

      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ảnh không được vượt quá 5MB.");

      return;
    }

    setProductForm((previous) => ({
      ...previous,

      thumbnail: file,
    }));

    clearProductError("thumbnail");

    event.target.value = "";
  };

  // =======================================================
  // GALLERY
  // =======================================================

  const galleryPreviews = useMemo(() => {
    return (productForm.gallery || []).map((image, index) => ({
      image,

      index,

      key:
        image instanceof File
          ? `${image.name}-${image.size}-${index}`
          : image?.id ||
            image?.image_id ||
            image?.image_url ||
            image?.path ||
            index,

      url: getImageUrl(image),
    }));
  }, [productForm.gallery]);

  const handleGallery = (event) => {
    const files = Array.from(event.target.files || []).filter((file) =>
      file.type.startsWith("image/"),
    );

    if (!files.length) {
      return;
    }

    setProductForm((previous) => ({
      ...previous,

      gallery: [...(previous.gallery || []), ...files],
    }));

    event.target.value = "";
  };

  const removeGalleryImage = async (index) => {
    const image = productForm.gallery?.[index];

    try {
      if (productModalMode === "edit" && image?.id && selectedProduct?.id) {
        await productService.deleteGalleryImage(selectedProduct.id, image.id);

        toast.success("Xóa ảnh thành công.");
      }

      setProductForm((previous) => ({
        ...previous,

        gallery: (previous.gallery || []).filter(
          (_, currentIndex) => currentIndex !== index,
        ),
      }));
    } catch (error) {
      console.error(error);

      toast.error(error.response?.data?.message || "Không thể xóa ảnh.");
    }
  };

  // =======================================================
  // VIEW PRODUCT
  // =======================================================

  const handleViewProduct = async (product) => {
    try {
      const res = await productService.getProductById(product.id);

      const data = res.data;

      setSelectedProduct(data);

      const images = [
        data.thumbnail,

        ...(data.gallery || []).map(
          (image) => image.image_url || image.path || image,
        ),
      ].filter(Boolean);

      setActiveViewImage(images[0] || "");

      setViewModalOpen(true);
    } catch (error) {
      console.error(error);

      toast.error("Không tải được chi tiết sản phẩm.");
    }
  };

  const closeViewModal = () => {
    setViewModalOpen(false);

    setSelectedProduct(null);

    setActiveViewImage("");
  };

  const viewGallery = useMemo(() => {
    if (!selectedProduct) {
      return [];
    }

    return [
      selectedProduct.thumbnail,

      ...(selectedProduct.gallery || []).map(
        (image) => image.image_url || image.path || image,
      ),
    ]
      .filter(Boolean)
      .filter((value, index, array) => array.indexOf(value) === index);
  }, [selectedProduct]);

  // =======================================================
  // DUPLICATE
  // =======================================================

  const handleDuplicate = async (product) => {
    if (duplicatingId) {
      return;
    }

    try {
      setDuplicatingId(product.id);

      const res = await productService.duplicateProduct(product.id);

      toast.success(res.message);

      await refresh();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Không thể nhân bản sản phẩm.",
      );
    } finally {
      setDuplicatingId(null);
    }
  };

  // =======================================================
  // STATUS
  // =======================================================

  const handleToggleStatus = async (product) => {
    try {
      const res = await productService.toggleStatus(product.id);

      if (res?.success === false) {
        toast.error(res.message);

        return;
      }

      setProducts((previous) =>
        previous.map((item) =>
          item.id === product.id
            ? {
                ...item,

                status: Number(item.status) === 1 ? 0 : 1,
              }
            : item,
        ),
      );

      toast.success(res.message || "Đã cập nhật trạng thái.");
    } catch (error) {
      console.error(error);

      toast.error(
        error.response?.data?.message || "Không thể thay đổi trạng thái.",
      );
    }
  };

  // =======================================================
  // CONFIRM
  // =======================================================

  const openConfirm = (type, product = null) => {
    setConfirmType(type);

    setConfirmProduct(product);

    setBulkAction(null);

    setConfirmOpen(true);
  };

  const openBulkConfirm = (type) => {
    if (selectedProducts.length === 0) {
      return;
    }

    setBulkAction(type);

    setConfirmType(type);

    setConfirmProduct(null);

    setConfirmOpen(true);
  };

  const closeConfirm = () => {
    setConfirmOpen(false);

    setConfirmProduct(null);

    setBulkAction(null);
  };

  const handleConfirmAction = async () => {
    try {
      setConfirmLoading(true);

      let res;

      if (bulkAction) {
        switch (bulkAction) {
          case "delete":
            res = await productService.bulkDeleteProducts(selectedProducts);

            break;

          case "restore":
            res = await productService.bulkRestoreProducts(selectedProducts);

            break;

          case "force-delete":
            res =
              await productService.bulkForceDeleteProducts(selectedProducts);

            break;

          default:
            return;
        }

        toast.success(res.message || "Thao tác thành công.");

        setSelectedProducts([]);

        closeConfirm();

        await refresh();

        return;
      }

      if (!confirmProduct) {
        return;
      }

      switch (confirmType) {
        case "delete":
          res = await productService.deleteProduct(confirmProduct.id);

          toast.success(res?.message || "Đã xóa sản phẩm thành công.");

          break;

        case "restore":
          res = await productService.restoreProduct(confirmProduct.id);

          toast.success(res.message || "Khôi phục sản phẩm thành công.");

          break;

        case "force-delete":
          res = await productService.forceDeleteProduct(confirmProduct.id);

          toast.success(res.message || "Xóa vĩnh viễn thành công.");

          break;

        default:
          return;
      }

      closeConfirm();

      await refresh();
    } catch (error) {
      console.error(error);

      toast.error(
        error.response?.data?.message || "Không thể thực hiện thao tác.",
      );
    } finally {
      setConfirmLoading(false);
    }
  };

  // =======================================================
  // STOCK MODAL
  // =======================================================

  const openStockModal = (product) => {
    setStockProduct(product);

    setStockType("import");

    setStockQuantity("");

    setStockNote("");

    setStockModalOpen(true);
  };

  const closeStockModal = () => {
    setStockModalOpen(false);

    setStockProduct(null);

    setStockType("import");

    setStockQuantity("");

    setStockNote("");
  };

  const handleStockSubmit = async () => {
    if (!stockQuantity || Number(stockQuantity) <= 0) {
      toast.error("Vui lòng nhập số lượng hợp lệ.");

      return;
    }

    if (!stockProduct) {
      return;
    }

    try {
      setStockSaving(true);

      const res = await productService.adjustStock(stockProduct.id, {
        type: stockType,

        quantity: Number(stockQuantity),

        note: stockNote.trim(),
      });

      toast.success(res.message || "Điều chỉnh tồn kho thành công.");

      closeStockModal();

      await refresh();
    } catch (error) {
      console.error(error);

      toast.error(
        error.response?.data?.message || "Không thể điều chỉnh tồn kho.",
      );
    } finally {
      setStockSaving(false);
    }
  };

  // =======================================================
  // STOCK HISTORY
  // =======================================================

  const openStockHistory = async (product) => {
    setHistoryProduct(product);

    setHistoryOpen(true);

    try {
      setHistoryLoading(true);

      const res = await productService.getStockHistory(product.id);

      setStockHistory(
        Array.isArray(res.data) ? res.data : res.data?.data || [],
      );
    } catch (error) {
      console.error(error);

      setStockHistory([]);

      toast.error("Không tải được lịch sử tồn kho.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const closeStockHistory = () => {
    setHistoryOpen(false);

    setHistoryProduct(null);

    setStockHistory([]);
  };

  // =======================================================
  // PAGINATION
  // =======================================================

  const currentPage = Number(pagination?.page || 1);

  const totalPages = Math.max(Number(pagination?.totalPages || 1), 1);

  const totalProducts = Number(pagination?.total || 0);

  const pageLimit = Number(pagination?.limit || filters.limit || 10);

  const pageStart = totalProducts > 0 ? (currentPage - 1) * pageLimit + 1 : 0;

  const pageEnd = Math.min(currentPage * pageLimit, totalProducts);

  const changePage = (newPage) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage) {
      return;
    }

    setFilters((previous) => ({
      ...previous,

      page: newPage,
    }));
  };

  const renderPages = () => {
    if (totalPages <= 7) {
      return Array.from(
        {
          length: totalPages,
        },
        (_, index) => index + 1,
      );
    }

    const result = [1];

    if (currentPage > 4) {
      result.push("left-dots");
    }

    const start = Math.max(2, currentPage - 1);

    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let number = start; number <= end; number += 1) {
      result.push(number);
    }

    if (currentPage < totalPages - 3) {
      result.push("right-dots");
    }

    result.push(totalPages);

    return result;
  };

  // =======================================================
  // CONFIRM META
  // =======================================================

  const confirmMeta = useMemo(() => {
    const count = selectedProducts.length;

    switch (confirmType) {
      case "restore":
        return {
          type: "success",

          icon: "bi-arrow-counterclockwise",

          title: bulkAction
            ? `Khôi phục ${count} sản phẩm`
            : "Khôi phục sản phẩm",

          message: bulkAction
            ? `Bạn có chắc muốn khôi phục ${count} sản phẩm đã chọn?`
            : `Bạn có chắc muốn khôi phục "${confirmProduct?.name || ""}"?`,

          button: "Khôi phục",
        };

      case "force-delete":
        return {
          type: "danger",

          icon: "bi-exclamation-triangle-fill",

          title: bulkAction
            ? `Xóa vĩnh viễn ${count} sản phẩm`
            : "Xóa vĩnh viễn sản phẩm",

          message: bulkAction
            ? `Bạn sắp XÓA VĨNH VIỄN ${count} sản phẩm. Hành động này không thể hoàn tác.`
            : `Bạn sắp XÓA VĨNH VIỄN "${confirmProduct?.name || ""}". Hành động này không thể hoàn tác.`,

          button: "Xóa vĩnh viễn",
        };

      default:
        return {
          type: "danger",

          icon: "bi-trash3-fill",

          title: bulkAction ? `Xóa ${count} sản phẩm` : "Xóa sản phẩm",

          message: bulkAction
            ? `Bạn có chắc muốn chuyển ${count} sản phẩm đã chọn vào Thùng rác?`
            : `Bạn có chắc muốn chuyển "${confirmProduct?.name || ""}" vào Thùng rác?`,

          button: "Xóa",
        };
    }
  }, [confirmType, confirmProduct, bulkAction, selectedProducts.length]);

  // =======================================================
  // STATISTICS
  // =======================================================

  const stats = [
    {
      title: "Tổng sản phẩm",

      value: statistics?.total_active || statistics?.total || 0,

      type: "total",

      icon: "bi-box-seam",
    },

    {
      title: "Đang bán",

      value: statistics?.published || 0,

      type: "published",

      icon: "bi-check-circle-fill",
    },

    {
      title: "Sắp hết",

      value: statistics?.low_stock || 0,

      type: "low",

      icon: "bi-exclamation-triangle-fill",
    },

    {
      title: "Hết hàng",

      value: statistics?.out_of_stock || 0,

      type: "out",

      icon: "bi-x-circle-fill",
    },

    {
      title: "Thùng rác",

      value: statistics?.trash || 0,

      type: "trash",

      icon: "bi-trash3-fill",
    },
  ];

  // =======================================================
  // RENDER
  // =======================================================

  return (
    <div className="adm-product-page">
      {/* =================================================
          HEADER
          ================================================= */}

      <section className="adm-product-header">
        <div>
          <span className="adm-product-header__kicker">Sản phẩm</span>

          <h1 className="adm-product-header__title">
            <span className="adm-product-header__icon">
              <i className="bi bi-box-seam" />
            </span>
            Quản lý sản phẩm
          </h1>

          <p className="adm-product-header__description">
            Quản lý sản phẩm, giá bán, tồn kho, hình ảnh và trạng thái kinh
            doanh.
          </p>
        </div>

        <button
          type="button"
          className="adm-product-button adm-product-button--primary"
          onClick={handleAddProduct}
        >
          <i className="bi bi-plus-lg" />
          Thêm sản phẩm
        </button>
      </section>

      {/* =================================================
          STATS
          ================================================= */}

      <section className="adm-product-stats">
        {stats.map((item) => (
          <article
            key={item.title}
            className={`adm-product-stat adm-product-stat--${item.type}`}
          >
            <div>
              <span>{item.title}</span>

              <strong>{item.value}</strong>
            </div>

            <span className="adm-product-stat__icon">
              <i className={`bi ${item.icon}`} />
            </span>
          </article>
        ))}
      </section>

      {/* =================================================
          TOOLBAR
          ================================================= */}

      <section className="adm-product-panel">
        <div className="adm-product-toolbar">
          <div className="adm-product-toolbar__views">
            <button
              type="button"
              className={[
                "adm-product-view-button",

                viewMode === "all" && "adm-product-view-button--current",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => handleChangeView("all")}
            >
              <i className="bi bi-grid" />
              Tất cả
            </button>

            <button
              type="button"
              className={[
                "adm-product-view-button",

                viewMode === "trash" && "adm-product-view-button--current",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => handleChangeView("trash")}
            >
              <i className="bi bi-trash3" />
              Thùng rác
            </button>
          </div>

          <div className="adm-product-toolbar__actions">
            <button
              type="button"
              className="adm-product-button adm-product-button--secondary"
              onClick={refresh}
            >
              <i className="bi bi-arrow-clockwise" />
              Làm mới
            </button>

            <button
              type="button"
              className="adm-product-button adm-product-button--primary"
              onClick={handleAddProduct}
            >
              <i className="bi bi-plus-lg" />
              Thêm sản phẩm
            </button>
          </div>
        </div>
      </section>

      {/* =================================================
          FILTER
          ================================================= */}

      <section className="adm-product-panel">
        <div className="adm-product-filter">
          <div className="adm-product-search">
            <i className="bi bi-search" />

            <input
              type="text"
              value={keyword}
              placeholder="Tìm theo tên hoặc SKU..."
              onChange={(event) => setKeyword(event.target.value)}
            />

            {keyword && (
              <button
                type="button"
                onClick={() => {
                  setKeyword("");

                  handleFilterChange("keyword", "");
                }}
              >
                <i className="bi bi-x-circle-fill" />
              </button>
            )}
          </div>

          <select
            value={filters.category}
            onChange={(event) =>
              handleFilterChange("category", event.target.value)
            }
            disabled={categoryLoading}
          >
            <option value="">Tất cả danh mục</option>

            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <select
            value={filters.status}
            onChange={(event) =>
              handleFilterChange("status", event.target.value)
            }
          >
            <option value="">Trạng thái</option>

            <option value="active">Đang bán</option>

            <option value="inactive">Ngừng bán</option>
          </select>

          <select
            value={filters.stock}
            onChange={(event) =>
              handleFilterChange("stock", event.target.value)
            }
          >
            <option value="">Tồn kho</option>

            <option value="instock">Còn hàng</option>

            <option value="low">Sắp hết</option>

            <option value="out">Hết hàng</option>
          </select>

          <select
            value={filters.sort}
            onChange={(event) => handleFilterChange("sort", event.target.value)}
          >
            <option value="newest">Mới nhất</option>

            <option value="oldest">Cũ nhất</option>

            <option value="price_asc">Giá tăng</option>

            <option value="price_desc">Giá giảm</option>

            <option value="stock_desc">Tồn kho</option>
          </select>

          <button
            type="button"
            className="adm-product-button adm-product-button--secondary"
            onClick={handleResetFilter}
          >
            <i className="bi bi-arrow-counterclockwise" />
            Reset
          </button>
        </div>
      </section>

      {/* =================================================
          BULK
          ================================================= */}

      {selectedProducts.length > 0 && (
        <section className="adm-product-bulk">
          <div className="adm-product-bulk__info">
            <span className="adm-product-bulk__icon">
              <i className="bi bi-check2-square" />
            </span>

            <div>
              <strong>Đã chọn {selectedProducts.length} sản phẩm</strong>

              <p>Thao tác sẽ áp dụng cho toàn bộ sản phẩm đã chọn.</p>
            </div>
          </div>

          <div className="adm-product-bulk__actions">
            {viewMode === "trash" ? (
              <>
                <button
                  type="button"
                  className="adm-product-button adm-product-button--success-soft"
                  onClick={() => openBulkConfirm("restore")}
                >
                  <i className="bi bi-arrow-counterclockwise" />
                  Khôi phục
                </button>

                <button
                  type="button"
                  className="adm-product-button adm-product-button--danger-soft"
                  onClick={() => openBulkConfirm("force-delete")}
                >
                  <i className="bi bi-trash3-fill" />
                  Xóa vĩnh viễn
                </button>
              </>
            ) : (
              <button
                type="button"
                className="adm-product-button adm-product-button--danger-soft"
                onClick={() => openBulkConfirm("delete")}
              >
                <i className="bi bi-trash" />
                Xóa
              </button>
            )}

            <button
              type="button"
              className="adm-product-button adm-product-button--secondary"
              onClick={() => setSelectedProducts([])}
            >
              <i className="bi bi-x-lg" />
              Bỏ chọn
            </button>
          </div>
        </section>
      )}

      {/* =================================================
          PRODUCT LIST
          ================================================= */}

      <section className="adm-product-panel">
        <div className="adm-product-panel__header">
          <div className="adm-product-panel__heading">
            <span className="adm-product-panel__icon">
              <i className="bi bi-list-ul" />
            </span>

            <div>
              <h2>
                {viewMode === "trash"
                  ? "Sản phẩm trong thùng rác"
                  : "Danh sách sản phẩm"}
              </h2>

              <p>
                {viewMode === "trash"
                  ? "Khôi phục hoặc xóa vĩnh viễn các sản phẩm."
                  : "Theo dõi và quản lý toàn bộ sản phẩm."}
              </p>
            </div>
          </div>

          <span className="adm-product-result-count">
            {totalProducts} sản phẩm
          </span>
        </div>

        {loading ? (
          <div className="adm-product-loading">
            <span className="adm-product-spinner" />

            <strong>Đang tải dữ liệu...</strong>

            <p>Vui lòng chờ trong giây lát.</p>
          </div>
        ) : (
          <div className="adm-product-table-wrap">
            <table className="adm-product-table">
              <thead>
                <tr>
                  <th>
                    <input
                      className="adm-product-checkbox"
                      type="checkbox"
                      checked={
                        products.length > 0 &&
                        selectedProducts.length === products.length
                      }
                      onChange={handleSelectAll}
                    />
                  </th>

                  <th>Ảnh</th>

                  <th>SKU</th>

                  <th>Tên sản phẩm</th>

                  <th>Danh mục</th>

                  <th>Giá</th>

                  <th>Tồn kho</th>

                  <th>Trạng thái</th>

                  <th>Ngày tạo</th>

                  <th>Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="adm-product-table__empty">
                      <div className="adm-product-empty">
                        <span>
                          <i className="bi bi-box-seam" />
                        </span>

                        <strong>Chưa có sản phẩm</strong>

                        <p>Không tìm thấy sản phẩm phù hợp.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  products.map((product) => {
                    const stock = getStockMeta(
                      product.quantity ?? product.remaining ?? 0,
                    );

                    return (
                      <tr key={product.id}>
                        <td>
                          <input
                            className="adm-product-checkbox"
                            type="checkbox"
                            checked={selectedProducts.includes(product.id)}
                            onChange={() => handleSelectProduct(product.id)}
                          />
                        </td>

                        <td>
                          <img
                            className="adm-product-thumb"
                            src={getImageUrl(product.thumbnail)}
                            alt={product.name}
                            onError={(event) => {
                              event.currentTarget.onerror = null;

                              event.currentTarget.src = "/images/no-image.png";
                            }}
                          />
                        </td>

                        <td>
                          <span className="adm-product-sku">{product.sku}</span>
                        </td>

                        <td>
                          <strong
                            className="adm-product-name"
                            title={product.name}
                          >
                            {product.name}
                          </strong>
                        </td>

                        <td>
                          <span className="adm-product-category">
                            {product.category_name || "--"}
                          </span>
                        </td>

                        <td>
                          <div className="adm-product-price">
                            <strong>
                              {formatMoney(product.sale_price || product.price)}
                            </strong>

                            {product.sale_price && (
                              <del>{formatMoney(product.price)}</del>
                            )}
                          </div>
                        </td>

                        <td>
                          <span
                            className={`adm-product-stock adm-product-stock--${stock.type}`}
                          >
                            <i className={`bi ${stock.icon}`} />

                            <span>{stock.value} SP</span>

                            <small>{stock.label}</small>
                          </span>
                        </td>

                        <td>
                          {viewMode === "trash" ? (
                            <span className="adm-product-trash-status">
                              <i className="bi bi-trash3" />
                              Thùng rác
                            </span>
                          ) : (
                            <button
                              type="button"
                              className={[
                                "adm-product-status",

                                Number(product.status) === 1
                                  ? "adm-product-status--active"
                                  : "adm-product-status--inactive",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                              onClick={() => handleToggleStatus(product)}
                            >
                              <span className="adm-product-status__dot" />

                              {Number(product.status) === 1
                                ? "Đang bán"
                                : "Ngừng bán"}
                            </button>
                          )}
                        </td>

                        <td>
                          <span className="adm-product-date">
                            <i className="bi bi-calendar3" />

                            {formatDate(product.created_at)}
                          </span>
                        </td>

                        <td>
                          <ProductActionMenu
                            product={product}
                            viewMode={viewMode}
                            onView={handleViewProduct}
                            onEdit={handleEditProduct}
                            onDuplicate={handleDuplicate}
                            onStock={openStockModal}
                            onStockHistory={openStockHistory}
                            onDelete={(item) => openConfirm("delete", item)}
                            onRestore={(item) => openConfirm("restore", item)}
                            onForceDelete={(item) =>
                              openConfirm("force-delete", item)
                            }
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {!loading && totalPages > 1 && (
          <div className="adm-product-pagination">
            <div className="adm-product-pagination__info">
              Hiển thị <strong>{pageStart}</strong> - <strong>{pageEnd}</strong>{" "}
              / <strong>{totalProducts}</strong> sản phẩm
            </div>

            <div className="adm-product-pagination__actions">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => changePage(1)}
              >
                <i className="bi bi-chevron-double-left" />
              </button>

              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => changePage(currentPage - 1)}
              >
                <i className="bi bi-chevron-left" />
              </button>

              {renderPages().map((item) =>
                typeof item === "string" ? (
                  <span key={item} className="adm-product-pagination__dots">
                    ...
                  </span>
                ) : (
                  <button
                    type="button"
                    key={item}
                    className={
                      item === currentPage
                        ? "adm-product-pagination__current"
                        : ""
                    }
                    onClick={() => changePage(item)}
                  >
                    {item}
                  </button>
                ),
              )}

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => changePage(currentPage + 1)}
              >
                <i className="bi bi-chevron-right" />
              </button>

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => changePage(totalPages)}
              >
                <i className="bi bi-chevron-double-right" />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* =================================================
          PRODUCT CREATE / EDIT MODAL
          ================================================= */}

      {productModalOpen && (
        <div className="adm-product-modal" onClick={closeProductModal}>
          <div
            className="adm-product-modal__dialog adm-product-modal__dialog--large"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="adm-product-modal__header">
              <div className="adm-product-modal__heading">
                <span className="adm-product-panel__icon">
                  <i
                    className={
                      productModalMode === "create"
                        ? "bi bi-plus-lg"
                        : "bi bi-pencil-square"
                    }
                  />
                </span>

                <div>
                  <h2>
                    {productModalMode === "create"
                      ? "Thêm sản phẩm"
                      : "Cập nhật sản phẩm"}
                  </h2>

                  <p>
                    {productModalMode === "create"
                      ? "Nhập thông tin sản phẩm mới."
                      : "Chỉnh sửa thông tin sản phẩm."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="adm-product-modal__close"
                onClick={closeProductModal}
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <form className="adm-product-form" onSubmit={handleProductSubmit}>
              {/* GENERAL */}

              <section className="adm-product-form-card">
                <div className="adm-product-form-card__header">
                  <span>
                    <i className="bi bi-info-circle" />
                  </span>

                  <div>
                    <h3>Thông tin chung</h3>

                    <p>Thông tin nhận diện chính của sản phẩm.</p>
                  </div>
                </div>

                <div className="adm-product-form-grid adm-product-form-grid--3">
                  <div className="adm-product-field">
                    <label>
                      Tên sản phẩm
                      <b>*</b>
                    </label>

                    <input
                      type="text"
                      name="name"
                      value={productForm.name || ""}
                      className={
                        productFormErrors.name
                          ? "adm-product-input adm-product-input--error"
                          : "adm-product-input"
                      }
                      onChange={handleProductFieldChange}
                    />

                    {productFormErrors.name && (
                      <small>{productFormErrors.name}</small>
                    )}
                  </div>

                  <div className="adm-product-field">
                    <label>
                      SKU
                      <b>*</b>
                    </label>

                    <input
                      type="text"
                      name="sku"
                      value={productForm.sku || ""}
                      className={
                        productFormErrors.sku
                          ? "adm-product-input adm-product-input--error"
                          : "adm-product-input"
                      }
                      onChange={handleProductFieldChange}
                    />

                    {productFormErrors.sku && (
                      <small>{productFormErrors.sku}</small>
                    )}
                  </div>

                  <div className="adm-product-field">
                    <label>
                      Danh mục
                      <b>*</b>
                    </label>

                    <select
                      name="category_id"
                      value={productForm.category_id || ""}
                      className={
                        productFormErrors.category_id
                          ? "adm-product-input adm-product-input--error"
                          : "adm-product-input"
                      }
                      onChange={handleProductFieldChange}
                    >
                      <option value="">Chọn danh mục</option>

                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>

                    {productFormErrors.category_id && (
                      <small>{productFormErrors.category_id}</small>
                    )}
                  </div>

                  <div className="adm-product-field">
                    <label>Trạng thái</label>

                    <select
                      name="status"
                      className="adm-product-input"
                      value={productForm.status ?? 1}
                      onChange={handleProductFieldChange}
                    >
                      <option value={1}>Đang bán</option>

                      <option value={0}>Ngừng bán</option>
                    </select>
                  </div>
                </div>
              </section>

              {/* PRICE + INVENTORY */}

              <div className="adm-product-form-columns">
                <section className="adm-product-form-card">
                  <div className="adm-product-form-card__header">
                    <span className="adm-product-form-card__icon--green">
                      <i className="bi bi-cash-coin" />
                    </span>

                    <div>
                      <h3>Giá sản phẩm</h3>

                      <p>Giá niêm yết và giá khuyến mãi.</p>
                    </div>
                  </div>

                  <div className="adm-product-form-grid adm-product-form-grid--2">
                    <div className="adm-product-field">
                      <label>
                        Giá bán
                        <b>*</b>
                      </label>

                      <input
                        type="number"
                        min="0"
                        name="price"
                        className={
                          productFormErrors.price
                            ? "adm-product-input adm-product-input--error"
                            : "adm-product-input"
                        }
                        value={productForm.price ?? ""}
                        onChange={handleProductFieldChange}
                      />

                      {productFormErrors.price && (
                        <small>{productFormErrors.price}</small>
                      )}
                    </div>

                    <div className="adm-product-field">
                      <label>Giá khuyến mãi</label>

                      <input
                        type="number"
                        min="0"
                        name="sale_price"
                        className={
                          productFormErrors.sale_price
                            ? "adm-product-input adm-product-input--error"
                            : "adm-product-input"
                        }
                        value={productForm.sale_price ?? ""}
                        onChange={handleProductFieldChange}
                      />

                      {productFormErrors.sale_price && (
                        <small>{productFormErrors.sale_price}</small>
                      )}
                    </div>
                  </div>
                </section>

                <section className="adm-product-form-card">
                  <div className="adm-product-form-card__header">
                    <span className="adm-product-form-card__icon--orange">
                      <i className="bi bi-boxes" />
                    </span>

                    <div>
                      <h3>Tồn kho</h3>

                      <p>Số lượng ban đầu của sản phẩm.</p>
                    </div>
                  </div>

                  <div className="adm-product-field">
                    <label>Số lượng</label>

                    <input
                      type="number"
                      min="0"
                      name="quantity"
                      className={
                        productFormErrors.quantity
                          ? "adm-product-input adm-product-input--error"
                          : "adm-product-input"
                      }
                      value={productForm.quantity ?? 0}
                      onChange={handleProductFieldChange}
                    />

                    {productFormErrors.quantity && (
                      <small>{productFormErrors.quantity}</small>
                    )}
                  </div>
                </section>
              </div>

              {/* =================================================
                  DESCRIPTION
                  ================================================= */}

              <section className="adm-product-form-card">
                <div className="adm-product-form-card__header">
                  <span className="adm-product-form-card__icon--purple">
                    <i className="bi bi-card-text" />
                  </span>

                  <div>
                    <h3>Mô tả sản phẩm</h3>

                    <p>Nội dung giới thiệu sản phẩm cho khách hàng.</p>
                  </div>
                </div>

                <div className="adm-product-field">
                  <label>Mô tả ngắn</label>

                  <textarea
                    rows={4}
                    name="short_description"
                    className="adm-product-textarea"
                    value={productForm.short_description || ""}
                    onChange={handleProductFieldChange}
                    placeholder="Ví dụ: RAM Kingston FURY Beast DDR5 hiệu năng cao, thiết kế RGB hiện đại..."
                  />

                  {productFormErrors.short_description && (
                    <small>{productFormErrors.short_description}</small>
                  )}
                </div>

                {/* =============================================
                    RICH TEXT DESCRIPTION
                    ============================================= */}

                <div className="adm-product-field">
                  <label>Mô tả chi tiết</label>

                  <RichTextEditor
                    value={productForm.description || ""}
                    disabled={productSaving}
                    placeholder="Viết mô tả chi tiết sản phẩm. Bạn có thể tạo tiêu đề, in đậm nội dung quan trọng, tạo danh sách ưu điểm, thông tin tương thích..."
                    onChange={(html) => {
                      clearProductError("description");

                      setProductForm((previous) => ({
                        ...previous,

                        description: html,
                      }));
                    }}
                  />

                  {productFormErrors.description && (
                    <small>{productFormErrors.description}</small>
                  )}
                </div>
              </section>

              {/* THUMBNAIL */}

              <section className="adm-product-form-card">
                <div className="adm-product-form-card__header">
                  <span className="adm-product-form-card__icon--blue">
                    <i className="bi bi-image" />
                  </span>

                  <div>
                    <h3>Ảnh đại diện</h3>

                    <p>Ảnh chính hiển thị trong danh sách sản phẩm.</p>
                  </div>
                </div>

                <input
                  key={fileInputKey}
                  type="file"
                  accept="image/*"
                  className="adm-product-file"
                  onChange={handleThumbnail}
                />

                {productFormErrors.thumbnail && (
                  <small className="adm-product-form-error">
                    {productFormErrors.thumbnail}
                  </small>
                )}

                <div className="adm-product-thumbnail-preview">
                  {thumbnailPreview ? (
                    <img src={thumbnailPreview} alt="Thumbnail" />
                  ) : (
                    <div className="adm-product-thumbnail-preview__empty">
                      <i className="bi bi-image" />

                      <span>Chưa có ảnh đại diện</span>
                    </div>
                  )}
                </div>
              </section>

              {/* GALLERY */}

              <section className="adm-product-form-card">
                <div className="adm-product-form-card__header">
                  <span className="adm-product-form-card__icon--blue">
                    <i className="bi bi-images" />
                  </span>

                  <div>
                    <h3>Album ảnh</h3>

                    <p>Thêm nhiều hình ảnh chi tiết của sản phẩm.</p>
                  </div>
                </div>

                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="adm-product-file"
                  onChange={handleGallery}
                />

                <div className="adm-product-gallery">
                  {galleryPreviews.length > 0 ? (
                    galleryPreviews.map((item) => (
                      <div key={item.key} className="adm-product-gallery__item">
                        <img src={item.url} alt="" />

                        <button
                          type="button"
                          onClick={() => removeGalleryImage(item.index)}
                        >
                          <i className="bi bi-x-lg" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="adm-product-gallery__empty">
                      <i className="bi bi-images" />

                      <span>Chưa có ảnh trong album</span>
                    </div>
                  )}
                </div>
              </section>

              {/* FOOTER */}

              <div className="adm-product-form__footer">
                <button
                  type="button"
                  className="adm-product-button adm-product-button--secondary"
                  onClick={closeProductModal}
                  disabled={productSaving}
                >
                  <i className="bi bi-x-circle" />
                  Hủy
                </button>

                <button
                  type="submit"
                  className="adm-product-button adm-product-button--primary"
                  disabled={productSaving}
                >
                  {productSaving ? (
                    <>
                      <span className="adm-product-spinner adm-product-spinner--small" />
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-circle" />

                      {productModalMode === "create"
                        ? "Thêm sản phẩm"
                        : "Lưu thay đổi"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================
          VIEW MODAL
          ================================================= */}

      {viewModalOpen && selectedProduct && (
        <div className="adm-product-modal" onClick={closeViewModal}>
          <div
            className="adm-product-modal__dialog adm-product-view"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="adm-product-modal__header">
              <div className="adm-product-modal__heading">
                <span className="adm-product-panel__icon">
                  <i className="bi bi-eye" />
                </span>

                <div>
                  <h2>{selectedProduct.name}</h2>

                  <p>Chi tiết thông tin sản phẩm.</p>
                </div>
              </div>

              <button
                type="button"
                className="adm-product-modal__close"
                onClick={closeViewModal}
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div className="adm-product-view__body">
              <div className="adm-product-view__main">
                <div className="adm-product-view-gallery">
                  <div className="adm-product-view-gallery__main">
                    <img
                      src={getImageUrl(
                        activeViewImage || selectedProduct.thumbnail,
                      )}
                      alt={selectedProduct.name}
                    />
                  </div>

                  <div className="adm-product-view-gallery__thumbs">
                    {viewGallery.map((image, index) => (
                      <button
                        type="button"
                        key={`${image}-${index}`}
                        className={
                          activeViewImage === image
                            ? "adm-product-view-gallery__thumb adm-product-view-gallery__thumb--current"
                            : "adm-product-view-gallery__thumb"
                        }
                        onClick={() => setActiveViewImage(image)}
                      >
                        <img src={getImageUrl(image)} alt="" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="adm-product-view__information">
                  <span
                    className={
                      Number(selectedProduct.status) === 1
                        ? "adm-product-view__status adm-product-view__status--active"
                        : "adm-product-view__status adm-product-view__status--inactive"
                    }
                  >
                    <span />

                    {Number(selectedProduct.status) === 1
                      ? "Đang bán"
                      : "Ngừng bán"}
                  </span>

                  <section className="adm-product-view-card">
                    <h3>Thông tin sản phẩm</h3>

                    <div className="adm-product-view-grid">
                      <div>
                        <span>SKU</span>

                        <strong>{selectedProduct.sku || "--"}</strong>
                      </div>

                      <div>
                        <span>Danh mục</span>

                        <strong>{selectedProduct.category_name || "--"}</strong>
                      </div>

                      <div>
                        <span>Thương hiệu</span>

                        <strong>{selectedProduct.brand_name || "--"}</strong>
                      </div>

                      <div>
                        <span>Ngày tạo</span>

                        <strong>
                          {formatDate(selectedProduct.created_at)}
                        </strong>
                      </div>
                    </div>
                  </section>

                  <section className="adm-product-view-card">
                    <h3>Giá sản phẩm</h3>

                    <div className="adm-product-view-price">
                      <div>
                        <span>Giá bán</span>

                        <strong>{formatMoney(selectedProduct.price)}</strong>
                      </div>

                      <div>
                        <span>Giá khuyến mãi</span>

                        <strong>
                          {selectedProduct.sale_price
                            ? formatMoney(selectedProduct.sale_price)
                            : "Không có"}
                        </strong>
                      </div>
                    </div>
                  </section>

                  <section className="adm-product-view-card">
                    <h3>Kho hàng</h3>

                    <div className="adm-product-view-stock">
                      <div>
                        <span>Tồn kho</span>

                        <strong>
                          {selectedProduct.quantity ??
                            selectedProduct.remaining ??
                            0}
                        </strong>
                      </div>

                      <div>
                        <span>Đã bán</span>

                        <strong>{selectedProduct.sold || 0}</strong>
                      </div>
                    </div>
                  </section>
                </div>
              </div>

              <section className="adm-product-view-card">
                <h3>Mô tả ngắn</h3>

                <p>
                  {selectedProduct.short_description || "Chưa có mô tả ngắn."}
                </p>
              </section>

              {/* ===========================================
                    RICH TEXT VIEW
                    =========================================== */}

              <section className="adm-product-view-card">
                <h3>Mô tả sản phẩm</h3>

                {!isRichTextEmpty(selectedProduct.description) ? (
                  <div
                    className="adm-product-rich-description"
                    dangerouslySetInnerHTML={{
                      __html: sanitizeRichTextHtml(selectedProduct.description),
                    }}
                  />
                ) : (
                  <p className="adm-product-view-description">Chưa có mô tả.</p>
                )}
              </section>

              <section className="adm-product-view-card">
                <h3>Thông số kỹ thuật</h3>

                {selectedProduct.specifications?.length > 0 ? (
                  <div className="adm-product-specs">
                    {selectedProduct.specifications.map(
                      (specification, index) => (
                        <div key={`${specification.spec_key}-${index}`}>
                          <span>{specification.spec_key}</span>

                          <strong>{specification.spec_value}</strong>
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <p>Chưa có thông số kỹ thuật.</p>
                )}
              </section>
            </div>

            <VariantManager
              product={selectedProduct}
              onProductUpdated={(updatedProduct) => {
                if (!updatedProduct) {
                  return;
                }

                setSelectedProduct(updatedProduct);

                setProducts((previous) =>
                  previous.map((item) =>
                    Number(item.id) === Number(updatedProduct.id)
                      ? {
                          ...item,

                          ...updatedProduct,

                          remaining: updatedProduct.quantity ?? item.remaining,
                        }
                      : item,
                  ),
                );
              }}
            />

            <div className="adm-product-modal__footer">
              <button
                type="button"
                className="adm-product-button adm-product-button--secondary"
                onClick={closeViewModal}
              >
                Đóng
              </button>

              <button
                type="button"
                className="adm-product-button adm-product-button--warning-soft"
                onClick={() => {
                  const current = selectedProduct;

                  closeViewModal();

                  handleEditProduct(current);
                }}
              >
                <i className="bi bi-pencil-square" />
                Chỉnh sửa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================
          STOCK MODAL
          ================================================= */}

      {stockModalOpen && stockProduct && (
        <div className="adm-product-modal" onClick={closeStockModal}>
          <div
            className="adm-product-modal__dialog adm-product-stock-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="adm-product-modal__header">
              <div className="adm-product-modal__heading">
                <span className="adm-product-panel__icon">
                  <i className="bi bi-boxes" />
                </span>

                <div>
                  <h2>Điều chỉnh tồn kho</h2>

                  <p>Cập nhật số lượng sản phẩm trong kho.</p>
                </div>
              </div>

              <button
                type="button"
                className="adm-product-modal__close"
                onClick={closeStockModal}
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div className="adm-product-stock-modal__body">
              <div className="adm-product-stock-product">
                <div>
                  <span>Sản phẩm</span>

                  <strong>{stockProduct.name}</strong>

                  <small>SKU: {stockProduct.sku}</small>
                </div>

                <div className="adm-product-stock-current">
                  <span>Tồn kho hiện tại</span>

                  <strong>
                    {stockProduct.remaining ?? stockProduct.quantity ?? 0}
                  </strong>
                </div>
              </div>

              <div className="adm-product-stock-field">
                <label>Loại điều chỉnh</label>

                <div className="adm-product-stock-radio">
                  <label
                    className={
                      stockType === "import"
                        ? "adm-product-stock-radio__item adm-product-stock-radio__item--current"
                        : "adm-product-stock-radio__item"
                    }
                  >
                    <input
                      type="radio"
                      value="import"
                      checked={stockType === "import"}
                      onChange={(event) => setStockType(event.target.value)}
                    />
                    <i className="bi bi-plus-circle" />
                    Nhập thêm
                  </label>

                  <label
                    className={
                      stockType === "export"
                        ? "adm-product-stock-radio__item adm-product-stock-radio__item--current"
                        : "adm-product-stock-radio__item"
                    }
                  >
                    <input
                      type="radio"
                      value="export"
                      checked={stockType === "export"}
                      onChange={(event) => setStockType(event.target.value)}
                    />
                    <i className="bi bi-dash-circle" />
                    Xuất bớt
                  </label>
                </div>
              </div>

              <div className="adm-product-stock-field">
                <label>Số lượng</label>

                <input
                  type="number"
                  min="1"
                  value={stockQuantity}
                  onChange={(event) => setStockQuantity(event.target.value)}
                  placeholder="Nhập số lượng..."
                />
              </div>

              <div className="adm-product-stock-field">
                <label>Ghi chú</label>

                <textarea
                  rows="4"
                  value={stockNote}
                  onChange={(event) => setStockNote(event.target.value)}
                  placeholder="Nhập ghi chú..."
                />
              </div>
            </div>

            <div className="adm-product-modal__footer">
              <button
                type="button"
                className="adm-product-button adm-product-button--secondary"
                onClick={closeStockModal}
                disabled={stockSaving}
              >
                Hủy
              </button>

              <button
                type="button"
                className="adm-product-button adm-product-button--primary"
                disabled={stockSaving}
                onClick={handleStockSubmit}
              >
                {stockSaving ? (
                  <>
                    <span className="adm-product-spinner adm-product-spinner--small" />
                    Đang cập nhật...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-lg" />
                    Xác nhận
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================
          STOCK HISTORY
          ================================================= */}

      {historyOpen && historyProduct && (
        <div className="adm-product-modal" onClick={closeStockHistory}>
          <div
            className="adm-product-modal__dialog adm-product-history"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="adm-product-modal__header">
              <div className="adm-product-modal__heading">
                <span className="adm-product-panel__icon">
                  <i className="bi bi-clock-history" />
                </span>

                <div>
                  <h2>Lịch sử tồn kho</h2>

                  <p>
                    {historyProduct.name} • SKU: {historyProduct.sku}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="adm-product-modal__close"
                onClick={closeStockHistory}
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div className="adm-product-history__body">
              {historyLoading ? (
                <div className="adm-product-loading">
                  <span className="adm-product-spinner" />

                  <strong>Đang tải lịch sử...</strong>
                </div>
              ) : stockHistory.length === 0 ? (
                <div className="adm-product-empty">
                  <span>
                    <i className="bi bi-clock-history" />
                  </span>

                  <strong>Chưa có lịch sử</strong>

                  <p>Sản phẩm chưa có lần điều chỉnh tồn kho nào.</p>
                </div>
              ) : (
                <div className="adm-product-history-table-wrap">
                  <table className="adm-product-history-table">
                    <thead>
                      <tr>
                        <th>Thời gian</th>

                        <th>Loại</th>

                        <th>Số lượng</th>

                        <th>Trước</th>

                        <th>Sau</th>

                        <th>Ghi chú</th>
                      </tr>
                    </thead>

                    <tbody>
                      {stockHistory.map((item) => (
                        <tr key={item.id}>
                          <td>{formatDateTime(item.created_at)}</td>

                          <td>
                            <span
                              className={`adm-product-history-type adm-product-history-type--${item.type || "adjust"}`}
                            >
                              <i
                                className={
                                  item.type === "import"
                                    ? "bi bi-plus-circle-fill"
                                    : item.type === "export"
                                      ? "bi bi-dash-circle-fill"
                                      : "bi bi-arrow-repeat"
                                }
                              />

                              {item.type === "import"
                                ? "Nhập kho"
                                : item.type === "export"
                                  ? "Xuất kho"
                                  : "Điều chỉnh"}
                            </span>
                          </td>

                          <td>{item.quantity}</td>

                          <td>{item.quantity_before}</td>

                          <td>{item.quantity_after}</td>

                          <td>{item.note || "--"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="adm-product-modal__footer">
              <button
                type="button"
                className="adm-product-button adm-product-button--secondary"
                onClick={closeStockHistory}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================
          CONFIRM
          ================================================= */}

      {confirmOpen && (
        <div className="adm-product-confirm" onClick={closeConfirm}>
          <div
            className="adm-product-confirm__dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <span
              className={`adm-product-confirm__icon adm-product-confirm__icon--${confirmMeta.type}`}
            >
              <i className={`bi ${confirmMeta.icon}`} />
            </span>

            <h2>{confirmMeta.title}</h2>

            <p>{confirmMeta.message}</p>

            {confirmProduct && (
              <div className="adm-product-confirm__product">
                <img
                  src={getImageUrl(confirmProduct.thumbnail)}
                  alt={confirmProduct.name}
                />

                <div>
                  <strong>{confirmProduct.name}</strong>

                  <span>SKU: {confirmProduct.sku}</span>
                </div>
              </div>
            )}

            <div className="adm-product-confirm__actions">
              <button
                type="button"
                className="adm-product-button adm-product-button--secondary"
                disabled={confirmLoading}
                onClick={closeConfirm}
              >
                Hủy
              </button>

              <button
                type="button"
                className={`adm-product-button adm-product-confirm__button--${confirmMeta.type}`}
                disabled={confirmLoading}
                onClick={handleConfirmAction}
              >
                {confirmLoading ? (
                  <>
                    <span className="adm-product-spinner adm-product-spinner--small-dark" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <i className={`bi ${confirmMeta.icon}`} />

                    {confirmMeta.button}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductManagement;
