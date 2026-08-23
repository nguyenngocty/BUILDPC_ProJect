import React, { useEffect, useRef, useState } from "react";

import { Link, useNavigate, useParams } from "react-router-dom";

import toast from "react-hot-toast";

import { CKEditor } from "@ckeditor/ckeditor5-react";

import ClassicEditor from "@ckeditor/ckeditor5-build-classic";

import "./PostForm.css";

import postService from "../../../../services/postService";
import categoryService from "../../../../services/categoryService";
import api from "../../../../services/api";

class MyUploadAdapter {
  constructor(loader) {
    this.loader = loader;
  }

  upload() {
    return this.loader.file.then(
      (file) =>
        new Promise((resolve, reject) => {
          const formData = new FormData();

          formData.append("image", file);

          api
            .post("/admin/posts/upload-image", formData, {
              headers: {
                "Content-Type": "multipart/form-data",
              },
            })
            .then((response) => {
              const data = response.data;

              if (data.success) {
                resolve({
                  default: data.location,
                });

                return;
              }

              reject(data.message);
            })
            .catch((error) => reject(error));
        }),
    );
  }

  abort() {}
}

function MyCustomUploadAdapterPlugin(editor) {
  editor.plugins.get("FileRepository").createUploadAdapter = (loader) =>
    new MyUploadAdapter(loader);
}

function PostForm({ isEdit = false }) {
  const navigate = useNavigate();

  const { id } = useParams();

  const tagInputRef = useRef(null);

  const [loading, setLoading] = useState(false);

  const [preview, setPreview] = useState("");

  const [thumbnailFile, setThumbnailFile] = useState(null);

  const [categories, setCategories] = useState([]);

  const [users, setUsers] = useState([]);

  const [tagInput, setTagInput] = useState("");

  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    user_id: "",
    category_id: "",
    title: "",
    slug: "",
    thumbnail: "",
    content: "",
    excerpt: "",
    meta_title: "",
    meta_description: "",
    meta_keywords: "",
    tags: [],
    is_featured: 0,
    status: 1,
  });

  // =====================================================
  // LOAD FORM DATA
  // =====================================================

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, userRes] = await Promise.all([
          categoryService.getCategories({
            status: 1,
          }),

          api.get("/admin/users"),
        ]);

        setCategories(catRes.data || []);

        const nextUsers = userRes?.data?.data?.users || [];

        setUsers(nextUsers);

        if (!isEdit && nextUsers.length > 0) {
          setFormData((previous) => ({
            ...previous,
            user_id: nextUsers[0].id,
          }));
        }
      } catch (error) {
        console.error("Lỗi tải dữ liệu:", error);
      }
    };

    fetchData();
  }, [isEdit]);

  // =====================================================
  // LOAD POST EDIT
  // =====================================================

  useEffect(() => {
    if (isEdit && id) {
      fetchPost();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit]);

  const fetchPost = async () => {
    try {
      const res = await postService.getPost(id);

      const post = res.data.data;

      const tagsArray = post.tags
        ? post.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [];

      setFormData({
        user_id: post.user_id,
        category_id: post.category_id,
        title: post.title || "",
        slug: post.slug || "",
        thumbnail: post.thumbnail || "",
        content: post.content || "",
        excerpt: post.excerpt || "",
        meta_title: post.meta_title || "",
        meta_description: post.meta_description || "",
        meta_keywords: post.meta_keywords || "",
        tags: tagsArray,
        is_featured: Number(post.is_featured || 0),
        status: Number(post.status ?? 1),
      });

      if (post.thumbnail) {
        setPreview(`http://localhost:5000${post.thumbnail}`);
      }
    } catch (error) {
      console.error(error);

      toast.error("Không lấy được dữ liệu bài viết.");
    }
  };

  // =====================================================
  // VALIDATE
  // =====================================================

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = "Vui lòng nhập tiêu đề bài viết.";
    }

    if (!formData.content.trim()) {
      newErrors.content = "Vui lòng nhập nội dung bài viết.";
    }

    if (!formData.category_id) {
      newErrors.category_id = "Vui lòng chọn danh mục.";
    }

    if (!formData.user_id) {
      newErrors.user_id = "Vui lòng chọn tác giả.";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  // =====================================================
  // INPUT CHANGE
  // =====================================================

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    const nextValue = type === "checkbox" ? (checked ? 1 : 0) : value;

    if (errors[name]) {
      setErrors((previous) => ({
        ...previous,
        [name]: "",
      }));
    }

    if (name === "title" && !formData.slug) {
      const generatedSlug = value
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");

      setFormData((previous) => ({
        ...previous,
        title: value,
        slug: generatedSlug,
      }));

      return;
    }

    const numericFields = ["category_id", "status", "is_featured", "user_id"];

    setFormData((previous) => ({
      ...previous,

      [name]: numericFields.includes(name) ? Number(nextValue) : nextValue,
    }));
  };

  // =====================================================
  // THUMBNAIL
  // =====================================================

  const handleThumbnail = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      toast.error("Chỉ hỗ trợ JPG, PNG và WEBP.");

      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ảnh không được vượt quá 5MB.");

      return;
    }

    setThumbnailFile(file);

    setPreview(URL.createObjectURL(file));

    try {
      const res = await postService.uploadThumbnail(file);

      setFormData((previous) => ({
        ...previous,
        thumbnail: res.data.thumbnail,
      }));

      toast.success("Upload ảnh thành công.");
    } catch (error) {
      console.error(error);

      toast.error("Upload ảnh thất bại.");
    }
  };

  // =====================================================
  // TAGS
  // =====================================================

  const addTag = () => {
    const tag = tagInput.trim();

    if (!tag) return;

    if (formData.tags.includes(tag)) {
      toast.error("Tag đã tồn tại.");

      return;
    }

    setFormData((previous) => ({
      ...previous,

      tags: [...previous.tags, tag],
    }));

    setTagInput("");

    tagInputRef.current?.focus();
  };

  const removeTag = (tagToRemove) => {
    setFormData((previous) => ({
      ...previous,

      tags: previous.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const handleTagKeyDown = (event) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();

      addTag();
    }
  };

  // =====================================================
  // SUBMIT
  // =====================================================

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error("Vui lòng kiểm tra lại thông tin bài viết.");

      return;
    }

    try {
      setLoading(true);

      const slug =
        formData.slug ||
        formData.title
          .toLowerCase()
          .trim()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/đ/g, "d")
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-");

      const data = {
        ...formData,
        slug,

        tags: formData.tags.join(", "),
      };

      if (isEdit) {
        await postService.updatePost(id, data);

        toast.success("Cập nhật bài viết thành công.");
      } else {
        await postService.createPost(data);

        toast.success("Thêm bài viết thành công.");
      }

      navigate("/admin/posts");
    } catch (error) {
      console.error(error);

      toast.error(
        error?.response?.data?.message || "Có lỗi xảy ra khi lưu bài viết.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="post-editor-page">
      {/* =================================================
          HEADER
      ================================================= */}

      <section className="post-editor-heading">
        <div>
          <span className="post-editor-kicker">
            <i className="bi bi-pencil-square" />
            Content Studio
          </span>

          <h1>{isEdit ? "Cập nhật bài viết" : "Tạo bài viết mới"}</h1>

          <p>
            Xây dựng nội dung chuyên nghiệp, tối ưu hiển thị và SEO cho website.
          </p>
        </div>

        <div className="post-editor-heading-actions">
          <Link
            to="/admin/posts"
            className="post-editor-button post-editor-button-light"
          >
            <i className="bi bi-arrow-left" />
            Quay lại
          </Link>

          <button
            type="button"
            className="post-editor-button post-editor-button-primary"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="post-editor-spinner" />
                Đang lưu...
              </>
            ) : (
              <>
                <i className="bi bi-cloud-arrow-up-fill" />

                {isEdit ? "Cập nhật" : "Xuất bản"}
              </>
            )}
          </button>
        </div>
      </section>

      {/* =================================================
          WORKSPACE
      ================================================= */}

      <div className="post-editor-layout">
        {/* =================================================
            LEFT
        ================================================= */}

        <main className="post-editor-main">
          {/* TITLE */}

          <section className="post-editor-card">
            <div className="post-editor-card-heading">
              <div className="post-editor-card-icon">
                <i className="bi bi-type-h1" />
              </div>

              <div>
                <h2>Nội dung chính</h2>

                <p>Thiết lập tiêu đề, đường dẫn và nội dung bài viết.</p>
              </div>
            </div>

            <div className="post-editor-field">
              <label>
                Tiêu đề bài viết
                <span>*</span>
              </label>

              <input
                type="text"
                name="title"
                className={
                  errors.title
                    ? "post-editor-input post-editor-input-error"
                    : "post-editor-input"
                }
                value={formData.title}
                onChange={handleChange}
                placeholder="Nhập tiêu đề bài viết..."
              />

              {errors.title && (
                <small className="post-editor-error">
                  <i className="bi bi-exclamation-circle" />
                  {errors.title}
                </small>
              )}
            </div>

            <div className="post-editor-field">
              <label>Slug</label>

              <div className="post-slug-input">
                <span>
                  <i className="bi bi-link-45deg" />
                </span>

                <input
                  type="text"
                  name="slug"
                  value={formData.slug}
                  onChange={handleChange}
                  placeholder="Để trống sẽ tự tạo từ tiêu đề"
                />
              </div>
            </div>

            <div className="post-editor-field">
              <label>
                Nội dung
                <span>*</span>
              </label>

              <div
                className={
                  errors.content
                    ? "post-editor-ckeditor post-editor-ckeditor-error"
                    : "post-editor-ckeditor"
                }
              >
                <CKEditor
                  editor={ClassicEditor}
                  data={formData.content}
                  onChange={(event, editor) => {
                    const data = editor.getData();

                    setFormData((previous) => ({
                      ...previous,
                      content: data,
                    }));

                    if (errors.content) {
                      setErrors((previous) => ({
                        ...previous,
                        content: "",
                      }));
                    }
                  }}
                  config={{
                    extraPlugins: [MyCustomUploadAdapterPlugin],

                    toolbar: [
                      "heading",
                      "|",
                      "bold",
                      "italic",
                      "underline",
                      "strikethrough",
                      "|",
                      "bulletedList",
                      "numberedList",
                      "|",
                      "link",
                      "blockQuote",
                      "insertTable",
                      "|",
                      "imageUpload",
                      "mediaEmbed",
                      "|",
                      "undo",
                      "redo",
                    ],

                    image: {
                      toolbar: [
                        "imageStyle:block",
                        "imageStyle:side",
                        "|",
                        "imageTextAlternative",
                      ],

                      upload: {
                        types: ["jpeg", "png", "gif", "bmp", "webp"],
                      },
                    },

                    mediaEmbed: {
                      previewsInData: true,
                    },
                  }}
                />
              </div>

              {errors.content && (
                <small className="post-editor-error">
                  <i className="bi bi-exclamation-circle" />
                  {errors.content}
                </small>
              )}
            </div>

            <div className="post-editor-field">
              <label>Trích dẫn / Tóm tắt</label>

              <textarea
                rows="4"
                name="excerpt"
                className="post-editor-textarea"
                value={formData.excerpt}
                onChange={handleChange}
                placeholder="Tóm tắt ngắn gọn nội dung bài viết..."
              />
            </div>
          </section>

          {/* SEO */}

          <section className="post-editor-card post-seo-card">
            <div className="post-editor-card-heading">
              <div className="post-editor-card-icon post-editor-card-icon-blue">
                <i className="bi bi-search-heart" />
              </div>

              <div>
                <h2>Tối ưu SEO</h2>

                <p>Thiết lập metadata hỗ trợ công cụ tìm kiếm.</p>
              </div>
            </div>

            <div className="post-seo-grid">
              <div className="post-editor-field post-seo-wide">
                <label>Meta Title</label>

                <input
                  type="text"
                  name="meta_title"
                  className="post-editor-input"
                  value={formData.meta_title}
                  onChange={handleChange}
                  placeholder="Tiêu đề SEO, nên khoảng 60 - 70 ký tự"
                />

                <small className="post-editor-helper">
                  {formData.meta_title.length} ký tự
                </small>
              </div>

              <div className="post-editor-field post-seo-wide">
                <label>Meta Description</label>

                <textarea
                  rows="3"
                  name="meta_description"
                  className="post-editor-textarea"
                  value={formData.meta_description}
                  onChange={handleChange}
                  placeholder="Mô tả SEO, nên khoảng 150 - 160 ký tự"
                />

                <small className="post-editor-helper">
                  {formData.meta_description.length} ký tự
                </small>
              </div>

              <div className="post-editor-field post-seo-wide">
                <label>Meta Keywords</label>

                <input
                  type="text"
                  name="meta_keywords"
                  className="post-editor-input"
                  value={formData.meta_keywords}
                  onChange={handleChange}
                  placeholder="build pc, gaming pc, linh kiện máy tính..."
                />
              </div>
            </div>
          </section>
        </main>

        {/* =================================================
            SIDEBAR
        ================================================= */}

        <aside className="post-editor-sidebar">
          {/* PUBLISH */}

          <section className="post-sidebar-card">
            <div className="post-sidebar-heading">
              <div className="post-sidebar-heading-icon">
                <i className="bi bi-sliders2" />
              </div>

              <div>
                <h3>Thiết lập bài viết</h3>

                <p>Thông tin hiển thị chính.</p>
              </div>
            </div>

            <div className="post-editor-field">
              <label>
                Tác giả
                <span>*</span>
              </label>

              <div className="post-editor-select-wrap">
                <i className="bi bi-person" />

                <select
                  name="user_id"
                  value={formData.user_id}
                  onChange={handleChange}
                  className={
                    errors.user_id
                      ? "post-editor-select post-editor-input-error"
                      : "post-editor-select"
                  }
                >
                  <option value="">Chọn tác giả</option>

                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.fullName || user.name || `User #${user.id}`}
                    </option>
                  ))}
                </select>
              </div>

              {errors.user_id && (
                <small className="post-editor-error">{errors.user_id}</small>
              )}
            </div>

            <div className="post-editor-field">
              <label>
                Danh mục
                <span>*</span>
              </label>

              <div className="post-editor-select-wrap">
                <i className="bi bi-folder2" />

                <select
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleChange}
                  className={
                    errors.category_id
                      ? "post-editor-select post-editor-input-error"
                      : "post-editor-select"
                  }
                >
                  <option value="">Chọn danh mục</option>

                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {errors.category_id && (
                <small className="post-editor-error">
                  {errors.category_id}
                </small>
              )}
            </div>

            <div className="post-editor-field">
              <label>Trạng thái</label>

              <div className="post-editor-select-wrap">
                <i className="bi bi-broadcast" />

                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="post-editor-select"
                >
                  <option value={1}>Đã xuất bản</option>

                  <option value={0}>Bản nháp</option>
                </select>
              </div>
            </div>

            <label className="post-feature-switch">
              <div>
                <strong>Bài viết nổi bật</strong>

                <small>Ưu tiên hiển thị trên website.</small>
              </div>

              <input
                type="checkbox"
                name="is_featured"
                checked={Number(formData.is_featured) === 1}
                onChange={handleChange}
              />

              <span className="post-feature-switch-track">
                <span />
              </span>
            </label>
          </section>

          {/* IMAGE */}

          <section className="post-sidebar-card">
            <div className="post-sidebar-heading">
              <div className="post-sidebar-heading-icon post-sidebar-heading-icon-cyan">
                <i className="bi bi-image" />
              </div>

              <div>
                <h3>Ảnh đại diện</h3>

                <p>Hình ảnh chính của bài viết.</p>
              </div>
            </div>

            <div className="post-thumbnail-panel">
              {preview ? (
                <div className="post-thumbnail-preview-wrap">
                  <img
                    src={preview}
                    alt="Thumbnail"
                    className="post-thumbnail-preview"
                  />

                  <div className="post-thumbnail-overlay">
                    <i className="bi bi-image" />
                  </div>
                </div>
              ) : (
                <div className="post-thumbnail-empty">
                  <div className="post-thumbnail-empty-icon">
                    <i className="bi bi-cloud-arrow-up" />
                  </div>

                  <strong>Chưa có ảnh</strong>

                  <p>JPG, PNG hoặc WEBP.</p>
                </div>
              )}

              <label className="post-upload-button">
                <i className="bi bi-upload" />

                <span>Chọn ảnh đại diện</span>

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleThumbnail}
                />
              </label>

              {thumbnailFile && (
                <div className="post-file-selected">
                  <i className="bi bi-check-circle-fill" />

                  <span>{thumbnailFile.name}</span>
                </div>
              )}
            </div>
          </section>

          {/* TAG */}

          <section className="post-sidebar-card">
            <div className="post-sidebar-heading">
              <div className="post-sidebar-heading-icon post-sidebar-heading-icon-violet">
                <i className="bi bi-tags" />
              </div>

              <div>
                <h3>Tags</h3>

                <p>Gắn nhãn để phân loại nội dung.</p>
              </div>
            </div>

            {formData.tags.length > 0 && (
              <div className="post-tag-list">
                {formData.tags.map((tag) => (
                  <span key={tag} className="post-tag-chip">
                    <span>{tag}</span>

                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      aria-label={`Xóa tag ${tag}`}
                    >
                      <i className="bi bi-x" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="post-tag-input-group">
              <input
                ref={tagInputRef}
                type="text"
                className="post-editor-input"
                placeholder="Nhập tag..."
                value={tagInput}
                onChange={(event) => setTagInput(event.target.value)}
                onKeyDown={handleTagKeyDown}
              />

              <button
                type="button"
                className="post-tag-add-button"
                onClick={addTag}
              >
                <i className="bi bi-plus-lg" />
              </button>
            </div>

            <small className="post-editor-helper">
              Nhấn Enter hoặc dấu phẩy để thêm nhanh.
            </small>
          </section>
        </aside>
      </div>
    </div>
  );
}

export default PostForm;
