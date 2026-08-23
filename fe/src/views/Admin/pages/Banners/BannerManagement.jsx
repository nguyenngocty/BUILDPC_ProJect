import React, { useEffect, useState } from "react";

import bannerService from "../../../../services/bannerService";

import "./BannerManagement.css";

const IMAGE_BASE_URL = "http://localhost:5000";

const DEFAULT_FORM = {
  title: "",
  subtitle: "",
  description: "",
  badge_text: "",
  position: "HOME",
  image: null,
  link_url: "",
  primary_button_text: "",
  secondary_button_text: "",
  text_color: "#ffffff",
  highlight_color: "#38bdf8",
  overlay_opacity: 0.65,
  display_order: 0,
  start_at: "",
  end_at: "",
  status: 1,
};

// =========================================================
// IMAGE
// =========================================================

const getImageUrl = (imageUrl) => {
  if (!imageUrl) {
    return "";
  }

  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }

  return `${IMAGE_BASE_URL}${imageUrl}`;
};

// =========================================================
// DATE
// =========================================================

const toDateTimeLocal = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 16);
  }

  const offset = date.getTimezoneOffset();

  const localDate = new Date(date.getTime() - offset * 60 * 1000);

  return localDate.toISOString().slice(0, 16);
};

const formatDateForApi = (value) => {
  if (!value) {
    return "";
  }

  return `${value.replace("T", " ")}:00`;
};

const formatDateTime = (value) => {
  if (!value) {
    return "Không giới hạn";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("vi-VN");
};

// =========================================================
// LINK
// =========================================================

const isValidLink = (link = "") => {
  if (!link.trim()) {
    return true;
  }

  return (
    link.startsWith("/") ||
    link.startsWith("http://") ||
    link.startsWith("https://")
  );
};

// =========================================================
// POSITION
// =========================================================

const getPositionMeta = (position) => {
  if (position === "BLOG") {
    return {
      type: "blog",
      icon: "bi-file-earmark-text",
      label: "Trang Blog",
    };
  }

  return {
    type: "home",
    icon: "bi-house",
    label: "Trang chủ",
  };
};

// =========================================================
// COMPONENT
// =========================================================

const BannerManagement = () => {
  const [banners, setBanners] = useState([]);

  const [keyword, setKeyword] = useState("");

  const [status, setStatus] = useState("");

  const [positionFilter, setPositionFilter] = useState("");

  const [loading, setLoading] = useState(false);

  const [saving, setSaving] = useState(false);

  const [deletingId, setDeletingId] = useState(null);

  const [statusUpdatingId, setStatusUpdatingId] = useState(null);

  const [page, setPage] = useState(1);

  const [limit, setLimit] = useState(5);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 5,
    total: 0,
    totalPages: 1,
  });

  const [editingBanner, setEditingBanner] = useState(null);

  const [detailBanner, setDetailBanner] = useState(null);

  const [errors, setErrors] = useState({});

  const [toast, setToast] = useState(null);

  const [fileInputKey, setFileInputKey] = useState(Date.now());

  const [form, setForm] = useState({
    ...DEFAULT_FORM,
  });

  // =====================================================
  // TOAST
  // =====================================================

  const showToast = (type, message) => {
    setToast({
      type,
      message,
    });

    window.setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  // =====================================================
  // FORM CLASS
  // =====================================================

  const getFieldClass = (fieldName, baseClass = "adm-banner-input") => {
    return [baseClass, errors[fieldName] && `${baseClass}--error`]
      .filter(Boolean)
      .join(" ");
  };

  // =====================================================
  // KEYWORD
  // =====================================================

  const normalizeKeyword = (value = "") => {
    return value.toLowerCase().replace(/\s+/g, "");
  };

  // =====================================================
  // FETCH
  // =====================================================

  const fetchBanners = async (customFilters = {}) => {
    try {
      setLoading(true);

      const nextPage = customFilters.page ?? page;

      const nextLimit = customFilters.limit ?? limit;

      const filters = {
        keyword:
          customFilters.keyword !== undefined
            ? normalizeKeyword(customFilters.keyword)
            : normalizeKeyword(keyword),

        status:
          customFilters.status !== undefined ? customFilters.status : status,

        position:
          customFilters.position !== undefined
            ? customFilters.position
            : positionFilter,

        page: nextPage,
        limit: nextLimit,
      };

      const res = await bannerService.getAll(filters);

      const responseData = res?.data || {};

      setBanners(responseData.data || []);

      setPagination(
        responseData.pagination || {
          page: nextPage,
          limit: nextLimit,

          total: responseData.data?.length || 0,

          totalPages: 1,
        },
      );

      setPage(nextPage);
      setLimit(nextLimit);
    } catch (error) {
      console.error(error);

      showToast(
        "error",
        error.response?.data?.message || "Lỗi lấy danh sách banner",
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    fetchBanners({
      keyword: "",
      status: "",
      position: "",
      page: 1,
      limit: 5,
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =====================================================
  // RESET FORM
  // =====================================================

  const resetForm = () => {
    setEditingBanner(null);

    setErrors({});

    setFileInputKey(Date.now());

    setForm({
      ...DEFAULT_FORM,
    });
  };

  // =====================================================
  // RESET FILTER
  // =====================================================

  const handleResetFilter = () => {
    setKeyword("");
    setStatus("");
    setPositionFilter("");
    setPage(1);

    fetchBanners({
      keyword: "",
      status: "",
      position: "",
      page: 1,
      limit,
    });
  };

  // =====================================================
  // PAGINATION
  // =====================================================

  const handleChangePage = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages) {
      return;
    }

    fetchBanners({
      page: newPage,
      limit,
    });
  };

  const handleChangeLimit = (event) => {
    const newLimit = Number(event.target.value);

    setLimit(newLimit);
    setPage(1);

    fetchBanners({
      page: 1,
      limit: newLimit,
    });
  };

  // =====================================================
  // ERROR
  // =====================================================

  const clearFieldError = (fieldName) => {
    setErrors((previous) => ({
      ...previous,
      [fieldName]: "",
    }));
  };

  // =====================================================
  // CHANGE
  // =====================================================

  const handleChange = (event) => {
    const { name, value, files } = event.target;

    clearFieldError(name);

    if (name === "image") {
      setForm((previous) => ({
        ...previous,

        image: files?.[0] || null,
      }));

      return;
    }

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // =====================================================
  // VALIDATE
  // =====================================================

  const validateForm = () => {
    const newErrors = {};

    if (!form.title.trim()) {
      newErrors.title = "Vui lòng nhập tiêu đề chính";
    } else if (form.title.trim().length < 3) {
      newErrors.title = "Tiêu đề chính phải có ít nhất 3 ký tự";
    }

    if (!form.subtitle.trim()) {
      newErrors.subtitle = "Vui lòng nhập dòng chữ nổi bật";
    } else if (form.subtitle.trim().length < 3) {
      newErrors.subtitle = "Dòng chữ nổi bật phải có ít nhất 3 ký tự";
    }

    if (!form.badge_text.trim()) {
      newErrors.badge_text = "Vui lòng nhập badge banner";
    }

    if (!form.description.trim()) {
      newErrors.description = "Vui lòng nhập mô tả banner";
    } else if (form.description.trim().length < 10) {
      newErrors.description = "Mô tả banner phải có ít nhất 10 ký tự";
    }

    if (!["HOME", "BLOG"].includes(form.position)) {
      newErrors.position = "Vui lòng chọn vị trí hiển thị";
    }

    if (!editingBanner && !form.image) {
      newErrors.image = "Vui lòng chọn ảnh banner";
    }

    if (form.image) {
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
      ];

      if (!allowedTypes.includes(form.image.type)) {
        newErrors.image = "Chỉ cho phép ảnh JPG, JPEG, PNG hoặc WEBP";
      }

      if (form.image.size > 5 * 1024 * 1024) {
        newErrors.image = "Ảnh không được vượt quá 5MB";
      }
    }

    if (!form.link_url.trim()) {
      newErrors.link_url = "Vui lòng nhập link banner tổng";
    } else if (!isValidLink(form.link_url)) {
      newErrors.link_url =
        "Link banner phải bắt đầu bằng / hoặc http:// hoặc https://";
    }

    if (!form.primary_button_text.trim()) {
      newErrors.primary_button_text = "Vui lòng nhập text nút chính";
    }

    if (!form.secondary_button_text.trim()) {
      newErrors.secondary_button_text = "Vui lòng nhập text nút phụ";
    }

    if (!form.text_color) {
      newErrors.text_color = "Vui lòng chọn màu tiêu đề";
    }

    if (!form.highlight_color) {
      newErrors.highlight_color = "Vui lòng chọn màu chữ nổi bật";
    }

    if (form.display_order === "" || Number.isNaN(Number(form.display_order))) {
      newErrors.display_order = "Vui lòng nhập thứ tự hiển thị";
    } else if (Number(form.display_order) < 0) {
      newErrors.display_order = "Thứ tự hiển thị không được nhỏ hơn 0";
    }

    if (
      form.overlay_opacity === "" ||
      Number.isNaN(Number(form.overlay_opacity))
    ) {
      newErrors.overlay_opacity = "Vui lòng nhập độ tối nền";
    } else if (
      Number(form.overlay_opacity) < 0 ||
      Number(form.overlay_opacity) > 1
    ) {
      newErrors.overlay_opacity = "Độ tối nền phải nằm trong khoảng 0 đến 1";
    }

    if (!form.start_at) {
      newErrors.start_at = "Vui lòng chọn thời gian bắt đầu";
    }

    if (!form.end_at) {
      newErrors.end_at = "Vui lòng chọn thời gian kết thúc";
    }

    if (form.start_at && form.end_at) {
      const startTime = new Date(form.start_at).getTime();

      const endTime = new Date(form.end_at).getTime();

      if (startTime > endTime) {
        newErrors.end_at = "Thời gian kết thúc phải lớn hơn thời gian bắt đầu";
      }
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  // =====================================================
  // FORM DATA
  // =====================================================

  const buildFormData = () => {
    const formData = new FormData();

    formData.append("position", form.position);

    formData.append("title", form.title.trim());

    formData.append("subtitle", form.subtitle.trim());

    formData.append("description", form.description.trim());

    formData.append("badge_text", form.badge_text.trim());

    formData.append("link_url", form.link_url.trim());

    formData.append("primary_button_text", form.primary_button_text.trim());

    formData.append("secondary_button_text", form.secondary_button_text.trim());

    formData.append("text_color", form.text_color);

    formData.append("highlight_color", form.highlight_color);

    formData.append("overlay_opacity", form.overlay_opacity);

    formData.append("display_order", form.display_order);

    formData.append("start_at", formatDateForApi(form.start_at));

    formData.append("end_at", formatDateForApi(form.end_at));

    formData.append("status", form.status);

    if (form.image) {
      formData.append("image", form.image);
    }

    return formData;
  };

  // =====================================================
  // SUBMIT
  // =====================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      showToast("error", "Vui lòng kiểm tra lại thông tin banner");

      return;
    }

    try {
      setSaving(true);

      const formData = buildFormData();

      if (editingBanner) {
        await bannerService.update(editingBanner.id, formData);

        showToast("success", "Cập nhật banner thành công");

        resetForm();

        await fetchBanners({
          page,
          limit,
        });
      } else {
        await bannerService.create(formData);

        showToast("success", "Thêm banner thành công");

        resetForm();

        await fetchBanners({
          page: 1,
          limit,
        });
      }
    } catch (error) {
      console.error(error);

      showToast("error", error.response?.data?.message || "Lỗi lưu banner");
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // EDIT
  // =====================================================

  const handleEdit = (banner) => {
    setEditingBanner(banner);

    setErrors({});

    setFileInputKey(Date.now());

    setForm({
      position: banner.position || "HOME",

      title: banner.title || "",

      subtitle: banner.subtitle || "",

      description: banner.description || "",

      badge_text: banner.badge_text || "",

      image: null,

      link_url: banner.link_url || "",

      primary_button_text: banner.primary_button_text || "",

      secondary_button_text: banner.secondary_button_text || "",

      text_color: banner.text_color || "#ffffff",

      highlight_color: banner.highlight_color || "#38bdf8",

      overlay_opacity: banner.overlay_opacity ?? 0.65,

      display_order: banner.display_order || 0,

      start_at: toDateTimeLocal(banner.start_at),

      end_at: toDateTimeLocal(banner.end_at),

      status: banner.status,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // =====================================================
  // DELETE
  // =====================================================

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa banner này?")) {
      return;
    }

    try {
      setDeletingId(id);

      await bannerService.delete(id);

      showToast("success", "Xóa banner thành công");

      const nextPage = banners.length === 1 && page > 1 ? page - 1 : page;

      await fetchBanners({
        page: nextPage,
        limit,
      });
    } catch (error) {
      console.error(error);

      showToast("error", error.response?.data?.message || "Lỗi xóa banner");
    } finally {
      setDeletingId(null);
    }
  };

  // =====================================================
  // STATUS
  // =====================================================

  const handleToggleStatus = async (id) => {
    const oldBanners = [...banners];

    const oldPagination = {
      ...pagination,
    };

    try {
      setStatusUpdatingId(id);

      setBanners((previous) => {
        let nextBanners = previous.map((banner) => {
          if (banner.id !== id) {
            return banner;
          }

          return {
            ...banner,

            status: Number(banner.status) === 1 ? 0 : 1,
          };
        });

        if (status !== "") {
          nextBanners = nextBanners.filter(
            (banner) => String(banner.status) === String(status),
          );
        }

        return nextBanners;
      });

      if (status !== "") {
        setPagination((previous) => ({
          ...previous,

          total: Math.max(Number(previous.total || 0) - 1, 0),
        }));
      }

      await bannerService.toggleStatus(id);

      showToast("success", "Cập nhật trạng thái banner thành công");
    } catch (error) {
      console.error(error);

      setBanners(oldBanners);

      setPagination(oldPagination);

      showToast("error", error.response?.data?.message || "Lỗi bật/tắt banner");
    } finally {
      setStatusUpdatingId(null);
    }
  };

  // =====================================================
  // PAGE NUMBERS
  // =====================================================

  const renderPageNumbers = () => {
    const totalPages = pagination.totalPages || 1;

    const currentPage = pagination.page || page;

    if (totalPages <= 7) {
      return Array.from(
        {
          length: totalPages,
        },
        (_, index) => index + 1,
      );
    }

    const pages = [1];

    if (currentPage > 4) {
      pages.push("...");
    }

    const start = Math.max(2, currentPage - 1);

    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let pageNumber = start; pageNumber <= end; pageNumber += 1) {
      pages.push(pageNumber);
    }

    if (currentPage < totalPages - 3) {
      pages.push("...");
    }

    pages.push(totalPages);

    return pages;
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="adm-banner-page">
      {/* TOAST */}

      {toast && (
        <div
          className={[
            "adm-banner-toast",

            toast.type === "success"
              ? "adm-banner-toast--success"
              : "adm-banner-toast--error",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <span className="adm-banner-toast__icon">
            <i
              className={
                toast.type === "success"
                  ? "bi bi-check-circle-fill"
                  : "bi bi-exclamation-circle-fill"
              }
            />
          </span>

          <span>{toast.message}</span>
        </div>
      )}

      {/* =================================================
            HEADER
            ================================================= */}

      <section className="adm-banner-header">
        <div className="adm-banner-header__content">
          <span className="adm-banner-header__kicker">Banner / Slider</span>

          <h1 className="adm-banner-header__title">
            <span className="adm-banner-header__title-icon">
              <i className="bi bi-images" />
            </span>

            <span>Quản lý Banner / Slider</span>
          </h1>

          <p className="adm-banner-header__description">
            Thêm, chỉnh sửa, bật/tắt banner và quản lý nội dung hiển thị trên
            website.
          </p>
        </div>

        <div className="adm-banner-total-card">
          <span className="adm-banner-total-card__icon">
            <i className="bi bi-images" />
          </span>

          <div>
            <strong>{pagination.total}</strong>

            <span>Tổng banner</span>
          </div>
        </div>
      </section>

      {/* =================================================
            FORM PANEL
            ================================================= */}

      <section className="adm-banner-panel">
        <div className="adm-banner-panel__header">
          <div className="adm-banner-panel__heading">
            <span className="adm-banner-panel__icon">
              <i
                className={
                  editingBanner ? "bi bi-pencil-square" : "bi bi-plus-lg"
                }
              />
            </span>

            <div>
              <h2>{editingBanner ? "Cập nhật banner" : "Thêm banner mới"}</h2>

              <p>Thiết lập nội dung, hình ảnh và thời gian hiển thị.</p>
            </div>
          </div>

          {editingBanner && (
            <button
              type="button"
              className="adm-banner-button adm-banner-button--secondary"
              onClick={resetForm}
              disabled={saving}
            >
              <i className="bi bi-x-lg" />
              Hủy chỉnh sửa
            </button>
          )}
        </div>

        <form className="adm-banner-form" onSubmit={handleSubmit}>
          <div className="adm-banner-form__grid">
            {/* TITLE */}

            <div className="adm-banner-field adm-banner-col--6">
              <label className="adm-banner-field__label">
                Tiêu đề chính
                <span>*</span>
              </label>

              <input
                type="text"
                name="title"
                className={getFieldClass("title")}
                value={form.title}
                onChange={handleChange}
                placeholder="VD: Build PC Gaming cao cấp"
                disabled={saving}
              />

              {errors.title && (
                <small className="adm-banner-field__error">
                  {errors.title}
                </small>
              )}
            </div>

            {/* SUBTITLE */}

            <div className="adm-banner-field adm-banner-col--6">
              <label className="adm-banner-field__label">
                Dòng chữ nổi bật
                <span>*</span>
              </label>

              <input
                type="text"
                name="subtitle"
                className={getFieldClass("subtitle")}
                value={form.subtitle}
                onChange={handleChange}
                placeholder="VD: Hiệu năng cho mọi nhu cầu"
                disabled={saving}
              />

              {errors.subtitle && (
                <small className="adm-banner-field__error">
                  {errors.subtitle}
                </small>
              )}
            </div>

            {/* BADGE */}

            <div className="adm-banner-field adm-banner-col--6">
              <label className="adm-banner-field__label">
                Badge banner
                <span>*</span>
              </label>

              <input
                type="text"
                name="badge_text"
                className={getFieldClass("badge_text")}
                value={form.badge_text}
                onChange={handleChange}
                placeholder="VD: Flash Sale giảm đến 35%"
                disabled={saving}
              />

              {errors.badge_text && (
                <small className="adm-banner-field__error">
                  {errors.badge_text}
                </small>
              )}
            </div>

            {/* LINK */}

            <div className="adm-banner-field adm-banner-col--6">
              <label className="adm-banner-field__label">
                Link banner tổng
                <span>*</span>
              </label>

              <input
                type="text"
                name="link_url"
                className={getFieldClass("link_url")}
                value={form.link_url}
                onChange={handleChange}
                placeholder="/products hoặc https://..."
                disabled={saving}
              />

              {errors.link_url && (
                <small className="adm-banner-field__error">
                  {errors.link_url}
                </small>
              )}
            </div>

            {/* DESCRIPTION */}

            <div className="adm-banner-field adm-banner-col--12">
              <label className="adm-banner-field__label">
                Mô tả banner
                <span>*</span>
              </label>

              <textarea
                name="description"
                className={[
                  getFieldClass("description"),
                  "adm-banner-textarea",
                ].join(" ")}
                value={form.description}
                onChange={handleChange}
                placeholder="Nhập mô tả banner hiển thị bên dưới tiêu đề"
                disabled={saving}
              />

              {errors.description && (
                <small className="adm-banner-field__error">
                  {errors.description}
                </small>
              )}
            </div>

            {/* IMAGE */}

            <div className="adm-banner-field adm-banner-col--5">
              <label className="adm-banner-field__label">
                Ảnh banner
                <span>*</span>
              </label>

              <input
                key={fileInputKey}
                type="file"
                name="image"
                className={[
                  getFieldClass("image"),
                  "adm-banner-file-input",
                ].join(" ")}
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleChange}
                disabled={saving}
              />

              {editingBanner && (
                <small className="adm-banner-field__help">
                  Không chọn ảnh mới thì hệ thống giữ ảnh cũ.
                </small>
              )}

              {form.image && (
                <small className="adm-banner-field__help adm-banner-field__help--selected">
                  <i className="bi bi-check-circle" />
                  Đã chọn: {form.image.name}
                </small>
              )}

              {errors.image && (
                <small className="adm-banner-field__error">
                  {errors.image}
                </small>
              )}
            </div>

            {/* ORDER */}

            <div className="adm-banner-field adm-banner-col--2">
              <label className="adm-banner-field__label">Thứ tự</label>

              <input
                type="number"
                name="display_order"
                className={getFieldClass("display_order")}
                value={form.display_order}
                onChange={handleChange}
                min="0"
                disabled={saving}
              />

              {errors.display_order && (
                <small className="adm-banner-field__error">
                  {errors.display_order}
                </small>
              )}
            </div>

            {/* STATUS */}

            <div className="adm-banner-field adm-banner-col--2">
              <label className="adm-banner-field__label">Trạng thái</label>

              <select
                name="status"
                className="adm-banner-select"
                value={form.status}
                onChange={handleChange}
                disabled={saving}
              >
                <option value={1}>Bật</option>

                <option value={0}>Tắt</option>
              </select>
            </div>

            {/* POSITION */}

            <div className="adm-banner-field adm-banner-col--3">
              <label className="adm-banner-field__label">Vị trí hiển thị</label>

              <select
                name="position"
                className={getFieldClass("position", "adm-banner-select")}
                value={form.position}
                onChange={handleChange}
                disabled={saving}
              >
                <option value="HOME">Trang chủ</option>

                <option value="BLOG">Trang Blog</option>
              </select>

              {errors.position && (
                <small className="adm-banner-field__error">
                  {errors.position}
                </small>
              )}
            </div>

            {/* OPACITY */}

            <div className="adm-banner-field adm-banner-col--3">
              <label className="adm-banner-field__label">Độ tối nền</label>

              <input
                type="number"
                name="overlay_opacity"
                className={getFieldClass("overlay_opacity")}
                value={form.overlay_opacity}
                onChange={handleChange}
                step="0.05"
                min="0"
                max="1"
                disabled={saving}
              />

              {errors.overlay_opacity && (
                <small className="adm-banner-field__error">
                  {errors.overlay_opacity}
                </small>
              )}
            </div>

            {/* PRIMARY BUTTON */}

            <div className="adm-banner-field adm-banner-col--3">
              <label className="adm-banner-field__label">Text nút chính</label>

              <input
                type="text"
                name="primary_button_text"
                className={getFieldClass("primary_button_text")}
                value={form.primary_button_text}
                onChange={handleChange}
                placeholder="VD: Khám phá ngay"
                disabled={saving}
              />

              {errors.primary_button_text && (
                <small className="adm-banner-field__error">
                  {errors.primary_button_text}
                </small>
              )}
            </div>

            {/* SECONDARY BUTTON */}

            <div className="adm-banner-field adm-banner-col--3">
              <label className="adm-banner-field__label">Text nút phụ</label>

              <input
                type="text"
                name="secondary_button_text"
                className={getFieldClass("secondary_button_text")}
                value={form.secondary_button_text}
                onChange={handleChange}
                placeholder="VD: Deal Hot"
                disabled={saving}
              />

              {errors.secondary_button_text && (
                <small className="adm-banner-field__error">
                  {errors.secondary_button_text}
                </small>
              )}
            </div>

            {/* TEXT COLOR */}

            <div className="adm-banner-field adm-banner-col--3">
              <label className="adm-banner-field__label">Màu tiêu đề</label>

              <div className="adm-banner-color-input">
                <input
                  type="color"
                  name="text_color"
                  value={form.text_color}
                  onChange={handleChange}
                  disabled={saving}
                />

                <span>{form.text_color}</span>
              </div>

              {errors.text_color && (
                <small className="adm-banner-field__error">
                  {errors.text_color}
                </small>
              )}
            </div>

            {/* HIGHLIGHT COLOR */}

            <div className="adm-banner-field adm-banner-col--3">
              <label className="adm-banner-field__label">Màu chữ nổi bật</label>

              <div className="adm-banner-color-input">
                <input
                  type="color"
                  name="highlight_color"
                  value={form.highlight_color}
                  onChange={handleChange}
                  disabled={saving}
                />

                <span>{form.highlight_color}</span>
              </div>

              {errors.highlight_color && (
                <small className="adm-banner-field__error">
                  {errors.highlight_color}
                </small>
              )}
            </div>

            {/* START */}

            <div className="adm-banner-field adm-banner-col--3">
              <label className="adm-banner-field__label">Bắt đầu</label>

              <input
                type="datetime-local"
                name="start_at"
                className={getFieldClass("start_at")}
                value={form.start_at}
                onChange={handleChange}
                disabled={saving}
              />

              {errors.start_at && (
                <small className="adm-banner-field__error">
                  {errors.start_at}
                </small>
              )}
            </div>

            {/* END */}

            <div className="adm-banner-field adm-banner-col--3">
              <label className="adm-banner-field__label">Kết thúc</label>

              <input
                type="datetime-local"
                name="end_at"
                className={getFieldClass("end_at")}
                value={form.end_at}
                onChange={handleChange}
                disabled={saving}
              />

              {errors.end_at && (
                <small className="adm-banner-field__error">
                  {errors.end_at}
                </small>
              )}
            </div>

            {/* ACTIONS */}

            <div className="adm-banner-col--12">
              <div className="adm-banner-form__actions">
                <button
                  className="adm-banner-button adm-banner-button--primary"
                  type="submit"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <span className="adm-banner-spinner adm-banner-spinner--small" />
                      Đang lưu...
                    </>
                  ) : editingBanner ? (
                    <>
                      <i className="bi bi-check-lg" />
                      Cập nhật banner
                    </>
                  ) : (
                    <>
                      <i className="bi bi-plus-lg" />
                      Thêm banner
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="adm-banner-button adm-banner-button--secondary"
                  onClick={resetForm}
                  disabled={saving}
                >
                  <i className="bi bi-arrow-counterclockwise" />
                  Làm mới form
                </button>
              </div>
            </div>
          </div>
        </form>
      </section>

      {/* =================================================
            LIST PANEL
            ================================================= */}

      <section className="adm-banner-panel">
        <div className="adm-banner-panel__header">
          <div className="adm-banner-panel__heading">
            <span className="adm-banner-panel__icon adm-banner-panel__icon--blue">
              <i className="bi bi-list-ul" />
            </span>

            <div>
              <h2>Danh sách banner</h2>

              <p>Tìm kiếm, theo dõi và quản lý các banner hiện có.</p>
            </div>
          </div>

          <span className="adm-banner-result-count">
            <i className="bi bi-images" />
            {pagination.total} banner
          </span>
        </div>

        <div className="adm-banner-panel__body">
          {/* FILTER */}

          <div className="adm-banner-filter">
            <div className="adm-banner-field">
              <label className="adm-banner-field__label">Tìm kiếm</label>

              <div className="adm-banner-search">
                <i className="bi bi-search" />

                <input
                  type="text"
                  placeholder="Nhập tiêu đề hoặc link..."
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      fetchBanners({
                        page: 1,
                        limit,
                      });
                    }
                  }}
                />
              </div>
            </div>

            <div className="adm-banner-field">
              <label className="adm-banner-field__label">Trạng thái</label>

              <select
                className="adm-banner-select"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="">Tất cả</option>

                <option value="1">Đang bật</option>

                <option value="0">Đang tắt</option>
              </select>
            </div>

            <div className="adm-banner-field">
              <label className="adm-banner-field__label">Vị trí</label>

              <select
                className="adm-banner-select"
                value={positionFilter}
                onChange={(event) => setPositionFilter(event.target.value)}
              >
                <option value="">Tất cả</option>

                <option value="HOME">Trang chủ</option>

                <option value="BLOG">Trang Blog</option>
              </select>
            </div>

            <div className="adm-banner-filter__actions">
              <button
                type="button"
                className="adm-banner-button adm-banner-button--primary"
                onClick={() =>
                  fetchBanners({
                    page: 1,
                    limit,
                  })
                }
              >
                <i className="bi bi-funnel-fill" />
                Lọc
              </button>

              <button
                type="button"
                className="adm-banner-button adm-banner-button--secondary"
                onClick={handleResetFilter}
              >
                <i className="bi bi-arrow-counterclockwise" />
                Làm mới
              </button>
            </div>
          </div>

          {/* TABLE */}

          {loading ? (
            <div className="adm-banner-loading">
              <span className="adm-banner-spinner" />

              <strong>Đang tải dữ liệu...</strong>

              <p>Vui lòng chờ trong giây lát.</p>
            </div>
          ) : (
            <>
              <div className="adm-banner-table-wrap">
                <table className="adm-banner-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Ảnh</th>
                      <th>Nội dung</th>
                      <th>Vị trí</th>
                      <th>Thứ tự</th>
                      <th>Thời gian</th>
                      <th>Trạng thái</th>
                      <th>Hành động</th>
                    </tr>
                  </thead>

                  <tbody>
                    {banners.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="adm-banner-table__empty">
                          <div className="adm-banner-empty">
                            <span className="adm-banner-empty__icon">
                              <i className="bi bi-images" />
                            </span>

                            <strong>Chưa có banner</strong>

                            <p>Chưa tìm thấy banner phù hợp.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      banners.map((banner) => {
                        const positionMeta = getPositionMeta(banner.position);

                        const isActive = Number(banner.status) === 1;

                        return (
                          <tr key={banner.id}>
                            <td>
                              <span className="adm-banner-table__id">
                                #{banner.id}
                              </span>
                            </td>

                            <td>
                              {banner.image_url ? (
                                <img
                                  className="adm-banner-image"
                                  src={getImageUrl(banner.image_url)}
                                  alt={banner.title}
                                />
                              ) : (
                                <div className="adm-banner-image-placeholder">
                                  <i className="bi bi-image" />

                                  <span>Không ảnh</span>
                                </div>
                              )}
                            </td>

                            <td>
                              <div className="adm-banner-content">
                                <strong>{banner.title}</strong>

                                <span>
                                  {banner.subtitle || "Không có dòng nổi bật"}
                                </span>

                                <span>
                                  Badge: {banner.badge_text || "Không có"}
                                </span>

                                <span className="adm-banner-content__link">
                                  <i className="bi bi-link-45deg" />

                                  {banner.link_url || "Không có link"}
                                </span>
                              </div>
                            </td>

                            <td>
                              <span
                                className={`adm-banner-position adm-banner-position--${positionMeta.type}`}
                              >
                                <i className={`bi ${positionMeta.icon}`} />

                                {positionMeta.label}
                              </span>
                            </td>

                            <td>
                              <span className="adm-banner-order">
                                {banner.display_order}
                              </span>
                            </td>

                            <td>
                              <div className="adm-banner-time">
                                <span>
                                  <i className="bi bi-calendar-check" />
                                  Bắt đầu:
                                </span>

                                <strong>
                                  {formatDateTime(banner.start_at)}
                                </strong>

                                <span>
                                  <i className="bi bi-calendar-x" />
                                  Kết thúc:
                                </span>

                                <strong>{formatDateTime(banner.end_at)}</strong>
                              </div>
                            </td>

                            <td>
                              <button
                                type="button"
                                className={[
                                  "adm-banner-status",

                                  isActive
                                    ? "adm-banner-status--active"
                                    : "adm-banner-status--inactive",
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                                disabled={statusUpdatingId === banner.id}
                                onClick={() => handleToggleStatus(banner.id)}
                              >
                                {statusUpdatingId === banner.id ? (
                                  <span className="adm-banner-spinner adm-banner-spinner--tiny" />
                                ) : (
                                  <>
                                    <span className="adm-banner-status__dot" />

                                    {isActive ? "Đang bật" : "Đang tắt"}
                                  </>
                                )}
                              </button>
                            </td>

                            <td>
                              <div className="adm-banner-row-actions">
                                <button
                                  type="button"
                                  className="adm-banner-action-button adm-banner-action-button--view"
                                  onClick={() => setDetailBanner(banner)}
                                  title="Chi tiết"
                                >
                                  <i className="bi bi-eye" />
                                </button>

                                <button
                                  type="button"
                                  className="adm-banner-action-button adm-banner-action-button--edit"
                                  onClick={() => handleEdit(banner)}
                                  title="Chỉnh sửa"
                                >
                                  <i className="bi bi-pencil-square" />
                                </button>

                                <button
                                  type="button"
                                  className="adm-banner-action-button adm-banner-action-button--delete"
                                  disabled={deletingId === banner.id}
                                  onClick={() => handleDelete(banner.id)}
                                  title="Xóa"
                                >
                                  {deletingId === banner.id ? (
                                    <span className="adm-banner-spinner adm-banner-spinner--tiny" />
                                  ) : (
                                    <i className="bi bi-trash" />
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION */}

              {pagination.total > 0 && (
                <div className="adm-banner-pagination">
                  <div className="adm-banner-pagination__info">
                    Hiển thị{" "}
                    <strong>
                      {(pagination.page - 1) * pagination.limit + 1}
                    </strong>{" "}
                    -{" "}
                    <strong>
                      {Math.min(
                        pagination.page * pagination.limit,

                        pagination.total,
                      )}
                    </strong>{" "}
                    trong tổng <strong>{pagination.total}</strong> banner
                  </div>

                  <div className="adm-banner-pagination__controls">
                    <select
                      className="adm-banner-pagination__size"
                      value={limit}
                      onChange={handleChangeLimit}
                    >
                      <option value={5}>5 / trang</option>

                      <option value={10}>10 / trang</option>

                      <option value={20}>20 / trang</option>
                    </select>

                    <button
                      type="button"
                      className="adm-banner-pagination__button adm-banner-pagination__button--wide"
                      disabled={pagination.page <= 1}
                      onClick={() => handleChangePage(pagination.page - 1)}
                    >
                      <i className="bi bi-chevron-left" />
                      Trước
                    </button>

                    <div className="adm-banner-pagination__numbers">
                      {renderPageNumbers().map((pageNumber, index) =>
                        pageNumber === "..." ? (
                          <span
                            key={`dots-${index}`}
                            className="adm-banner-pagination__dots"
                          >
                            ...
                          </span>
                        ) : (
                          <button
                            key={pageNumber}
                            type="button"
                            className={[
                              "adm-banner-pagination__button",

                              pageNumber === pagination.page &&
                                "adm-banner-pagination__button--current",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            onClick={() => handleChangePage(pageNumber)}
                          >
                            {pageNumber}
                          </button>
                        ),
                      )}
                    </div>

                    <button
                      type="button"
                      className="adm-banner-pagination__button adm-banner-pagination__button--wide"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => handleChangePage(pagination.page + 1)}
                    >
                      Sau
                      <i className="bi bi-chevron-right" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* =================================================
            DETAIL MODAL
            ================================================= */}

      {detailBanner && (
        <div className="adm-banner-modal" onClick={() => setDetailBanner(null)}>
          <div
            className="adm-banner-modal__dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="adm-banner-modal__header">
              <div>
                <span className="adm-banner-modal__kicker">
                  Chi tiết banner #{detailBanner.id}
                </span>

                <h2>{detailBanner.title}</h2>

                <p>{detailBanner.subtitle || "Không có dòng nổi bật"}</p>
              </div>

              <button
                type="button"
                className="adm-banner-modal__close"
                onClick={() => setDetailBanner(null)}
                aria-label="Đóng"
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>

            {/* PREVIEW */}

            <div className="adm-banner-preview">
              {detailBanner.image_url ? (
                <img
                  src={getImageUrl(detailBanner.image_url)}
                  alt={detailBanner.title}
                />
              ) : (
                <div className="adm-banner-preview__no-image">
                  <i className="bi bi-image" />
                  Không có ảnh banner
                </div>
              )}

              <div
                className="adm-banner-preview__overlay"
                style={{
                  "--adm-banner-overlay": detailBanner.overlay_opacity ?? 0.65,

                  "--adm-banner-title-color":
                    detailBanner.text_color || "#ffffff",

                  "--adm-banner-highlight-color":
                    detailBanner.highlight_color || "#38bdf8",
                }}
              >
                <div>
                  <span className="adm-banner-preview__badge">
                    {detailBanner.badge_text || "Không có badge"}
                  </span>

                  <h2>{detailBanner.title}</h2>

                  <h3>{detailBanner.subtitle || "Không có dòng nổi bật"}</h3>

                  <p>{detailBanner.description || "Không có mô tả"}</p>
                </div>
              </div>
            </div>

            {/* DETAIL GRID */}

            <div className="adm-banner-detail-grid">
              <div className="adm-banner-detail-item">
                <span>Vị trí hiển thị</span>

                <strong>{getPositionMeta(detailBanner.position).label}</strong>
              </div>

              <div className="adm-banner-detail-item">
                <span>Trạng thái</span>

                <strong>
                  {Number(detailBanner.status) === 1 ? "Đang bật" : "Đang tắt"}
                </strong>
              </div>

              <div className="adm-banner-detail-item">
                <span>Thứ tự</span>

                <strong>{detailBanner.display_order}</strong>
              </div>

              <div className="adm-banner-detail-item">
                <span>Độ tối nền</span>

                <strong>{detailBanner.overlay_opacity ?? 0.65}</strong>
              </div>

              <div className="adm-banner-detail-item">
                <span>Text nút chính</span>

                <strong>
                  {detailBanner.primary_button_text || "Không có"}
                </strong>
              </div>

              <div className="adm-banner-detail-item">
                <span>Text nút phụ</span>

                <strong>
                  {detailBanner.secondary_button_text || "Không có"}
                </strong>
              </div>

              <div className="adm-banner-detail-item">
                <span>Màu tiêu đề</span>

                <strong className="adm-banner-color-value">
                  <i
                    style={{
                      "--adm-banner-chip-color":
                        detailBanner.text_color || "#ffffff",
                    }}
                  />

                  {detailBanner.text_color || "#ffffff"}
                </strong>
              </div>

              <div className="adm-banner-detail-item">
                <span>Màu chữ nổi bật</span>

                <strong className="adm-banner-color-value">
                  <i
                    style={{
                      "--adm-banner-chip-color":
                        detailBanner.highlight_color || "#38bdf8",
                    }}
                  />

                  {detailBanner.highlight_color || "#38bdf8"}
                </strong>
              </div>

              <div className="adm-banner-detail-item adm-banner-detail-item--wide">
                <span>Link banner</span>

                <strong>{detailBanner.link_url || "Không có"}</strong>
              </div>

              <div className="adm-banner-detail-item adm-banner-detail-item--wide">
                <span>Thời gian bắt đầu</span>

                <strong>{formatDateTime(detailBanner.start_at)}</strong>
              </div>

              <div className="adm-banner-detail-item adm-banner-detail-item--wide">
                <span>Thời gian kết thúc</span>

                <strong>{formatDateTime(detailBanner.end_at)}</strong>
              </div>

              <div className="adm-banner-detail-item adm-banner-detail-item--wide">
                <span>Mô tả</span>

                <strong>{detailBanner.description || "Không có mô tả"}</strong>
              </div>
            </div>

            <div className="adm-banner-modal__footer">
              <button
                type="button"
                className="adm-banner-button adm-banner-button--secondary"
                onClick={() => setDetailBanner(null)}
              >
                <i className="bi bi-x-lg" />
                Đóng
              </button>

              <button
                type="button"
                className="adm-banner-button adm-banner-button--warning"
                onClick={() => {
                  handleEdit(detailBanner);

                  setDetailBanner(null);
                }}
              >
                <i className="bi bi-pencil-square" />
                Sửa banner
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BannerManagement;
