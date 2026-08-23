import { useEffect, useRef, useState } from "react";

import toast from "react-hot-toast";

import useCategories from "../../../../hooks/useCategories";

import categoryService from "../../../../services/categoryService";

import "./CategoryManagement.css";

const IMAGE_BASE_URL = "http://localhost:5000";

const DEFAULT_FORM = {
  name: "",
  slug: "",
  description: "",
  status: 1,
};

const DEFAULT_FILTER = {
  page: 1,
  limit: 10,
  search: "",
  status: "",
  sort: "newest",
};

// =========================================================
// HELPERS
// =========================================================

const getImageUrl = (image) => {
  if (!image) {
    return "";
  }

  if (image.startsWith("http://") || image.startsWith("https://")) {
    return image;
  }

  return `${IMAGE_BASE_URL}${image}`;
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

// =========================================================
// ACTION MENU
// =========================================================

function CategoryActionMenu({
  category,
  viewMode,
  onView,
  onEdit,
  onDelete,
  onRestore,
  onForceDelete,
  onToggleStatus,
}) {
  const [open, setOpen] = useState(false);

  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="adm-category-action-menu" ref={menuRef}>
      <button
        type="button"
        className="adm-category-action-menu__trigger"
        onClick={() => setOpen((current) => !current)}
        aria-label="Mở thao tác"
      >
        <i className="bi bi-three-dots-vertical" />
      </button>

      {open && (
        <div className="adm-category-action-menu__dropdown">
          {viewMode === "trash" ? (
            <>
              <button
                type="button"
                className="adm-category-action-menu__item adm-category-action-menu__item--restore"
                onClick={() => {
                  onRestore(category);

                  setOpen(false);
                }}
              >
                <i className="bi bi-arrow-counterclockwise" />

                <span>Khôi phục</span>
              </button>

              <button
                type="button"
                className="adm-category-action-menu__item adm-category-action-menu__item--danger"
                onClick={() => {
                  onForceDelete(category);

                  setOpen(false);
                }}
              >
                <i className="bi bi-trash3-fill" />

                <span>Xóa vĩnh viễn</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="adm-category-action-menu__item"
                onClick={() => {
                  onView(category);

                  setOpen(false);
                }}
              >
                <i className="bi bi-eye" />

                <span>Xem chi tiết</span>
              </button>

              <button
                type="button"
                className="adm-category-action-menu__item"
                onClick={() => {
                  onEdit(category);

                  setOpen(false);
                }}
              >
                <i className="bi bi-pencil-square" />

                <span>Chỉnh sửa</span>
              </button>

              <button
                type="button"
                className="adm-category-action-menu__item adm-category-action-menu__item--status"
                onClick={() => {
                  onToggleStatus(category);

                  setOpen(false);
                }}
              >
                <i className="bi bi-arrow-repeat" />

                <span>
                  {Number(category.status) === 1 ? "Tạm khóa" : "Kích hoạt"}
                </span>
              </button>

              <button
                type="button"
                className="adm-category-action-menu__item adm-category-action-menu__item--danger"
                onClick={() => {
                  onDelete(category);

                  setOpen(false);
                }}
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
// CATEGORY MANAGEMENT
// =========================================================

function CategoryManagement() {
  const [viewMode, setViewMode] = useState("all");

  const [selectedCategories, setSelectedCategories] = useState([]);

  const {
    categories,
    loading,
    statistics,
    pagination,
    filters,
    setFilters,
    refresh,
  } = useCategories(viewMode);

  const [searchKeyword, setSearchKeyword] = useState(filters.search || "");

  const [openModal, setOpenModal] = useState(false);

  const [modalMode, setModalMode] = useState("create");

  const [selectedCategory, setSelectedCategory] = useState(null);

  const [openViewModal, setOpenViewModal] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);

  const [confirmLoading, setConfirmLoading] = useState(false);

  const [confirmType, setConfirmType] = useState("delete");

  const [bulkMode, setBulkMode] = useState(false);

  // =======================================================
  // CATEGORY FORM
  // =======================================================

  const [categoryForm, setCategoryForm] = useState({
    ...DEFAULT_FORM,
  });

  const [categoryFormErrors, setCategoryFormErrors] = useState({});

  const [categoryImageFile, setCategoryImageFile] = useState(null);

  const [categoryPreview, setCategoryPreview] = useState("");

  const [categorySaving, setCategorySaving] = useState(false);

  const [fileInputKey, setFileInputKey] = useState(Date.now());

  // =======================================================
  // RESET SELECTION
  // =======================================================

  useEffect(() => {
    setSelectedCategories([]);
  }, [categories]);

  // =======================================================
  // ESCAPE
  // =======================================================

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key !== "Escape") {
        return;
      }

      if (confirmOpen) {
        setConfirmOpen(false);

        return;
      }

      if (openViewModal) {
        setOpenViewModal(false);

        setSelectedCategory(null);

        return;
      }

      if (openModal) {
        closeCategoryModal();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  });

  // =======================================================
  // SELECT
  // =======================================================

  const handleSelectCategory = (id) => {
    setSelectedCategories((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id],
    );
  };

  const handleSelectAll = () => {
    if (selectedCategories.length === categories.length) {
      setSelectedCategories([]);

      return;
    }

    setSelectedCategories(categories.map((item) => item.id));
  };

  // =======================================================
  // VIEW
  // =======================================================

  const handleView = async (category) => {
    try {
      const res = await categoryService.getCategoryById(category.id);

      setSelectedCategory(res.data);

      setOpenViewModal(true);
    } catch (error) {
      console.error(error);

      toast.error("Không thể tải thông tin danh mục.");
    }
  };

  // =======================================================
  // FORM RESET
  // =======================================================

  const resetCategoryForm = () => {
    setCategoryForm({
      ...DEFAULT_FORM,
    });

    setCategoryFormErrors({});

    setCategoryImageFile(null);

    setCategoryPreview("");

    setFileInputKey(Date.now());
  };

  const closeCategoryModal = () => {
    setOpenModal(false);

    setSelectedCategory(null);

    setModalMode("create");

    resetCategoryForm();
  };

  // =======================================================
  // ADD
  // =======================================================

  const handleAdd = () => {
    setModalMode("create");

    setSelectedCategory(null);

    resetCategoryForm();

    setOpenModal(true);
  };

  // =======================================================
  // EDIT
  // =======================================================

  const handleEdit = async (category) => {
    try {
      const res = await categoryService.getCategoryById(category.id);

      const data = res.data;

      setModalMode("edit");

      setSelectedCategory(data);

      setCategoryForm({
        name: data.name || "",

        slug: data.slug || "",

        description: data.description || "",

        status: Number(data.status) === 1 ? 1 : 0,
      });

      setCategoryImageFile(null);

      setCategoryPreview(data.image ? getImageUrl(data.image) : "");

      setCategoryFormErrors({});

      setFileInputKey(Date.now());

      setOpenModal(true);
    } catch (error) {
      console.error(error);

      toast.error("Không thể tải thông tin danh mục.");
    }
  };

  // =======================================================
  // FORM CHANGE
  // =======================================================

  const handleCategoryFormChange = (event) => {
    const { name, value } = event.target;

    setCategoryForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setCategoryFormErrors((previous) => ({
      ...previous,
      [name]: "",
    }));
  };

  // =======================================================
  // IMAGE
  // =======================================================

  const handleChooseImage = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setCategoryFormErrors((previous) => ({
        ...previous,

        image: "Chỉ cho phép JPG, JPEG, PNG hoặc WEBP.",
      }));

      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setCategoryFormErrors((previous) => ({
        ...previous,

        image: "Ảnh không được vượt quá 5MB.",
      }));

      return;
    }

    setCategoryImageFile(file);

    setCategoryPreview(URL.createObjectURL(file));

    setCategoryFormErrors((previous) => ({
      ...previous,
      image: "",
    }));
  };

  // =======================================================
  // FORM SUBMIT
  // =======================================================

  const handleCategorySubmit = async (event) => {
    event.preventDefault();

    const validateErrors = {};

    if (!categoryForm.name.trim()) {
      validateErrors.name = "Tên danh mục không được để trống.";
    }

    if (!categoryForm.slug.trim()) {
      validateErrors.slug = "Slug không được để trống.";
    }

    if (Object.keys(validateErrors).length > 0) {
      setCategoryFormErrors(validateErrors);

      return;
    }

    try {
      setCategorySaving(true);

      setCategoryFormErrors({});

      const formData = new FormData();

      formData.append("name", categoryForm.name.trim());

      formData.append("slug", categoryForm.slug.trim());

      formData.append("description", categoryForm.description.trim());

      formData.append("status", categoryForm.status);

      if (categoryImageFile) {
        formData.append("image", categoryImageFile);
      }

      let res;

      if (modalMode === "create") {
        res = await categoryService.createCategory(formData);
      } else {
        res = await categoryService.updateCategory(
          selectedCategory.id,
          formData,
        );
      }

      toast.success(res.message);

      closeCategoryModal();

      await refresh();
    } catch (error) {
      console.error(error);

      if (error.response?.status === 422) {
        setCategoryFormErrors(error.response.data?.errors || {});

        return;
      }

      toast.error(error.response?.data?.message || "Không thể lưu danh mục.");
    } finally {
      setCategorySaving(false);
    }
  };

  // =======================================================
  // CONFIRM
  // =======================================================

  const openConfirm = (type, category) => {
    setBulkMode(false);

    setConfirmType(type);

    setSelectedCategory(category);

    setConfirmOpen(true);
  };

  const closeConfirm = () => {
    setConfirmOpen(false);

    setSelectedCategory(null);

    setBulkMode(false);
  };

  const openBulkConfirm = (type) => {
    setBulkMode(true);

    setConfirmType(type);

    setSelectedCategory(null);

    setConfirmOpen(true);
  };

  // =======================================================
  // SINGLE ACTIONS
  // =======================================================

  const handleDelete = (category) => {
    openConfirm("delete", category);
  };

  const handleRestore = (category) => {
    openConfirm("restore", category);
  };

  const handleForceDelete = (category) => {
    openConfirm("force", category);
  };

  // =======================================================
  // CONFIRM ACTION
  // =======================================================

  const handleConfirm = async () => {
    try {
      setConfirmLoading(true);

      let res;

      if (bulkMode) {
        switch (confirmType) {
          case "delete":
            res = await categoryService.bulkDelete(selectedCategories);

            break;

          case "restore":
            res = await categoryService.bulkRestore(selectedCategories);

            break;

          case "force":
            res = await categoryService.bulkForceDelete(selectedCategories);

            break;

          case "status":
            res = await categoryService.bulkToggleStatus(selectedCategories);

            break;

          default:
            return;
        }

        toast.success(res.message);

        setSelectedCategories([]);

        closeConfirm();

        await refresh();

        return;
      }

      if (!selectedCategory) {
        return;
      }

      switch (confirmType) {
        case "delete":
          res = await categoryService.deleteCategory(selectedCategory.id);

          break;

        case "restore":
          res = await categoryService.restoreCategory(selectedCategory.id);

          break;

        case "force":
          res = await categoryService.forceDeleteCategory(selectedCategory.id);

          break;

        default:
          return;
      }

      toast.success(res.message);

      closeConfirm();

      await refresh();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Không thể thực hiện thao tác.",
      );
    } finally {
      setConfirmLoading(false);
    }
  };

  // =======================================================
  // STATUS
  // =======================================================

  const handleToggleStatus = async (category) => {
    try {
      const res = await categoryService.toggleStatus(category.id);

      toast.success(res.message);

      await refresh();
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể đổi trạng thái.");
    }
  };

  // =======================================================
  // BULK
  // =======================================================

  const handleBulkDelete = () => {
    openBulkConfirm("delete");
  };

  const handleBulkRestore = () => {
    openBulkConfirm("restore");
  };

  const handleBulkForceDelete = () => {
    openBulkConfirm("force");
  };

  const handleBulkToggleStatus = () => {
    openBulkConfirm("status");
  };

  // =======================================================
  // VIEW MODE
  // =======================================================

  const handleChangeView = (mode) => {
    setViewMode(mode);

    setSelectedCategories([]);

    setFilters((previous) => ({
      ...previous,
      page: 1,
    }));
  };

  // =======================================================
  // REFRESH
  // =======================================================

  const handleRefresh = async () => {
    setSelectedCategories([]);

    await refresh();
  };

  // =======================================================
  // SEARCH
  // =======================================================

  const handleSearch = (event) => {
    event.preventDefault();

    setFilters((previous) => ({
      ...previous,

      page: 1,

      search: searchKeyword.trim(),
    }));
  };

  // =======================================================
  // FILTER
  // =======================================================

  const handleFilterChange = (key, value) => {
    setFilters((previous) => ({
      ...previous,

      [key]: value,

      page: 1,
    }));
  };

  const handleResetFilter = () => {
    setSearchKeyword("");

    setFilters({
      ...DEFAULT_FILTER,
    });
  };

  // =======================================================
  // PAGINATION
  // =======================================================

  const changePage = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages) {
      return;
    }

    setFilters((previous) => ({
      ...previous,

      page: newPage,
    }));
  };

  const getPages = () => {
    if (!pagination) {
      return [];
    }

    const { page: currentPage, totalPages } = pagination;

    if (totalPages <= 7) {
      return Array.from(
        {
          length: totalPages,
        },
        (_, index) => index + 1,
      );
    }

    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages];
    }

    if (currentPage >= totalPages - 3) {
      return [
        1,
        "...",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }

    return [
      1,
      "...",
      currentPage - 1,
      currentPage,
      currentPage + 1,
      "...",
      totalPages,
    ];
  };

  // =======================================================
  // CONFIRM META
  // =======================================================

  const getConfirmMeta = () => {
    const config = {
      delete: {
        icon: "bi-trash3-fill",

        type: "danger",

        button: "Xóa",

        title: bulkMode
          ? `Xóa ${selectedCategories.length} danh mục`
          : "Xóa danh mục",

        message: bulkMode
          ? "Bạn có chắc chắn muốn chuyển các danh mục đã chọn vào Thùng rác?"
          : "Danh mục sẽ được chuyển vào Thùng rác.",
      },

      restore: {
        icon: "bi-arrow-counterclockwise",

        type: "success",

        button: "Khôi phục",

        title: bulkMode
          ? `Khôi phục ${selectedCategories.length} danh mục`
          : "Khôi phục danh mục",

        message: bulkMode
          ? "Các danh mục đã chọn sẽ được khôi phục."
          : "Danh mục sẽ được khôi phục.",
      },

      force: {
        icon: "bi-exclamation-triangle-fill",

        type: "warning",

        button: "Xóa vĩnh viễn",

        title: bulkMode
          ? `Xóa vĩnh viễn ${selectedCategories.length} danh mục`
          : "Xóa vĩnh viễn",

        message: "Hành động này không thể hoàn tác.",
      },

      status: {
        icon: "bi-arrow-repeat",

        type: "primary",

        button: "Xác nhận",

        title: `Đổi trạng thái ${selectedCategories.length} danh mục`,

        message: "Trạng thái của các danh mục đã chọn sẽ được thay đổi.",
      },
    };

    return config[confirmType] || config.delete;
  };

  const confirmMeta = getConfirmMeta();

  // =======================================================
  // DASHBOARD
  // =======================================================

  const dashboardCards = [
    {
      title: "Tổng danh mục",

      value: statistics?.total || 0,

      icon: "bi-grid-3x3-gap-fill",

      type: "total",
    },

    {
      title: "Đang hoạt động",

      value: statistics?.active || 0,

      icon: "bi-check-circle-fill",

      type: "active",
    },

    {
      title: "Trong thùng rác",

      value: statistics?.trash || 0,

      icon: "bi-trash3-fill",

      type: "trash",
    },
  ];

  // =======================================================
  // PAGINATION VALUES
  // =======================================================

  const currentPage = Number(pagination?.page || 1);

  const totalPages = Number(pagination?.totalPages || 1);

  const total = Number(pagination?.total || 0);

  const pageLimit = Number(pagination?.limit || filters.limit || 10);

  const paginationStart = total > 0 ? (currentPage - 1) * pageLimit + 1 : 0;

  const paginationEnd = Math.min(currentPage * pageLimit, total);

  const pages = getPages();

  // =======================================================
  // RENDER
  // =======================================================

  return (
    <div className="adm-category-page">
      {/* ===================================================
          HEADER
          =================================================== */}

      <section className="adm-category-header">
        <div className="adm-category-header__content">
          <span className="adm-category-header__kicker">Danh mục</span>

          <h1 className="adm-category-header__title">
            <span className="adm-category-header__title-icon">
              <i className="bi bi-grid" />
            </span>

            <span>Quản lý danh mục</span>
          </h1>

          <p className="adm-category-header__description">
            Quản lý danh mục linh kiện và sản phẩm trong hệ thống.
          </p>
        </div>

        <button
          type="button"
          className="adm-category-button adm-category-button--primary"
          onClick={handleAdd}
        >
          <i className="bi bi-plus-lg" />

          <span>Thêm danh mục</span>
        </button>
      </section>

      {/* ===================================================
          STATISTICS
          =================================================== */}

      <section className="adm-category-stats">
        {dashboardCards.map((item) => (
          <article
            key={item.title}
            className={`adm-category-stat-card adm-category-stat-card--${item.type}`}
          >
            <div className="adm-category-stat-card__content">
              <span>{item.title}</span>

              <strong>{item.value}</strong>
            </div>

            <span className="adm-category-stat-card__icon">
              <i className={`bi ${item.icon}`} />
            </span>
          </article>
        ))}
      </section>

      {/* ===================================================
          TOOLBAR
          =================================================== */}

      <section className="adm-category-panel">
        <div className="adm-category-toolbar">
          <div className="adm-category-toolbar__views">
            <button
              type="button"
              className={[
                "adm-category-view-button",

                viewMode === "all" && "adm-category-view-button--current",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => handleChangeView("all")}
            >
              <i className="bi bi-grid" />

              <span>Danh sách</span>
            </button>

            <button
              type="button"
              className={[
                "adm-category-view-button",

                viewMode === "trash" && "adm-category-view-button--current",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => handleChangeView("trash")}
            >
              <i className="bi bi-trash3" />

              <span>Thùng rác</span>
            </button>
          </div>

          <div className="adm-category-toolbar__actions">
            <form className="adm-category-search" onSubmit={handleSearch}>
              <i className="bi bi-search" />

              <input
                type="text"
                value={searchKeyword}
                placeholder="Tìm danh mục..."
                onChange={(event) => setSearchKeyword(event.target.value)}
              />
            </form>

            <button
              type="button"
              className="adm-category-icon-button"
              onClick={handleRefresh}
              title="Làm mới"
            >
              <i className="bi bi-arrow-clockwise" />
            </button>

            <button
              type="button"
              className="adm-category-button adm-category-button--primary"
              onClick={handleAdd}
            >
              <i className="bi bi-plus-lg" />

              <span>Thêm danh mục</span>
            </button>
          </div>
        </div>
      </section>

      {/* ===================================================
          BULK TOOLBAR
          =================================================== */}

      {selectedCategories.length > 0 && (
        <section className="adm-category-bulk">
          <div className="adm-category-bulk__selected">
            <span className="adm-category-bulk__icon">
              <i className="bi bi-check2-square" />
            </span>

            <span>
              Đã chọn <strong>{selectedCategories.length}</strong> danh mục
            </span>
          </div>

          <div className="adm-category-bulk__actions">
            {viewMode === "trash" ? (
              <>
                <button
                  type="button"
                  className="adm-category-button adm-category-button--success-soft"
                  onClick={handleBulkRestore}
                >
                  <i className="bi bi-arrow-counterclockwise" />
                  Khôi phục
                </button>

                <button
                  type="button"
                  className="adm-category-button adm-category-button--danger-soft"
                  onClick={handleBulkForceDelete}
                >
                  <i className="bi bi-trash3-fill" />
                  Xóa vĩnh viễn
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="adm-category-button adm-category-button--warning-soft"
                  onClick={handleBulkToggleStatus}
                >
                  <i className="bi bi-arrow-repeat" />
                  Đổi trạng thái
                </button>

                <button
                  type="button"
                  className="adm-category-button adm-category-button--danger-soft"
                  onClick={handleBulkDelete}
                >
                  <i className="bi bi-trash" />
                  Xóa
                </button>
              </>
            )}

            <button
              type="button"
              className="adm-category-button adm-category-button--secondary"
              onClick={() => setSelectedCategories([])}
            >
              <i className="bi bi-x-circle" />
              Bỏ chọn
            </button>
          </div>
        </section>
      )}

      {/* ===================================================
          FILTER
          =================================================== */}

      <section className="adm-category-panel">
        <div className="adm-category-filter">
          <div className="adm-category-filter__heading">
            <span className="adm-category-panel-icon adm-category-panel-icon--purple">
              <i className="bi bi-funnel" />
            </span>

            <div>
              <h2>Bộ lọc danh mục</h2>

              <p>Lọc theo trạng thái và thứ tự hiển thị.</p>
            </div>
          </div>

          <div className="adm-category-filter__controls">
            <select
              value={filters.status}
              onChange={(event) =>
                handleFilterChange("status", event.target.value)
              }
            >
              <option value="">Tất cả trạng thái</option>

              <option value="1">Đang hoạt động</option>

              <option value="0">Đã khóa</option>
            </select>

            <select
              value={filters.sort}
              onChange={(event) =>
                handleFilterChange("sort", event.target.value)
              }
            >
              <option value="newest">Mới nhất</option>

              <option value="oldest">Cũ nhất</option>

              <option value="name_asc">Tên A-Z</option>

              <option value="name_desc">Tên Z-A</option>
            </select>

            <button
              type="button"
              className="adm-category-button adm-category-button--secondary"
              onClick={handleResetFilter}
            >
              <i className="bi bi-arrow-counterclockwise" />
              Làm mới lọc
            </button>

            <span className="adm-category-filter__result">
              <i className="bi bi-folder2-open" />
              Tổng: <strong>{total}</strong> danh mục
            </span>
          </div>
        </div>
      </section>

      {/* ===================================================
          TABLE
          =================================================== */}

      <section className="adm-category-panel">
        <div className="adm-category-panel__header">
          <div className="adm-category-panel__heading">
            <span className="adm-category-panel-icon adm-category-panel-icon--blue">
              <i className="bi bi-list-ul" />
            </span>

            <div>
              <h2>
                {viewMode === "trash"
                  ? "Danh mục trong thùng rác"
                  : "Danh sách danh mục"}
              </h2>

              <p>
                {viewMode === "trash"
                  ? "Khôi phục hoặc xóa vĩnh viễn danh mục."
                  : "Quản lý các danh mục đang sử dụng."}
              </p>
            </div>
          </div>

          <span className="adm-category-result-count">{total} danh mục</span>
        </div>

        {loading ? (
          <div className="adm-category-loading">
            <span className="adm-category-spinner" />

            <strong>Đang tải dữ liệu...</strong>

            <p>Vui lòng chờ trong giây lát.</p>
          </div>
        ) : (
          <div className="adm-category-table-wrap">
            <table className="adm-category-table">
              <thead>
                <tr>
                  <th>
                    <input
                      className="adm-category-checkbox"
                      type="checkbox"
                      checked={
                        categories.length > 0 &&
                        selectedCategories.length === categories.length
                      }
                      onChange={handleSelectAll}
                    />
                  </th>

                  <th>Ảnh</th>

                  <th>Tên danh mục</th>

                  <th>Slug</th>

                  <th>Mô tả</th>

                  <th>Trạng thái</th>

                  <th>Ngày tạo</th>

                  <th>Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {categories.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="adm-category-table__empty-cell">
                      <div className="adm-category-empty">
                        <span className="adm-category-empty__icon">
                          <i className="bi bi-folder2-open" />
                        </span>

                        <strong>Không có danh mục</strong>

                        <p>Không tìm thấy danh mục phù hợp với bộ lọc.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  categories.map((category) => (
                    <tr key={category.id}>
                      <td>
                        <input
                          className="adm-category-checkbox"
                          type="checkbox"
                          checked={selectedCategories.includes(category.id)}
                          onChange={() => handleSelectCategory(category.id)}
                        />
                      </td>

                      <td>
                        {category.image ? (
                          <img
                            src={getImageUrl(category.image)}
                            alt={category.name}
                            className="adm-category-image"
                          />
                        ) : (
                          <span className="adm-category-image-placeholder">
                            <i className="bi bi-image" />
                          </span>
                        )}
                      </td>

                      <td>
                        <div className="adm-category-name">
                          <span className="adm-category-name__icon">
                            <i className="bi bi-folder2" />
                          </span>

                          <strong>{category.name}</strong>
                        </div>
                      </td>

                      <td>
                        <code className="adm-category-slug">
                          {category.slug}
                        </code>
                      </td>

                      <td>
                        <span
                          className="adm-category-description"
                          title={category.description || ""}
                        >
                          {category.description
                            ? category.description.length > 70
                              ? `${category.description.slice(0, 70)}...`
                              : category.description
                            : "--"}
                        </span>
                      </td>

                      <td>
                        {viewMode === "trash" ? (
                          <span className="adm-category-trash-label">
                            <i className="bi bi-trash3" />
                            Trong thùng rác
                          </span>
                        ) : (
                          <button
                            type="button"
                            className={[
                              "adm-category-status",

                              Number(category.status) === 1
                                ? "adm-category-status--active"
                                : "adm-category-status--inactive",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            onClick={() => handleToggleStatus(category)}
                          >
                            <span className="adm-category-status__dot" />

                            <span>
                              {Number(category.status) === 1
                                ? "Hoạt động"
                                : "Tạm khóa"}
                            </span>
                          </button>
                        )}
                      </td>

                      <td>
                        <span className="adm-category-date">
                          <i className="bi bi-calendar3" />

                          {formatDate(category.created_at)}
                        </span>
                      </td>

                      <td>
                        <CategoryActionMenu
                          category={category}
                          viewMode={viewMode}
                          onView={handleView}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onRestore={handleRestore}
                          onForceDelete={handleForceDelete}
                          onToggleStatus={handleToggleStatus}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* =================================================
            PAGINATION
            ================================================= */}

        {!loading && totalPages > 1 && (
          <div className="adm-category-pagination">
            <div className="adm-category-pagination__info">
              Hiển thị <strong>{paginationStart}</strong> -{" "}
              <strong>{paginationEnd}</strong> trên <strong>{total}</strong>{" "}
              danh mục
            </div>

            <div className="adm-category-pagination__actions">
              <button
                type="button"
                className="adm-category-pagination__button"
                onClick={() => changePage(1)}
                disabled={currentPage === 1}
              >
                <i className="bi bi-chevron-double-left" />
              </button>

              <button
                type="button"
                className="adm-category-pagination__button"
                onClick={() => changePage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <i className="bi bi-chevron-left" />
              </button>

              {pages.map((item, index) =>
                item === "..." ? (
                  <span
                    key={`dots-${index}`}
                    className="adm-category-pagination__dots"
                  >
                    ...
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    className={[
                      "adm-category-pagination__button",

                      currentPage === item &&
                        "adm-category-pagination__button--current",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => changePage(item)}
                  >
                    {item}
                  </button>
                ),
              )}

              <button
                type="button"
                className="adm-category-pagination__button"
                onClick={() => changePage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <i className="bi bi-chevron-right" />
              </button>

              <button
                type="button"
                className="adm-category-pagination__button"
                onClick={() => changePage(totalPages)}
                disabled={currentPage === totalPages}
              >
                <i className="bi bi-chevron-double-right" />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ===================================================
          CREATE / EDIT MODAL
          =================================================== */}

      {openModal && (
        <div className="adm-category-modal" onClick={closeCategoryModal}>
          <div
            className="adm-category-modal__dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="adm-category-modal__header">
              <div className="adm-category-modal__heading">
                <span className="adm-category-panel-icon">
                  <i
                    className={
                      modalMode === "create"
                        ? "bi bi-plus-lg"
                        : "bi bi-pencil-square"
                    }
                  />
                </span>

                <div>
                  <h2>
                    {modalMode === "create"
                      ? "Thêm danh mục"
                      : "Cập nhật danh mục"}
                  </h2>

                  <p>Nhập thông tin danh mục sản phẩm.</p>
                </div>
              </div>

              <button
                type="button"
                className="adm-category-modal__close"
                onClick={closeCategoryModal}
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <form
              className="adm-category-modal__body"
              onSubmit={handleCategorySubmit}
            >
              <div className="adm-category-modal__grid">
                <div className="adm-category-form-field">
                  <label>
                    Tên danh mục
                    <span>*</span>
                  </label>

                  <input
                    type="text"
                    name="name"
                    value={categoryForm.name}
                    className={[
                      "adm-category-form-input",

                      categoryFormErrors.name &&
                        "adm-category-form-input--error",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onChange={handleCategoryFormChange}
                    placeholder="VD: CPU"
                  />

                  {categoryFormErrors.name && (
                    <small className="adm-category-form-error">
                      {categoryFormErrors.name}
                    </small>
                  )}
                </div>

                <div className="adm-category-form-field">
                  <label>
                    Slug
                    <span>*</span>
                  </label>

                  <input
                    type="text"
                    name="slug"
                    value={categoryForm.slug}
                    className={[
                      "adm-category-form-input",

                      categoryFormErrors.slug &&
                        "adm-category-form-input--error",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onChange={handleCategoryFormChange}
                    placeholder="VD: cpu"
                  />

                  {categoryFormErrors.slug && (
                    <small className="adm-category-form-error">
                      {categoryFormErrors.slug}
                    </small>
                  )}
                </div>

                <div className="adm-category-form-field adm-category-form-field--wide">
                  <label>Mô tả</label>

                  <textarea
                    name="description"
                    rows="4"
                    value={categoryForm.description}
                    className={[
                      "adm-category-form-textarea",

                      categoryFormErrors.description &&
                        "adm-category-form-input--error",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onChange={handleCategoryFormChange}
                    placeholder="Nhập mô tả danh mục..."
                  />

                  {categoryFormErrors.description && (
                    <small className="adm-category-form-error">
                      {categoryFormErrors.description}
                    </small>
                  )}
                </div>

                <div className="adm-category-form-field">
                  <label>Ảnh danh mục</label>

                  <input
                    key={fileInputKey}
                    className="adm-category-form-file"
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleChooseImage}
                  />

                  {categoryFormErrors.image && (
                    <small className="adm-category-form-error">
                      {categoryFormErrors.image}
                    </small>
                  )}
                </div>

                <div className="adm-category-form-field">
                  <label>Trạng thái</label>

                  <select
                    className="adm-category-form-input"
                    name="status"
                    value={categoryForm.status}
                    onChange={handleCategoryFormChange}
                  >
                    <option value={1}>Hoạt động</option>

                    <option value={0}>Tạm khóa</option>
                  </select>
                </div>

                {categoryPreview && (
                  <div className="adm-category-preview">
                    <span className="adm-category-preview__label">
                      Xem trước ảnh
                    </span>

                    <img src={categoryPreview} alt="Preview" />
                  </div>
                )}
              </div>

              <div className="adm-category-modal__footer">
                <button
                  type="button"
                  className="adm-category-button adm-category-button--secondary"
                  disabled={categorySaving}
                  onClick={closeCategoryModal}
                >
                  <i className="bi bi-x-circle" />
                  Hủy
                </button>

                <button
                  type="submit"
                  className="adm-category-button adm-category-button--primary"
                  disabled={categorySaving}
                >
                  {categorySaving ? (
                    <>
                      <span className="adm-category-spinner adm-category-spinner--small" />
                      Đang lưu...
                    </>
                  ) : modalMode === "create" ? (
                    <>
                      <i className="bi bi-plus-circle" />
                      Thêm danh mục
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-circle" />
                      Cập nhật
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================
          CONFIRM MODAL
          =================================================== */}

      {confirmOpen && (
        <div className="adm-category-confirm" onClick={closeConfirm}>
          <div
            className="adm-category-confirm__dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <span
              className={`adm-category-confirm__icon adm-category-confirm__icon--${confirmMeta.type}`}
            >
              <i className={`bi ${confirmMeta.icon}`} />
            </span>

            <h2>{confirmMeta.title}</h2>

            <p>{confirmMeta.message}</p>

            {!bulkMode && selectedCategory && (
              <div className="adm-category-confirm__category">
                {selectedCategory.image ? (
                  <img
                    src={getImageUrl(selectedCategory.image)}
                    alt={selectedCategory.name}
                  />
                ) : (
                  <span className="adm-category-confirm__image-empty">
                    <i className="bi bi-image" />
                  </span>
                )}

                <div>
                  <strong>{selectedCategory.name}</strong>

                  <span>{selectedCategory.slug}</span>
                </div>
              </div>
            )}

            <div className="adm-category-confirm__actions">
              <button
                type="button"
                className="adm-category-button adm-category-button--secondary"
                onClick={closeConfirm}
                disabled={confirmLoading}
              >
                <i className="bi bi-x-circle" />
                Hủy
              </button>

              <button
                type="button"
                className={`adm-category-button adm-category-confirm__button--${confirmMeta.type}`}
                onClick={handleConfirm}
                disabled={confirmLoading}
              >
                {confirmLoading ? (
                  <>
                    <span className="adm-category-spinner adm-category-spinner--small-dark" />
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

      {/* ===================================================
          VIEW MODAL
          =================================================== */}

      {openViewModal && selectedCategory && (
        <div
          className="adm-category-view"
          onClick={() => {
            setOpenViewModal(false);

            setSelectedCategory(null);
          }}
        >
          <div
            className="adm-category-view__dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="adm-category-view__header">
              <div className="adm-category-modal__heading">
                <span className="adm-category-panel-icon adm-category-panel-icon--blue">
                  <i className="bi bi-eye" />
                </span>

                <div>
                  <h2>Chi tiết danh mục</h2>

                  <p>Thông tin đầy đủ của danh mục.</p>
                </div>
              </div>

              <button
                type="button"
                className="adm-category-modal__close"
                onClick={() => {
                  setOpenViewModal(false);

                  setSelectedCategory(null);
                }}
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div className="adm-category-view__body">
              <div className="adm-category-view__image">
                {selectedCategory.image ? (
                  <img
                    src={getImageUrl(selectedCategory.image)}
                    alt={selectedCategory.name}
                  />
                ) : (
                  <span>
                    <i className="bi bi-image" />
                  </span>
                )}
              </div>

              <div className="adm-category-view__content">
                <div className="adm-category-view__item">
                  <span>Tên danh mục</span>

                  <strong>{selectedCategory.name}</strong>
                </div>

                <div className="adm-category-view__item">
                  <span>Slug</span>

                  <strong>{selectedCategory.slug}</strong>
                </div>

                <div className="adm-category-view__item">
                  <span>Trạng thái</span>

                  <strong>
                    <span
                      className={[
                        "adm-category-status",

                        Number(selectedCategory.status) === 1
                          ? "adm-category-status--active"
                          : "adm-category-status--inactive",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <span className="adm-category-status__dot" />

                      {Number(selectedCategory.status) === 1
                        ? "Hoạt động"
                        : "Tạm khóa"}
                    </span>
                  </strong>
                </div>

                <div className="adm-category-view__item">
                  <span>Ngày tạo</span>

                  <strong>{formatDateTime(selectedCategory.created_at)}</strong>
                </div>

                <div className="adm-category-view__item">
                  <span>Cập nhật</span>

                  <strong>{formatDateTime(selectedCategory.updated_at)}</strong>
                </div>

                <div className="adm-category-view__description">
                  <span>Mô tả</span>

                  <p>{selectedCategory.description || "Không có mô tả."}</p>
                </div>
              </div>
            </div>

            <div className="adm-category-view__footer">
              <button
                type="button"
                className="adm-category-button adm-category-button--secondary"
                onClick={() => {
                  setOpenViewModal(false);

                  setSelectedCategory(null);
                }}
              >
                <i className="bi bi-x-circle" />
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CategoryManagement;
