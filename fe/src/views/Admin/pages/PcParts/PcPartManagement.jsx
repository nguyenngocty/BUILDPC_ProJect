import { useCallback, useEffect, useMemo, useState } from "react";
import pcPartTypeService from "../../../../services/pcPartTypeService";
import pcPartService from "../../../../services/pcPartService";
import "./PcPartManagement.css";

const DEFAULT_TAB = "types";

const emptyTypeForm = {
  type_code: "",
  type_name: "",
  description: "",
};

const emptyPartForm = {
  type_id: "",
  product_id: "",
  specifications: "{\n  \"socket\": \"\",\n  \"ram_type\": \"\"\n}",
  is_visible: "1",
};

const formatDateTime = (value) => {
  if (!value) return "Không có";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("vi-VN");
};

const formatMoney = (value) => {
  return `${Number(value || 0).toLocaleString("vi-VN")} đ`;
};

const safeJsonStringify = (value) => {
  if (!value) return "{}";

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

function PcPartManagement() {
  const [activeTab, setActiveTab] = useState(DEFAULT_TAB);

  const [partTypes, setPartTypes] = useState([]);
  const [pcParts, setPcParts] = useState([]);

  const [typeKeyword, setTypeKeyword] = useState("");
  const [partKeyword, setPartKeyword] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [visibleFilter, setVisibleFilter] = useState("");

  const [typeLoading, setTypeLoading] = useState(false);
  const [partLoading, setPartLoading] = useState(false);
  const [typeError, setTypeError] = useState("");
  const [partError, setPartError] = useState("");

  const [editingTypeId, setEditingTypeId] = useState(null);
  const [editingPartId, setEditingPartId] = useState(null);

  const [typeForm, setTypeForm] = useState(emptyTypeForm);
  const [partForm, setPartForm] = useState(emptyPartForm);

  const loadPartTypes = useCallback(async () => {
    setTypeLoading(true);
    setTypeError("");

    try {
      const response = await pcPartTypeService.getAll({
        keyword: typeKeyword,
        page: 1,
        limit: 100,
      });

      setPartTypes(response?.data?.data || []);
    } catch (error) {
      setTypeError(error?.response?.data?.message || "Không thể tải loại linh kiện.");
    } finally {
      setTypeLoading(false);
    }
  }, [typeKeyword]);

  const loadPcParts = useCallback(async () => {
    setPartLoading(true);
    setPartError("");

    try {
      const response = await pcPartService.getAll({
        keyword: partKeyword,
        type_id: typeFilter,
        product_id: productFilter,
        is_visible: visibleFilter,
        page: 1,
        limit: 100,
      });

      setPcParts(response?.data?.data || []);
    } catch (error) {
      setPartError(error?.response?.data?.message || "Không thể tải danh sách linh kiện.");
    } finally {
      setPartLoading(false);
    }
  }, [partKeyword, typeFilter, productFilter, visibleFilter]);

  useEffect(() => {
    loadPartTypes();
  }, [loadPartTypes]);

  useEffect(() => {
    loadPcParts();
  }, [loadPcParts]);

  const stats = useMemo(() => {
    return {
      typeCount: partTypes.length,
      partCount: pcParts.length,
      visibleCount: pcParts.filter((item) => Number(item.is_visible) === 1).length,
      hiddenCount: pcParts.filter((item) => Number(item.is_visible) === 0).length,
    };
  }, [partTypes, pcParts]);

  const resetTypeForm = () => {
    setEditingTypeId(null);
    setTypeForm(emptyTypeForm);
  };

  const resetPartForm = () => {
    setEditingPartId(null);
    setPartForm(emptyPartForm);
  };

  const handleTypeSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      type_code: typeForm.type_code.trim(),
      type_name: typeForm.type_name.trim(),
      description: typeForm.description.trim(),
    };

    if (!payload.type_code || !payload.type_name) {
      window.alert("Vui lòng nhập mã và tên loại linh kiện.");
      return;
    }

    try {
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
      window.alert(error?.response?.data?.message || "Không thể lưu loại linh kiện.");
    }
  };

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

    if (!payload.type_id || !payload.product_id) {
      window.alert("Vui lòng chọn loại linh kiện và sản phẩm.");
      return;
    }

    try {
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
      window.alert(error?.response?.data?.message || "Không thể lưu linh kiện.");
    }
  };

  const handleEditType = (item) => {
    setEditingTypeId(item.id);
    setTypeForm({
      type_code: item.type_code || "",
      type_name: item.type_name || "",
      description: item.description || "",
    });
    setActiveTab("types");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleEditPart = (item) => {
    setEditingPartId(item.id);
    setPartForm({
      type_id: String(item.type_id || ""),
      product_id: String(item.product_id || ""),
      specifications: safeJsonStringify(item.specifications),
      is_visible: String(Number(item.is_visible ?? 1)),
    });
    setActiveTab("parts");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteType = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa loại linh kiện này?")) return;

    try {
      await pcPartTypeService.remove(id);
      await loadPartTypes();
    } catch (error) {
      window.alert(error?.response?.data?.message || "Không thể xóa loại linh kiện.");
    }
  };

  const handleDeletePart = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa linh kiện này?")) return;

    try {
      await pcPartService.remove(id);
      await loadPcParts();
    } catch (error) {
      window.alert(error?.response?.data?.message || "Không thể xóa linh kiện.");
    }
  };

  const handleRefreshTypes = () => {
    loadPartTypes();
  };

  const handleRefreshParts = () => {
    loadPcParts();
  };

  return (
    <section className="admin-page pc-part-page">
      <div className="pc-part-hero">
        <div>
          <p className="admin-page-eyebrow">QUẢN LÝ LINH KIỆN</p>
          <h1>Quản lý linh kiện</h1>
          <p>
            Quản lý loại linh kiện và mapping linh kiện vào sản phẩm trong một giao diện.
          </p>
        </div>

        <div className="pc-part-stats">
          <article>
            <span>Loại linh kiện</span>
            <strong>{stats.typeCount}</strong>
          </article>
          <article>
            <span>Linh kiện</span>
            <strong>{stats.partCount}</strong>
          </article>
          <article>
            <span>Đang hiển thị</span>
            <strong>{stats.visibleCount}</strong>
          </article>
          <article>
            <span>Đang ẩn</span>
            <strong>{stats.hiddenCount}</strong>
          </article>
        </div>
      </div>

      <div className="pc-part-tabs">
        <button type="button" className={activeTab === "types" ? "active" : ""} onClick={() => setActiveTab("types")}>Loại linh kiện</button>
        <button type="button" className={activeTab === "parts" ? "active" : ""} onClick={() => setActiveTab("parts")}>Linh kiện</button>
      </div>

      {activeTab === "types" ? (
        <div className="pc-part-grid">
          <div className="admin-panel pc-part-form-panel">
            <div className="panel-head">
              <div>
                <h2>{editingTypeId ? "Chỉnh sửa loại linh kiện" : "Thêm loại linh kiện"}</h2>
                <p>Tạo mã, tên hiển thị và mô tả cho nhóm linh kiện.</p>
              </div>
              {editingTypeId && <button className="ghost-action" type="button" onClick={resetTypeForm}>Hủy</button>}
            </div>

            <form className="pc-part-form" onSubmit={handleTypeSubmit}>
              <label>
                <span>Mã loại</span>
                <input name="type_code" value={typeForm.type_code} onChange={(event) => setTypeForm((current) => ({ ...current, type_code: event.target.value }))} placeholder="cpu, ram, vga..." />
              </label>
              <label>
                <span>Tên loại</span>
                <input name="type_name" value={typeForm.type_name} onChange={(event) => setTypeForm((current) => ({ ...current, type_name: event.target.value }))} placeholder="CPU, RAM, VGA..." />
              </label>
              <label className="full-span">
                <span>Mô tả</span>
                <textarea name="description" rows="4" value={typeForm.description} onChange={(event) => setTypeForm((current) => ({ ...current, description: event.target.value }))} placeholder="Mô tả ngắn cho loại linh kiện" />
              </label>

              <div className="pc-part-actions full-span">
                <button type="submit" className="primary-action">{editingTypeId ? "Cập nhật" : "Thêm loại linh kiện"}</button>
                <button type="button" className="ghost-action" onClick={resetTypeForm}>Làm mới</button>
                <button type="button" className="ghost-action" onClick={handleRefreshTypes}>Tải lại</button>
              </div>
            </form>
          </div>

          <div className="admin-panel pc-part-list-panel">
            <div className="panel-head">
              <div>
                <h2>Danh sách loại linh kiện</h2>
                <p>Theo dõi mã, tên và mô tả của các loại linh kiện.</p>
              </div>
            </div>

            <div className="admin-toolbar pc-part-toolbar">
              <div className="admin-search-box">
                <input type="text" placeholder="Tìm theo mã, tên hoặc mô tả..." value={typeKeyword} onChange={(event) => setTypeKeyword(event.target.value)} />
              </div>
              <button type="button" className="ghost-action" onClick={handleRefreshTypes}>Lọc lại</button>
            </div>

            <div className="table-responsive">
              <table className="admin-table pc-part-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Mã</th>
                    <th>Tên</th>
                    <th>Mô tả</th>
                    <th>Ngày tạo</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {typeLoading ? (
                    <tr><td colSpan="6" className="admin-table-empty">Đang tải loại linh kiện...</td></tr>
                  ) : typeError ? (
                    <tr><td colSpan="6" className="admin-table-empty">{typeError}</td></tr>
                  ) : partTypes.length === 0 ? (
                    <tr><td colSpan="6" className="admin-table-empty">Chưa có loại linh kiện nào.</td></tr>
                  ) : (
                    partTypes.map((item) => (
                      <tr key={item.id}>
                        <td>#{item.id}</td>
                        <td><strong>{item.type_code}</strong></td>
                        <td>{item.type_name}</td>
                        <td>{item.description || "-"}</td>
                        <td>{formatDateTime(item.created_at)}</td>
                        <td>
                          <div className="pc-part-row-actions">
                            <button type="button" className="ghost-action pc-part-mini-button" onClick={() => handleEditType(item)}>Sửa</button>
                            <button type="button" className="ghost-action pc-part-mini-button pc-part-danger" onClick={() => handleDeleteType(item.id)}>Xóa</button>
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
      ) : (
        <div className="pc-part-grid pc-part-grid-parts">
          <div className="admin-panel pc-part-form-panel">
            <div className="panel-head">
              <div>
                <h2>{editingPartId ? "Chỉnh sửa linh kiện" : "Thêm linh kiện"}</h2>
                <p>Gắn sản phẩm vào loại linh kiện và cấu hình specifications dạng JSON.</p>
              </div>
              {editingPartId && <button className="ghost-action" type="button" onClick={resetPartForm}>Hủy</button>}
            </div>

            <form className="pc-part-form" onSubmit={handlePartSubmit}>
              <label>
                <span>Loại linh kiện</span>
                <select value={partForm.type_id} onChange={(event) => setPartForm((current) => ({ ...current, type_id: event.target.value }))}>
                  <option value="">Chọn loại linh kiện</option>
                  {partTypes.map((item) => (
                    <option key={item.id} value={item.id}>{item.type_name} ({item.type_code})</option>
                  ))}
                </select>
              </label>

              <label>
                <span>product_id</span>
                <input
                  type="number"
                  min="1"
                  value={partForm.product_id}
                  onChange={(event) => setPartForm((current) => ({ ...current, product_id: event.target.value }))}
                  placeholder="Nhập ID sản phẩm"
                />
              </label>

              <label className="full-span">
                <span>Specifications JSON</span>
                <textarea rows="8" value={partForm.specifications} onChange={(event) => setPartForm((current) => ({ ...current, specifications: event.target.value }))} placeholder='{"socket":"LGA1700","ram_type":"DDR5"}' />
              </label>

              <label>
                <span>Hiển thị</span>
                <select value={partForm.is_visible} onChange={(event) => setPartForm((current) => ({ ...current, is_visible: event.target.value }))}>
                  <option value="1">Hiển thị</option>
                  <option value="0">Ẩn</option>
                </select>
              </label>

              <div className="pc-part-actions full-span">
                <button type="submit" className="primary-action">{editingPartId ? "Cập nhật" : "Thêm linh kiện"}</button>
                <button type="button" className="ghost-action" onClick={resetPartForm}>Làm mới</button>
                <button type="button" className="ghost-action" onClick={handleRefreshParts}>Tải lại</button>
              </div>
            </form>
          </div>

          <div className="admin-panel pc-part-list-panel">
            <div className="panel-head">
              <div>
                <h2>Danh sách linh kiện</h2>
                <p>Theo dõi linh kiện theo loại, sản phẩm và trạng thái hiển thị.</p>
              </div>
            </div>

            <div className="admin-toolbar pc-part-toolbar pc-part-toolbar-parts">
              <div className="admin-search-box">
                <input type="text" placeholder="Tìm theo tên sản phẩm hoặc loại..." value={partKeyword} onChange={(event) => setPartKeyword(event.target.value)} />
              </div>
              <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                <option value="">Tất cả loại</option>
                {partTypes.map((item) => (
                  <option key={item.id} value={item.id}>{item.type_name}</option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                value={productFilter}
                onChange={(event) => setProductFilter(event.target.value)}
                placeholder="Lọc theo product_id"
              />
              <select value={visibleFilter} onChange={(event) => setVisibleFilter(event.target.value)}>
                <option value="">Tất cả trạng thái</option>
                <option value="1">Hiển thị</option>
                <option value="0">Ẩn</option>
              </select>
              <button type="button" className="ghost-action" onClick={handleRefreshParts}>Lọc lại</button>
            </div>

            <div className="table-responsive">
              <table className="admin-table pc-part-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Loại</th>
                    <th>Sản phẩm</th>
                    <th>Specifications</th>
                    <th>Giá</th>
                    <th>Hiển thị</th>
                    <th>Ngày cập nhật</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {partLoading ? (
                    <tr><td colSpan="8" className="admin-table-empty">Đang tải linh kiện...</td></tr>
                  ) : partError ? (
                    <tr><td colSpan="8" className="admin-table-empty">{partError}</td></tr>
                  ) : pcParts.length === 0 ? (
                    <tr><td colSpan="8" className="admin-table-empty">Chưa có linh kiện nào.</td></tr>
                  ) : (
                    pcParts.map((item) => (
                      <tr key={item.id}>
                        <td>#{item.id}</td>
                        <td>
                          <strong>{item.type_name}</strong>
                          <div className="pc-part-subtext">{item.type_code}</div>
                        </td>
                        <td>
                          <strong>{item.product_name}</strong>
                          <div className="pc-part-subtext">SKU: {item.product_sku || "-"}</div>
                        </td>
                        <td>
                          <pre className="pc-part-json">{safeJsonStringify(item.specifications)}</pre>
                        </td>
                        <td>{formatMoney(item.product_sale_price || item.product_price)}</td>
                        <td>
                          <span className={Number(item.is_visible) === 1 ? "pc-part-badge pc-part-badge-on" : "pc-part-badge pc-part-badge-off"}>
                            {Number(item.is_visible) === 1 ? "Hiển thị" : "Ẩn"}
                          </span>
                        </td>
                        <td>{formatDateTime(item.updated_at)}</td>
                        <td>
                          <div className="pc-part-row-actions">
                            <button type="button" className="ghost-action pc-part-mini-button" onClick={() => handleEditPart(item)}>Sửa</button>
                            <button type="button" className="ghost-action pc-part-mini-button pc-part-danger" onClick={() => handleDeletePart(item.id)}>Xóa</button>
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
      )}
    </section>
  );
}

export default PcPartManagement;