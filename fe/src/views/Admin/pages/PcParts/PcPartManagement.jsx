import { useCallback, useEffect, useMemo, useState } from "react";

import pcPartTypeService from "../../../../services/pcPartTypeService";
import pcPartService from "../../../../services/pcPartService";

import "./PcPartManagement.css";

const DEFAULT_TAB = "types";

const EMPTY_TYPE_FORM = {
  type_code: "",
  type_name: "",
  description: "",
};

const EMPTY_PART_FORM = {
  type_id: "",
  product_id: "",
  specifications: '{\n  "socket": "",\n  "ram_type": ""\n}',
  is_visible: "1",
};

/* =========================================================
   HELPERS
   ========================================================= */

const formatDateTime = (value) => {
  if (!value) {
    return "Không có";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("vi-VN");
};

const formatMoney = (value) => {
  return `${Number(value || 0).toLocaleString("vi-VN")} đ`;
};

const safeJsonStringify = (value) => {
  if (!value) {
    return "{}";
  }

  if (typeof value === "string") {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch (error) {
      return value;
    }
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch (error) {
    return String(value);
  }
};

/* =========================================================
   COMPONENT
   ========================================================= */

function PcPartManagement() {
  /* =======================================================
     TAB
     ======================================================= */

  const [activeTab, setActiveTab] = useState(DEFAULT_TAB);

  /* =======================================================
     DATA
     ======================================================= */

  const [partTypes, setPartTypes] = useState([]);

  const [pcParts, setPcParts] = useState([]);

  /* =======================================================
     FILTER
     ======================================================= */

  const [typeKeyword, setTypeKeyword] = useState("");

  const [partKeyword, setPartKeyword] = useState("");

  const [typeFilter, setTypeFilter] = useState("");

  const [productFilter, setProductFilter] = useState("");

  const [visibleFilter, setVisibleFilter] = useState("");

  /* =======================================================
     LOADING / ERROR
     ======================================================= */

  const [typeLoading, setTypeLoading] = useState(false);

  const [partLoading, setPartLoading] = useState(false);

  const [typeError, setTypeError] = useState("");

  const [partError, setPartError] = useState("");

  const [typeSaving, setTypeSaving] = useState(false);

  const [partSaving, setPartSaving] = useState(false);

  const [deletingTypeId, setDeletingTypeId] = useState(null);

  const [deletingPartId, setDeletingPartId] = useState(null);

  /* =======================================================
     EDIT
     ======================================================= */

  const [editingTypeId, setEditingTypeId] = useState(null);

  const [editingPartId, setEditingPartId] = useState(null);

  /* =======================================================
     FORM
     ======================================================= */

  const [typeForm, setTypeForm] = useState(EMPTY_TYPE_FORM);

  const [partForm, setPartForm] = useState(EMPTY_PART_FORM);

  /* =======================================================
     LOAD PART TYPES
     ======================================================= */

  const loadPartTypes = useCallback(async () => {
    try {
      setTypeLoading(true);
      setTypeError("");

      const response = await pcPartTypeService.getAll({
        keyword: typeKeyword.trim(),
        page: 1,
        limit: 100,
      });

      setPartTypes(
        Array.isArray(response?.data?.data) ? response.data.data : [],
      );
    } catch (error) {
      console.error("Lỗi tải loại linh kiện:", error);

      setTypeError(
        error?.response?.data?.message || "Không thể tải loại linh kiện.",
      );
    } finally {
      setTypeLoading(false);
    }
  }, [typeKeyword]);

  /* =======================================================
     LOAD PC PARTS
     ======================================================= */

  const loadPcParts = useCallback(async () => {
    try {
      setPartLoading(true);
      setPartError("");

      const response = await pcPartService.getAll({
        keyword: partKeyword.trim(),

        type_id: typeFilter,

        product_id: productFilter,

        is_visible: visibleFilter,

        page: 1,

        limit: 100,
      });

      setPcParts(Array.isArray(response?.data?.data) ? response.data.data : []);
    } catch (error) {
      console.error("Lỗi tải linh kiện:", error);

      setPartError(
        error?.response?.data?.message || "Không thể tải danh sách linh kiện.",
      );
    } finally {
      setPartLoading(false);
    }
  }, [partKeyword, typeFilter, productFilter, visibleFilter]);

  /* =======================================================
     INITIAL LOAD
     ======================================================= */

  useEffect(() => {
    loadPartTypes();
  }, [loadPartTypes]);

  useEffect(() => {
    loadPcParts();
  }, [loadPcParts]);

  /* =======================================================
     STATISTICS
     ======================================================= */

  const stats = useMemo(() => {
    const visibleCount = pcParts.filter(
      (item) => Number(item.is_visible) === 1,
    ).length;

    const hiddenCount = pcParts.filter(
      (item) => Number(item.is_visible) === 0,
    ).length;

    return {
      typeCount: partTypes.length,

      partCount: pcParts.length,

      visibleCount,

      hiddenCount,
    };
  }, [partTypes, pcParts]);

  /* =======================================================
     RESET
     ======================================================= */

  const resetTypeForm = () => {
    setEditingTypeId(null);

    setTypeForm({
      ...EMPTY_TYPE_FORM,
    });
  };

  const resetPartForm = () => {
    setEditingPartId(null);

    setPartForm({
      ...EMPTY_PART_FORM,
    });
  };

  const resetTypeFilter = () => {
    setTypeKeyword("");
  };

  const resetPartFilter = () => {
    setPartKeyword("");

    setTypeFilter("");

    setProductFilter("");

    setVisibleFilter("");
  };

  /* =======================================================
     CREATE / UPDATE TYPE
     ======================================================= */

  const handleTypeSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      type_code: typeForm.type_code.trim().toUpperCase(),

      type_name: typeForm.type_name.trim(),

      description: typeForm.description.trim(),
    };

    if (!payload.type_code) {
      window.alert("Vui lòng nhập mã loại linh kiện.");

      return;
    }

    if (!payload.type_name) {
      window.alert("Vui lòng nhập tên loại linh kiện.");

      return;
    }

    try {
      setTypeSaving(true);

      if (editingTypeId) {
        await pcPartTypeService.update(editingTypeId, payload);

        window.alert("Cập nhật loại linh kiện thành công.");
      } else {
        await pcPartTypeService.create(payload);

        window.alert("Thêm loại linh kiện thành công.");
      }

      resetTypeForm();

      await loadPartTypes();
    } catch (error) {
      console.error(error);

      window.alert(
        error?.response?.data?.message || "Không thể lưu loại linh kiện.",
      );
    } finally {
      setTypeSaving(false);
    }
  };

  /* =======================================================
     CREATE / UPDATE PART
     ======================================================= */

  const handlePartSubmit = async (event) => {
    event.preventDefault();

    let parsedSpecifications = null;

    if (partForm.specifications.trim()) {
      try {
        parsedSpecifications = JSON.parse(partForm.specifications);
      } catch (error) {
        window.alert("Specifications phải là JSON hợp lệ.");

        return;
      }
    }

    const payload = {
      type_id: Number(partForm.type_id),

      product_id: Number(partForm.product_id),

      specifications: parsedSpecifications,

      is_visible: Number(partForm.is_visible),
    };

    if (!payload.type_id) {
      window.alert("Vui lòng chọn loại linh kiện.");

      return;
    }

    if (!payload.product_id) {
      window.alert("Vui lòng nhập Product ID.");

      return;
    }

    try {
      setPartSaving(true);

      if (editingPartId) {
        await pcPartService.update(editingPartId, payload);

        window.alert("Cập nhật linh kiện thành công.");
      } else {
        await pcPartService.create(payload);

        window.alert("Thêm linh kiện thành công.");
      }

      resetPartForm();

      await loadPcParts();
    } catch (error) {
      console.error(error);

      window.alert(
        error?.response?.data?.message || "Không thể lưu linh kiện.",
      );
    } finally {
      setPartSaving(false);
    }
  };

  /* =======================================================
     EDIT TYPE
     ======================================================= */

  const handleEditType = (item) => {
    setEditingTypeId(item.id);

    setTypeForm({
      type_code: item.type_code || "",

      type_name: item.type_name || "",

      description: item.description || "",
    });

    setActiveTab("types");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /* =======================================================
     EDIT PART
     ======================================================= */

  const handleEditPart = (item) => {
    setEditingPartId(item.id);

    setPartForm({
      type_id: String(item.type_id || ""),

      product_id: String(item.product_id || ""),

      specifications: safeJsonStringify(item.specifications),

      is_visible: String(Number(item.is_visible ?? 1)),
    });

    setActiveTab("parts");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /* =======================================================
     DELETE TYPE
     ======================================================= */

  const handleDeleteType = async (id) => {
    const confirmed = window.confirm(
      "Bạn có chắc muốn xóa loại linh kiện này?",
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingTypeId(id);

      await pcPartTypeService.remove(id);

      if (Number(editingTypeId) === Number(id)) {
        resetTypeForm();
      }

      await loadPartTypes();
    } catch (error) {
      console.error(error);

      window.alert(
        error?.response?.data?.message || "Không thể xóa loại linh kiện.",
      );
    } finally {
      setDeletingTypeId(null);
    }
  };

  /* =======================================================
     DELETE PART
     ======================================================= */

  const handleDeletePart = async (id) => {
    const confirmed = window.confirm("Bạn có chắc muốn xóa linh kiện này?");

    if (!confirmed) {
      return;
    }

    try {
      setDeletingPartId(id);

      await pcPartService.remove(id);

      if (Number(editingPartId) === Number(id)) {
        resetPartForm();
      }

      await loadPcParts();
    } catch (error) {
      console.error(error);

      window.alert(
        error?.response?.data?.message || "Không thể xóa linh kiện.",
      );
    } finally {
      setDeletingPartId(null);
    }
  };

  /* =======================================================
     CHANGE TAB
     ======================================================= */

  const handleChangeTab = (tab) => {
    setActiveTab(tab);
  };

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <div className="adm-part-page">
      {/* =================================================
          HEADER
          ================================================= */}

      <section className="adm-part-header">
        <div>
          <span className="adm-part-kicker">
            <i className="bi bi-pc-display" />
            Quản lý linh kiện
          </span>

          <h1>Linh kiện Build PC</h1>

          <p>
            Quản lý nhóm linh kiện, liên kết sản phẩm với hệ thống Build PC và
            thiết lập thông số kỹ thuật phục vụ kiểm tra tương thích.
          </p>
        </div>

        <button
          type="button"
          className="adm-part-header-refresh"
          onClick={() => {
            loadPartTypes();
            loadPcParts();
          }}
        >
          <i className="bi bi-arrow-clockwise" />
          Làm mới dữ liệu
        </button>
      </section>

      {/* =================================================
          STATISTICS
          ================================================= */}

      <section className="adm-part-stats">
        <article className="adm-part-stat">
          <div className="adm-part-stat__icon adm-part-stat__icon--blue">
            <i className="bi bi-grid-3x3-gap" />
          </div>

          <div>
            <span>Loại linh kiện</span>

            <strong>{stats.typeCount}</strong>
          </div>
        </article>

        <article className="adm-part-stat">
          <div className="adm-part-stat__icon adm-part-stat__icon--purple">
            <i className="bi bi-cpu" />
          </div>

          <div>
            <span>Tổng linh kiện</span>

            <strong>{stats.partCount}</strong>
          </div>
        </article>

        <article className="adm-part-stat">
          <div className="adm-part-stat__icon adm-part-stat__icon--green">
            <i className="bi bi-eye-fill" />
          </div>

          <div>
            <span>Đang hiển thị</span>

            <strong>{stats.visibleCount}</strong>
          </div>
        </article>

        <article className="adm-part-stat">
          <div className="adm-part-stat__icon adm-part-stat__icon--red">
            <i className="bi bi-eye-slash-fill" />
          </div>

          <div>
            <span>Đang ẩn</span>

            <strong>{stats.hiddenCount}</strong>
          </div>
        </article>
      </section>

      {/* =================================================
          TABS
          ================================================= */}

      <div className="adm-part-tabs">
        <button
          type="button"
          className={
            activeTab === "types"
              ? "adm-part-tab adm-part-tab--active"
              : "adm-part-tab"
          }
          onClick={() => handleChangeTab("types")}
        >
          <i className="bi bi-grid" />
          Loại linh kiện
        </button>

        <button
          type="button"
          className={
            activeTab === "parts"
              ? "adm-part-tab adm-part-tab--active"
              : "adm-part-tab"
          }
          onClick={() => handleChangeTab("parts")}
        >
          <i className="bi bi-cpu" />
          Linh kiện
        </button>
      </div>

      {/* =================================================
          TYPE TAB
          ================================================= */}

      {activeTab === "types" && (
        <div className="adm-part-layout">
          {/* ================= FORM ================= */}

          <section className="adm-part-card adm-part-form-card">
            <div className="adm-part-card__header">
              <div className="adm-part-card__heading">
                <span className="adm-part-card__icon">
                  <i
                    className={
                      editingTypeId ? "bi bi-pencil-square" : "bi bi-plus-lg"
                    }
                  />
                </span>

                <div>
                  <h2>
                    {editingTypeId
                      ? "Chỉnh sửa loại linh kiện"
                      : "Thêm loại linh kiện"}
                  </h2>

                  <p>Thiết lập mã, tên và mô tả cho nhóm linh kiện.</p>
                </div>
              </div>

              {editingTypeId && (
                <button
                  type="button"
                  className="adm-part-btn adm-part-btn--light"
                  onClick={resetTypeForm}
                  disabled={typeSaving}
                >
                  <i className="bi bi-x-lg" />
                  Hủy chỉnh sửa
                </button>
              )}
            </div>

            <form className="adm-part-form" onSubmit={handleTypeSubmit}>
              <div className="adm-part-field">
                <label>
                  Mã loại
                  <b>*</b>
                </label>

                <div className="adm-part-input-wrap">
                  <i className="bi bi-upc-scan" />

                  <input
                    type="text"
                    value={typeForm.type_code}
                    placeholder="VD: CPU"
                    disabled={typeSaving}
                    onChange={(event) =>
                      setTypeForm((current) => ({
                        ...current,

                        type_code: event.target.value,
                      }))
                    }
                  />
                </div>

                <small>Ví dụ: CPU, MAINBOARD, RAM, VGA.</small>
              </div>

              <div className="adm-part-field">
                <label>
                  Tên loại
                  <b>*</b>
                </label>

                <div className="adm-part-input-wrap">
                  <i className="bi bi-tag" />

                  <input
                    type="text"
                    value={typeForm.type_name}
                    placeholder="VD: Bộ vi xử lý"
                    disabled={typeSaving}
                    onChange={(event) =>
                      setTypeForm((current) => ({
                        ...current,

                        type_name: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="adm-part-field adm-part-field--full">
                <label>Mô tả</label>

                <textarea
                  rows={5}
                  value={typeForm.description}
                  placeholder="Nhập mô tả ngắn cho loại linh kiện..."
                  disabled={typeSaving}
                  onChange={(event) =>
                    setTypeForm((current) => ({
                      ...current,

                      description: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="adm-part-form-actions adm-part-field--full">
                <button
                  type="submit"
                  className="adm-part-btn adm-part-btn--primary"
                  disabled={typeSaving}
                >
                  {typeSaving ? (
                    <>
                      <span className="adm-part-spinner adm-part-spinner--small" />
                      Đang lưu...
                    </>
                  ) : editingTypeId ? (
                    <>
                      <i className="bi bi-check-lg" />
                      Cập nhật
                    </>
                  ) : (
                    <>
                      <i className="bi bi-plus-lg" />
                      Thêm loại
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="adm-part-btn adm-part-btn--light"
                  onClick={resetTypeForm}
                  disabled={typeSaving}
                >
                  <i className="bi bi-arrow-counterclockwise" />
                  Làm mới
                </button>
              </div>
            </form>
          </section>

          {/* ================= LIST ================= */}

          <section className="adm-part-card adm-part-list-card">
            <div className="adm-part-card__header">
              <div className="adm-part-card__heading">
                <span className="adm-part-card__icon adm-part-card__icon--blue">
                  <i className="bi bi-list-ul" />
                </span>

                <div>
                  <h2>Danh sách loại linh kiện</h2>

                  <p>Quản lý các nhóm được sử dụng trong Build PC.</p>
                </div>
              </div>

              <span className="adm-part-result-count">
                {partTypes.length} loại
              </span>
            </div>

            {/* FILTER */}

            <div className="adm-part-filter">
              <div className="adm-part-search">
                <i className="bi bi-search" />

                <input
                  type="text"
                  value={typeKeyword}
                  placeholder="Tìm theo mã, tên hoặc mô tả..."
                  onChange={(event) => setTypeKeyword(event.target.value)}
                />

                {typeKeyword && (
                  <button type="button" onClick={resetTypeFilter}>
                    <i className="bi bi-x-circle-fill" />
                  </button>
                )}
              </div>

              <button
                type="button"
                className="adm-part-btn adm-part-btn--filter"
                onClick={loadPartTypes}
                disabled={typeLoading}
              >
                <i className="bi bi-funnel" />
                Lọc lại
              </button>
            </div>

            {/* TABLE */}

            <div className="adm-part-table-wrap">
              <table className="adm-part-table adm-part-type-table">
                <thead>
                  <tr>
                    <th>ID</th>

                    <th>Mã</th>

                    <th>Tên loại</th>

                    <th>Mô tả</th>

                    <th>Ngày tạo</th>

                    <th>Thao tác</th>
                  </tr>
                </thead>

                <tbody>
                  {typeLoading ? (
                    <tr>
                      <td colSpan="6" className="adm-part-table-state">
                        <div className="adm-part-loading">
                          <span className="adm-part-spinner" />

                          <strong>Đang tải loại linh kiện...</strong>
                        </div>
                      </td>
                    </tr>
                  ) : typeError ? (
                    <tr>
                      <td colSpan="6" className="adm-part-table-state">
                        <div className="adm-part-error-state">
                          <i className="bi bi-exclamation-triangle" />

                          <strong>Không thể tải dữ liệu</strong>

                          <p>{typeError}</p>
                        </div>
                      </td>
                    </tr>
                  ) : partTypes.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="adm-part-table-state">
                        <div className="adm-part-empty">
                          <span>
                            <i className="bi bi-grid" />
                          </span>

                          <strong>Chưa có loại linh kiện</strong>

                          <p>Hãy thêm loại linh kiện đầu tiên.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    partTypes.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <span className="adm-part-id">#{item.id}</span>
                        </td>

                        <td>
                          <span className="adm-part-code">
                            {item.type_code}
                          </span>
                        </td>

                        <td>
                          <strong className="adm-part-name">
                            {item.type_name}
                          </strong>
                        </td>

                        <td>
                          <p className="adm-part-description">
                            {item.description || "Không có mô tả"}
                          </p>
                        </td>

                        <td>
                          <span className="adm-part-date">
                            {formatDateTime(item.created_at)}
                          </span>
                        </td>

                        <td>
                          <div className="adm-part-row-actions">
                            <button
                              type="button"
                              className="adm-part-action adm-part-action--edit"
                              onClick={() => handleEditType(item)}
                            >
                              <i className="bi bi-pencil-square" />
                              Sửa
                            </button>

                            <button
                              type="button"
                              className="adm-part-action adm-part-action--delete"
                              disabled={deletingTypeId === item.id}
                              onClick={() => handleDeleteType(item.id)}
                            >
                              {deletingTypeId === item.id ? (
                                <span className="adm-part-spinner adm-part-spinner--tiny" />
                              ) : (
                                <i className="bi bi-trash3" />
                              )}
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
          </section>
        </div>
      )}

      {/* =================================================
          PART TAB
          ================================================= */}

      {activeTab === "parts" && (
        <div className="adm-part-layout">
          {/* ================= FORM ================= */}

          <section className="adm-part-card adm-part-form-card">
            <div className="adm-part-card__header">
              <div className="adm-part-card__heading">
                <span className="adm-part-card__icon adm-part-card__icon--purple">
                  <i
                    className={
                      editingPartId ? "bi bi-pencil-square" : "bi bi-cpu"
                    }
                  />
                </span>

                <div>
                  <h2>
                    {editingPartId ? "Chỉnh sửa linh kiện" : "Thêm linh kiện"}
                  </h2>

                  <p>Liên kết sản phẩm với loại linh kiện Build PC.</p>
                </div>
              </div>

              {editingPartId && (
                <button
                  type="button"
                  className="adm-part-btn adm-part-btn--light"
                  onClick={resetPartForm}
                  disabled={partSaving}
                >
                  <i className="bi bi-x-lg" />
                  Hủy chỉnh sửa
                </button>
              )}
            </div>

            <form className="adm-part-form" onSubmit={handlePartSubmit}>
              <div className="adm-part-field">
                <label>
                  Loại linh kiện
                  <b>*</b>
                </label>

                <div className="adm-part-input-wrap">
                  <i className="bi bi-grid" />

                  <select
                    value={partForm.type_id}
                    disabled={partSaving}
                    onChange={(event) =>
                      setPartForm((current) => ({
                        ...current,

                        type_id: event.target.value,
                      }))
                    }
                  >
                    <option value="">Chọn loại linh kiện</option>

                    {partTypes.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.type_name} ({item.type_code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="adm-part-field">
                <label>
                  Product ID
                  <b>*</b>
                </label>

                <div className="adm-part-input-wrap">
                  <i className="bi bi-box-seam" />

                  <input
                    type="number"
                    min="1"
                    value={partForm.product_id}
                    placeholder="VD: 15"
                    disabled={partSaving}
                    onChange={(event) =>
                      setPartForm((current) => ({
                        ...current,

                        product_id: event.target.value,
                      }))
                    }
                  />
                </div>

                <small>ID của sản phẩm trong bảng products.</small>
              </div>

              <div className="adm-part-field adm-part-field--full">
                <label>Specifications JSON</label>

                <textarea
                  rows={11}
                  className="adm-part-json-editor"
                  value={partForm.specifications}
                  disabled={partSaving}
                  placeholder='{"socket":"LGA1700","ram_type":"DDR5"}'
                  onChange={(event) =>
                    setPartForm((current) => ({
                      ...current,

                      specifications: event.target.value,
                    }))
                  }
                />

                <small>
                  Dùng JSON để lưu Socket, RAM Type, Wattage, Power Recommend...
                </small>
              </div>

              <div className="adm-part-field">
                <label>Trạng thái hiển thị</label>

                <div className="adm-part-input-wrap">
                  <i className="bi bi-eye" />

                  <select
                    value={partForm.is_visible}
                    disabled={partSaving}
                    onChange={(event) =>
                      setPartForm((current) => ({
                        ...current,

                        is_visible: event.target.value,
                      }))
                    }
                  >
                    <option value="1">Hiển thị</option>

                    <option value="0">Ẩn</option>
                  </select>
                </div>
              </div>

              <div className="adm-part-form-actions adm-part-field--full">
                <button
                  type="submit"
                  className="adm-part-btn adm-part-btn--primary"
                  disabled={partSaving}
                >
                  {partSaving ? (
                    <>
                      <span className="adm-part-spinner adm-part-spinner--small" />
                      Đang lưu...
                    </>
                  ) : editingPartId ? (
                    <>
                      <i className="bi bi-check-lg" />
                      Cập nhật
                    </>
                  ) : (
                    <>
                      <i className="bi bi-plus-lg" />
                      Thêm linh kiện
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="adm-part-btn adm-part-btn--light"
                  onClick={resetPartForm}
                  disabled={partSaving}
                >
                  <i className="bi bi-arrow-counterclockwise" />
                  Làm mới
                </button>
              </div>
            </form>
          </section>

          {/* ================= PART LIST ================= */}

          <section className="adm-part-card adm-part-list-card">
            <div className="adm-part-card__header">
              <div className="adm-part-card__heading">
                <span className="adm-part-card__icon adm-part-card__icon--blue">
                  <i className="bi bi-list-ul" />
                </span>

                <div>
                  <h2>Danh sách linh kiện</h2>

                  <p>Theo dõi sản phẩm, thông số và trạng thái hiển thị.</p>
                </div>
              </div>

              <span className="adm-part-result-count">
                {pcParts.length} linh kiện
              </span>
            </div>

            {/* FILTER */}

            <div className="adm-part-filter adm-part-filter--parts">
              <div className="adm-part-search">
                <i className="bi bi-search" />

                <input
                  type="text"
                  value={partKeyword}
                  placeholder="Tên sản phẩm, SKU, loại..."
                  onChange={(event) => setPartKeyword(event.target.value)}
                />

                {partKeyword && (
                  <button type="button" onClick={() => setPartKeyword("")}>
                    <i className="bi bi-x-circle-fill" />
                  </button>
                )}
              </div>

              <select
                className="adm-part-filter-control"
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
              >
                <option value="">Tất cả loại</option>

                {partTypes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.type_name}
                  </option>
                ))}
              </select>

              <input
                type="number"
                min="1"
                className="adm-part-filter-control"
                value={productFilter}
                placeholder="Product ID"
                onChange={(event) => setProductFilter(event.target.value)}
              />

              <select
                className="adm-part-filter-control"
                value={visibleFilter}
                onChange={(event) => setVisibleFilter(event.target.value)}
              >
                <option value="">Tất cả trạng thái</option>

                <option value="1">Hiển thị</option>

                <option value="0">Đang ẩn</option>
              </select>

              <button
                type="button"
                className="adm-part-btn adm-part-btn--filter"
                onClick={loadPcParts}
                disabled={partLoading}
              >
                <i className="bi bi-funnel" />
                Lọc
              </button>

              <button
                type="button"
                className="adm-part-filter-reset"
                onClick={resetPartFilter}
                title="Xóa bộ lọc"
              >
                <i className="bi bi-arrow-counterclockwise" />
              </button>
            </div>

            {/* TABLE */}

            <div className="adm-part-table-wrap">
              <table className="adm-part-table adm-part-product-table">
                <thead>
                  <tr>
                    <th>ID</th>

                    <th>Loại</th>

                    <th>Sản phẩm</th>

                    <th>Specifications</th>

                    <th>Giá</th>

                    <th>Hiển thị</th>

                    <th>Cập nhật</th>

                    <th>Thao tác</th>
                  </tr>
                </thead>

                <tbody>
                  {partLoading ? (
                    <tr>
                      <td colSpan="8" className="adm-part-table-state">
                        <div className="adm-part-loading">
                          <span className="adm-part-spinner" />

                          <strong>Đang tải linh kiện...</strong>
                        </div>
                      </td>
                    </tr>
                  ) : partError ? (
                    <tr>
                      <td colSpan="8" className="adm-part-table-state">
                        <div className="adm-part-error-state">
                          <i className="bi bi-exclamation-triangle" />

                          <strong>Không thể tải dữ liệu</strong>

                          <p>{partError}</p>
                        </div>
                      </td>
                    </tr>
                  ) : pcParts.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="adm-part-table-state">
                        <div className="adm-part-empty">
                          <span>
                            <i className="bi bi-cpu" />
                          </span>

                          <strong>Chưa có linh kiện</strong>

                          <p>Hãy thêm linh kiện đầu tiên vào Build PC.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    pcParts.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <span className="adm-part-id">#{item.id}</span>
                        </td>

                        <td>
                          <strong className="adm-part-name">
                            {item.type_name || "Không rõ"}
                          </strong>

                          <span className="adm-part-subtext">
                            {item.type_code || "-"}
                          </span>
                        </td>

                        <td>
                          <div className="adm-part-product">
                            <span className="adm-part-product__icon">
                              <i className="bi bi-box-seam" />
                            </span>

                            <div>
                              <strong>
                                {item.product_name ||
                                  `Sản phẩm #${item.product_id}`}
                              </strong>

                              <span>SKU: {item.product_sku || "-"}</span>

                              <small>ID: {item.product_id}</small>
                            </div>
                          </div>
                        </td>

                        <td>
                          <pre className="adm-part-json">
                            {safeJsonStringify(item.specifications)}
                          </pre>
                        </td>

                        <td>
                          <strong className="adm-part-price">
                            {formatMoney(
                              item.product_sale_price || item.product_price,
                            )}
                          </strong>
                        </td>

                        <td>
                          <span
                            className={
                              Number(item.is_visible) === 1
                                ? "adm-part-status adm-part-status--visible"
                                : "adm-part-status adm-part-status--hidden"
                            }
                          >
                            <span />

                            {Number(item.is_visible) === 1
                              ? "Hiển thị"
                              : "Đang ẩn"}
                          </span>
                        </td>

                        <td>
                          <span className="adm-part-date">
                            {formatDateTime(item.updated_at)}
                          </span>
                        </td>

                        <td>
                          <div className="adm-part-row-actions">
                            <button
                              type="button"
                              className="adm-part-action adm-part-action--edit"
                              onClick={() => handleEditPart(item)}
                            >
                              <i className="bi bi-pencil-square" />
                              Sửa
                            </button>

                            <button
                              type="button"
                              className="adm-part-action adm-part-action--delete"
                              disabled={deletingPartId === item.id}
                              onClick={() => handleDeletePart(item.id)}
                            >
                              {deletingPartId === item.id ? (
                                <span className="adm-part-spinner adm-part-spinner--tiny" />
                              ) : (
                                <i className="bi bi-trash3" />
                              )}
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
          </section>
        </div>
      )}
    </div>
  );
}

export default PcPartManagement;
