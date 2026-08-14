import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import "./PostForm.css";
import postService from "../../../../services/postService";

const PostForm = ({ isEdit = false }) => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(false);

  const [preview, setPreview] = useState("");

  const [thumbnailFile, setThumbnailFile] = useState(null);

  const [formData, setFormData] = useState({
    user_id: 1,
    category_id: 1,
    title: "",
    slug: "",
    thumbnail: "",
    content: "",
    status: 1,
  });

  // ==========================
  // Load dữ liệu khi sửa
  // ==========================
  useEffect(() => {
    if (isEdit && id) {
      fetchPost();
    }
  }, [id]);

  const fetchPost = async () => {
    try {
      const res = await postService.getPost(id);

      const post = res.data.data;

      setFormData({
        user_id: post.user_id,
        category_id: post.category_id,
        title: post.title,
        slug: post.slug,
        thumbnail: post.thumbnail,
        content: post.content,
        status: post.status,
      });

      if (post.thumbnail) {
        setPreview("http://localhost:5000" + post.thumbnail);
      }
    } catch (err) {
      toast.error("Không lấy được dữ liệu bài viết");
    }
  };

  // ==========================
  // Input Change
  // ==========================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "category_id" || name === "status" ? Number(value) : value,
    }));
  };

  // ==========================
  // Upload ảnh
  // ==========================

  const handleThumbnail = async (e) => {
    const file = e.target.files[0];

    if (!file) return;

    setThumbnailFile(file);

    setPreview(URL.createObjectURL(file));

    try {
      const res = await postService.uploadThumbnail(file);

      setFormData((prev) => ({
        ...prev,
        thumbnail: res.data.thumbnail,
      }));

      toast.success("Upload ảnh thành công");
    } catch (err) {
      toast.error("Upload ảnh thất bại");
    }
  };

  // ==========================
  // Validate
  // ==========================

  const validate = () => {
    if (!formData.title.trim()) {
      toast.error("Nhập tiêu đề");
      return false;
    }

    if (!formData.content.trim()) {
      toast.error("Nhập nội dung");
      return false;
    }

    return true;
  };
  // ==========================
  // Submit
  // ==========================

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setLoading(true);

      // tạo slug tự động nếu chưa có
      const slug =
        formData.slug ||
        formData.title
          .toLowerCase()
          .trim()
          .replace(/\s+/g, "-")
          .replace(/[^\w-]+/g, "");

      const data = {
        ...formData,
        slug,
      };

      if (isEdit) {
        await postService.updatePost(id, data);

        toast.success("Cập nhật bài viết thành công");
      } else {
        await postService.createPost(data);

        toast.success("Thêm bài viết thành công");
      }

      setTimeout(() => {
        navigate("/admin/posts");
      }, 1000);
    } catch (err) {
      console.log(err);

      toast.error(err.response?.data?.message || "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  // ==========================
  // Render
  // ==========================

  return (
    <div className="admin-post-form">
      <div className="page-header">
        <div className="header-title">
          <h2>{isEdit ? "Cập nhật bài viết" : "Thêm bài viết mới"}</h2>
          <p>
            {isEdit
              ? "Chỉnh sửa thông tin bài viết"
              : "Thêm bài viết mới cho website"}
          </p>
        </div>

        <div className="header-actions">
          <Link
            to="/admin/posts"
            className="btn-cancel"
            style={{ textDecoration: "none" }}
          >
            Hủy
          </Link>

          <button
            className="btn-save"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                ></span>
                Đang lưu...
              </>
            ) : (
              <>
                <i className="bi bi-save"></i>{" "}
                {isEdit ? "Cập nhật" : "Xuất bản"}
              </>
            )}
          </button>
        </div>
      </div>

      <div className="form-container">
        <div className="form-main">
          <div className="form-group">
            <label>
              Tiêu đề bài viết
              <span className="required">*</span>
            </label>

            <input
              className="form-control"
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Nhập tiêu đề..."
            />
          </div>

          <div className="form-group">
            <label>Slug</label>

            <input
              className="form-control"
              type="text"
              name="slug"
              value={formData.slug}
              onChange={handleChange}
              placeholder="Để trống sẽ tự sinh"
            />
          </div>

          <div className="form-group">
            <label>
              Nội dung
              <span className="required">*</span>
            </label>

            <textarea
              className="form-control editor-textarea"
              rows="18"
              name="content"
              value={formData.content}
              onChange={handleChange}
              placeholder="Nhập nội dung..."
            ></textarea>
          </div>
        </div>

        <div className="form-sidebar">
          <div className="sidebar-card">
            <h3>Thông tin</h3>

            <div className="form-group">
              <label>Danh mục</label>

              <select
                className="form-control"
                name="category_id"
                value={formData.category_id}
                onChange={handleChange}
              >
                <option value={1}>Hướng dẫn Build PC</option>
                <option value={2}>Tin tức</option>
                <option value={3}>Khuyến mãi</option>
              </select>
            </div>

            <div className="form-group">
              <label>Trạng thái</label>

              <select
                className="form-control"
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                <option value={1}>Đã xuất bản</option>
                <option value={0}>Bản nháp</option>
              </select>
            </div>
          </div>
          <div className="sidebar-card">
            <h3>Ảnh đại diện</h3>

            <div className="thumbnail-upload">
              {preview ? (
                <img
                  src={preview}
                  alt="thumbnail"
                  className="thumbnail-preview"
                  style={{
                    width: "100%",
                    borderRadius: "8px",
                    marginBottom: "10px",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <div className="upload-placeholder">
                  <i className="bi bi-image"></i>
                  <p>Chưa có ảnh</p>
                </div>
              )}

              <input
                type="file"
                accept="image/*"
                className="form-control"
                onChange={handleThumbnail}
              />

              {thumbnailFile && (
                <small
                  style={{
                    display: "block",
                    marginTop: "8px",
                    color: "#666",
                  }}
                >
                  {thumbnailFile.name}
                </small>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostForm;
