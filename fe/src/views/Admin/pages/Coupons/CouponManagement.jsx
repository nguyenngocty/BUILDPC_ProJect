import { useCallback, useEffect, useMemo, useState } from "react";
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

const emptyForm = {
  code: "",
  type: "percent",
  value: 0,
  minOrder: 0,
  quantity: 0,
  usedCount: 0,
  startAt: "",
  endAt: "",
  status: "1",
};

function formatMoney(value) {
  return `${Number(value || 0).toLocaleString("vi-VN")} đ`;
}

function formatDate(value) {
  if (!value) return "Không có";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("vi-VN");
}

function toDateTimeLocal(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 16);
  }

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);

  return localDate.toISOString().slice(0, 16);
}

function toMysqlDatetime(value) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const pad = (number) => String(number).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function resolveCouponStatus(coupon) {
  const now = Date.now();
  const startTime = coupon.start_date ? new Date(coupon.start_date).getTime() : null;
  const endTime = coupon.end_date ? new Date(coupon.end_date).getTime() : null;

  if (Number(coupon.status) === 0) {
    return "inactive";
  }

  if (startTime && now < startTime) {
    return "scheduled";
  }

  if (endTime && now > endTime) {
    return "expired";
  }

  return "active";
}

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
    rawStatus: Number(coupon.status ?? 1),
    status: resolveCouponStatus(coupon),
  };
}

function getStatusClass(status) {
  switch (status) {
    case "active":
      return "coupon-badge coupon-badge-active";
    case "scheduled":
      return "coupon-badge coupon-badge-scheduled";
    case "expired":
      return "coupon-badge coupon-badge-expired";
    default:
      return "coupon-badge coupon-badge-inactive";
  }
}

function getUsagePercent(coupon) {
  if (!coupon.quantity) return 0;

  return Math.min(100, Math.round((coupon.usedCount / coupon.quantity) * 100));
}

function CouponManagement() {
  const [coupons, setCoupons] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingCouponId, setEditingCouponId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadCoupons = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await couponService.getAll({ page: 1, limit: 1000 });
      const rows = response?.data?.data || [];

      setCoupons(rows.map(normalizeCoupon));
    } catch (requestError) {
      const message =
        requestError?.response?.data?.message ||
        "Không thể tải danh sách coupon từ backend.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  useEffect(() => {
    if (!editingCouponId) return;

    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [editingCouponId]);

  const filteredCoupons = useMemo(() => {
    const lowerKeyword = keyword.trim().toLowerCase();

    return coupons.filter((coupon) => {
      const matchesKeyword =
        !lowerKeyword ||
        coupon.code.toLowerCase().includes(lowerKeyword) ||
        coupon.status.toLowerCase().includes(lowerKeyword);

      const matchesType = typeFilter === "all" || coupon.type === typeFilter;
      const matchesStatus =
        statusFilter === "all" || coupon.status === statusFilter;

      return matchesKeyword && matchesType && matchesStatus;
    });
  }, [coupons, keyword, typeFilter, statusFilter]);

  const stats = useMemo(() => {
    const now = new Date();

    return {
      total: coupons.length,
      active: coupons.filter((coupon) => coupon.status === "active").length,
      scheduled: coupons.filter((coupon) => coupon.status === "scheduled").length,
      expiringSoon: coupons.filter((coupon) => {
        const endDate = coupon.endAt ? new Date(coupon.endAt) : null;

        if (!endDate || Number.isNaN(endDate.getTime())) {
          return false;
        }

        const diffDays =
          (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

        return coupon.status === "active" && diffDays <= 7 && diffDays >= 0;
      }).length,
    };
  }, [coupons]);

  const resetForm = () => {
    setEditingCouponId(null);
    setForm(emptyForm);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]:
        name === "value" ||
        name === "minOrder" ||
        name === "quantity" ||
        name === "usedCount"
          ? Number(value)
          : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const code = form.code.trim().toUpperCase();

    if (!code) {
      window.alert("Vui lòng nhập mã coupon.");
      return;
    }

    if (!["percent", "fixed"].includes(form.type)) {
      window.alert("Loại coupon không hợp lệ.");
      return;
    }

    if (form.value < 0) {
      window.alert("Giá trị coupon không hợp lệ.");
      return;
    }

    if (form.type === "percent" && form.value > 100) {
      window.alert("Giá trị phần trăm phải từ 0 đến 100.");
      return;
    }

    if (form.quantity < 0 || form.usedCount < 0) {
      window.alert("Số lượng coupon không hợp lệ.");
      return;
    }

    if (Number(form.status) !== 0 && Number(form.status) !== 1) {
      window.alert("Trạng thái coupon phải là 0 hoặc 1.");
      return;
    }

    const startDate = toMysqlDatetime(form.startAt);
    const endDate = toMysqlDatetime(form.endAt);

    if (startDate && endDate && new Date(startDate).getTime() > new Date(endDate).getTime()) {
      window.alert("Ngày bắt đầu không được lớn hơn ngày kết thúc.");
      return;
    }

    const payload = {
      code,
      type: form.type,
      value: Number(form.value),
      min_order: Number(form.minOrder),
      quantity: Number(form.quantity),
      used_count: Number(form.usedCount),
      status: Number(form.status),
      start_date: startDate,
      end_date: endDate,
    };

    try {
      if (editingCouponId) {
        await couponService.update(editingCouponId, payload);
        window.alert("Cập nhật coupon thành công.");
      } else {
        await couponService.create(payload);
        window.alert("Thêm coupon thành công.");
      }

      resetForm();
      await loadCoupons();
    } catch (requestError) {
      const message =
        requestError?.response?.data?.message ||
        "Không thể lưu coupon. Vui lòng thử lại.";

      window.alert(message);
    }
  };

  const handleEdit = (coupon) => {
    setEditingCouponId(coupon.id);
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

  const handleDelete = async (couponId) => {
    const confirmDelete = window.confirm("Bạn có chắc muốn xóa coupon này?");

    if (!confirmDelete) return;

    try {
      await couponService.remove(couponId);

      if (editingCouponId === couponId) {
        resetForm();
      }

      await loadCoupons();
    } catch (requestError) {
      const message =
        requestError?.response?.data?.message ||
        "Không thể xóa coupon. Vui lòng thử lại.";

      window.alert(message);
    }
  };

  const handleToggleStatus = async (coupon) => {
    const nextStatus = Number(coupon.rawStatus) === 1 ? 0 : 1;

    try {
      await couponService.update(coupon.id, {
        status: nextStatus,
      });

      await loadCoupons();
    } catch (requestError) {
      const message =
        requestError?.response?.data?.message ||
        "Không thể đổi trạng thái coupon.";

      window.alert(message);
    }
  };

  const handleResetFilter = () => {
    setKeyword("");
    setTypeFilter("all");
    setStatusFilter("all");
  };

  return (
    <section className="admin-page coupon-page">
      <div className="admin-page-heading coupon-heading">
        <div>
          <p className="admin-page-eyebrow">QUẢN LÝ KHUYẾN MÃI</p>
          <h1>Quản lý coupons</h1>
          <p>
            Tạo, chỉnh sửa, bật/tắt và theo dõi mã giảm giá trong một màn hình.
          </p>
        </div>

        <div className="coupon-stats-grid" aria-label="Thống kê coupons">
          <article className="coupon-stat-card">
            <span>Tổng coupon</span>
            <strong>{stats.total}</strong>
          </article>

          <article className="coupon-stat-card">
            <span>Đang bật</span>
            <strong>{stats.active}</strong>
          </article>

          <article className="coupon-stat-card">
            <span>Lên lịch</span>
            <strong>{stats.scheduled}</strong>
          </article>

          <article className="coupon-stat-card">
            <span>Sắp hết hạn</span>
            <strong>{stats.expiringSoon}</strong>
          </article>
        </div>
      </div>

      <div className="coupon-grid">
        <div className="admin-panel coupon-form-panel">
          <div className="panel-head">
            <div>
              <h2>
                <i className="bi bi-ticket-perforated" />
                {editingCouponId ? "Chỉnh sửa coupon" : "Thêm coupon mới"}
              </h2>
              <p>Thiết lập mã, giá trị giảm, hạn dùng và giới hạn lượt sử dụng.</p>
            </div>

            {editingCouponId && (
              <button
                type="button"
                className="ghost-action"
                onClick={resetForm}
              >
                Hủy chỉnh sửa
              </button>
            )}
          </div>

          <form className="coupon-form" onSubmit={handleSubmit}>
            <div className="coupon-field">
              <label>Mã coupon</label>
              <input
                type="text"
                name="code"
                value={form.code}
                onChange={handleChange}
                placeholder="VD: GIAM15"
              />
            </div>

            <div className="coupon-field">
              <label>Kiểu giảm</label>
              <select name="type" value={form.type} onChange={handleChange}>
                <option value="percent">Phần trăm</option>
                <option value="fixed">Giảm tiền</option>
              </select>
            </div>

            <div className="coupon-field">
              <label>{form.type === "percent" ? "Giảm (%)" : "Giảm tiền"}</label>
              <input
                type="number"
                name="value"
                min="0"
                value={form.value}
                onChange={handleChange}
              />
            </div>

            <div className="coupon-field">
              <label>Đơn tối thiểu</label>
              <input
                type="number"
                name="minOrder"
                min="0"
                value={form.minOrder}
                onChange={handleChange}
              />
            </div>

            <div className="coupon-field">
              <label>Số lượng</label>
              <input
                type="number"
                name="quantity"
                min="0"
                value={form.quantity}
                onChange={handleChange}
              />
            </div>

            <div className="coupon-field">
              <label>Đã dùng</label>
              <input
                type="number"
                name="usedCount"
                min="0"
                value={form.usedCount}
                onChange={handleChange}
              />
            </div>

            <div className="coupon-field">
              <label>Bắt đầu</label>
              <input
                type="datetime-local"
                name="startAt"
                value={form.startAt}
                onChange={handleChange}
              />
            </div>

            <div className="coupon-field">
              <label>Kết thúc</label>
              <input
                type="datetime-local"
                name="endAt"
                value={form.endAt}
                onChange={handleChange}
              />
            </div>

            <div className="coupon-field">
              <label>Trạng thái</label>
              <select name="status" value={form.status} onChange={handleChange}>
                <option value="1">Đang bật</option>
                <option value="0">Đang tắt</option>
              </select>
            </div>

            <div className="coupon-actions coupon-field-full">
              <button type="submit" className="primary-action">
                <i className="bi bi-save2" />
                {editingCouponId ? "Cập nhật coupon" : "Thêm coupon"}
              </button>

              <button type="button" className="ghost-action" onClick={resetForm}>
                Làm mới form
              </button>
            </div>
          </form>
        </div>

        <div className="admin-panel coupon-list-panel">
          <div className="panel-head">
            <div>
              <h2>
                <i className="bi bi-collection" /> Danh sách coupon
              </h2>
              <p>Theo dõi trạng thái, lượt dùng và thao tác nhanh cho từng mã.</p>
            </div>
          </div>

          <div className="coupon-toolbar">
            <div className="admin-search-box coupon-search-box">
              <input
                type="text"
                placeholder="Tìm theo mã coupon hoặc trạng thái..."
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
              />
            </div>

            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
              <option value="all">Tất cả kiểu giảm</option>
              <option value="percent">Phần trăm</option>
              <option value="fixed">Giảm tiền</option>
            </select>

            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang bật</option>
              <option value="scheduled">Lên lịch</option>
              <option value="expired">Hết hạn</option>
              <option value="inactive">Đang tắt</option>
            </select>

            <button type="button" className="ghost-action" onClick={handleResetFilter}>
              Làm mới lọc
            </button>
          </div>

          <div className="table-responsive coupon-table-wrap">
            <table className="admin-table coupon-table">
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Giá trị</th>
                  <th>Điều kiện</th>
                  <th>Hiệu lực</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="admin-table-empty">
                      Đang tải dữ liệu coupon...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan="6" className="admin-table-empty">
                      {error}
                    </td>
                  </tr>
                ) : filteredCoupons.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="admin-table-empty">
                      Chưa có coupon nào phù hợp bộ lọc.
                    </td>
                  </tr>
                ) : (
                  filteredCoupons.map((coupon) => (
                    <tr key={coupon.id}>
                      <td>
                        <div className="coupon-code-block">
                          <strong>{coupon.code}</strong>
                          <span>Loại: {DISCOUNT_TYPES[coupon.type] || coupon.type}</span>
                        </div>
                      </td>

                      <td>
                        <div className="coupon-value-block">
                          <strong>
                            {coupon.type === "percent"
                              ? `${coupon.value}%`
                              : formatMoney(coupon.value)}
                          </strong>
                          <span>{DISCOUNT_TYPES[coupon.type] || coupon.type}</span>
                        </div>
                      </td>

                      <td>
                        <div className="coupon-condition-block">
                          <span>Tối thiểu: {formatMoney(coupon.minOrder)}</span>
                          <span>
                            {coupon.usedCount}/{coupon.quantity} lượt dùng
                          </span>
                          <div className="coupon-progress">
                            <span style={{ width: `${getUsagePercent(coupon)}%` }} />
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="coupon-time-block">
                          <span>Bắt đầu: {formatDate(coupon.startAt)}</span>
                          <span>Kết thúc: {formatDate(coupon.endAt)}</span>
                        </div>
                      </td>

                      <td>
                        <span className={getStatusClass(coupon.status)}>
                          {STATUS_LABELS[coupon.status] || coupon.status}
                        </span>
                      </td>

                      <td>
                        <div className="coupon-row-actions">
                          <button
                            type="button"
                            className="ghost-action coupon-action-button"
                            onClick={() => handleEdit(coupon)}
                          >
                            Sửa
                          </button>

                          <button
                            type="button"
                            className="ghost-action coupon-action-button"
                            onClick={() => handleToggleStatus(coupon)}
                          >
                            Bật/Tắt
                          </button>

                          <button
                            type="button"
                            className="ghost-action coupon-action-button coupon-danger-button"
                            onClick={() => handleDelete(coupon.id)}
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
        </div>
      </div>
    </section>
  );
}

export default CouponManagement;
