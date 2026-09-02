import React, { useEffect, useRef, useState } from "react";

import { Link, useNavigate, useParams } from "react-router-dom";

import toast from "react-hot-toast";

import { CKEditor } from "@ckeditor/ckeditor5-react";

import ClassicEditor from "@ckeditor/ckeditor5-build-classic";

import "./PostForm.css";

import postService from "../../../../services/postService";
import postCategoryService from "../../../../services/postCategoryService";

// ============================================================
// IMAGE
// ============================================================

const IMAGE_BASE_URL =
  process.env.REACT_APP_API_URL?.replace(/\/api\/?$/, "") ||
  "http://localhost:5000";

function getImageUrl(image) {
  if (!image) {
    return "";
  }

  if (
    image.startsWith("http://") ||
    image.startsWith("https://") ||
    image.startsWith("blob:") ||
    image.startsWith("data:")
  ) {
    return image;
  }

  return `${IMAGE_BASE_URL}${image.startsWith("/") ? image : `/${image}`}`;
}

// ============================================================
// SLUG
// ============================================================

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

// ============================================================
// CKEDITOR UPLOAD
// ============================================================

class MyUploadAdapter {
  constructor(loader) {
    this.loader = loader;

    this.controller = new AbortController();
  }

  upload() {
    return this.loader.file.then(async (file) => {
      try {
        const response = await postService.uploadContentImage(file);

        const data = response?.data;

        if (!data?.success || !(data.location || data.url)) {
          throw new Error(data?.message || "Upload ảnh thất bại.");
        }

        return {
          default: data.location || data.url,
        };
      } catch (error) {
        throw error;
      }
    });
  }

  abort() {
    this.controller.abort();
  }
}

function MyCustomUploadAdapterPlugin(editor) {
  editor.plugins.get("FileRepository").createUploadAdapter = (loader) =>
    new MyUploadAdapter(loader);
}

// ============================================================
// COMPONENT
// ============================================================

function PostForm({ isEdit = false }) {
  const navigate = useNavigate();

  const { id } = useParams();

  const tagInputRef = useRef(null);

  const previewObjectUrlRef = useRef(null);

  const [loading, setLoading] = useState(false);

  const [initialLoading, setInitialLoading] = useState(Boolean(isEdit));

  const [preview, setPreview] = useState("");

  const [thumbnailFile, setThumbnailFile] = useState(null);

  const [categories, setCategories] = useState([]);

  const [authorName, setAuthorName] = useState("");

  const [tagInput, setTagInput] = useState("");

  const [errors, setErrors] = useState({});

  const [slugTouched, setSlugTouched] = useState(Boolean(isEdit));

  const [formData, setFormData] = useState({
    post_category_id: "",

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

  // ============================================================
  // CLEAN OBJECT URL
  // ============================================================

  useEffect(() => {
    return () => {
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
      }
    };
  }, []);

  // ============================================================
  // LOAD CATEGORIES
  // ============================================================

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await postCategoryService.getActiveCategories();

        setCategories(response?.data?.data || []);
      } catch (error) {
        console.error("Lỗi tải danh mục bài viết:", error);

        toast.error("Không tải được danh mục bài viết.");
      }
    };

    fetchCategories();
  }, []);

  // ============================================================
  // LOAD POST
  // ============================================================

  useEffect(() => {
    if (!isEdit || !id) {
      setInitialLoading(false);

      return;
    }

    const fetchPost = async () => {
      try {
        setInitialLoading(true);

        const response = await postService.getPost(id);

        const post = response?.data?.data;

        if (!post) {
          throw new Error("Không tìm thấy dữ liệu bài viết.");
        }

        const tagsArray = post.tags
          ? String(post.tags)
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean)
          : [];

        setFormData({
          post_category_id: post.post_category_id ?? post.category_id ?? "",

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

        setSlugTouched(true);

        setAuthorName(post.author || post.author_name || "");

        if (post.thumbnail) {
          setPreview(getImageUrl(post.thumbnail));
        }
      } catch (error) {
        console.error(error);

        toast.error(
          error?.response?.data?.message || "Không lấy được dữ liệu bài viết.",
        );
      } finally {
        setInitialLoading(false);
      }
    };

    fetchPost();
  }, [id, isEdit]);

  // ============================================================
  // VALIDATE
  // ============================================================

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = "Vui lòng nhập tiêu đề bài viết.";
    }

    if (!formData.content.trim()) {
      newErrors.content = "Vui lòng nhập nội dung bài viết.";
    }

    if (!formData.post_category_id) {
      newErrors.post_category_id = "Vui lòng chọn danh mục bài viết.";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  // ============================================================
  // INPUT
  // ============================================================

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    let nextValue = type === "checkbox" ? (checked ? 1 : 0) : value;

    if (errors[name]) {
      setErrors((previous) => ({
        ...previous,
        [name]: "",
      }));
    }

    if (name === "slug") {
      setSlugTouched(Boolean(value.trim()));

      setFormData((previous) => ({
        ...previous,
        slug: createSlug(value),
      }));

      return;
    }

    if (name === "title") {
      setFormData((previous) => ({
        ...previous,

        title: value,

        slug: slugTouched ? previous.slug : createSlug(value),
      }));

      return;
    }

    const numericFields = ["post_category_id", "status", "is_featured"];

    if (numericFields.includes(name)) {
      nextValue = value === "" ? "" : Number(nextValue);
    }

    setFormData((previous) => ({
      ...previous,
      [name]: nextValue,
    }));
  };

  // ============================================================
  // THUMBNAIL
  // ============================================================

  const handleThumbnail = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      toast.error("Chỉ hỗ trợ JPG, PNG và WEBP.");

      event.target.value = "";

      return;
    }

    /*
     * Đồng bộ với BE uploadPost:
     * max 2MB
     */
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ảnh không được vượt quá 2MB.");

      event.target.value = "";

      return;
    }

    setThumbnailFile(file);

    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
    }

    const objectUrl = URL.createObjectURL(file);

    previewObjectUrlRef.current = objectUrl;

    setPreview(objectUrl);

    try {
      const response = await postService.uploadThumbnail(file);

      const thumbnail = response?.data?.thumbnail || response?.data?.url;

      if (!thumbnail) {
        throw new Error("Server không trả về đường dẫn ảnh.");
      }

      setFormData((previous) => ({
        ...previous,
        thumbnail,
      }));

      toast.success("Upload ảnh thành công.");
    } catch (error) {
      console.error(error);

      toast.error(error?.response?.data?.message || "Upload ảnh thất bại.");
    }
  };

  // ============================================================
  // TAG
  // ============================================================

  const addTag = () => {
    const tag = tagInput.trim();

    if (!tag) {
      return;
    }

    const existed = formData.tags.some(
      (item) => item.toLowerCase() === tag.toLowerCase(),
    );

    if (existed) {
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

  // ============================================================
  // SUBMIT
  // ============================================================

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error("Vui lòng kiểm tra lại thông tin bài viết.");

      return;
    }

    try {
      setLoading(true);

      const data = {
        post_category_id: Number(formData.post_category_id),

        title: formData.title.trim(),

        /*
         * BE vẫn kiểm tra unique slug.
         */
        slug: formData.slug
          ? createSlug(formData.slug)
          : createSlug(formData.title),

        thumbnail: formData.thumbnail || null,

        content: formData.content,

        excerpt: formData.excerpt.trim() || null,

        meta_title: formData.meta_title.trim() || null,

        meta_description: formData.meta_description.trim() || null,

        meta_keywords: formData.meta_keywords.trim() || null,

        tags: formData.tags.length ? formData.tags.join(", ") : null,

        is_featured: Number(formData.is_featured),

        status: Number(formData.status),
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

  // ============================================================
  // LOADING
  // ============================================================

  if (initialLoading) {
    return (
      <div className="post-editor-page">
        <section className="post-editor-card">
          <div className="post-loading-state">
            <span className="post-editor-spinner" />

            <strong>Đang tải bài viết...</strong>
          </div>
        </section>
      </div>
    );
  }

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

                {isEdit
                  ? "Cập nhật"
                  : Number(formData.status) === 1
                    ? "Xuất bản"
                    : "Lưu bản nháp"}
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
                        types: ["jpeg", "png", "webp"],
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

            {/* AUTHOR READONLY */}

            {isEdit && authorName && (
              <div className="post-editor-field">
                <label>Tác giả</label>

                <div className="post-slug-input">
                  <span>
                    <i className="bi bi-person-circle" />
                  </span>

                  <input type="text" value={authorName} readOnly />
                </div>
              </div>
            )}

            <div className="post-editor-field">
              <label>
                Danh mục bài viết
                <span>*</span>
              </label>

              <div className="post-editor-select-wrap">
                <i className="bi bi-folder2" />

                <select
                  name="post_category_id"
                  value={formData.post_category_id}
                  onChange={handleChange}
                  className={
                    errors.post_category_id
                      ? "post-editor-select post-editor-input-error"
                      : "post-editor-select"
                  }
                >
                  <option value="">Chọn danh mục bài viết</option>

                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {errors.post_category_id && (
                <small className="post-editor-error">
                  {errors.post_category_id}
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
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
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

                  <p>JPG, PNG hoặc WEBP. Tối đa 2MB.</p>
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
