import { useCallback, useEffect, useMemo, useState } from "react";

import toast from "react-hot-toast";

import couponService from "../../../../services/couponService";

import "./CouponManagement.css";

const STATUS_LABELS = {
  active: "Đang bật",
  scheduled: "Lên lịch",
  expired: "Hết hạn",
  inactive: "Đang tắt",
};

const DISCOUNT_TYPES = {
  percent: "Phần trăm",
  fixed: "Giảm tiền",
};

const EMPTY_FORM = {
  code: "",
  type: "percent",
  value: "",
  minOrder: "",
  quantity: "",
  usedCount: 0,
  startAt: "",
  endAt: "",
  status: "1",
};

// =====================================================
// FORMAT MONEY
// =====================================================

function formatMoney(value) {
  return `${Number(value || 0).toLocaleString("vi-VN")} đ`;
}

// =====================================================
// FORMAT DATE
// =====================================================

function formatDate(value) {
  if (!value) {
    return "Không giới hạn";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("vi-VN");
}

// =====================================================
// FORMAT DATETIME
// =====================================================

function formatDateTime(value) {
  if (!value) {
    return "Không giới hạn";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("vi-VN");
}

// =====================================================
// DATETIME LOCAL
// =====================================================

function toDateTimeLocal(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 16);
  }

  const offset = date.getTimezoneOffset();

  const localDate = new Date(date.getTime() - offset * 60 * 1000);

  return localDate.toISOString().slice(0, 16);
}

// =====================================================
// MYSQL DATETIME
// =====================================================

function toMysqlDatetime(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const pad = (number) => String(number).padStart(2, "0");

  return `${date.getFullYear()}-${pad(
    date.getMonth() + 1,
  )}-${pad(date.getDate())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

// =====================================================
// RESOLVE STATUS
// =====================================================

function resolveCouponStatus(coupon) {
  const now = Date.now();

  const startTime = coupon.start_date
    ? new Date(coupon.start_date).getTime()
    : null;

  const endTime = coupon.end_date ? new Date(coupon.end_date).getTime() : null;

  if (Number(coupon.status) === 0) {
    return "inactive";
  }

  if (startTime && !Number.isNaN(startTime) && now < startTime) {
    return "scheduled";
  }

  if (endTime && !Number.isNaN(endTime) && now > endTime) {
    return "expired";
  }

  return "active";
}

// =====================================================
// NORMALIZE
// =====================================================

function normalizeCoupon(coupon) {
  return {
    id: coupon.id,

    code: coupon.code || "",

    type: coupon.type || "percent",

    value: Number(coupon.value || 0),

    minOrder: Number(coupon.min_order || 0),

    quantity: Number(coupon.quantity || 0),

    usedCount: Number(coupon.used_count || 0),

    startAt: toDateTimeLocal(coupon.start_date),

    endAt: toDateTimeLocal(coupon.end_date),

    startDate: coupon.start_date,

    endDate: coupon.end_date,

    rawStatus: Number(coupon.status ?? 1),

    status: resolveCouponStatus(coupon),
  };
}

// =====================================================
// USAGE
// =====================================================

function getUsagePercent(coupon) {
  const quantity = Number(coupon.quantity) || 0;

  const used = Number(coupon.usedCount) || 0;

  if (quantity <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((used / quantity) * 100));
}

// =====================================================
// COMPONENT
// =====================================================

function CouponManagement() {
  const [coupons, setCoupons] = useState([]);

  const [keyword, setKeyword] = useState("");

  const [typeFilter, setTypeFilter] = useState("all");

  const [statusFilter, setStatusFilter] = useState("all");

  const [editingCouponId, setEditingCouponId] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);

  const [errors, setErrors] = useState({});

  const [loading, setLoading] = useState(false);

  const [saving, setSaving] = useState(false);

  const [statusUpdatingId, setStatusUpdatingId] = useState(null);

  const [deletingId, setDeletingId] = useState(null);

  const [pageError, setPageError] = useState("");

  const [openMenuId, setOpenMenuId] = useState(null);

  const [deleteConfirm, setDeleteConfirm] = useState({
    open: false,
    coupon: null,
  });

  // =====================================================
  // LOAD COUPONS
  // =====================================================

  const loadCoupons = useCallback(async () => {
    try {
      setLoading(true);

      setPageError("");

      const response = await couponService.getAll({
        page: 1,
        limit: 1000,
      });

      const rows = response?.data?.data || [];

      setCoupons(Array.isArray(rows) ? rows.map(normalizeCoupon) : []);
    } catch (error) {
      console.error(error);

      const message =
        error?.response?.data?.message || "Không thể tải danh sách coupon.";

      setPageError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  // =====================================================
  // CLOSE ACTION MENU
  // =====================================================

  useEffect(() => {
    const closeMenu = () => {
      setOpenMenuId(null);
    };

    document.addEventListener("click", closeMenu);

    return () => {
      document.removeEventListener("click", closeMenu);
    };
  }, []);

  // =====================================================
  // SCROLL EDIT
  // =====================================================

  useEffect(() => {
    if (!editingCouponId) {
      return;
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, [editingCouponId]);

  // =====================================================
  // FILTER
  // =====================================================

  const filteredCoupons = useMemo(() => {
    const search = keyword.trim().toLowerCase();

    return coupons.filter((coupon) => {
      const matchesKeyword =
        !search ||
        coupon.code.toLowerCase().includes(search) ||
        (STATUS_LABELS[coupon.status] || "").toLowerCase().includes(search);

      const matchesType = typeFilter === "all" || coupon.type === typeFilter;

      const matchesStatus =
        statusFilter === "all" || coupon.status === statusFilter;

      return matchesKeyword && matchesType && matchesStatus;
    });
  }, [coupons, keyword, typeFilter, statusFilter]);

  // =====================================================
  // STATS
  // =====================================================

  const stats = useMemo(() => {
    const now = new Date();

    const active = coupons.filter(
      (coupon) => coupon.status === "active",
    ).length;

    const scheduled = coupons.filter(
      (coupon) => coupon.status === "scheduled",
    ).length;

    const expired = coupons.filter(
      (coupon) => coupon.status === "expired",
    ).length;

    const expiringSoon = coupons.filter((coupon) => {
      if (coupon.status !== "active" || !coupon.endAt) {
        return false;
      }

      const endDate = new Date(coupon.endAt);

      if (Number.isNaN(endDate.getTime())) {
        return false;
      }

      const difference =
        (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

      return difference >= 0 && difference <= 7;
    }).length;

    return {
      total: coupons.length,
      active,
      scheduled,
      expired,
      expiringSoon,
    };
  }, [coupons]);

  // =====================================================
  // RESET FORM
  // =====================================================

  const resetForm = () => {
    setEditingCouponId(null);

    setErrors({});

    setForm({
      ...EMPTY_FORM,
    });
  };

  // =====================================================
  // CLEAR ERROR
  // =====================================================

  const clearError = (name) => {
    setErrors((previous) => ({
      ...previous,
      [name]: "",
    }));
  };

  // =====================================================
  // CHANGE
  // =====================================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    clearError(name);

    setForm((current) => ({
      ...current,

      [name]: value,
    }));
  };

  // =====================================================
  // VALIDATE
  // =====================================================

  const validateForm = () => {
    const nextErrors = {};

    const code = form.code.trim().toUpperCase();

    if (!code) {
      nextErrors.code = "Vui lòng nhập mã coupon.";
    } else if (code.length < 3) {
      nextErrors.code = "Mã coupon phải có ít nhất 3 ký tự.";
    }

    if (!["percent", "fixed"].includes(form.type)) {
      nextErrors.type = "Kiểu giảm giá không hợp lệ.";
    }

    const value = Number(form.value);

    if (form.value === "" || !Number.isFinite(value)) {
      nextErrors.value = "Vui lòng nhập giá trị giảm.";
    } else if (value <= 0) {
      nextErrors.value = "Giá trị giảm phải lớn hơn 0.";
    } else if (form.type === "percent" && value > 100) {
      nextErrors.value = "Phần trăm giảm không được vượt quá 100%.";
    }

    const minOrder = Number(form.minOrder);

    if (form.minOrder !== "" && (!Number.isFinite(minOrder) || minOrder < 0)) {
      nextErrors.minOrder = "Giá trị đơn tối thiểu không hợp lệ.";
    }

    const quantity = Number(form.quantity);

    if (form.quantity === "" || !Number.isFinite(quantity)) {
      nextErrors.quantity = "Vui lòng nhập số lượng coupon.";
    } else if (quantity < 0) {
      nextErrors.quantity = "Số lượng không được âm.";
    }

    const usedCount = Number(form.usedCount);

    if (!Number.isFinite(usedCount) || usedCount < 0) {
      nextErrors.usedCount = "Số lượt đã dùng không hợp lệ.";
    }

    if (quantity >= 0 && usedCount > quantity && quantity !== 0) {
      nextErrors.usedCount =
        "Số lượt đã dùng không được lớn hơn tổng số lượng.";
    }

    if (!["0", "1"].includes(String(form.status))) {
      nextErrors.status = "Trạng thái coupon không hợp lệ.";
    }

    if (form.startAt && form.endAt) {
      const start = new Date(form.startAt).getTime();

      const end = new Date(form.endAt).getTime();

      if (!Number.isNaN(start) && !Number.isNaN(end) && start > end) {
        nextErrors.endAt = "Thời gian kết thúc phải sau thời gian bắt đầu.";
      }
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  // =====================================================
  // SUBMIT
  // =====================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      toast.error("Vui lòng kiểm tra lại thông tin coupon.");

      return;
    }

    const payload = {
      code: form.code.trim().toUpperCase(),

      type: form.type,

      value: Number(form.value),

      min_order: Number(form.minOrder || 0),

      quantity: Number(form.quantity || 0),

      used_count: Number(form.usedCount || 0),

      status: Number(form.status),

      start_date: toMysqlDatetime(form.startAt),

      end_date: toMysqlDatetime(form.endAt),
    };

    try {
      setSaving(true);

      if (editingCouponId) {
        await couponService.update(editingCouponId, payload);

        toast.success("Cập nhật coupon thành công.");
      } else {
        await couponService.create(payload);

        toast.success("Thêm coupon thành công.");
      }

      resetForm();

      await loadCoupons();
    } catch (error) {
      console.error(error);

      toast.error(error?.response?.data?.message || "Không thể lưu coupon.");
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // EDIT
  // =====================================================

  const handleEdit = (coupon) => {
    setEditingCouponId(coupon.id);

    setErrors({});

    setForm({
      code: coupon.code,

      type: coupon.type,

      value: coupon.value,

      minOrder: coupon.minOrder,

      quantity: coupon.quantity,

      usedCount: coupon.usedCount,

      startAt: coupon.startAt,

      endAt: coupon.endAt,

      status: String(coupon.rawStatus ?? 1),
    });
  };

  // =====================================================
  // DELETE
  // =====================================================

  const openDeleteConfirm = (coupon) => {
    setOpenMenuId(null);

    setDeleteConfirm({
      open: true,
      coupon,
    });
  };

  const closeDeleteConfirm = () => {
    if (deletingId) {
      return;
    }

    setDeleteConfirm({
      open: false,
      coupon: null,
    });
  };

  const handleDelete = async () => {
    const coupon = deleteConfirm.coupon;

    if (!coupon) {
      return;
    }

    try {
      setDeletingId(coupon.id);

      await couponService.remove(coupon.id);

      if (editingCouponId === coupon.id) {
        resetForm();
      }

      toast.success(`Đã xóa coupon "${coupon.code}".`);

      setDeleteConfirm({
        open: false,
        coupon: null,
      });

      await loadCoupons();
    } catch (error) {
      console.error(error);

      toast.error(error?.response?.data?.message || "Không thể xóa coupon.");
    } finally {
      setDeletingId(null);
    }
  };

  // =====================================================
  // STATUS
  // =====================================================

  const handleToggleStatus = async (coupon) => {
    const nextStatus = Number(coupon.rawStatus) === 1 ? 0 : 1;

    try {
      setStatusUpdatingId(coupon.id);

      setOpenMenuId(null);

      await couponService.update(coupon.id, {
        status: nextStatus,
      });

      toast.success(
        nextStatus === 1
          ? `Đã bật coupon "${coupon.code}".`
          : `Đã tắt coupon "${coupon.code}".`,
      );

      await loadCoupons();
    } catch (error) {
      console.error(error);

      toast.error(
        error?.response?.data?.message ||
          "Không thể thay đổi trạng thái coupon.",
      );
    } finally {
      setStatusUpdatingId(null);
    }
  };

  // =====================================================
  // RESET FILTER
  // =====================================================

  const handleResetFilter = () => {
    setKeyword("");
    setTypeFilter("all");
    setStatusFilter("all");
  };

  // =====================================================
  // STATUS CLASS
  // =====================================================

  const getStatusClass = (status) => {
    return `coupon-status-badge coupon-status-${status}`;
  };

  return (
    <div className="coupon-admin-page">
      {/* =================================================
          DELETE MODAL
      ================================================= */}

      {deleteConfirm.open && (
        <div
          className="coupon-confirm-overlay"
          onMouseDown={closeDeleteConfirm}
        >
          <div
            className="coupon-confirm-dialog"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="coupon-confirm-icon">
              <i className="bi bi-trash3" />
            </div>

            <span className="coupon-confirm-kicker">Xác nhận thao tác</span>

            <h2>Xóa coupon</h2>

            <p>
              Bạn có chắc muốn xóa coupon{" "}
              <strong>{deleteConfirm.coupon?.code}</strong>? Hành động này có
              thể ảnh hưởng đến chương trình khuyến mãi đang áp dụng.
            </p>

            <div className="coupon-confirm-actions">
              <button
                type="button"
                className="coupon-button coupon-button-light"
                onClick={closeDeleteConfirm}
                disabled={Boolean(deletingId)}
              >
                Hủy
              </button>

              <button
                type="button"
                className="coupon-button coupon-button-danger"
                onClick={handleDelete}
                disabled={Boolean(deletingId)}
              >
                {deletingId ? (
                  <>
                    <span className="coupon-spinner" />
                    Đang xóa...
                  </>
                ) : (
                  <>
                    <i className="bi bi-trash3" />
                    Xóa coupon
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================
          HEADER
      ================================================= */}

      <section className="coupon-page-heading">
        <div className="coupon-heading-content">
          <span className="coupon-heading-kicker">
            <i className="bi bi-ticket-perforated-fill" />
            Promotion Center
          </span>

          <h1>Quản lý Coupons</h1>

          <p>
            Tạo mã giảm giá, thiết lập thời gian áp dụng, giới hạn lượt sử dụng
            và quản lý các chương trình khuyến mãi.
          </p>
        </div>

        <button
          type="button"
          className="coupon-heading-action"
          onClick={() => {
            resetForm();

            window.scrollTo({
              top: 0,
              behavior: "smooth",
            });
          }}
        >
          <i className="bi bi-plus-lg" />
          Tạo coupon mới
        </button>
      </section>

      {/* =================================================
          STATISTICS
      ================================================= */}

      <section className="coupon-stat-grid">
        <article className="coupon-stat-card coupon-stat-total">
          <div className="coupon-stat-icon">
            <i className="bi bi-ticket-perforated" />
          </div>

          <div>
            <span>Tổng coupon</span>

            <strong>{stats.total}</strong>

            <small>Toàn bộ mã khuyến mãi</small>
          </div>
        </article>

        <article className="coupon-stat-card coupon-stat-active">
          <div className="coupon-stat-icon">
            <i className="bi bi-lightning-charge-fill" />
          </div>

          <div>
            <span>Đang hoạt động</span>

            <strong>{stats.active}</strong>

            <small>Có thể sử dụng ngay</small>
          </div>
        </article>

        <article className="coupon-stat-card coupon-stat-scheduled">
          <div className="coupon-stat-icon">
            <i className="bi bi-clock-fill" />
          </div>

          <div>
            <span>Đang lên lịch</span>

            <strong>{stats.scheduled}</strong>

            <small>Chờ đến thời gian áp dụng</small>
          </div>
        </article>

        <article className="coupon-stat-card coupon-stat-expiring">
          <div className="coupon-stat-icon">
            <i className="bi bi-hourglass-split" />
          </div>

          <div>
            <span>Sắp hết hạn</span>

            <strong>{stats.expiringSoon}</strong>

            <small>Hết hạn trong 7 ngày</small>
          </div>
        </article>
      </section>

      {/* =================================================
          FORM
      ================================================= */}

      <section className="coupon-editor-card">
        <div className="coupon-card-heading">
          <div className="coupon-card-heading-main">
            <div
              className={
                editingCouponId
                  ? "coupon-card-icon coupon-card-icon-edit"
                  : "coupon-card-icon"
              }
            >
              <i
                className={
                  editingCouponId ? "bi bi-pencil-square" : "bi bi-plus-lg"
                }
              />
            </div>

            <div>
              <span className="coupon-card-kicker">Coupon Editor</span>

              <h2>{editingCouponId ? "Cập nhật coupon" : "Tạo coupon mới"}</h2>

              <p>
                Thiết lập mã khuyến mãi, điều kiện, thời gian và giới hạn sử
                dụng.
              </p>
            </div>
          </div>

          {editingCouponId && (
            <button
              type="button"
              className="coupon-button coupon-button-light"
              onClick={resetForm}
              disabled={saving}
            >
              <i className="bi bi-x-lg" />
              Hủy chỉnh sửa
            </button>
          )}
        </div>

        <form className="coupon-form" onSubmit={handleSubmit}>
          {/* CODE */}

          <div className="coupon-field coupon-field-code">
            <label>
              Mã coupon
              <span>*</span>
            </label>

            <div
              className={
                errors.code
                  ? "coupon-input-wrap coupon-input-error"
                  : "coupon-input-wrap"
              }
            >
              <i className="bi bi-upc-scan" />

              <input
                type="text"
                name="code"
                value={form.code}
                placeholder="VD: GIAM15"
                maxLength={50}
                disabled={saving}
                onChange={(event) => {
                  const value = event.target.value
                    .toUpperCase()
                    .replace(/\s+/g, "")
                    .replace(/[^A-Z0-9_-]/g, "");

                  clearError("code");

                  setForm((previous) => ({
                    ...previous,
                    code: value,
                  }));
                }}
              />
            </div>

            {errors.code && (
              <small className="coupon-error-text">
                <i className="bi bi-exclamation-circle" />
                {errors.code}
              </small>
            )}
          </div>

          {/* TYPE */}

          <div className="coupon-field">
            <label>
              Kiểu giảm
              <span>*</span>
            </label>

            <div className="coupon-input-wrap">
              <i className="bi bi-tags" />

              <select
                name="type"
                value={form.type}
                onChange={handleChange}
                disabled={saving}
              >
                <option value="percent">Phần trăm (%)</option>

                <option value="fixed">Giảm số tiền cố định</option>
              </select>
            </div>
          </div>

          {/* VALUE */}

          <div className="coupon-field">
            <label>
              {form.type === "percent" ? "Mức giảm (%)" : "Số tiền giảm"}
              <span>*</span>
            </label>

            <div
              className={
                errors.value
                  ? "coupon-input-wrap coupon-input-error"
                  : "coupon-input-wrap"
              }
            >
              <i className="bi bi-percent" />

              <input
                type="number"
                name="value"
                min="0"
                step={form.type === "percent" ? "1" : "1000"}
                value={form.value}
                placeholder={form.type === "percent" ? "15" : "100000"}
                disabled={saving}
                onChange={handleChange}
              />

              <span className="coupon-input-suffix">
                {form.type === "percent" ? "%" : "đ"}
              </span>
            </div>

            {errors.value && (
              <small className="coupon-error-text">
                <i className="bi bi-exclamation-circle" />
                {errors.value}
              </small>
            )}
          </div>

          {/* MIN ORDER */}

          <div className="coupon-field">
            <label>Đơn hàng tối thiểu</label>

            <div
              className={
                errors.minOrder
                  ? "coupon-input-wrap coupon-input-error"
                  : "coupon-input-wrap"
              }
            >
              <i className="bi bi-cart-check" />

              <input
                type="number"
                name="minOrder"
                min="0"
                step="1000"
                value={form.minOrder}
                placeholder="0"
                disabled={saving}
                onChange={handleChange}
              />

              <span className="coupon-input-suffix">đ</span>
            </div>

            {errors.minOrder && (
              <small className="coupon-error-text">
                <i className="bi bi-exclamation-circle" />
                {errors.minOrder}
              </small>
            )}
          </div>

          {/* QUANTITY */}

          <div className="coupon-field">
            <label>
              Số lượng coupon
              <span>*</span>
            </label>

            <div
              className={
                errors.quantity
                  ? "coupon-input-wrap coupon-input-error"
                  : "coupon-input-wrap"
              }
            >
              <i className="bi bi-stack" />

              <input
                type="number"
                name="quantity"
                min="0"
                value={form.quantity}
                placeholder="100"
                disabled={saving}
                onChange={handleChange}
              />
            </div>

            {errors.quantity && (
              <small className="coupon-error-text">
                <i className="bi bi-exclamation-circle" />
                {errors.quantity}
              </small>
            )}
          </div>

          {/* USED */}

          <div className="coupon-field">
            <label>Đã sử dụng</label>

            <div
              className={
                errors.usedCount
                  ? "coupon-input-wrap coupon-input-error"
                  : "coupon-input-wrap"
              }
            >
              <i className="bi bi-graph-up-arrow" />

              <input
                type="number"
                name="usedCount"
                min="0"
                value={form.usedCount}
                disabled={saving}
                onChange={handleChange}
              />
            </div>

            {errors.usedCount && (
              <small className="coupon-error-text">
                <i className="bi bi-exclamation-circle" />
                {errors.usedCount}
              </small>
            )}
          </div>

          {/* START */}

          <div className="coupon-field">
            <label>Thời gian bắt đầu</label>

            <div className="coupon-input-wrap">
              <i className="bi bi-calendar-event" />

              <input
                type="datetime-local"
                name="startAt"
                value={form.startAt}
                disabled={saving}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* END */}

          <div className="coupon-field">
            <label>Thời gian kết thúc</label>

            <div
              className={
                errors.endAt
                  ? "coupon-input-wrap coupon-input-error"
                  : "coupon-input-wrap"
              }
            >
              <i className="bi bi-calendar-x" />

              <input
                type="datetime-local"
                name="endAt"
                value={form.endAt}
                disabled={saving}
                onChange={handleChange}
              />
            </div>

            {errors.endAt && (
              <small className="coupon-error-text">
                <i className="bi bi-exclamation-circle" />
                {errors.endAt}
              </small>
            )}
          </div>

          {/* STATUS */}

          <div className="coupon-field">
            <label>Trạng thái</label>

            <div className="coupon-input-wrap">
              <i className="bi bi-toggle-on" />

              <select
                name="status"
                value={form.status}
                disabled={saving}
                onChange={handleChange}
              >
                <option value="1">Đang bật</option>

                <option value="0">Đang tắt</option>
              </select>
            </div>
          </div>

          {/* ACTION */}

          <div className="coupon-form-actions">
            <button
              type="submit"
              className="coupon-button coupon-button-primary"
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className="coupon-spinner" />
                  Đang lưu...
                </>
              ) : editingCouponId ? (
                <>
                  <i className="bi bi-check-lg" />
                  Lưu thay đổi
                </>
              ) : (
                <>
                  <i className="bi bi-plus-lg" />
                  Thêm coupon
                </>
              )}
            </button>

            <button
              type="button"
              className="coupon-button coupon-button-light"
              onClick={resetForm}
              disabled={saving}
            >
              <i className="bi bi-arrow-counterclockwise" />
              Làm mới form
            </button>
          </div>
        </form>
      </section>

      {/* =================================================
          LIST
      ================================================= */}

      <section className="coupon-list-card">
        <div className="coupon-card-heading">
          <div className="coupon-card-heading-main">
            <div className="coupon-card-icon coupon-card-icon-blue">
              <i className="bi bi-collection" />
            </div>

            <div>
              <span className="coupon-card-kicker">Promotion Library</span>

              <h2>Danh sách coupon</h2>

              <p>
                Theo dõi trạng thái, thời gian áp dụng và mức sử dụng của từng
                mã.
              </p>
            </div>
          </div>

          <span className="coupon-result-count">
            <i className="bi bi-ticket-perforated" />
            {filteredCoupons.length} / {coupons.length} coupon
          </span>
        </div>

        {/* FILTER */}

        <div className="coupon-filter-panel">
          <label className="coupon-search-field">
            <i className="bi bi-search" />

            <input
              type="search"
              value={keyword}
              placeholder="Tìm theo mã coupon..."
              onChange={(event) => setKeyword(event.target.value)}
            />

            {keyword && (
              <button
                type="button"
                onClick={() => setKeyword("")}
                aria-label="Xóa từ khóa"
              >
                <i className="bi bi-x-lg" />
              </button>
            )}
          </label>

          <div className="coupon-filter-select">
            <i className="bi bi-percent" />

            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
            >
              <option value="all">Tất cả kiểu giảm</option>

              <option value="percent">Phần trăm</option>

              <option value="fixed">Giảm tiền</option>
            </select>
          </div>

          <div className="coupon-filter-select">
            <i className="bi bi-activity" />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">Tất cả trạng thái</option>

              <option value="active">Đang bật</option>

              <option value="scheduled">Lên lịch</option>

              <option value="expired">Hết hạn</option>

              <option value="inactive">Đang tắt</option>
            </select>
          </div>

          <button
            type="button"
            className="coupon-button coupon-button-light coupon-filter-reset"
            onClick={handleResetFilter}
          >
            <i className="bi bi-arrow-counterclockwise" />
            Làm mới
          </button>
        </div>

        {/* ERROR */}

        {pageError && (
          <div className="coupon-page-error">
            <div>
              <i className="bi bi-exclamation-triangle-fill" />

              <span>{pageError}</span>
            </div>

            <button type="button" onClick={loadCoupons}>
              Thử lại
            </button>
          </div>
        )}

        {/* TABLE */}

        <div className="coupon-table-shell">
          <div className="coupon-table-scroll">
            <table className="coupon-data-table">
              <thead>
                <tr>
                  <th>Coupon</th>

                  <th>Giá trị giảm</th>

                  <th>Điều kiện</th>

                  <th>Mức sử dụng</th>

                  <th>Thời gian</th>

                  <th>Trạng thái</th>

                  <th className="coupon-text-center">Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="coupon-table-state">
                      <div className="coupon-loading-state">
                        <span className="coupon-loader" />

                        <strong>Đang tải dữ liệu</strong>

                        <p>
                          Hệ thống đang đồng bộ các chương trình khuyến mãi...
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : filteredCoupons.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="coupon-table-state">
                      <div className="coupon-empty-state">
                        <div className="coupon-empty-icon">
                          <i className="bi bi-ticket-perforated" />
                        </div>

                        <strong>Không tìm thấy coupon</strong>

                        <p>Thử thay đổi từ khóa hoặc bộ lọc.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredCoupons.map((coupon) => {
                    const usage = getUsagePercent(coupon);

                    return (
                      <tr key={coupon.id}>
                        {/* CODE */}

                        <td>
                          <div className="coupon-code-info">
                            <div className="coupon-code-icon">
                              <i className="bi bi-ticket-perforated-fill" />
                            </div>

                            <div>
                              <strong>{coupon.code}</strong>

                              <span>ID #{coupon.id}</span>
                            </div>
                          </div>
                        </td>

                        {/* VALUE */}

                        <td>
                          <div className="coupon-discount-value">
                            <strong>
                              {coupon.type === "percent"
                                ? `${coupon.value}%`
                                : formatMoney(coupon.value)}
                            </strong>

                            <span>
                              {DISCOUNT_TYPES[coupon.type] || coupon.type}
                            </span>
                          </div>
                        </td>

                        {/* CONDITION */}

                        <td>
                          <div className="coupon-condition">
                            <span>
                              <i className="bi bi-cart-check" />
                              Đơn từ{" "}
                              <strong>{formatMoney(coupon.minOrder)}</strong>
                            </span>

                            <span>
                              <i className="bi bi-stack" />
                              Giới hạn <strong>{coupon.quantity}</strong> lượt
                            </span>
                          </div>
                        </td>

                        {/* USAGE */}

                        <td>
                          <div className="coupon-usage">
                            <div className="coupon-usage-top">
                              <strong>
                                {coupon.usedCount}/{coupon.quantity}
                              </strong>

                              <span>{usage}%</span>
                            </div>

                            <div className="coupon-progress-track">
                              <span
                                style={{
                                  width: `${usage}%`,
                                }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* TIME */}

                        <td>
                          <div className="coupon-time">
                            <span>
                              <i className="bi bi-calendar-check" />

                              {formatDate(coupon.startDate || coupon.startAt)}
                            </span>

                            <span>
                              <i className="bi bi-calendar-x" />

                              {formatDate(coupon.endDate || coupon.endAt)}
                            </span>
                          </div>
                        </td>

                        {/* STATUS */}

                        <td>
                          <span
                            className={getStatusClass(coupon.status)}
                            title={`Bắt đầu: ${formatDateTime(
                              coupon.startDate,
                            )} - Kết thúc: ${formatDateTime(coupon.endDate)}`}
                          >
                            <span className="coupon-status-dot" />

                            {STATUS_LABELS[coupon.status] || coupon.status}
                          </span>
                        </td>

                        {/* ACTION */}

                        <td className="coupon-text-center">
                          <div
                            className="coupon-action"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <button
                              type="button"
                              className="coupon-action-trigger"
                              onClick={() =>
                                setOpenMenuId(
                                  openMenuId === coupon.id ? null : coupon.id,
                                )
                              }
                            >
                              <i className="bi bi-three-dots-vertical" />
                            </button>

                            {openMenuId === coupon.id && (
                              <div className="coupon-action-menu">
                                <button
                                  type="button"
                                  className="coupon-action-item"
                                  onClick={() => {
                                    setOpenMenuId(null);

                                    handleEdit(coupon);
                                  }}
                                >
                                  <span className="coupon-action-icon coupon-action-icon-edit">
                                    <i className="bi bi-pencil-square" />
                                  </span>

                                  <span>Chỉnh sửa</span>
                                </button>

                                <button
                                  type="button"
                                  className="coupon-action-item"
                                  disabled={statusUpdatingId === coupon.id}
                                  onClick={() => handleToggleStatus(coupon)}
                                >
                                  <span className="coupon-action-icon coupon-action-icon-status">
                                    <i
                                      className={
                                        Number(coupon.rawStatus) === 1
                                          ? "bi bi-eye-slash"
                                          : "bi bi-eye"
                                      }
                                    />
                                  </span>

                                  <span>
                                    {Number(coupon.rawStatus) === 1
                                      ? "Tắt coupon"
                                      : "Bật coupon"}
                                  </span>
                                </button>

                                <button
                                  type="button"
                                  className="coupon-action-item coupon-action-delete"
                                  onClick={() => openDeleteConfirm(coupon)}
                                >
                                  <span className="coupon-action-icon coupon-action-icon-delete">
                                    <i className="bi bi-trash3" />
                                  </span>

                                  <span>Xóa coupon</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {!loading && !pageError && filteredCoupons.length > 0 && (
          <div className="coupon-table-footer">
            <div>
              Hiển thị <strong>{filteredCoupons.length}</strong> trong tổng{" "}
              <strong>{coupons.length}</strong> coupon
            </div>

            <div className="coupon-footer-note">
              <i className="bi bi-shield-check" />
              Dữ liệu được đồng bộ từ hệ thống
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default CouponManagement;
