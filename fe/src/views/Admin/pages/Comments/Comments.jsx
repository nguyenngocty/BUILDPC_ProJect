import { useEffect, useState } from "react";
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
  // SELECT
  // ==========================
  const [selectedIds, setSelectedIds] = useState([]);

  // ==========================
  // DETAIL MODAL
  // ==========================
  const [showModal, setShowModal] = useState(false);
  const [detail, setDetail] = useState(null);

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

      setPagination(
        res.data.pagination || {
          page: 1,
          totalPages: 1,
          total: 0,
        },
      );

      setSelectedIds([]);
    } catch (err) {
      console.error(err);
      alert("Không tải được bình luận.");
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

      setStatistics(
        res.data.data || {
          total: 0,
          approved: 0,
          pending: 0,
        },
      );
    } catch (err) {
      console.error(err);
    }
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
    } catch (err) {
      console.error(err);
    }
  };

  // ==========================
  // INIT
  // ==========================
  useEffect(() => {
    loadComments();
  }, [page]);

  useEffect(() => {
    loadStatistics();
    loadFilters();
  }, []);

  // ==========================
  // APPROVE
  // ==========================
  const handleApprove = async (id) => {
    try {
      await approveComment(id);

      loadComments();
      loadStatistics();

      alert("Đã duyệt bình luận.");
    } catch (err) {
      console.error(err);
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

      alert("Đã từ chối bình luận.");
    } catch (err) {
      console.error(err);
    }
  };

  // ==========================
  // DELETE
  // ==========================
  const handleDelete = async (id) => {
    if (!window.confirm("Bạn chắc chắn muốn xóa?")) return;

    try {
      await deleteComment(id);

      loadComments();
      loadStatistics();

      alert("Đã xóa bình luận.");
    } catch (err) {
      console.error(err);
    }
  };

  // ==========================
  // DELETE MANY
  // ==========================
  const handleDeleteMany = async () => {
    if (selectedIds.length === 0) {
      return alert("Hãy chọn bình luận.");
    }

    if (!window.confirm(`Xóa ${selectedIds.length} bình luận?`)) return;

    try {
      await deleteManyComments(selectedIds);

      loadComments();
      loadStatistics();

      alert("Đã xóa thành công.");
    } catch (err) {
      console.error(err);
    }
  };

  // ==========================
  // DETAIL
  // ==========================
  const handleView = async (id) => {
    try {
      const res = await getCommentById(id);

      setDetail(res.data.data);

      setShowModal(true);
    } catch (err) {
      console.error(err);
    }
  };

  // ==========================
  // CHECKBOX
  // ==========================
  const handleSelect = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((x) => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === comments.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(comments.map((item) => item.id));
    }
  };

  return (
    <section className="cm-page">
      {/* ================= HEADER ================= */}

      <div className="cm-header">
        <div className="cm-title">
          <p className="cm-eyebrow">QUẢN LÝ CỬA HÀNG</p>

          <h1>Quản lý đánh giá sản phẩm</h1>

          <p className="cm-desc">
            Quản lý, duyệt và kiểm soát bình luận của khách hàng.
          </p>
        </div>
      </div>

      {/* ================= STATISTICS ================= */}

      <div className="cm-stat-grid">
        <div className="cm-stat-card">
          <h3>Tổng bình luận</h3>

          <span>{statistics.total}</span>
        </div>

        <div className="cm-stat-card success">
          <h3>Đã duyệt</h3>

          <span>{statistics.approved}</span>
        </div>

        <div className="cm-stat-card warning">
          <h3>Chờ duyệt</h3>

          <span>{statistics.pending}</span>
        </div>
      </div>

      {/* ================= PANEL ================= */}

      <div className="cm-panel">
        {/* ================= TOOLBAR ================= */}

        <div className="cm-toolbar">
          <input
            type="text"
            placeholder="🔍 Tìm kiếm..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />

          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
          >
            <option value="">Tất cả sản phẩm</option>

            {products.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>

          <select value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">Tất cả người dùng</option>

            {users.map((item) => (
              <option key={item.id} value={item.id}>
                {item.full_name}
              </option>
            ))}
          </select>

          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">Tất cả</option>

            <option value="1">Đã duyệt</option>

            <option value="0">Chưa duyệt</option>
          </select>

          <button
            className="cm-btn-search"
            onClick={() => {
              setPage(1);
              loadComments();
            }}
          >
            Tìm kiếm
          </button>

          <button className="cm-btn-danger" onClick={handleDeleteMany}>
            Xóa đã chọn
          </button>
        </div>

        {/* ================= TABLE ================= */}

        <div className="cm-table-wrapper">
          <table className="cm-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={
                      comments.length > 0 &&
                      selectedIds.length === comments.length
                    }
                    onChange={handleSelectAll}
                  />
                </th>

                <th>ID</th>

                <th>Người dùng</th>

                <th>Sản phẩm</th>

                <th>Nội dung</th>

                <th>Đánh giá</th>

                <th>Trạng thái</th>

                <th>Ngày</th>

                <th>Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className="cm-empty">
                    Đang tải...
                  </td>
                </tr>
              ) : comments.length === 0 ? (
                <tr>
                  <td colSpan="9" className="cm-empty">
                    Không có dữ liệu.
                  </td>
                </tr>
              ) : (
                comments.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        onChange={() => handleSelect(item.id)}
                      />
                    </td>

                    <td>#{item.id}</td>

                    <td>
                      <strong>{item.full_name}</strong>
                    </td>

                    <td>{item.product_name}</td>

                    <td>
                      <div className="cm-content">{item.content}</div>
                    </td>

                    <td>
                      <div className="cm-rating">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <i
                            key={star}
                            className={
                              star <= item.rating
                                ? "bi bi-star-fill active"
                                : "bi bi-star"
                            }
                          ></i>
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
                    <td>
                      {new Date(item.created_at).toLocaleDateString("vi-VN")}
                    </td>

                    <td>
                      <div className="cm-actions">
                        <button
                          className="cm-btn-info"
                          onClick={() => handleView(item.id)}
                        >
                          Chi tiết
                        </button>

                        {item.is_approved === 0 ? (
                          <button
                            className="cm-btn-success"
                            onClick={() => handleApprove(item.id)}
                          >
                            Duyệt
                          </button>
                        ) : (
                          <button
                            className="cm-btn-warning"
                            onClick={() => handleReject(item.id)}
                          >
                            Từ chối
                          </button>
                        )}

                        <button
                          className="cm-btn-danger"
                          onClick={() => handleDelete(item.id)}
                        >
                          XÓA
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* ================= PAGINATION ================= */}

        {pagination.totalPages > 1 && (
          <div className="cm-pagination">
            <button disabled={page === 1} onClick={() => setPage(page - 1)}>
              ← Trước
            </button>

            <span>
              Trang {pagination.page} / {pagination.totalPages}
            </span>

            <button
              disabled={page === pagination.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Sau →
            </button>
          </div>
        )}
      </div>

      {/* ================= DETAIL MODAL ================= */}

      {showModal && detail && (
        <div className="cm-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="cm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cm-modal-header">
              <h2>Chi tiết bình luận</h2>

              <button className="cm-close" onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>

            <div className="cm-modal-body">
              <div className="cm-detail-row">
                <strong>ID:</strong>
                <span>#{detail.id}</span>
              </div>

              <div className="cm-detail-row">
                <strong>Người dùng:</strong>
                <span>{detail.full_name}</span>
              </div>

              <div className="cm-detail-row">
                <strong>Email:</strong>
                <span>{detail.email}</span>
              </div>

              <div className="cm-detail-row">
                <strong>Sản phẩm:</strong>
                <span>{detail.product_name}</span>
              </div>
              <div className="cm-detail-row">
                <strong>Đánh giá:</strong>

                <span className="cm-rating">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <i
                      key={star}
                      className={
                        star <= detail.rating
                          ? "bi bi-star-fill active"
                          : "bi bi-star"
                      }
                    ></i>
                  ))}
                </span>
              </div>

              <div className="cm-detail-row">
                <strong>Ngày tạo:</strong>
                <span>
                  {new Date(detail.created_at).toLocaleString("vi-VN")}
                </span>
              </div>

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
              <button
                className="cm-btn-secondary"
                onClick={() => setShowModal(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default Comments;
