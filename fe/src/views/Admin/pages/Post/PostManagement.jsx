import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast"; 
import "./PostManagement.css";
import postService from "../../../../services/postService";
import categoryService from "../../../../services/categoryService";

const PostManagement = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [featured, setFeatured] = useState("");
  const [categoryList, setCategoryList] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  
  const [openMenuId, setOpenMenuId] = useState(null);

  // 👇 State quản lý Modal xác nhận xóa mới
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    postId: null,
  });

  const NO_IMAGE_SVG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Crect width='60' height='60' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='12' fill='%23999'%3ENo Image%3C/text%3E%3C/svg%3E";

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await categoryService.getCategories({ status: 1 });
        setCategoryList(res.data || []);
      } catch (err) {
        console.error("Lỗi tải danh mục", err);
      }
    };
    fetchCategories();
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const res = await postService.getPosts({
        keyword,
        category_id: category,
        status,
        is_featured: featured,
        sortBy: "created_at",
        order: "DESC",
        page,
        limit
      });
      setPosts(res.data.data || []);
      setTotal(res.data.total || 0);
      setOpenMenuId(null);
    } catch (err) {
      console.error(err);
      toast.error("Không tải được danh sách bài viết");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { setPage(1); }, [keyword, category, status, featured]);
  useEffect(() => { fetchPosts(); }, [keyword, category, status, featured, page, limit]);

  // 👇 Hàm mở Modal
  const handleOpenDeleteConfirm = (id) => {
    setConfirmModal({ isOpen: true, postId: id });
  };

  // 👇 Hàm thực hiện xóa (sau khi bấm nút Xóa đỏ)
  const handleConfirmDelete = async () => {
    const id = confirmModal.postId;
    setConfirmModal({ isOpen: false, postId: null });
    
    try {
      await postService.deletePost(id);
      toast.success("Xóa bài viết thành công!");
      fetchPosts();
    } catch (err) {
      console.error(err);
      toast.error("Xóa thất bại!");
    }
  };

  // 👇 Hàm đóng Modal (khi bấm Hủy)
  const handleCloseDeleteConfirm = () => {
    setConfirmModal({ isOpen: false, postId: null });
  };

  const formatDate = (date) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("vi-VN");
  };

  const totalPages = Math.ceil(total / limit) || 1;
  const startResult = total === 0 ? 0 : (page - 1) * limit + 1;
  const endResult = Math.min(page * limit, total);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let startPage = Math.max(1, page - 2);
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage < maxVisible - 1) startPage = Math.max(1, endPage - maxVisible + 1);
    for (let i = startPage; i <= endPage; i++) pages.push(i);
    return pages;
  };

  return (
    <div className="admin-post-management">
      
      {/* 👇 MODAL XÁC NHẬN XÓA (Tích hợp trực tiếp ở đây) */}
      {confirmModal.isOpen && (
        <div className="custom-confirm-overlay" onClick={handleCloseDeleteConfirm}>
          <div className="custom-confirm-box" onClick={(e) => e.stopPropagation()}>
            {/* Icon thùng rác */}
            <div className="custom-confirm-icon">
              <i className="bi bi-trash3"></i>
            </div>
            <h3 className="custom-confirm-title">Xóa bài viết</h3>
            <p className="custom-confirm-message">Bạn có chắc muốn xóa bài viết này?</p>
            <div className="custom-confirm-actions">
              <button className="custom-btn-cancel" onClick={handleCloseDeleteConfirm}>
                Hủy
              </button>
              <button className="custom-btn-delete" onClick={handleConfirmDelete}>
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="page-header">
        <div className="header-title">
          <h2>Quản lý bài viết</h2>
          <p>Quản lý tin tức, hướng dẫn Build PC và khuyến mãi.</p>
        </div>
        <Link to="/admin/posts/create" className="btn-create-post" style={{ textDecoration: "none" }}>
          <i className="bi bi-plus-lg"></i> Tạo bài viết mới
        </Link>
      </div>

      <div className="filter-bar">
        <div className="search-box">
          <i className="bi bi-search"></i>
          <input type="text" placeholder="Tìm kiếm..." value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        </div>
        <div className="filter-actions">
          <select className="filter-select" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Tất cả danh mục</option>
            {categoryList.map((cat) => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
          </select>
          <select className="filter-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Tất cả trạng thái</option>
            <option value="1">Đã xuất bản</option>
            <option value="0">Bản nháp</option>
          </select>
          <select className="filter-select" value={featured} onChange={(e) => setFeatured(e.target.value)}>
            <option value="">Tất cả</option>
            <option value="1">Nổi bật</option>
            <option value="0">Không nổi bật</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 20 }}>Đang tải dữ liệu...</div>
      ) : (
        <>
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: 'auto', minWidth: '250px' }}>Tiêu đề</th>
                  <th style={{ width: '120px' }}>Tác giả</th>
                  <th style={{ width: '140px' }}>Danh mục</th>
                  <th style={{ width: '110px' }}>Ngày đăng</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>Lượt xem</th>
                  <th style={{ width: '100px', textAlign: 'center' }}>Nổi bật</th>
                  <th style={{ width: '120px', textAlign: 'center' }}>Trạng thái</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {posts.length === 0 ? (
                  <tr><td colSpan="8" style={{ textAlign: "center" }}>Không có bài viết.</td></tr>
                ) : (
                  posts.map((post) => (
                    <tr key={post.id}>
                      <td>
                        <div className="post-info">
                          <img src={post.thumbnail ? `http://localhost:5000${post.thumbnail}` : NO_IMAGE_SVG} alt={post.title} className="post-thumb" onError={(e) => e.target.src = NO_IMAGE_SVG} />
                          <div className="post-meta">
                            <h4>{post.title}</h4>
                            <span><i className="bi bi-link-45deg"></i>{post.slug}</span>
                          </div>
                        </div>
                      </td>
                      <td>{post.author}</td>
                      <td><span className="category-tag">{post.category_name}</span></td>
                      <td>{formatDate(post.created_at)}</td>
                      <td style={{ textAlign: 'center' }}>{post.views || 0}</td>
                      <td style={{ textAlign: 'center' }}>
                        {post.is_featured ? (
                          <span className="featured-badge" style={{ color: "#f59e0b", fontWeight: "bold" }}><i className="bi bi-star-fill" style={{ marginRight: "4px" }}></i>Nổi bật</span>
                        ) : (<span style={{ color: "#aaa" }}>—</span>)}
                      </td>
                      <td style={{ textAlign: 'center' }}><span className={`status-badge ${Number(post.status) === 1 ? "published" : "draft"}`}>{Number(post.status) === 1 ? "Đã xuất bản" : "Bản nháp"}</span></td>
                      
                      <td style={{ textAlign: 'center' }}>
                        <div className="action-dropdown">
                          <button 
                            className="action-trigger" 
                            onClick={() => setOpenMenuId(openMenuId === post.id ? null : post.id)}
                          >
                            <i className="bi bi-three-dots-vertical"></i>
                          </button>
                          
                          {openMenuId === post.id && (
                            <div className="action-menu">
                              <Link to={`/admin/posts/edit/${post.id}`} className="action-item">
                                <i className="bi bi-pencil"></i> Sửa
                              </Link>
                              <button className="action-item delete-item" onClick={() => handleOpenDeleteConfirm(post.id)}>
                                <i className="bi bi-trash"></i> Xóa
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

                           {/* 👇 SỬA LẠI THÀNH DÒNG NÀY: Luôn hiện phân trang khi có bài viết */}
          {total > 0 && (
            <div className="pagination-wrapper">
              <div className="pagination-info">Hiển thị {startResult} - {endResult} / {total} sản phẩm</div>
              <div className="pagination-controls">
                <button className="page-btn" disabled={page === 1} onClick={() => setPage(1)}>«</button>
                <button className="page-btn" disabled={page === 1} onClick={() => setPage(page - 1)}>‹</button>
                {getPageNumbers().map((p) => (
                  <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                ))}
                <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(page + 1)}>›</button>
                <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(totalPages)}>»</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
export default PostManagement;