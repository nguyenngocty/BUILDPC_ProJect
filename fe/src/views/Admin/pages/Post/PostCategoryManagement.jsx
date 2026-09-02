import React, { useEffect, useState } from "react";

import { Link } from "react-router-dom";

import toast from "react-hot-toast";

import "./PostManagement.css";

import postCategoryService from "../../../../services/postCategoryService";

const EMPTY_FORM = {
  name: "",
  slug: "",
  description: "",
  status: 1,
};

function createSlug(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function PostCategoryManagement() {
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [keyword, setKeyword] = useState("");

  const [status, setStatus] = useState("");

  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState(EMPTY_FORM);

  const [deleteId, setDeleteId] = useState(null);

  // ============================================================
  // FETCH
  // ============================================================

  const fetchCategories = async () => {
    try {
      setLoading(true);

      const response = await postCategoryService.getCategories({
        keyword,
        status,
        page: 1,
        limit: 100,
      });

      setCategories(response?.data?.data || []);
    } catch (error) {
      console.error(error);

      toast.error(
        error?.response?.data?.message || "Không tải được danh mục bài viết.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword, status]);

  // ============================================================
  // FORM
  // ============================================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    if (name === "name") {
      setFormData((previous) => ({
        ...previous,

        name: value,

        slug: editingId ? previous.slug : createSlug(value),
      }));

      return;
    }

    if (name === "slug") {
      setFormData((previous) => ({
        ...previous,
        slug: createSlug(value),
      }));

      return;
    }

    setFormData((previous) => ({
      ...previous,

      [name]: name === "status" ? Number(value) : value,
    }));
  };

  const resetForm = () => {
    setEditingId(null);

    setFormData(EMPTY_FORM);
  };

  const handleEdit = (category) => {
    setEditingId(category.id);

    setFormData({
      name: category.name || "",

      slug: category.slug || "",

      description: category.description || "",

      status: Number(category.status ?? 1),
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const name = formData.name.trim();

    if (!name) {
      toast.error("Vui lòng nhập tên danh mục.");

      return;
    }

    try {
      setSaving(true);

      const payload = {
        name,

        slug: formData.slug || createSlug(name),

        description: formData.description.trim() || null,

        status: Number(formData.status),
      };

      if (editingId) {
        await postCategoryService.updateCategory(editingId, payload);

        toast.success("Cập nhật danh mục thành công.");
      } else {
        await postCategoryService.createCategory(payload);

        toast.success("Thêm danh mục bài viết thành công.");
      }

      resetForm();

      await fetchCategories();
    } catch (error) {
      console.error(error);

      toast.error(
        error?.response?.data?.message || "Không thể lưu danh mục bài viết.",
      );
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // STATUS
  // ============================================================

  const handleToggleStatus = async (id) => {
    try {
      const response = await postCategoryService.toggleStatus(id);

      toast.success(response?.data?.message || "Đã cập nhật trạng thái.");

      await fetchCategories();
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Không thể cập nhật trạng thái.",
      );
    }
  };

  // ============================================================
  // DELETE
  // ============================================================

  const handleDelete = async () => {
    if (!deleteId) {
      return;
    }

    try {
      await postCategoryService.deleteCategory(deleteId);

      toast.success("Đã đưa danh mục vào thùng rác.");

      setDeleteId(null);

      await fetchCategories();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Không thể xóa danh mục.");
    }
  };

  return (
    <div className="post-admin-page">
      {deleteId && (
        <div
          className="post-confirm-overlay"
          onMouseDown={() => setDeleteId(null)}
        >
          <div
            className="post-confirm-dialog"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="post-confirm-icon">
              <i className="bi bi-trash3" />
            </div>

            <span className="post-confirm-kicker">Xác nhận thao tác</span>

            <h2>Xóa danh mục</h2>

            <p>
              Danh mục sẽ được đưa vào thùng rác. Các bài viết hiện tại không bị
              xóa.
            </p>

            <div className="post-confirm-actions">
              <button
                type="button"
                className="post-button post-button-neutral"
                onClick={() => setDeleteId(null)}
              >
                Hủy
              </button>

              <button
                type="button"
                className="post-button post-button-danger"
                onClick={handleDelete}
              >
                <i className="bi bi-trash3" />
                Xóa danh mục
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="post-page-heading">
        <div className="post-heading-content">
          <span className="post-heading-kicker">
            <i className="bi bi-folder2-open" />
            Content Center
          </span>

          <h1>Danh mục bài viết</h1>

          <p>
            Quản lý nhóm nội dung riêng cho Blog, hoàn toàn độc lập với danh mục
            sản phẩm.
          </p>
        </div>

        <Link to="/admin/posts" className="post-create-button">
          <i className="bi bi-arrow-left" />

          <span>Quay lại bài viết</span>
        </Link>
      </section>

      <section className="post-content-card">
        <div className="post-content-header">
          <div>
            <span className="post-section-kicker">Danh mục Blog</span>

            <h2>{editingId ? "Cập nhật danh mục" : "Thêm danh mục"}</h2>

            <p>Tạo danh mục riêng cho các nội dung tin tức và hướng dẫn.</p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            display: "grid",
            gap: "14px",
            marginBottom: "28px",
          }}
        >
          <input
            type="text"
            name="name"
            className="post-editor-input"
            value={formData.name}
            onChange={handleChange}
            placeholder="Tên danh mục..."
          />

          <input
            type="text"
            name="slug"
            className="post-editor-input"
            value={formData.slug}
            onChange={handleChange}
            placeholder="Slug..."
          />

          <textarea
            name="description"
            rows="3"
            className="post-editor-textarea"
            value={formData.description}
            onChange={handleChange}
            placeholder="Mô tả danh mục..."
          />

          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="post-editor-select"
          >
            <option value={1}>Hoạt động</option>

            <option value={0}>Tạm ẩn</option>
          </select>

          <div
            style={{
              display: "flex",
              gap: "10px",
            }}
          >
            <button
              type="submit"
              className="post-create-button"
              disabled={saving}
            >
              <i className="bi bi-check-lg" />

              {saving
                ? "Đang lưu..."
                : editingId
                  ? "Cập nhật danh mục"
                  : "Thêm danh mục"}
            </button>

            {editingId && (
              <button
                type="button"
                className="post-button post-button-neutral"
                onClick={resetForm}
              >
                Hủy chỉnh sửa
              </button>
            )}
          </div>
        </form>

        <div className="post-filter-panel">
          <label className="post-search-field">
            <i className="bi bi-search" />

            <input
              type="search"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Tìm danh mục..."
            />
          </label>

          <div className="post-filter-select-wrap">
            <i className="bi bi-toggle2-on" />

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="">Tất cả trạng thái</option>

              <option value="1">Hoạt động</option>

              <option value="0">Tạm ẩn</option>
            </select>
          </div>
        </div>

        <div className="post-table-shell">
          <div className="post-table-scroll">
            <table className="post-data-table">
              <thead>
                <tr>
                  <th>Tên danh mục</th>

                  <th>Slug</th>

                  <th>Mô tả</th>

                  <th className="post-text-center">Bài viết</th>

                  <th className="post-text-center">Trạng thái</th>

                  <th className="post-text-center">Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="post-table-state">
                      Đang tải dữ liệu...
                    </td>
                  </tr>
                ) : categories.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="post-table-state">
                      Không có danh mục bài viết.
                    </td>
                  </tr>
                ) : (
                  categories.map((category) => (
                    <tr key={category.id}>
                      <td>
                        <strong>{category.name}</strong>
                      </td>

                      <td>{category.slug}</td>

                      <td>{category.description || "—"}</td>

                      <td className="post-text-center">
                        {Number(category.post_count || 0)}
                      </td>

                      <td className="post-text-center">
                        <span
                          className={
                            Number(category.status) === 1
                              ? "post-status-pill post-status-published"
                              : "post-status-pill post-status-draft"
                          }
                        >
                          {Number(category.status) === 1
                            ? "Hoạt động"
                            : "Tạm ẩn"}
                        </span>
                      </td>

                      <td className="post-text-center">
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "center",
                            gap: "8px",
                          }}
                        >
                          <button
                            type="button"
                            className="post-action-trigger"
                            title="Chỉnh sửa"
                            onClick={() => handleEdit(category)}
                          >
                            <i className="bi bi-pencil-square" />
                          </button>

                          <button
                            type="button"
                            className="post-action-trigger"
                            title="Đổi trạng thái"
                            onClick={() => handleToggleStatus(category.id)}
                          >
                            <i
                              className={
                                Number(category.status) === 1
                                  ? "bi bi-eye-slash"
                                  : "bi bi-eye"
                              }
                            />
                          </button>

                          <button
                            type="button"
                            className="post-action-trigger"
                            title="Xóa"
                            onClick={() => setDeleteId(category.id)}
                          >
                            <i className="bi bi-trash3" />
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
      </section>
    </div>
  );
}

export default PostCategoryManagement;
