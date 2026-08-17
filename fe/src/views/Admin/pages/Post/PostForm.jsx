import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";
import "./PostForm.css";
import postService from "../../../../services/postService";
import categoryService from "../../../../services/categoryService";
import api from "../../../../services/api";

class MyUploadAdapter {
  constructor(loader) { this.loader = loader; }
  upload() {
    return this.loader.file.then(file => new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append("image", file);
      api.post("/admin/posts/upload-image", formData, { headers: { "Content-Type": "multipart/form-data" } })
      .then(response => {
        const data = response.data;
        if (data.success) resolve({ default: data.location });
        else reject(data.message);
      }).catch(err => reject(err));
    }));
  }
  abort() {}
}
function MyCustomUploadAdapterPlugin(editor) {
  editor.plugins.get("FileRepository").createUploadAdapter = (loader) => new MyUploadAdapter(loader);
}

const PostForm = ({ isEdit = false }) => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState("");
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const tagInputRef = useRef(null);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    user_id: 1, category_id: "", title: "", slug: "", thumbnail: "",
    content: "", excerpt: "", meta_title: "", meta_description: "",
    meta_keywords: "", tags: [], is_featured: 0, status: 1,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, userRes] = await Promise.all([
          categoryService.getCategories({ status: 1 }),
          api.get("/admin/users")
        ]);
        setCategories(catRes.data || []);
        setUsers(userRes.data.data.users || []);
        if (!isEdit && userRes.data.data.users && userRes.data.data.users.length > 0) {
          setFormData(prev => ({ ...prev, user_id: userRes.data.data.users[0].id }));
        }
      } catch (err) { console.error("Lỗi tải dữ liệu", err); }
    };
    fetchData();
  }, [isEdit]);

  useEffect(() => {
    if (isEdit && id) fetchPost();
  }, [id]);

  const fetchPost = async () => {
    try {
      const res = await postService.getPost(id);
      const post = res.data.data;
      const tagsArray = post.tags ? post.tags.split(",").map(t => t.trim()).filter(Boolean) : [];
      setFormData({
        user_id: post.user_id, category_id: post.category_id, title: post.title,
        slug: post.slug, thumbnail: post.thumbnail, content: post.content,
        excerpt: post.excerpt || "", meta_title: post.meta_title || "",
        meta_description: post.meta_description || "", meta_keywords: post.meta_keywords || "",
        tags: tagsArray, is_featured: post.is_featured ?? 0, status: post.status,
      });
      if (post.thumbnail) setPreview("http://localhost:5000" + post.thumbnail);
    } catch (err) { toast.error("Không lấy được dữ liệu bài viết"); }
  };

  const validateForm = () => {
    let newErrors = {};
    if (!formData.title.trim()) newErrors.title = "Vui lòng nhập tiêu đề bài viết";
    if (!formData.content.trim()) newErrors.content = "Vui lòng nhập nội dung bài viết";
    if (!formData.category_id) newErrors.category_id = "Vui lòng chọn danh mục";
    if (!formData.user_id) newErrors.user_id = "Vui lòng chọn tác giả";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === "checkbox" ? (checked ? 1 : 0) : value;
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));

    if (name === "title" && !formData.slug) {
      const generatedSlug = value.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^\w-]+/g, "");
      setFormData(prev => ({ ...prev, [name]: val, slug: generatedSlug }));
      return;
    }
    const numericFields = ["category_id", "status", "is_featured", "user_id"];
    setFormData(prev => ({ ...prev, [name]: numericFields.includes(name) ? Number(val) : val }));
  };

  const handleThumbnail = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setThumbnailFile(file);
    setPreview(URL.createObjectURL(file));
    try {
      const res = await postService.uploadThumbnail(file);
      setFormData(prev => ({ ...prev, thumbnail: res.data.thumbnail }));
      toast.success("Upload ảnh thành công");
    } catch (err) { toast.error("Upload ảnh thất bại"); }
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (!tag) return;
    if (formData.tags.includes(tag)) { toast.warning("Tag đã tồn tại"); return; }
    setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }));
    setTagInput("");
    tagInputRef.current.focus();
  };
  const removeTag = (tagToRemove) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tagToRemove) }));
  };
  const handleTagKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    try {
      setLoading(true);
      const slug = formData.slug || formData.title.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^\w-]+/g, "");
      const data = { ...formData, slug, tags: formData.tags.join(", ") };

      if (isEdit) {
        await postService.updatePost(id, data);
        toast.success("Cập nhật bài viết thành công");
      } else {
        await postService.createPost(data);
        toast.success("Thêm bài viết thành công");
      }
      setTimeout(() => navigate("/admin/posts"), 1000);
    } catch (err) {
      toast.error(err.response?.data?.message || "Có lỗi xảy ra");
    } finally { setLoading(false); }
  };

  return (
    <div className="admin-post-form">
      <div className="page-header">
        <div className="header-title"><h2>{isEdit ? "Cập nhật bài viết" : "Thêm bài viết mới"}</h2><p>{isEdit ? "Chỉnh sửa thông tin bài viết" : "Thêm bài viết mới cho website"}</p></div>
        <div className="header-actions">
          <Link to="/admin/posts" className="btn-cancel" style={{ textDecoration: "none" }}>Hủy</Link>
          <button className="btn-save" onClick={handleSubmit} disabled={loading}>
            {loading ? <><span className="spinner-border spinner-border-sm me-2" role="status"></span>Đang lưu...</> : <><i className="bi bi-save"></i> {isEdit ? "Cập nhật" : "Xuất bản"}</>}
          </button>
        </div>
      </div>

      <div className="form-container">
        <div className="form-main">
          <div className="form-group">
            <label>Tiêu đề bài viết <span className="required">*</span></label>
            <input className={`form-control ${errors.title ? 'error' : ''}`} type="text" name="title" value={formData.title} onChange={handleChange} placeholder="Nhập tiêu đề..." />
            {errors.title && <div className="error-text">{errors.title}</div>}
          </div>
          <div className="form-group">
            <label>Slug</label>
            <input className="form-control" type="text" name="slug" value={formData.slug} onChange={handleChange} placeholder="Để trống sẽ tự sinh" />
          </div>
          <div className="form-group">
            <label>Nội dung <span className="required">*</span></label>
            <CKEditor editor={ClassicEditor} data={formData.content} onChange={(event, editor) => { 
              setFormData(prev => ({ ...prev, content: editor.getData() }));
              if (errors.content) setErrors(prev => ({ ...prev, content: '' }));
            }} config={{ extraPlugins: [MyCustomUploadAdapterPlugin], toolbar: ['heading', '|', 'bold', 'italic', 'underline', 'strikethrough', '|', 'bulletedList', 'numberedList', '|', 'link', 'blockQuote', 'insertTable', '|', 'imageUpload', 'mediaEmbed', '|', 'undo', 'redo'], image: { toolbar: ['imageStyle:block', 'imageStyle:side', '|', 'imageTextAlternative'], upload: { types: ['jpeg', 'png', 'gif', 'bmp', 'webp'] } }, mediaEmbed: { previewsInData: true } }} />
            {errors.content && <div className="error-text">{errors.content}</div>}
          </div>
          <div className="form-group"><label>Trích dẫn / Tóm tắt</label><textarea className="form-control" rows="3" name="excerpt" value={formData.excerpt} onChange={handleChange} placeholder="Tóm tắt ngắn gọn về bài viết (hiển thị ở danh sách, SEO)" /></div>
          <div className="seo-box">
            <h3 className="seo-title">SEO</h3>
            <div className="form-group"><label>Meta Title</label><input className="form-control" type="text" name="meta_title" value={formData.meta_title} onChange={handleChange} placeholder="Tiêu đề SEO (tối ưu 60-70 ký tự)" /></div>
            <div className="form-group"><label>Meta Description</label><textarea className="form-control" rows="2" name="meta_description" value={formData.meta_description} onChange={handleChange} placeholder="Mô tả SEO (tối ưu 150-160 ký tự)" /></div>
            <div className="form-group"><label>Meta Keywords</label><input className="form-control" type="text" name="meta_keywords" value={formData.meta_keywords} onChange={handleChange} placeholder="Từ khóa, cách nhau bởi dấu phẩy" /></div>
          </div>
        </div>

        <div className="form-sidebar">
          <div className="sidebar-card">
            <h3>Thông tin</h3>
            <div className="form-group">
              <label>Tác giả</label>
              <select className={`form-control ${errors.user_id ? 'error' : ''}`} name="user_id" value={formData.user_id} onChange={handleChange} style={{ width: "100%" }}>
                <option value="">-- Chọn tác giả --</option>
                {users.map((user) => (<option key={user.id} value={user.id}>{user.fullName || user.name || `User #${user.id}`}</option>))}
              </select>
              {errors.user_id && <div className="error-text">{errors.user_id}</div>}
            </div>
            <div className="form-group">
              <label>Danh mục <span className="required">*</span></label>
              <select className={`form-control ${errors.category_id ? 'error' : ''}`} name="category_id" value={formData.category_id} onChange={handleChange} style={{ width: "100%" }}>
                <option value="">-- Chọn danh mục --</option>
                {categories.map((cat) => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
              </select>
              {errors.category_id && <div className="error-text">{errors.category_id}</div>}
            </div>
            <div className="form-group"><label>Trạng thái</label><select className="form-control" name="status" value={formData.status} onChange={handleChange}><option value={1}>Đã xuất bản</option><option value={0}>Bản nháp</option></select></div>
          </div>

          <div className="sidebar-card">
            <h3>Ảnh đại diện</h3>
            <div className="thumbnail-upload">
              {preview ? <img src={preview} alt="thumbnail" className="thumbnail-preview" style={{ width: "100%", borderRadius: "8px", marginBottom: "10px", objectFit: "cover" }} /> : <div className="upload-placeholder"><i className="bi bi-image"></i><p>Chưa có ảnh</p></div>}
              <input type="file" accept="image/*" className="form-control" onChange={handleThumbnail} />
              {thumbnailFile && (<small style={{ display: "block", marginTop: "8px", color: "#666" }}>{thumbnailFile.name}</small>)}
            </div>
          </div>

          <div className="sidebar-card">
            <h3>Tùy chọn</h3>
            <div className="form-group" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <input type="checkbox" id="is_featured" name="is_featured" checked={formData.is_featured === 1} onChange={handleChange} style={{ width: "20px", height: "20px", cursor: "pointer" }} />
              <label htmlFor="is_featured" style={{ margin: 0, fontWeight: "500" }}>Bài viết nổi bật</label>
            </div>
            <div className="form-group">
              <label>Tags</label>
              <div className="tag-input-wrapper">
                <div className="tag-list">{formData.tags.map((tag, index) => (<span key={index} className="tag-chip">{tag}<button type="button" className="tag-remove" onClick={() => removeTag(tag)}>×</button></span>))}</div>
                <div className="tag-input-group">
                  <input ref={tagInputRef} type="text" className="form-control" placeholder="Nhập tag và nhấn Enter hoặc dấu phẩy" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleTagKeyDown} />
                  <button type="button" className="btn-add-tag" onClick={addTag}>Thêm</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default PostForm;