import "./css/CategoryModal.css";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import categoryService from "../../../../services/categoryService";

const defaultForm = {
  name: "",
  slug: "",
  description: "",
  status: 1,
};

function CategoryModal({
  open,
  mode = "create",
  category = null,
  onClose,
  onSuccess,
}) {
  const [form, setForm] = useState(defaultForm);

  const [imageFile, setImageFile] = useState(null);

  const [preview, setPreview] = useState("");

  const [loading, setLoading] = useState(false);

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && category) {
      setForm({
        name: category.name || "",
        slug: category.slug || "",
        description: category.description || "",
        status: Number(category.status),
      });

      setPreview(
        category.image ? `http://localhost:5000${category.image}` : "",
      );

      setImageFile(null);
    } else {
      resetForm();
    }
  }, [open, mode, category]);

  const resetForm = () => {
    setForm(defaultForm);

    setImageFile(null);

    setPreview("");

    setErrors({});
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  };

  const handleChooseImage = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    setImageFile(file);

    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validateErrors = {};

    if (!form.name.trim()) {
      validateErrors.name = "Tên danh mục không được để trống.";
    }

    if (!form.slug.trim()) {
      validateErrors.slug = "Slug không được để trống.";
    }

    if (Object.keys(validateErrors).length > 0) {
      setErrors(validateErrors);
      return;
    }

    try {
      setLoading(true);

      setErrors({});

      const formData = new FormData();

      formData.append("name", form.name.trim());
      formData.append("slug", form.slug.trim());
      formData.append("description", form.description.trim());
      formData.append("status", form.status);

      if (imageFile) {
        formData.append("image", imageFile);
      }

      let res;

      if (mode === "create") {
        res = await categoryService.createCategory(formData);
      } else {
        res = await categoryService.updateCategory(category.id, formData);
      }

      toast.success(res.message);

      resetForm();

      onSuccess?.();

      onClose();
    } catch (err) {
      console.error(err);

      if (err.response?.status === 422) {
        setErrors(err.response.data.errors || {});
        return;
      }

      toast.error(err.response?.data?.message || "Không thể lưu danh mục.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();

    onClose?.();
  };

  if (!open) return null;

  return (
    <div className="category-modal-overlay" onClick={handleClose}>
      <div
        className="category-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}

        <div className="category-modal-header">
          <h2 className="category-modal-heading">
            {mode === "create" ? "Thêm danh mục" : "Cập nhật danh mục"}
          </h2>

          <button
            type="button"
            className="category-modal-close-btn"
            onClick={handleClose}
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        {/* Body */}

        <form className="category-modal-form" onSubmit={handleSubmit}>
          {/* Tên danh mục */}

          <div className="category-modal-group">
            <label className="category-modal-label">Tên danh mục *</label>

            <input
              className="category-modal-input"
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
            />

            {errors.name && (
              <small className="category-modal-error">{errors.name}</small>
            )}
          </div>

          {/* Slug */}

          <div className="category-modal-group">
            <label className="category-modal-label">Slug *</label>

            <input
              className="category-modal-input"
              type="text"
              name="slug"
              value={form.slug}
              onChange={handleChange}
            />

            {errors.slug && (
              <small className="category-modal-error">{errors.slug}</small>
            )}
          </div>

          {/* Mô tả */}

          <div className="category-modal-group">
            <label className="category-modal-label">Mô tả</label>

            <textarea
              className="category-modal-textarea"
              rows="4"
              name="description"
              value={form.description}
              onChange={handleChange}
            />

            {errors.description && (
              <small className="category-modal-error">
                {errors.description}
              </small>
            )}
          </div>

          {/* Upload ảnh */}

          <div className="category-modal-group">
            <label className="category-modal-label">Ảnh danh mục</label>

            <input
              className="category-modal-file"
              type="file"
              accept="image/*"
              onChange={handleChooseImage}
            />

            {preview && (
              <img
                src={preview}
                alt="Preview"
                className="category-modal-preview"
              />
            )}
          </div>

          {/* Trạng thái */}

          <div className="category-modal-group">
            <label className="category-modal-label">Trạng thái</label>

            <select
              className="category-modal-select"
              name="status"
              value={form.status}
              onChange={handleChange}
            >
              <option value={1}>Hoạt động</option>
              <option value={0}>Tạm khóa</option>
            </select>

            {errors.status && (
              <small className="category-modal-error">{errors.status}</small>
            )}
          </div>

          {/* Footer */}

          <div className="category-modal-footer">
            <button
              type="button"
              className="category-modal-btn category-modal-btn-cancel"
              disabled={loading}
              onClick={handleClose}
            >
              Hủy
            </button>

            <button
              type="submit"
              className="category-modal-btn category-modal-btn-submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <i className="bi bi-arrow-repeat category-modal-loading"></i>
                  Đang lưu...
                </>
              ) : mode === "create" ? (
                <>
                  <i className="bi bi-plus-circle"></i>
                  Thêm danh mục
                </>
              ) : (
                <>
                  <i className="bi bi-check-circle"></i>
                  Cập nhật
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CategoryModal;
