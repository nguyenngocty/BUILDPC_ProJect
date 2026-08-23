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

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="adm-shipping-page">
      {/* =================================================
          HEADER
          ================================================= */}

      <section className="adm-shipping-header">
        <div className="adm-shipping-header__content">
          <span className="adm-shipping-header__kicker">Vận chuyển</span>

          <h1 className="adm-shipping-header__title">
            <span className="adm-shipping-header__title-icon">
              <i className="bi bi-truck" />
            </span>

            <span>Quản lý vận chuyển</span>
          </h1>

          <p className="adm-shipping-header__description">
            Thiết lập phí giao hàng và mức miễn phí vận chuyển theo từng tỉnh /
            thành phố.
          </p>
        </div>

        <div className="adm-shipping-total-card">
          <span className="adm-shipping-total-card__icon">
            <i className="bi bi-geo-alt" />
          </span>

          <div>
            <strong>{pagination.total}</strong>

            <span>Tổng khu vực</span>
          </div>
        </div>
      </section>

      {/* =================================================
          ADD / EDIT
          ================================================= */}

      <section className="adm-shipping-panel">
        <div className="adm-shipping-panel__header">
          <div className="adm-shipping-panel__heading">
            <span className="adm-shipping-panel__icon">
              <i
                className={editingId ? "bi bi-pencil-square" : "bi bi-plus-lg"}
              />
            </span>

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
              className="adm-shipping-button adm-shipping-button--secondary"
              onClick={resetForm}
              disabled={saving}
            >
              <i className="bi bi-x-lg" />

              <span>Hủy chỉnh sửa</span>
            </button>
          )}
        </div>

        <form className="adm-shipping-form" onSubmit={handleSubmit}>
          <div className="adm-shipping-form__grid">
            {/* PROVINCE CODE */}

            <div className="adm-shipping-field">
              <label className="adm-shipping-field__label">
                Mã tỉnh / thành
                <span>*</span>
              </label>

              <div className="adm-shipping-input-wrap">
                <i className="bi bi-upc-scan adm-shipping-input-wrap__icon" />

                <input
                  className="adm-shipping-input"
                  type="text"
                  name="province_code"
                  placeholder="VD: CAN_THO"
                  value={form.province_code}
                  onChange={handleProvinceCodeChange}
                  maxLength={50}
                  disabled={saving}
                />
              </div>

              <small className="adm-shipping-field__help">
                Ví dụ: CAN_THO, HA_NOI, DA_NANG.
              </small>
            </div>

            {/* PROVINCE NAME */}

            <div className="adm-shipping-field">
              <label className="adm-shipping-field__label">
                Tỉnh / Thành phố
                <span>*</span>
              </label>

              <div className="adm-shipping-input-wrap">
                <i className="bi bi-geo-alt adm-shipping-input-wrap__icon" />

                <input
                  className="adm-shipping-input"
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

            {/* SHIPPING FEE */}

            <div className="adm-shipping-field">
              <label className="adm-shipping-field__label">
                Phí vận chuyển
                <span>*</span>
              </label>

              <div className="adm-shipping-input-wrap">
                <i className="bi bi-cash-coin adm-shipping-input-wrap__icon" />

                <input
                  className="adm-shipping-input adm-shipping-input--money"
                  type="number"
                  name="shipping_fee"
                  placeholder="20000"
                  value={form.shipping_fee}
                  onChange={handleFormChange}
                  min="0"
                  step="1000"
                  disabled={saving}
                />

                <span className="adm-shipping-input-wrap__suffix">đ</span>
              </div>
            </div>

            {/* FREE SHIPPING */}

            <div className="adm-shipping-field">
              <label className="adm-shipping-field__label">Miễn phí từ</label>

              <div className="adm-shipping-input-wrap">
                <i className="bi bi-gift adm-shipping-input-wrap__icon" />

                <input
                  className="adm-shipping-input adm-shipping-input--money"
                  type="number"
                  name="free_shipping_min"
                  placeholder="5000000"
                  value={form.free_shipping_min}
                  onChange={handleFormChange}
                  min="0"
                  step="1000"
                  disabled={saving}
                />

                <span className="adm-shipping-input-wrap__suffix">đ</span>
              </div>

              <small className="adm-shipping-field__help">
                Để trống nếu không áp dụng miễn phí ship.
              </small>
            </div>

            {/* STATUS */}

            <div className="adm-shipping-field">
              <label className="adm-shipping-field__label">Trạng thái</label>

              <div className="adm-shipping-input-wrap">
                <i className="bi bi-toggle-on adm-shipping-input-wrap__icon" />

                <select
                  className="adm-shipping-select"
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

          <div className="adm-shipping-form__actions">
            <button
              type="submit"
              className="adm-shipping-button adm-shipping-button--primary"
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className="adm-shipping-spinner adm-shipping-spinner--small" />

                  <span>Đang lưu...</span>
                </>
              ) : editingId ? (
                <>
                  <i className="bi bi-check-lg" />

                  <span>Lưu thay đổi</span>
                </>
              ) : (
                <>
                  <i className="bi bi-plus-lg" />

                  <span>Thêm mới</span>
                </>
              )}
            </button>

            {editingId && (
              <button
                type="button"
                className="adm-shipping-button adm-shipping-button--secondary"
                onClick={resetForm}
                disabled={saving}
              >
                <i className="bi bi-x-circle" />

                <span>Hủy</span>
              </button>
            )}
          </div>
        </form>
      </section>

      {/* =================================================
          FILTER
          ================================================= */}

      <section className="adm-shipping-panel">
        <div className="adm-shipping-panel__header">
          <div className="adm-shipping-panel__heading">
            <span className="adm-shipping-panel__icon adm-shipping-panel__icon--purple">
              <i className="bi bi-funnel" />
            </span>

            <div>
              <h2>Tìm kiếm & lọc</h2>

              <p>Tìm nhanh khu vực vận chuyển theo tên, mã hoặc trạng thái.</p>
            </div>
          </div>
        </div>

        <div className="adm-shipping-panel__body">
          <div className="adm-shipping-filter">
            <form className="adm-shipping-search" onSubmit={handleSearch}>
              <div className="adm-shipping-search__input-wrap">
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
                className="adm-shipping-button adm-shipping-button--primary"
                disabled={loading}
              >
                <i className="bi bi-search" />

                <span>Tìm kiếm</span>
              </button>

              {keyword && (
                <button
                  type="button"
                  className="adm-shipping-button adm-shipping-button--secondary"
                  onClick={handleClearSearch}
                  disabled={loading}
                >
                  <i className="bi bi-x-circle" />

                  <span>Xóa lọc</span>
                </button>
              )}
            </form>

            <div className="adm-shipping-filter__status">
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
        </div>
      </section>

      {/* =================================================
          TABLE
          ================================================= */}

      <section className="adm-shipping-panel">
        <div className="adm-shipping-panel__header">
          <div className="adm-shipping-panel__heading">
            <span className="adm-shipping-panel__icon adm-shipping-panel__icon--blue">
              <i className="bi bi-list-ul" />
            </span>

            <div>
              <h2>Danh sách phí vận chuyển</h2>

              <p>Quản lý các khu vực đang được áp dụng trên hệ thống.</p>
            </div>
          </div>

          <span className="adm-shipping-result-count">
            <i className="bi bi-geo-alt" />
            {pagination.total} khu vực
          </span>
        </div>

        <div className="adm-shipping-table-wrap">
          <table className="adm-shipping-table">
            <thead>
              <tr>
                <th>#</th>

                <th>Mã tỉnh</th>

                <th>Tỉnh / Thành phố</th>

                <th>Phí vận chuyển</th>

                <th>Miễn phí từ</th>

                <th>Trạng thái</th>

                <th>Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="adm-shipping-table__state">
                    <div className="adm-shipping-loading">
                      <span className="adm-shipping-spinner" />

                      <strong>Đang tải dữ liệu...</strong>

                      <p>Vui lòng chờ trong giây lát.</p>
                    </div>
                  </td>
                </tr>
              ) : shippingRates.length === 0 ? (
                <tr>
                  <td colSpan="7" className="adm-shipping-table__state">
                    <div className="adm-shipping-empty">
                      <span className="adm-shipping-empty__icon">
                        <i className="bi bi-truck" />
                      </span>

                      <strong>Chưa có dữ liệu vận chuyển</strong>

                      <p>Hãy thêm tỉnh / thành phố đầu tiên ở phía trên.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                shippingRates.map((item, index) => {
                  const isActive = Number(item.status) === 1;

                  return (
                    <tr key={item.id}>
                      <td>
                        <span className="adm-shipping-index">
                          {(pagination.page - 1) * pagination.limit + index + 1}
                        </span>
                      </td>

                      <td>
                        <span className="adm-shipping-code">
                          {item.province_code}
                        </span>
                      </td>

                      <td>
                        <div className="adm-shipping-province">
                          <span className="adm-shipping-province__icon">
                            <i className="bi bi-geo-alt-fill" />
                          </span>

                          <strong>{item.province_name}</strong>
                        </div>
                      </td>

                      <td>
                        <strong className="adm-shipping-fee">
                          {formatMoney(item.shipping_fee)}
                        </strong>
                      </td>

                      <td>
                        {item.free_shipping_min === null ||
                        item.free_shipping_min === undefined ? (
                          <span className="adm-shipping-free adm-shipping-free--none">
                            Không áp dụng
                          </span>
                        ) : Number(item.free_shipping_min) === 0 ? (
                          <span className="adm-shipping-free adm-shipping-free--always">
                            <i className="bi bi-gift-fill" />
                            Luôn miễn phí
                          </span>
                        ) : (
                          <span className="adm-shipping-free adm-shipping-free--minimum">
                            {formatMoney(item.free_shipping_min)}
                          </span>
                        )}
                      </td>

                      <td>
                        <button
                          type="button"
                          className={[
                            "adm-shipping-status",
                            isActive
                              ? "adm-shipping-status--active"
                              : "adm-shipping-status--disabled",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          onClick={() => handleToggleStatus(item)}
                          disabled={statusUpdatingId === item.id}
                        >
                          {statusUpdatingId === item.id ? (
                            <span className="adm-shipping-spinner adm-shipping-spinner--tiny" />
                          ) : (
                            <>
                              <span className="adm-shipping-status__dot" />

                              <span>{isActive ? "Hoạt động" : "Tạm tắt"}</span>
                            </>
                          )}
                        </button>
                      </td>

                      <td>
                        <div className="adm-shipping-row-actions">
                          <button
                            type="button"
                            className="adm-shipping-action-button adm-shipping-action-button--edit"
                            onClick={() => handleEdit(item)}
                            title="Chỉnh sửa"
                          >
                            <i className="bi bi-pencil-square" />

                            <span>Sửa</span>
                          </button>

                          <button
                            type="button"
                            className="adm-shipping-action-button adm-shipping-action-button--delete"
                            onClick={() => handleDelete(item)}
                            disabled={deletingId === item.id}
                            title="Xóa"
                          >
                            {deletingId === item.id ? (
                              <span className="adm-shipping-spinner adm-shipping-spinner--tiny" />
                            ) : (
                              <>
                                <i className="bi bi-trash" />

                                <span>Xóa</span>
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
          <div className="adm-shipping-pagination">
            <div className="adm-shipping-pagination__info">
              Trang <strong>{pagination.page}</strong> /{" "}
              <strong>{pagination.totalPages}</strong>
              <span>{pagination.total} khu vực</span>
            </div>

            <div className="adm-shipping-pagination__controls">
              <button
                type="button"
                className="adm-shipping-pagination__button"
                onClick={() => changePage(page - 1)}
                disabled={page <= 1}
                aria-label="Trang trước"
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
                      className={[
                        "adm-shipping-pagination__button",
                        page === pageNumber &&
                          "adm-shipping-pagination__button--current",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => changePage(pageNumber)}
                    >
                      {pageNumber}
                    </button>
                  );
                },
              )}

              <button
                type="button"
                className="adm-shipping-pagination__button"
                onClick={() => changePage(page + 1)}
                disabled={page >= pagination.totalPages}
                aria-label="Trang sau"
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
