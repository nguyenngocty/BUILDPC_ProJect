import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast"; 
import "./Comments.css";
import {
  getComments,
  getCommentStatistics,
  getCommentById,
  approveComment,
  rejectComment,
  deleteComment,
  deleteManyComments,
  getProducts,
  getUsers,
} from "../../../../services/commentService";

function Comments() {
  // ==========================
  // DATA
  // ==========================
  const [comments, setComments] = useState([]);
  const [statistics, setStatistics] = useState({
    total: 0,
    approved: 0,
    pending: 0,
  });

  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);

  // ==========================
  // FILTER
  // ==========================
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("all");
  const [productId, setProductId] = useState("");
  const [userId, setUserId] = useState("");

  // ==========================
  // PAGINATION
  // ==========================
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  });

  // ==========================
  // SELECT & DROPDOWN
  // ==========================
  const [selectedIds, setSelectedIds] = useState([]);
  const [openMenuId, setOpenMenuId] = useState(null);

  // ==========================
  // DETAIL MODAL
  // ==========================
  const [showModal, setShowModal] = useState(false);
  const [detail, setDetail] = useState(null);

  // ==========================
  // DELETE CONFIRM MODAL
  // ==========================
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    type: null, // 'single' or 'bulk'
    id: null,
  });

  // ==========================
  // LOADING
  // ==========================
  const [loading, setLoading] = useState(false);

  // ==========================
  // LOAD COMMENTS
  // ==========================
  const loadComments = async () => {
    try {
      setLoading(true);

      const params = {
        page,
        limit,
      };

      if (keyword.trim()) params.keyword = keyword;
      if (status !== "all") params.status = status;
      if (productId) params.product_id = productId;
      if (userId) params.user_id = userId;

      const res = await getComments(params);

      setComments(res.data.data || []);
      setPagination(res.data.pagination || { page: 1, totalPages: 1, total: 0 });
      setSelectedIds([]);
      setOpenMenuId(null);
    } catch (err) {
      console.error(err);
      toast.error("Không tải được bình luận.");
    } finally {
      setLoading(false);
    }
  };

  // ==========================
  // LOAD STATISTICS
  // ==========================
  const loadStatistics = async () => {
    try {
      const res = await getCommentStatistics();
      setStatistics(res.data.data || { total: 0, approved: 0, pending: 0 });
    } catch (err) { console.error(err); }
  };

  // ==========================
  // LOAD FILTER
  // ==========================
  const loadFilters = async () => {
    try {
      const p = await getProducts();
      const u = await getUsers();
      setProducts(p.data.data || []);
      setUsers(u.data.data || []);
    } catch (err) { console.error(err); }
  };

  // ==========================
  // INIT
  // ==========================
  useEffect(() => {
    loadFilters();
    loadStatistics();
  }, []);

  // Reset page về 1 khi có sự thay đổi filter
  useEffect(() => {
    setPage(1);
  }, [keyword, status, productId, userId]);

  // Gọi API khi filter hoặc page thay đổi
  useEffect(() => {
    loadComments();
  }, [page, keyword, status, productId, userId]);

  // ==========================
  // APPROVE
  // ==========================
  const handleApprove = async (id) => {
    try {
      await approveComment(id);
      loadComments();
      loadStatistics();
      toast.success("Đã duyệt bình luận.");
    } catch (err) {
      console.error(err);
      toast.error("Duyệt thất bại!");
    }
  };

  // ==========================
  // REJECT
  // ==========================
  const handleReject = async (id) => {
    try {
      await rejectComment(id);
      loadComments();
      loadStatistics();
      toast.success("Đã từ chối bình luận.");
    } catch (err) {
      console.error(err);
      toast.error("Từ chối thất bại!");
    }
  };

  // ==========================
  // DELETE HANDLERS
  // ==========================
  const openDeleteModal = (id) => {
    setDeleteModal({ isOpen: true, type: 'single', id });
  };

  const openBulkDeleteModal = () => {
    if (selectedIds.length === 0) {
      toast.error("Vui lòng chọn ít nhất một bình luận!");
      return;
    }
    setDeleteModal({ isOpen: true, type: 'bulk', id: null });
  };

  const handleConfirmDelete = async () => {
    const { type, id } = deleteModal;
    setDeleteModal({ isOpen: false, type: null, id: null });

    try {
      if (type === 'single') {
        await deleteComment(id);
        toast.success("Đã xóa bình luận.");
      } else {
        await deleteManyComments(selectedIds);
        toast.success(`Đã xóa ${selectedIds.length} bình luận.`);
      }
      loadComments();
      loadStatistics();
    } catch (err) {
      console.error(err);
      toast.error("Xóa thất bại!");
    }
  };

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, type: null, id: null });
  };

  // ==========================
  // VIEW DETAIL
  // ==========================
  const handleView = async (id) => {
    try {
      const res = await getCommentById(id);
      setDetail(res.data.data);
      setShowModal(true);
    } catch (err) { console.error(err); }
  };

  // ==========================
  // CHECKBOX
  // ==========================
  const handleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === comments.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(comments.map(item => item.id));
    }
  };

  // ==========================
  // PAGINATION UTILITIES
  // ==========================
  const totalPages = pagination.totalPages || 1;
  const startResult = pagination.total === 0 ? 0 : (page - 1) * limit + 1;
  const endResult = Math.min(page * limit, pagination.total);

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
    <section className="cm-page">
      {/* ================= CUSTOM CONFIRM MODAL ================= */}
      {deleteModal.isOpen && (
        <div className="custom-confirm-overlay" onClick={closeDeleteModal}>
          <div className="custom-confirm-box" onClick={(e) => e.stopPropagation()}>
            <div className="custom-confirm-icon"><i className="bi bi-trash3"></i></div>
            <h3 className="custom-confirm-title">Xóa bình luận</h3>
            <p className="custom-confirm-message">
              {deleteModal.type === 'bulk' 
                ? `Bạn có chắc muốn xóa ${selectedIds.length} bình luận đã chọn?` 
                : "Bạn có chắc muốn xóa bình luận này?"}
            </p>
            <div className="custom-confirm-actions">
              <button className="custom-btn-cancel" onClick={closeDeleteModal}>Hủy</button>
              <button className="custom-btn-delete" onClick={handleConfirmDelete}>Xóa</button>
            </div>
          </div>
        </div>
      )}

      {/* ================= HEADER ================= */}
      <div className="cm-header">
        <div className="cm-title">
          <p className="cm-eyebrow">QUẢN LÝ CỬA HÀNG</p>
          <h1>Quản lý đánh giá sản phẩm</h1>
          <p className="cm-desc">Quản lý, duyệt và kiểm soát bình luận của khách hàng.</p>
        </div>
      </div>

      {/* ================= STATISTICS ================= */}
      <div className="cm-stat-grid">
        <div className="cm-stat-card"><h3>Tổng bình luận</h3><span>{statistics.total}</span></div>
        <div className="cm-stat-card success"><h3>Đã duyệt</h3><span>{statistics.approved}</span></div>
        <div className="cm-stat-card warning"><h3>Chờ duyệt</h3><span>{statistics.pending}</span></div>
      </div>

      {/* ================= PANEL ================= */}
      <div className="cm-panel">
        
        {/* ================= BULK ACTION BAR ================= */}
        {selectedIds.length > 0 && (
          <div className="cm-bulk-action-bar">
            <div className="cm-bulk-info">
              <div className="cm-bulk-icon-box"><i className="bi bi-check-square-fill"></i></div>
              <div className="cm-bulk-text">
                <h4>Đã chọn <span>{selectedIds.length}</span> bình luận</h4>
                <p>Các thao tác sẽ áp dụng cho toàn bộ bình luận đã chọn.</p>
              </div>
            </div>
            <div className="cm-bulk-actions">
              <button className="cm-bulk-delete-btn" onClick={openBulkDeleteModal}>
                <i className="bi bi-trash"></i> Xóa
              </button>
              <button className="cm-bulk-cancel-btn" onClick={() => setSelectedIds([])}>
                <i className="bi bi-x-lg"></i> Bỏ chọn
              </button>
            </div>
          </div>
        )}

        {/* ================= TOOLBAR ================= */}
        <div className="cm-toolbar">
          <input type="text" placeholder="🔍 Tìm kiếm..." value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          <select value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="">Tất cả sản phẩm</option>
            {products.map((item) => (<option key={item.id} value={item.id}>{item.name}</option>))}
          </select>
          <select value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">Tất cả người dùng</option>
            {users.map((item) => (<option key={item.id} value={item.id}>{item.full_name}</option>))}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">Tất cả</option>
            <option value="1">Đã duyệt</option>
            <option value="0">Chưa duyệt</option>
          </select>
        </div>

        {/* ================= TABLE ================= */}
        <div className="cm-table-wrapper">
          <table className="cm-table">
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>
                  <input type="checkbox" checked={comments.length > 0 && selectedIds.length === comments.length} onChange={handleSelectAll} />
                </th>
                <th>ID</th>
                <th>Người dùng</th>
                <th>Sản phẩm</th>
                <th style={{ minWidth: '200px' }}>Nội dung</th>
                <th style={{ width: '130px' }}>Đánh giá</th>
                <th style={{ width: '120px' }}>Trạng thái</th>
                <th style={{ width: '110px' }}>Ngày</th>
                <th style={{ width: '60px', textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9" className="cm-empty">Đang tải...</td></tr>
              ) : comments.length === 0 ? (
                <tr><td colSpan="9" className="cm-empty">Không có dữ liệu.</td></tr>
              ) : (
                comments.map((item) => (
                  <tr key={item.id}>
                    <td style={{ textAlign: 'center' }}>
                      <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => handleSelect(item.id)} />
                    </td>
                    <td>#{item.id}</td>
                    <td><strong>{item.full_name}</strong></td>
                    <td>{item.product_name}</td>
                    <td><div className="cm-content">{item.content}</div></td>
                    <td>
                      <div className="cm-rating">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <i key={star} className={star <= item.rating ? "bi bi-star-fill active" : "bi bi-star"}></i>
                        ))}
                      </div>
                    </td>
                    <td>
                      {item.is_approved ? (
                        <span className="cm-badge-approved">Đã duyệt</span>
                      ) : (
                        <span className="cm-badge-pending">Chờ duyệt</span>
                      )}
                    </td>
                    <td>{new Date(item.created_at).toLocaleDateString("vi-VN")}</td>

                    {/* 👇 CỘT THAO TÁC 3 CHẤM (Giống Post) */}
                    <td style={{ textAlign: 'center' }}>
                      <div className="cm-action-dropdown">
                        <button className="cm-action-trigger" onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}>
                          <i className="bi bi-three-dots-vertical"></i>
                        </button>
                        
                        {openMenuId === item.id && (
                          <div className="cm-action-menu">
                            <button className="cm-action-item" onClick={() => handleView(item.id)}>
                              <i className="bi bi-eye"></i> Chi tiết
                            </button>
                            {item.is_approved === 0 ? (
                              <button className="cm-action-item success-item" onClick={() => handleApprove(item.id)}>
                                <i className="bi bi-check-circle"></i> Duyệt
                              </button>
                            ) : (
                              <button className="cm-action-item warning-item" onClick={() => handleReject(item.id)}>
                                <i className="bi bi-x-circle"></i> Từ chối
                              </button>
                            )}
                            <button className="cm-action-item delete-item" onClick={() => openDeleteModal(item.id)}>
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

        {/* ================= PAGINATION (ĐÃ SỬA ĐIỀU KIỆN HIỂN THỊ) ================= */}
        {/* 👇 Đã đổi từ `totalPages > 1` thành `pagination.total > 0` để luôn hiện */}
        {pagination.total > 0 && (
          <div className="cm-pagination-box">
            <div className="cm-pagination-info">
              Hiển thị {startResult} - {endResult} / {pagination.total} bình luận
            </div>
            <div className="cm-pagination-controls">
              <button className="cm-page-btn" disabled={page === 1} onClick={() => setPage(1)}>«</button>
              <button className="cm-page-btn" disabled={page === 1} onClick={() => setPage(page - 1)}>‹</button>
              {getPageNumbers().map((p) => (
                <button key={p} className={`cm-page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
              ))}
              <button className="cm-page-btn" disabled={page === totalPages} onClick={() => setPage(page + 1)}>›</button>
              <button className="cm-page-btn" disabled={page === totalPages} onClick={() => setPage(totalPages)}>»</button>
            </div>
          </div>
        )}
      </div>

      {/* ================= DETAIL MODAL (Đã cập nhật UI) ================= */}
      {showModal && detail && (
        <div className="cm-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="cm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cm-modal-header">
              <h2>Chi tiết bình luận</h2>
              <button className="cm-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="cm-modal-body">
              <div className="cm-detail-row"><strong>ID:</strong><span>#{detail.id}</span></div>
              <div className="cm-detail-row"><strong>Người dùng:</strong><span>{detail.full_name}</span></div>
              <div className="cm-detail-row"><strong>Email:</strong><span>{detail.email}</span></div>
              <div className="cm-detail-row"><strong>Sản phẩm:</strong><span>{detail.product_name}</span></div>
              <div className="cm-detail-row">
                <strong>Đánh giá:</strong>
                <span className="cm-rating">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <i key={star} className={star <= detail.rating ? "bi bi-star-fill active" : "bi bi-star"}></i>
                  ))}
                </span>
              </div>
              <div className="cm-detail-row"><strong>Ngày tạo:</strong><span>{new Date(detail.created_at).toLocaleString("vi-VN")}</span></div>
              <div className="cm-detail-row">
                <strong>Trạng thái:</strong>
                {detail.is_approved ? (
                  <span className="cm-badge-approved">Đã duyệt</span>
                ) : (
                  <span className="cm-badge-pending">Chưa duyệt</span>
                )}
              </div>
              <div className="cm-detail-content">
                <strong>Nội dung bình luận</strong>
                <div className="cm-content-box">{detail.content}</div>
              </div>
            </div>
            <div className="cm-modal-footer">
              <button className="cm-btn-secondary" onClick={() => setShowModal(false)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default Comments;