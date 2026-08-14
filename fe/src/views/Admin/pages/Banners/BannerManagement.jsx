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

const getImageUrl = (imageUrl) => {
  if (!imageUrl) return "";

  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }

  return `${IMAGE_BASE_URL}${imageUrl}`;
};

const toDateTimeLocal = (value) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 16);
  }

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);

  return localDate.toISOString().slice(0, 16);
};

const formatDateForApi = (value) => {
  if (!value) return "";
  return `${value.replace("T", " ")}:00`;
};

const formatDateTime = (value) => {
  if (!value) return "Không giới hạn";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("vi-VN");
};

const isValidLink = (link = "") => {
  if (!link.trim()) return true;

  return (
    link.startsWith("/") ||
    link.startsWith("http://") ||
    link.startsWith("https://")
  );
};

const errorTextStyle = {
  color: "#ef233c",
  fontSize: "12px",
  fontWeight: 700,
  marginTop: "4px",
  display: "block",
};

const positionBadgeStyle = (position) => {
  if (position === "BLOG") {
    return {
      background: "#dbeafe",
      color: "#1d4ed8",
      border: "1px solid rgba(37, 99, 235, 0.25)",
    };
  }

  return {
    background: "#dcfce7",
    color: "#15803d",
    border: "1px solid rgba(22, 163, 74, 0.25)",
  };
};

const BannerManagement = () => {
  const [banners, setBanners] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("");
  const [positionFilter, setPositionFilter] = useState("");
  const [loading, setLoading] = useState(false);

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
  const [form, setForm] = useState({ ...DEFAULT_FORM });

  const showToast = (type, message) => {
    setToast({
      type,
      message,
    });

    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const getInputStyle = (fieldName) => {
    if (!errors[fieldName]) return {};

    return {
      borderColor: "#ef233c",
      boxShadow: "0 0 0 4px rgba(239, 35, 60, 0.12)",
    };
  };

  const normalizeKeyword = (value = "") => {
    return value.toLowerCase().replace(/\s+/g, "");
  };

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

      setBanners(res.data.data || []);

      setPagination(
        res.data.pagination || {
          page: nextPage,
          limit: nextLimit,
          total: res.data.data?.length || 0,
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

  const resetForm = () => {
    setEditingBanner(null);
    setErrors({});
    setFileInputKey(Date.now());
    setForm({ ...DEFAULT_FORM });
  };

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

  const handleChangePage = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;

    fetchBanners({
      page: newPage,
      limit,
    });
  };

  const handleChangeLimit = (e) => {
    const newLimit = Number(e.target.value);

    setLimit(newLimit);
    setPage(1);

    fetchBanners({
      page: 1,
      limit: newLimit,
    });
  };

  const clearFieldError = (fieldName) => {
    setErrors((prev) => ({
      ...prev,
      [fieldName]: "",
    }));
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;

    clearFieldError(name);

    if (name === "image") {
      setForm({
        ...form,
        image: files?.[0] || null,
      });
      return;
    }

    setForm({
      ...form,
      [name]: value,
    });
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast("error", "Vui lòng kiểm tra lại thông tin banner");
      return;
    }

    try {
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
    }
  };

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

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa banner này?")) return;

    try {
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
    }
  };

  const handleToggleStatus = async (id) => {
    const oldBanners = [...banners];
    const oldPagination = { ...pagination };

    try {
      setBanners((prev) => {
        let nextBanners = prev.map((banner) => {
          if (banner.id !== id) return banner;

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
        setPagination((prev) => ({
          ...prev,
          total: Math.max(Number(prev.total || 0) - 1, 0),
        }));
      }

      await bannerService.toggleStatus(id);

      showToast("success", "Cập nhật trạng thái banner thành công");
    } catch (error) {
      console.error(error);

      setBanners(oldBanners);
      setPagination(oldPagination);

      showToast("error", error.response?.data?.message || "Lỗi bật/tắt banner");
    }
  };

  const renderPageNumbers = () => {
    const totalPages = pagination.totalPages || 1;
    const currentPage = pagination.page || page;

    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
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

  return (
    <div className="banner-page">
      {toast && (
        <div
          style={{
            position: "fixed",
            top: "24px",
            right: "24px",
            zIndex: 99999,
            minWidth: "280px",
            maxWidth: "420px",
            padding: "14px 18px",
            borderRadius: "14px",
            fontSize: "14px",
            fontWeight: 800,
            boxShadow: "0 14px 35px rgba(15, 23, 42, 0.18)",
            background: toast.type === "success" ? "#dcfce7" : "#fee2e2",
            color: toast.type === "success" ? "#15803d" : "#ef233c",
            border:
              toast.type === "success"
                ? "1px solid rgba(22, 163, 74, 0.25)"
                : "1px solid rgba(239, 35, 60, 0.25)",
          }}
        >
          {toast.message}
        </div>
      )}

      <div className="banner-page-header">
        <div>
          <h3 className="banner-page-title">Quản lý Banner / Slider</h3>
          <p className="banner-page-subtitle">
            Thêm, sửa, xóa, bật/tắt banner và thiết lập nội dung hiển thị.
          </p>
        </div>

        <div className="banner-page-count">
          <span>{pagination.total}</span>
          <small>banner</small>
        </div>
      </div>

      <div className="banner-card">
        <div className="banner-card-header">
          <h4 className="banner-card-title">
            {editingBanner ? "Cập nhật banner" : "Thêm banner mới"}
          </h4>

          {editingBanner && (
            <button
              type="button"
              className="banner-btn banner-btn-sm banner-btn-secondary"
              onClick={resetForm}
            >
              Hủy chỉnh sửa
            </button>
          )}
        </div>

        <div className="banner-card-body">
          <form onSubmit={handleSubmit}>
            <div className="banner-form-grid">
              <div className="banner-form-group banner-col-6">
                <label className="banner-label">Tiêu đề chính</label>
                <input
                  type="text"
                  name="title"
                  className="banner-input"
                  style={getInputStyle("title")}
                  value={form.title}
                  onChange={handleChange}
                  placeholder="VD: Build PC Gaming cao cấp"
                />
                {errors.title && (
                  <small style={errorTextStyle}>{errors.title}</small>
                )}
              </div>

              <div className="banner-form-group banner-col-6">
                <label className="banner-label">Dòng chữ nổi bật</label>
                <input
                  type="text"
                  name="subtitle"
                  className="banner-input"
                  style={getInputStyle("subtitle")}
                  value={form.subtitle}
                  onChange={handleChange}
                  placeholder="VD: Hiệu năng cho mọi nhu cầu"
                />
                {errors.subtitle && (
                  <small style={errorTextStyle}>{errors.subtitle}</small>
                )}
              </div>

              <div className="banner-form-group banner-col-6">
                <label className="banner-label">Badge banner</label>
                <input
                  type="text"
                  name="badge_text"
                  className="banner-input"
                  style={getInputStyle("badge_text")}
                  value={form.badge_text}
                  onChange={handleChange}
                  placeholder="VD: Flash Sale giảm đến 35%"
                />
                {errors.badge_text && (
                  <small style={errorTextStyle}>{errors.badge_text}</small>
                )}
              </div>

              <div className="banner-form-group banner-col-6">
                <label className="banner-label">Link banner tổng</label>
                <input
                  type="text"
                  name="link_url"
                  className="banner-input"
                  style={getInputStyle("link_url")}
                  value={form.link_url}
                  onChange={handleChange}
                  placeholder="/products hoặc https://..."
                />
                {errors.link_url && (
                  <small style={errorTextStyle}>{errors.link_url}</small>
                )}
              </div>

              <div className="banner-form-group banner-col-12">
                <label className="banner-label">Mô tả banner</label>
                <textarea
                  name="description"
                  className="banner-input"
                  style={{
                    ...getInputStyle("description"),
                    height: "92px",
                    paddingTop: "12px",
                    resize: "vertical",
                  }}
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Nhập mô tả banner hiển thị bên dưới tiêu đề"
                />
                {errors.description && (
                  <small style={errorTextStyle}>{errors.description}</small>
                )}
              </div>

              <div className="banner-form-group banner-col-5">
                <label className="banner-label">Ảnh banner</label>
                <input
                  key={fileInputKey}
                  type="file"
                  name="image"
                  className="banner-input"
                  style={getInputStyle("image")}
                  accept="image/*"
                  onChange={handleChange}
                />

                {editingBanner && (
                  <small className="banner-muted">
                    Không chọn ảnh mới thì hệ thống giữ ảnh cũ.
                  </small>
                )}

                {form.image && (
                  <small className="banner-muted">
                    Đã chọn: {form.image.name}
                  </small>
                )}

                {errors.image && (
                  <small style={errorTextStyle}>{errors.image}</small>
                )}
              </div>

              <div className="banner-form-group banner-col-2">
                <label className="banner-label">Thứ tự</label>
                <input
                  type="number"
                  name="display_order"
                  className="banner-input"
                  style={getInputStyle("display_order")}
                  value={form.display_order}
                  onChange={handleChange}
                  min="0"
                />
                {errors.display_order && (
                  <small style={errorTextStyle}>{errors.display_order}</small>
                )}
              </div>

              <div className="banner-form-group banner-col-2">
                <label className="banner-label">Trạng thái</label>
                <select
                  name="status"
                  className="banner-select"
                  value={form.status}
                  onChange={handleChange}
                >
                  <option value={1}>Bật</option>
                  <option value={0}>Tắt</option>
                </select>
              </div>

              <div className="banner-form-group banner-col-3">
                <label className="banner-label">Vị trí hiển thị</label>
                <select
                  name="position"
                  className="banner-select"
                  style={getInputStyle("position")}
                  value={form.position}
                  onChange={handleChange}
                >
                  <option value="HOME">Trang chủ</option>
                  <option value="BLOG">Trang Blog</option>
                </select>
                {errors.position && (
                  <small style={errorTextStyle}>{errors.position}</small>
                )}
              </div>

              <div className="banner-form-group banner-col-3">
                <label className="banner-label">Độ tối nền</label>
                <input
                  type="number"
                  name="overlay_opacity"
                  className="banner-input"
                  style={getInputStyle("overlay_opacity")}
                  value={form.overlay_opacity}
                  onChange={handleChange}
                  step="0.05"
                  min="0"
                  max="1"
                />
                {errors.overlay_opacity && (
                  <small style={errorTextStyle}>{errors.overlay_opacity}</small>
                )}
              </div>

              <div className="banner-form-group banner-col-3">
                <label className="banner-label">Text nút chính</label>
                <input
                  type="text"
                  name="primary_button_text"
                  className="banner-input"
                  style={getInputStyle("primary_button_text")}
                  value={form.primary_button_text}
                  onChange={handleChange}
                  placeholder="VD: Khám phá ngay"
                />
                {errors.primary_button_text && (
                  <small style={errorTextStyle}>
                    {errors.primary_button_text}
                  </small>
                )}
              </div>

              <div className="banner-form-group banner-col-3">
                <label className="banner-label">Text nút phụ</label>
                <input
                  type="text"
                  name="secondary_button_text"
                  className="banner-input"
                  style={getInputStyle("secondary_button_text")}
                  value={form.secondary_button_text}
                  onChange={handleChange}
                  placeholder="VD: Deal Hot"
                />
                {errors.secondary_button_text && (
                  <small style={errorTextStyle}>
                    {errors.secondary_button_text}
                  </small>
                )}
              </div>

              <div className="banner-form-group banner-col-3">
                <label className="banner-label">Màu tiêu đề</label>
                <input
                  type="color"
                  name="text_color"
                  className="banner-input"
                  style={{
                    ...getInputStyle("text_color"),
                    padding: "6px",
                    cursor: "pointer",
                  }}
                  value={form.text_color}
                  onChange={handleChange}
                />
                {errors.text_color && (
                  <small style={errorTextStyle}>{errors.text_color}</small>
                )}
              </div>

              <div className="banner-form-group banner-col-3">
                <label className="banner-label">Màu chữ nổi bật</label>
                <input
                  type="color"
                  name="highlight_color"
                  className="banner-input"
                  style={{
                    ...getInputStyle("highlight_color"),
                    padding: "6px",
                    cursor: "pointer",
                  }}
                  value={form.highlight_color}
                  onChange={handleChange}
                />
                {errors.highlight_color && (
                  <small style={errorTextStyle}>{errors.highlight_color}</small>
                )}
              </div>

              <div className="banner-form-group banner-col-3">
                <label className="banner-label">Bắt đầu</label>
                <input
                  type="datetime-local"
                  name="start_at"
                  className="banner-input"
                  style={getInputStyle("start_at")}
                  value={form.start_at}
                  onChange={handleChange}
                />
                {errors.start_at && (
                  <small style={errorTextStyle}>{errors.start_at}</small>
                )}
              </div>

              <div className="banner-form-group banner-col-3">
                <label className="banner-label">Kết thúc</label>
                <input
                  type="datetime-local"
                  name="end_at"
                  className="banner-input"
                  style={getInputStyle("end_at")}
                  value={form.end_at}
                  onChange={handleChange}
                />
                {errors.end_at && (
                  <small style={errorTextStyle}>{errors.end_at}</small>
                )}
              </div>

              <div className="banner-form-group banner-col-12">
                <div className="banner-actions">
                  <button
                    className="banner-btn banner-btn-primary"
                    type="submit"
                  >
                    {editingBanner ? "Cập nhật banner" : "Thêm banner"}
                  </button>

                  <button
                    type="button"
                    className="banner-btn banner-btn-secondary"
                    onClick={resetForm}
                  >
                    Làm mới form
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div className="banner-card">
        <div className="banner-card-header">
          <h4 className="banner-card-title">Danh sách banner</h4>
          <span className="banner-muted">Tổng: {pagination.total} banner</span>
        </div>

        <div className="banner-card-body">
          <div className="banner-filter-grid">
            <div className="banner-form-group">
              <label className="banner-label">Tìm kiếm</label>
              <input
                type="text"
                className="banner-input"
                placeholder="Nhập tiêu đề hoặc link..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    fetchBanners({
                      page: 1,
                      limit,
                    });
                  }
                }}
              />
            </div>

            <div className="banner-form-group">
              <label className="banner-label">Trạng thái</label>
              <select
                className="banner-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">Tất cả</option>
                <option value="1">Đang bật</option>
                <option value="0">Đang tắt</option>
              </select>
            </div>

            <div className="banner-form-group">
              <label className="banner-label">Vị trí</label>
              <select
                className="banner-select"
                value={positionFilter}
                onChange={(e) => setPositionFilter(e.target.value)}
              >
                <option value="">Tất cả</option>
                <option value="HOME">Trang chủ</option>
                <option value="BLOG">Trang Blog</option>
              </select>
            </div>

            <div className="banner-actions banner-filter-actions">
              <button
                type="button"
                className="banner-btn banner-btn-dark"
                onClick={() =>
                  fetchBanners({
                    page: 1,
                    limit,
                  })
                }
              >
                Lọc
              </button>

              <button
                type="button"
                className="banner-btn banner-btn-secondary"
                onClick={handleResetFilter}
              >
                Làm mới
              </button>
            </div>
          </div>

          {loading ? (
            <div className="banner-loading">Đang tải dữ liệu...</div>
          ) : (
            <>
              <div className="banner-table-wrap">
                <table className="banner-table">
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
                        <td colSpan="8" className="banner-empty">
                          Chưa có banner
                        </td>
                      </tr>
                    ) : (
                      banners.map((banner) => (
                        <tr key={banner.id}>
                          <td className="banner-id">#{banner.id}</td>

                          <td>
                            {banner.image_url ? (
                              <img
                                className="banner-image"
                                src={getImageUrl(banner.image_url)}
                                alt={banner.title}
                              />
                            ) : (
                              <div className="banner-image-placeholder">
                                Không ảnh
                              </div>
                            )}
                          </td>

                          <td>
                            <div>
                              <strong>{banner.title}</strong>
                            </div>

                            <div className="banner-muted">
                              {banner.subtitle || "Không có dòng nổi bật"}
                            </div>

                            <div className="banner-muted">
                              Badge: {banner.badge_text || "Không có"}
                            </div>

                            <div className="banner-link-text">
                              Link banner: {banner.link_url || "Không có"}
                            </div>
                          </td>

                          <td>
                            <span
                              className="banner-badge"
                              style={positionBadgeStyle(banner.position)}
                            >
                              {banner.position === "BLOG"
                                ? "Trang Blog"
                                : "Trang chủ"}
                            </span>
                          </td>

                          <td>{banner.display_order}</td>

                          <td>
                            <div className="banner-muted">
                              Bắt đầu: {formatDateTime(banner.start_at)}
                            </div>

                            <div className="banner-muted">
                              Kết thúc: {formatDateTime(banner.end_at)}
                            </div>
                          </td>

                          <td>
                            <span
                              className={
                                Number(banner.status) === 1
                                  ? "banner-badge banner-badge-active"
                                  : "banner-badge banner-badge-inactive"
                              }
                            >
                              {Number(banner.status) === 1
                                ? "Đang bật"
                                : "Đang tắt"}
                            </span>
                          </td>

                          <td>
                            <div className="banner-row-actions">
                              <button
                                type="button"
                                className="banner-action-btn banner-action-view"
                                onClick={() => setDetailBanner(banner)}
                              >
                                Chi tiết
                              </button>

                              <button
                                type="button"
                                className="banner-action-btn banner-action-edit"
                                onClick={() => handleEdit(banner)}
                              >
                                Sửa
                              </button>

                              <button
                                type="button"
                                className="banner-action-btn banner-action-toggle"
                                onClick={() => handleToggleStatus(banner.id)}
                              >
                                Bật/Tắt
                              </button>

                              <button
                                type="button"
                                className="banner-action-btn banner-action-delete"
                                onClick={() => handleDelete(banner.id)}
                              >
                                Xóa
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {pagination.total > 0 && (
                <div className="banner-pagination">
                  <div className="banner-pagination-info">
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

                  <div className="banner-pagination-controls">
                    <select
                      className="banner-page-size"
                      value={limit}
                      onChange={handleChangeLimit}
                    >
                      <option value={5}>5 / trang</option>
                      <option value={10}>10 / trang</option>
                      <option value={20}>20 / trang</option>
                    </select>

                    <button
                      type="button"
                      className="banner-page-btn"
                      disabled={pagination.page <= 1}
                      onClick={() => handleChangePage(pagination.page - 1)}
                    >
                      Trước
                    </button>

                    <div className="banner-page-numbers">
                      {renderPageNumbers().map((pageNumber, index) =>
                        pageNumber === "..." ? (
                          <span
                            key={`dots-${index}`}
                            className="banner-page-dots"
                          >
                            ...
                          </span>
                        ) : (
                          <button
                            key={pageNumber}
                            type="button"
                            className={
                              pageNumber === pagination.page
                                ? "banner-page-number active"
                                : "banner-page-number"
                            }
                            onClick={() => handleChangePage(pageNumber)}
                          >
                            {pageNumber}
                          </button>
                        ),
                      )}
                    </div>

                    <button
                      type="button"
                      className="banner-page-btn"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => handleChangePage(pagination.page + 1)}
                    >
                      Sau
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {detailBanner && (
        <div
          className="banner-detail-overlay"
          onClick={() => setDetailBanner(null)}
        >
          <div
            className="banner-detail-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="banner-detail-header">
              <div>
                <span className="banner-detail-kicker">
                  Chi tiết banner #{detailBanner.id}
                </span>
                <h3>{detailBanner.title}</h3>
                <p>{detailBanner.subtitle || "Không có dòng nổi bật"}</p>
              </div>

              <button
                type="button"
                className="banner-detail-close"
                onClick={() => setDetailBanner(null)}
              >
                ×
              </button>
            </div>

            <div className="banner-detail-preview">
              {detailBanner.image_url ? (
                <img
                  src={getImageUrl(detailBanner.image_url)}
                  alt={detailBanner.title}
                />
              ) : (
                <div className="banner-detail-no-image">
                  Không có ảnh banner
                </div>
              )}

              <div
                className="banner-detail-preview-overlay"
                style={{
                  background: `linear-gradient(90deg, rgba(8, 13, 25, ${
                    detailBanner.overlay_opacity ?? 0.65
                  }) 0%, rgba(8, 13, 25, 0.18) 100%)`,
                }}
              >
                <div>
                  <span>{detailBanner.badge_text || "Không có badge"}</span>

                  <h2 style={{ color: detailBanner.text_color || "#ffffff" }}>
                    {detailBanner.title}
                  </h2>

                  <h4
                    style={{
                      color: detailBanner.highlight_color || "#38bdf8",
                    }}
                  >
                    {detailBanner.subtitle || "Không có dòng nổi bật"}
                  </h4>

                  <p>{detailBanner.description || "Không có mô tả"}</p>
                </div>
              </div>
            </div>

            <div className="banner-detail-grid">
              <div className="banner-detail-item">
                <span>Vị trí hiển thị</span>
                <strong>
                  {detailBanner.position === "BLOG"
                    ? "Trang Blog"
                    : "Trang chủ"}
                </strong>
              </div>

              <div className="banner-detail-item">
                <span>Trạng thái</span>
                <strong>
                  {Number(detailBanner.status) === 1 ? "Đang bật" : "Đang tắt"}
                </strong>
              </div>

              <div className="banner-detail-item">
                <span>Thứ tự</span>
                <strong>{detailBanner.display_order}</strong>
              </div>

              <div className="banner-detail-item">
                <span>Độ tối nền</span>
                <strong>{detailBanner.overlay_opacity ?? 0.65}</strong>
              </div>

              <div className="banner-detail-item">
                <span>Text nút chính</span>
                <strong>
                  {detailBanner.primary_button_text || "Không có"}
                </strong>
              </div>

              <div className="banner-detail-item">
                <span>Text nút phụ</span>
                <strong>
                  {detailBanner.secondary_button_text || "Không có"}
                </strong>
              </div>

              <div className="banner-detail-item">
                <span>Màu tiêu đề</span>
                <strong className="banner-color-value">
                  <i
                    style={{
                      background: detailBanner.text_color || "#ffffff",
                    }}
                  ></i>
                  {detailBanner.text_color || "#ffffff"}
                </strong>
              </div>

              <div className="banner-detail-item">
                <span>Màu chữ nổi bật</span>
                <strong className="banner-color-value">
                  <i
                    style={{
                      background: detailBanner.highlight_color || "#38bdf8",
                    }}
                  ></i>
                  {detailBanner.highlight_color || "#38bdf8"}
                </strong>
              </div>

              <div className="banner-detail-item banner-detail-wide">
                <span>Link banner</span>
                <strong>{detailBanner.link_url || "Không có"}</strong>
              </div>

              <div className="banner-detail-item banner-detail-wide">
                <span>Thời gian bắt đầu</span>
                <strong>{formatDateTime(detailBanner.start_at)}</strong>
              </div>

              <div className="banner-detail-item banner-detail-wide">
                <span>Thời gian kết thúc</span>
                <strong>{formatDateTime(detailBanner.end_at)}</strong>
              </div>

              <div className="banner-detail-item banner-detail-wide">
                <span>Mô tả</span>
                <strong>{detailBanner.description || "Không có mô tả"}</strong>
              </div>
            </div>

            <div className="banner-detail-footer">
              <button
                type="button"
                className="banner-btn banner-btn-secondary"
                onClick={() => setDetailBanner(null)}
              >
                Đóng
              </button>

              <button
                type="button"
                className="banner-btn banner-btn-warning"
                onClick={() => {
                  handleEdit(detailBanner);
                  setDetailBanner(null);
                }}
              >
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
