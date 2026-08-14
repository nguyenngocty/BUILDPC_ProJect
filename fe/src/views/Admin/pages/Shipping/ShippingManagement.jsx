import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import shippingService from "../../../../services/shippingService";
import "./ShippingManagement.css";

const DEFAULT_FORM = {
  province_code: "",
  province_name: "",
  shipping_fee: "",
  free_shipping_min: "",
  status: 1,
};

const ShippingManagement = () => {
  const [shippingRates, setShippingRates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);

  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [page, setPage] = useState(1);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [form, setForm] = useState(DEFAULT_FORM);
  const [editingId, setEditingId] = useState(null);

  // =====================================================
  // FORMAT MONEY
  // =====================================================
  const formatMoney = (value) => {
    return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
  };

  // =====================================================
  // ERROR
  // =====================================================
  const getErrorMessage = (error, fallback = "Có lỗi xảy ra") => {
    return error?.response?.data?.message || error?.message || fallback;
  };

  // =====================================================
  // LOAD DATA
  // =====================================================
  const fetchShippingRates = async (targetPage = page) => {
    try {
      setLoading(true);

      const response = await shippingService.getAll({
        keyword: keyword.trim(),
        status: statusFilter,
        page: targetPage,
        limit: 10,
      });

      const responseData = response?.data || {};

      setShippingRates(
        Array.isArray(responseData.data) ? responseData.data : [],
      );

      setPagination({
        page: Number(responseData.pagination?.page) || targetPage,

        limit: Number(responseData.pagination?.limit) || 10,

        total: Number(responseData.pagination?.total) || 0,

        totalPages: Number(responseData.pagination?.totalPages) || 1,
      });
    } catch (error) {
      setShippingRates([]);

      toast.error(getErrorMessage(error, "Không thể tải danh sách vận chuyển"));
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // INITIAL LOAD
  // =====================================================
  useEffect(() => {
    fetchShippingRates(page);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  // =====================================================
  // FORM CHANGE
  // =====================================================
  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // =====================================================
  // PROVINCE CODE
  // =====================================================
  const handleProvinceCodeChange = (event) => {
    const value = event.target.value
      .toUpperCase()
      .replace(/\s+/g, "_")
      .replace(/[^A-Z0-9_]/g, "");

    setForm((previous) => ({
      ...previous,
      province_code: value,
    }));
  };

  // =====================================================
  // RESET FORM
  // =====================================================
  const resetForm = () => {
    setForm(DEFAULT_FORM);
    setEditingId(null);
  };

  // =====================================================
  // VALIDATE
  // =====================================================
  const validateForm = () => {
    if (!form.province_code.trim()) {
      toast.error("Vui lòng nhập mã tỉnh/thành");

      return false;
    }

    if (!form.province_name.trim()) {
      toast.error("Vui lòng nhập tên tỉnh/thành");

      return false;
    }

    if (form.shipping_fee === "") {
      toast.error("Vui lòng nhập phí vận chuyển");

      return false;
    }

    const shippingFee = Number(form.shipping_fee);

    if (!Number.isFinite(shippingFee) || shippingFee < 0) {
      toast.error("Phí vận chuyển không hợp lệ");

      return false;
    }

    if (form.free_shipping_min !== "" && form.free_shipping_min !== null) {
      const freeShippingMin = Number(form.free_shipping_min);

      if (!Number.isFinite(freeShippingMin) || freeShippingMin < 0) {
        toast.error("Mức miễn phí vận chuyển không hợp lệ");

        return false;
      }
    }

    return true;
  };

  // =====================================================
  // CREATE / UPDATE
  // =====================================================
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    const payload = {
      province_code: form.province_code.trim().toUpperCase(),

      province_name: form.province_name.trim(),

      shipping_fee: Number(form.shipping_fee),

      free_shipping_min:
        form.free_shipping_min === "" ? null : Number(form.free_shipping_min),

      status: Number(form.status),
    };

    try {
      setSaving(true);

      if (editingId) {
        await shippingService.update(editingId, payload);

        toast.success("Cập nhật phí vận chuyển thành công");
      } else {
        await shippingService.create(payload);

        toast.success("Thêm phí vận chuyển thành công");
      }

      resetForm();

      setPage(1);

      await fetchShippingRates(1);
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          editingId ? "Cập nhật thất bại" : "Thêm mới thất bại",
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // EDIT
  // =====================================================
  const handleEdit = (item) => {
    setEditingId(item.id);

    setForm({
      province_code: item.province_code || "",

      province_name: item.province_name || "",

      shipping_fee: item.shipping_fee ?? "",

      free_shipping_min: item.free_shipping_min ?? "",

      status: Number(item.status) === 1 ? 1 : 0,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // =====================================================
  // DELETE
  // =====================================================
  const handleDelete = async (item) => {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa phí vận chuyển của "${item.province_name}" không?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(item.id);

      await shippingService.remove(item.id);

      toast.success("Xóa khu vực vận chuyển thành công");

      const remainingItems = shippingRates.length - 1;

      if (remainingItems === 0 && page > 1) {
        setPage((previous) => previous - 1);
      } else {
        await fetchShippingRates(page);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể xóa khu vực vận chuyển"));
    } finally {
      setDeletingId(null);
    }
  };

  // =====================================================
  // STATUS
  // =====================================================
  const handleToggleStatus = async (item) => {
    const nextStatus = Number(item.status) === 1 ? 0 : 1;

    try {
      setStatusUpdatingId(item.id);

      await shippingService.updateStatus(item.id, nextStatus);

      toast.success(
        nextStatus === 1
          ? "Đã bật khu vực vận chuyển"
          : "Đã tắt khu vực vận chuyển",
      );

      await fetchShippingRates(page);
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể thay đổi trạng thái"));
    } finally {
      setStatusUpdatingId(null);
    }
  };

  // =====================================================
  // SEARCH
  // =====================================================
  const handleSearch = async (event) => {
    event.preventDefault();

    if (page !== 1) {
      setPage(1);
      return;
    }

    await fetchShippingRates(1);
  };

  const handleClearSearch = async () => {
    setKeyword("");

    if (page !== 1) {
      setPage(1);
      return;
    }

    try {
      setLoading(true);

      const response = await shippingService.getAll({
        keyword: "",
        status: statusFilter,
        page: 1,
        limit: 10,
      });

      const responseData = response?.data || {};

      setShippingRates(
        Array.isArray(responseData.data) ? responseData.data : [],
      );

      setPagination({
        page: Number(responseData.pagination?.page) || 1,

        limit: Number(responseData.pagination?.limit) || 10,

        total: Number(responseData.pagination?.total) || 0,

        totalPages: Number(responseData.pagination?.totalPages) || 1,
      });
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể tải danh sách"));
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // PAGINATION
  // =====================================================
  const changePage = (nextPage) => {
    if (nextPage < 1 || nextPage > pagination.totalPages || nextPage === page) {
      return;
    }

    setPage(nextPage);
  };

  return (
    <div className="shipping-admin-page">
      {/* =================================================
          HEADER
      ================================================= */}
      <div className="shipping-page-header">
        <div>
          <span className="shipping-page-kicker">
            <i className="bi bi-truck" />
            Vận chuyển
          </span>

          <h1>Quản lý vận chuyển</h1>

          <p>
            Thiết lập phí giao hàng và mức miễn phí vận chuyển theo từng tỉnh /
            thành phố.
          </p>
        </div>

        <div className="shipping-total-card">
          <span>Tổng khu vực</span>

          <strong>{pagination.total}</strong>
        </div>
      </div>

      {/* =================================================
          ADD / EDIT
      ================================================= */}
      <section className="shipping-card">
        <div className="shipping-card-header">
          <div className="shipping-card-title">
            <div className="shipping-title-icon">
              <i
                className={editingId ? "bi bi-pencil-square" : "bi bi-plus-lg"}
              />
            </div>

            <div>
              <h2>
                {editingId
                  ? "Cập nhật phí vận chuyển"
                  : "Thêm tỉnh / thành phố"}
              </h2>

              <p>Thiết lập thông tin và mức phí giao hàng.</p>
            </div>
          </div>

          {editingId && (
            <button
              type="button"
              className="shipping-btn shipping-btn-light"
              onClick={resetForm}
              disabled={saving}
            >
              <i className="bi bi-x-lg" />
              Hủy chỉnh sửa
            </button>
          )}
        </div>

        <form className="shipping-form" onSubmit={handleSubmit}>
          <div className="shipping-form-grid">
            <div className="shipping-field">
              <label>
                Mã tỉnh / thành
                <span>*</span>
              </label>

              <div className="shipping-input-wrap">
                <i className="bi bi-upc-scan" />

                <input
                  type="text"
                  name="province_code"
                  placeholder="VD: CAN_THO"
                  value={form.province_code}
                  onChange={handleProvinceCodeChange}
                  maxLength={50}
                  disabled={saving}
                />
              </div>

              <small>Ví dụ: CAN_THO, HA_NOI, DA_NANG.</small>
            </div>

            <div className="shipping-field">
              <label>
                Tỉnh / Thành phố
                <span>*</span>
              </label>

              <div className="shipping-input-wrap">
                <i className="bi bi-geo-alt" />

                <input
                  type="text"
                  name="province_name"
                  placeholder="VD: Cần Thơ"
                  value={form.province_name}
                  onChange={handleFormChange}
                  maxLength={150}
                  disabled={saving}
                />
              </div>
            </div>

            <div className="shipping-field">
              <label>
                Phí vận chuyển
                <span>*</span>
              </label>

              <div className="shipping-input-wrap shipping-money-input">
                <i className="bi bi-cash-coin" />

                <input
                  type="number"
                  name="shipping_fee"
                  placeholder="20000"
                  value={form.shipping_fee}
                  onChange={handleFormChange}
                  min="0"
                  step="1000"
                  disabled={saving}
                />

                <b>đ</b>
              </div>
            </div>

            <div className="shipping-field">
              <label>Miễn phí từ</label>

              <div className="shipping-input-wrap shipping-money-input">
                <i className="bi bi-gift" />

                <input
                  type="number"
                  name="free_shipping_min"
                  placeholder="5000000"
                  value={form.free_shipping_min}
                  onChange={handleFormChange}
                  min="0"
                  step="1000"
                  disabled={saving}
                />

                <b>đ</b>
              </div>

              <small>Để trống nếu không áp dụng miễn phí ship.</small>
            </div>

            <div className="shipping-field">
              <label>Trạng thái</label>

              <div className="shipping-input-wrap">
                <i className="bi bi-toggle-on" />

                <select
                  name="status"
                  value={form.status}
                  onChange={handleFormChange}
                  disabled={saving}
                >
                  <option value={1}>Hoạt động</option>

                  <option value={0}>Tạm tắt</option>
                </select>
              </div>
            </div>
          </div>

          <div className="shipping-form-actions">
            <button
              type="submit"
              className="shipping-btn shipping-btn-primary"
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className="spinner-border spinner-border-sm" />
                  Đang lưu...
                </>
              ) : editingId ? (
                <>
                  <i className="bi bi-check-lg" />
                  Lưu thay đổi
                </>
              ) : (
                <>
                  <i className="bi bi-plus-lg" />
                  Thêm mới
                </>
              )}
            </button>

            {editingId && (
              <button
                type="button"
                className="shipping-btn shipping-btn-light"
                onClick={resetForm}
                disabled={saving}
              >
                Hủy
              </button>
            )}
          </div>
        </form>
      </section>

      {/* =================================================
          FILTER
      ================================================= */}
      <section className="shipping-card shipping-filter-card">
        <div className="shipping-filter-title">
          <i className="bi bi-funnel" />

          <div>
            <h2>Tìm kiếm & lọc</h2>

            <p>Tìm nhanh khu vực vận chuyển.</p>
          </div>
        </div>

        <div className="shipping-filter-grid">
          <form className="shipping-search" onSubmit={handleSearch}>
            <div className="shipping-search-input">
              <i className="bi bi-search" />

              <input
                type="text"
                placeholder="Tìm theo tên hoặc mã tỉnh/thành..."
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
              />
            </div>

            <button
              type="submit"
              className="shipping-btn shipping-btn-primary"
              disabled={loading}
            >
              Tìm kiếm
            </button>

            {keyword && (
              <button
                type="button"
                className="shipping-btn shipping-btn-light"
                onClick={handleClearSearch}
                disabled={loading}
              >
                Xóa lọc
              </button>
            )}
          </form>

          <div className="shipping-status-filter">
            <i className="bi bi-sliders" />

            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);

                setPage(1);
              }}
            >
              <option value="">Tất cả trạng thái</option>

              <option value="1">Hoạt động</option>

              <option value="0">Tạm tắt</option>
            </select>
          </div>
        </div>
      </section>

      {/* =================================================
          TABLE
      ================================================= */}
      <section className="shipping-card shipping-list-card">
        <div className="shipping-card-header">
          <div className="shipping-card-title">
            <div className="shipping-title-icon shipping-title-icon-blue">
              <i className="bi bi-list-ul" />
            </div>

            <div>
              <h2>Danh sách phí vận chuyển</h2>

              <p>Quản lý khu vực đang được áp dụng trên hệ thống.</p>
            </div>
          </div>

          <span className="shipping-result-count">
            {pagination.total} khu vực
          </span>
        </div>

        <div className="shipping-table-wrap">
          <table className="shipping-table">
            <thead>
              <tr>
                <th>#</th>

                <th>Mã tỉnh</th>

                <th>Tỉnh / Thành phố</th>

                <th>Phí vận chuyển</th>

                <th>Miễn phí từ</th>

                <th>Trạng thái</th>

                <th className="shipping-text-right">Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="shipping-table-state">
                    <div className="shipping-loading">
                      <span className="spinner-border" />

                      <strong>Đang tải dữ liệu...</strong>

                      <p>Vui lòng chờ trong giây lát.</p>
                    </div>
                  </td>
                </tr>
              ) : shippingRates.length === 0 ? (
                <tr>
                  <td colSpan="7" className="shipping-table-state">
                    <div className="shipping-empty">
                      <div className="shipping-empty-icon">
                        <i className="bi bi-truck" />
                      </div>

                      <strong>Chưa có dữ liệu vận chuyển</strong>

                      <p>Hãy thêm tỉnh / thành phố đầu tiên ở phía trên.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                shippingRates.map((item, index) => {
                  const active = Number(item.status) === 1;

                  return (
                    <tr key={item.id}>
                      <td className="shipping-index">
                        {(pagination.page - 1) * pagination.limit + index + 1}
                      </td>

                      <td>
                        <span className="shipping-code">
                          {item.province_code}
                        </span>
                      </td>

                      <td>
                        <div className="shipping-province">
                          <div className="shipping-location-icon">
                            <i className="bi bi-geo-alt-fill" />
                          </div>

                          <strong>{item.province_name}</strong>
                        </div>
                      </td>

                      <td>
                        <strong className="shipping-fee">
                          {formatMoney(item.shipping_fee)}
                        </strong>
                      </td>

                      <td>
                        {item.free_shipping_min === null ||
                        item.free_shipping_min === undefined ? (
                          <span className="shipping-no-free">
                            Không áp dụng
                          </span>
                        ) : Number(item.free_shipping_min) === 0 ? (
                          <span className="shipping-free-badge">
                            <i className="bi bi-gift-fill" />
                            Luôn miễn phí
                          </span>
                        ) : (
                          <span className="shipping-free-min">
                            {formatMoney(item.free_shipping_min)}
                          </span>
                        )}
                      </td>

                      <td>
                        <button
                          type="button"
                          className={
                            active
                              ? "shipping-status shipping-status-active"
                              : "shipping-status shipping-status-disabled"
                          }
                          onClick={() => handleToggleStatus(item)}
                          disabled={statusUpdatingId === item.id}
                        >
                          {statusUpdatingId === item.id ? (
                            <span className="spinner-border spinner-border-sm" />
                          ) : active ? (
                            <>
                              <span className="shipping-status-dot" />
                              Hoạt động
                            </>
                          ) : (
                            <>
                              <span className="shipping-status-dot" />
                              Tạm tắt
                            </>
                          )}
                        </button>
                      </td>

                      <td>
                        <div className="shipping-actions">
                          <button
                            type="button"
                            className="shipping-action-btn shipping-edit-btn"
                            onClick={() => handleEdit(item)}
                            title="Chỉnh sửa"
                          >
                            <i className="bi bi-pencil-square" />
                            Sửa
                          </button>

                          <button
                            type="button"
                            className="shipping-action-btn shipping-delete-btn"
                            onClick={() => handleDelete(item)}
                            disabled={deletingId === item.id}
                            title="Xóa"
                          >
                            {deletingId === item.id ? (
                              <span className="spinner-border spinner-border-sm" />
                            ) : (
                              <>
                                <i className="bi bi-trash" />
                                Xóa
                              </>
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

        {/* =================================================
            PAGINATION
        ================================================= */}
        {!loading && pagination.totalPages > 1 && (
          <div className="shipping-pagination">
            <div>
              Trang <strong>{pagination.page}</strong> /{" "}
              <strong>{pagination.totalPages}</strong>
              <span>• {pagination.total} khu vực</span>
            </div>

            <div className="shipping-pagination-buttons">
              <button
                type="button"
                onClick={() => changePage(page - 1)}
                disabled={page <= 1}
              >
                <i className="bi bi-chevron-left" />
              </button>

              {Array.from(
                {
                  length: pagination.totalPages,
                },
                (_, pageIndex) => {
                  const pageNumber = pageIndex + 1;

                  return (
                    <button
                      key={pageNumber}
                      type="button"
                      className={page === pageNumber ? "active" : ""}
                      onClick={() => changePage(pageNumber)}
                    >
                      {pageNumber}
                    </button>
                  );
                },
              )}

              <button
                type="button"
                onClick={() => changePage(page + 1)}
                disabled={page >= pagination.totalPages}
              >
                <i className="bi bi-chevron-right" />
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default ShippingManagement;
