import { useEffect, useMemo, useState } from "react";
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
  // =====================================================
  // DATA
  // =====================================================

  const [comments, setComments] = useState([]);

  const [statistics, setStatistics] = useState({
    total: 0,
    approved: 0,
    pending: 0,
  });

  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);

  // =====================================================
  // FILTER
  // =====================================================

  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("all");
  const [productId, setProductId] = useState("");
  const [userId, setUserId] = useState("");

  // =====================================================
  // PAGINATION
  // =====================================================

  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  });

  // =====================================================
  // SELECT
  // =====================================================

  const [selectedIds, setSelectedIds] = useState([]);

  // =====================================================
  // ACTION MENU
  // =====================================================

  const [openMenuId, setOpenMenuId] = useState(null);

  // =====================================================
  // DETAIL MODAL
  // =====================================================

  const [showModal, setShowModal] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // =====================================================
  // DELETE MODAL
  // =====================================================

  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    type: null,
    id: null,
  });

  const [deleteLoading, setDeleteLoading] = useState(false);

  // =====================================================
  // LOADING
  // =====================================================

  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // =====================================================
  // LOAD COMMENTS
  // =====================================================

  const loadComments = async () => {
    try {
      setLoading(true);

      const params = {
        page,
        limit,
      };

      if (keyword.trim()) {
        params.keyword = keyword.trim();
      }

      if (status !== "all") {
        params.status = status;
      }

      if (productId) {
        params.product_id = productId;
      }

      if (userId) {
        params.user_id = userId;
      }

      const res = await getComments(params);

      const rows = res?.data?.data || [];

      const paging = res?.data?.pagination || {
        page: 1,
        totalPages: 1,
        total: 0,
      };

      setComments(Array.isArray(rows) ? rows : []);

      setPagination({
        page: Number(paging.page) || page,
        totalPages: Number(paging.totalPages) || 1,
        total: Number(paging.total) || 0,
      });

      setSelectedIds([]);
      setOpenMenuId(null);
    } catch (err) {
      console.error(err);

      toast.error(
        err?.response?.data?.message || "Không tải được danh sách bình luận.",
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // STATISTICS
  // =====================================================

  const loadStatistics = async () => {
    try {
      const res = await getCommentStatistics();

      setStatistics(
        res?.data?.data || {
          total: 0,
          approved: 0,
          pending: 0,
        },
      );
    } catch (err) {
      console.error(err);
    }
  };

  // =====================================================
  // FILTER DATA
  // =====================================================

  const loadFilters = async () => {
    try {
      const [productResponse, userResponse] = await Promise.all([
        getProducts(),
        getUsers(),
      ]);

      setProducts(productResponse?.data?.data || []);
      setUsers(userResponse?.data?.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  // =====================================================
  // INIT
  // =====================================================

  useEffect(() => {
    loadFilters();
    loadStatistics();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =====================================================
  // RESET PAGE WHEN FILTER CHANGES
  // =====================================================

  useEffect(() => {
    setPage(1);
  }, [keyword, status, productId, userId]);

  // =====================================================
  // LOAD LIST
  // =====================================================

  useEffect(() => {
    loadComments();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, keyword, status, productId, userId]);

  // =====================================================
  // CLOSE ACTION MENU WHEN CLICK OUTSIDE
  // =====================================================

  useEffect(() => {
    const handleDocumentClick = () => {
      setOpenMenuId(null);
    };

    document.addEventListener("click", handleDocumentClick);

    return () => {
      document.removeEventListener("click", handleDocumentClick);
    };
  }, []);

  // =====================================================
  // APPROVE
  // =====================================================

  const handleApprove = async (id) => {
    try {
      setActionLoadingId(id);
      setOpenMenuId(null);

      await approveComment(id);

      toast.success("Đã duyệt bình luận.");

      await Promise.all([loadComments(), loadStatistics()]);
    } catch (err) {
      console.error(err);

      toast.error(err?.response?.data?.message || "Không thể duyệt bình luận.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // =====================================================
  // REJECT
  // =====================================================

  const handleReject = async (id) => {
    try {
      setActionLoadingId(id);
      setOpenMenuId(null);

      await rejectComment(id);

      toast.success("Đã chuyển bình luận về trạng thái chờ duyệt.");

      await Promise.all([loadComments(), loadStatistics()]);
    } catch (err) {
      console.error(err);

      toast.error(
        err?.response?.data?.message || "Không thể từ chối bình luận.",
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  // =====================================================
  // OPEN DELETE
  // =====================================================

  const openDeleteModal = (id) => {
    setOpenMenuId(null);

    setDeleteModal({
      isOpen: true,
      type: "single",
      id,
    });
  };

  const openBulkDeleteModal = () => {
    if (selectedIds.length === 0) {
      toast.error("Vui lòng chọn ít nhất một bình luận.");

      return;
    }

    setDeleteModal({
      isOpen: true,
      type: "bulk",
      id: null,
    });
  };

  // =====================================================
  // CLOSE DELETE
  // =====================================================

  const closeDeleteModal = () => {
    if (deleteLoading) {
      return;
    }

    setDeleteModal({
      isOpen: false,
      type: null,
      id: null,
    });
  };

  // =====================================================
  // DELETE
  // =====================================================

  const handleConfirmDelete = async () => {
    const { type, id } = deleteModal;

    try {
      setDeleteLoading(true);

      if (type === "single") {
        await deleteComment(id);

        toast.success("Đã xóa bình luận.");
      } else {
        await deleteManyComments(selectedIds);

        toast.success(`Đã xóa ${selectedIds.length} bình luận.`);
      }

      setDeleteModal({
        isOpen: false,
        type: null,
        id: null,
      });

      setSelectedIds([]);

      await Promise.all([loadComments(), loadStatistics()]);
    } catch (err) {
      console.error(err);

      toast.error(err?.response?.data?.message || "Không thể xóa bình luận.");
    } finally {
      setDeleteLoading(false);
    }
  };

  // =====================================================
  // VIEW DETAIL
  // =====================================================

  const handleView = async (id) => {
    try {
      setDetailLoading(true);
      setOpenMenuId(null);

      const res = await getCommentById(id);

      setDetail(res?.data?.data || null);
      setShowModal(true);
    } catch (err) {
      console.error(err);

      toast.error("Không thể tải chi tiết bình luận.");
    } finally {
      setDetailLoading(false);
    }
  };

  // =====================================================
  // CHECKBOX
  // =====================================================

  const handleSelect = (id) => {
    setSelectedIds((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id],
    );
  };

  const handleSelectAll = () => {
    if (comments.length > 0 && selectedIds.length === comments.length) {
      setSelectedIds([]);

      return;
    }

    setSelectedIds(comments.map((item) => item.id));
  };

  // =====================================================
  // RESET FILTER
  // =====================================================

  const handleResetFilter = () => {
    setKeyword("");
    setStatus("all");
    setProductId("");
    setUserId("");
    setPage(1);
  };

  // =====================================================
  // PAGINATION
  // =====================================================

  const totalPages = Number(pagination.totalPages) || 1;

  const startResult = pagination.total === 0 ? 0 : (page - 1) * limit + 1;

  const endResult = Math.min(page * limit, pagination.total);

  const getPageNumbers = () => {
    const pages = [];

    const maxVisible = 5;

    let startPage = Math.max(1, page - 2);

    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let pageNumber = startPage; pageNumber <= endPage; pageNumber += 1) {
      pages.push(pageNumber);
    }

    return pages;
  };

  // =====================================================
  // EXTRA STATS
  // =====================================================

  const approvalRate = useMemo(() => {
    if (!statistics.total) {
      return 0;
    }

    return Math.round(
      (Number(statistics.approved || 0) / Number(statistics.total || 1)) * 100,
    );
  }, [statistics]);

  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDate = (value) => {
    if (!value) {
      return "--";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString("vi-VN");
  };

  const formatDateTime = (value) => {
    if (!value) {
      return "--";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString("vi-VN");
  };

  // =====================================================
  // RENDER STARS
  // =====================================================

  const renderRating = (rating) => {
    const safeRating = Number(rating || 0);

    return (
      <div className="cm-rating" title={`${safeRating}/5 sao`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <i
            key={star}
            className={
              star <= safeRating
                ? "bi bi-star-fill cm-rating-active"
                : "bi bi-star cm-rating-empty"
            }
          />
        ))}
      </div>
    );
  };

  return (
    <div className="cm-admin-page">
      {/* =================================================
          DELETE CONFIRM
      ================================================= */}

      {deleteModal.isOpen && (
        <div className="cm-confirm-overlay" onMouseDown={closeDeleteModal}>
          <div
            className="cm-confirm-dialog"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="cm-confirm-icon">
              <i className="bi bi-trash3" />
            </div>

            <span className="cm-confirm-kicker">Xác nhận thao tác</span>

            <h2>
              {deleteModal.type === "bulk"
                ? "Xóa nhiều bình luận"
                : "Xóa bình luận"}
            </h2>

            <p>
              {deleteModal.type === "bulk"
                ? `Bạn có chắc muốn xóa ${selectedIds.length} bình luận đã chọn? Hành động này không thể hoàn tác.`
                : "Bạn có chắc muốn xóa bình luận này? Hành động này không thể hoàn tác."}
            </p>

            <div className="cm-confirm-actions">
              <button
                type="button"
                className="cm-button cm-button-light"
                onClick={closeDeleteModal}
                disabled={deleteLoading}
              >
                Hủy
              </button>

              <button
                type="button"
                className="cm-button cm-button-danger"
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <>
                    <span className="cm-spinner" />
                    Đang xóa...
                  </>
                ) : (
                  <>
                    <i className="bi bi-trash3" />
                    Xóa
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================
          HEADER
      ================================================= */}

      <section className="cm-page-heading">
        <div className="cm-heading-content">
          <span className="cm-heading-kicker">
            <i className="bi bi-chat-square-heart-fill" />
            Review Center
          </span>

          <h1>Quản lý đánh giá sản phẩm</h1>

          <p>
            Theo dõi phản hồi của khách hàng, kiểm duyệt nội dung, quản lý đánh
            giá và duy trì chất lượng cộng đồng trên hệ thống.
          </p>
        </div>

        <div className="cm-heading-summary">
          <div>
            <span>Tỷ lệ đã duyệt</span>

            <strong>{approvalRate}%</strong>
          </div>

          <div className="cm-heading-progress">
            <span
              style={{
                width: `${approvalRate}%`,
              }}
            />
          </div>
        </div>
      </section>

      {/* =================================================
          STATISTICS
      ================================================= */}

      <section className="cm-stat-grid">
        <article className="cm-stat-card cm-stat-total">
          <div className="cm-stat-icon">
            <i className="bi bi-chat-square-text-fill" />
          </div>

          <div className="cm-stat-content">
            <span className="cm-stat-label">Tổng bình luận</span>

            <strong>{statistics.total || 0}</strong>

            <small>Tất cả phản hồi khách hàng</small>
          </div>
        </article>

        <article className="cm-stat-card cm-stat-approved">
          <div className="cm-stat-icon">
            <i className="bi bi-shield-check" />
          </div>

          <div className="cm-stat-content">
            <span className="cm-stat-label">Đã duyệt</span>

            <strong>{statistics.approved || 0}</strong>

            <small>Đang hiển thị trên website</small>
          </div>
        </article>

        <article className="cm-stat-card cm-stat-pending">
          <div className="cm-stat-icon">
            <i className="bi bi-hourglass-split" />
          </div>

          <div className="cm-stat-content">
            <span className="cm-stat-label">Chờ duyệt</span>

            <strong>{statistics.pending || 0}</strong>

            <small>Cần quản trị viên kiểm tra</small>
          </div>
        </article>
      </section>

      {/* =================================================
          MAIN CARD
      ================================================= */}

      <section className="cm-list-card">
        {/* ===============================================
            CARD HEADER
        =============================================== */}

        <div className="cm-card-heading">
          <div className="cm-card-heading-main">
            <div className="cm-card-icon">
              <i className="bi bi-chat-left-dots-fill" />
            </div>

            <div>
              <span className="cm-card-kicker">Customer Feedback</span>

              <h2>Danh sách đánh giá</h2>

              <p>
                Kiểm duyệt nội dung, đánh giá sao và phản hồi của khách hàng.
              </p>
            </div>
          </div>

          <span className="cm-result-count">
            <i className="bi bi-database" />
            {pagination.total || 0} bình luận
          </span>
        </div>

        {/* ===============================================
            BULK BAR
        =============================================== */}

        {selectedIds.length > 0 && (
          <div className="cm-bulk-bar">
            <div className="cm-bulk-left">
              <div className="cm-bulk-icon">
                <i className="bi bi-check2-square" />
              </div>

              <div>
                <strong>
                  Đã chọn <span>{selectedIds.length}</span> bình luận
                </strong>

                <p>Thao tác sẽ áp dụng cho toàn bộ nội dung đã chọn.</p>
              </div>
            </div>

            <div className="cm-bulk-actions">
              <button
                type="button"
                className="cm-button cm-button-danger-soft"
                onClick={openBulkDeleteModal}
              >
                <i className="bi bi-trash3" />
                Xóa đã chọn
              </button>

              <button
                type="button"
                className="cm-button cm-button-light"
                onClick={() => setSelectedIds([])}
              >
                <i className="bi bi-x-lg" />
                Bỏ chọn
              </button>
            </div>
          </div>
        )}

        {/* ===============================================
            FILTER
        =============================================== */}

        <div className="cm-filter-panel">
          <label className="cm-search-field">
            <i className="bi bi-search" />

            <input
              type="search"
              placeholder="Tìm nội dung, người dùng..."
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />

            {keyword && (
              <button
                type="button"
                onClick={() => setKeyword("")}
                aria-label="Xóa tìm kiếm"
              >
                <i className="bi bi-x-lg" />
              </button>
            )}
          </label>

          <div className="cm-filter-select">
            <i className="bi bi-box-seam" />

            <select
              value={productId}
              onChange={(event) => setProductId(event.target.value)}
            >
              <option value="">Tất cả sản phẩm</option>

              {products.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div className="cm-filter-select">
            <i className="bi bi-person" />

            <select
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
            >
              <option value="">Tất cả người dùng</option>

              {users.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.full_name ||
                    item.name ||
                    item.email ||
                    `User #${item.id}`}
                </option>
              ))}
            </select>
          </div>

          <div className="cm-filter-select">
            <i className="bi bi-shield-check" />

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="all">Tất cả trạng thái</option>

              <option value="1">Đã duyệt</option>

              <option value="0">Chờ duyệt</option>
            </select>
          </div>

          <button
            type="button"
            className="cm-button cm-button-light cm-filter-reset"
            onClick={handleResetFilter}
          >
            <i className="bi bi-arrow-counterclockwise" />
            Làm mới
          </button>
        </div>

        {/* ===============================================
            TABLE
        =============================================== */}

        <div className="cm-table-shell">
          <div className="cm-table-scroll">
            <table className="cm-data-table">
              <thead>
                <tr>
                  <th className="cm-checkbox-column">
                    <label className="cm-checkbox">
                      <input
                        type="checkbox"
                        checked={
                          comments.length > 0 &&
                          selectedIds.length === comments.length
                        }
                        onChange={handleSelectAll}
                      />

                      <span />
                    </label>
                  </th>

                  <th>Mã</th>

                  <th>Người dùng</th>

                  <th>Sản phẩm</th>

                  <th>Nội dung</th>

                  <th>Đánh giá</th>

                  <th>Trạng thái</th>

                  <th>Ngày tạo</th>

                  <th className="cm-text-center">Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9" className="cm-table-state">
                      <div className="cm-loading-state">
                        <span className="cm-loader" />

                        <strong>Đang tải đánh giá</strong>

                        <p>Hệ thống đang đồng bộ phản hồi của khách hàng...</p>
                      </div>
                    </td>
                  </tr>
                ) : comments.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="cm-table-state">
                      <div className="cm-empty-state">
                        <div className="cm-empty-icon">
                          <i className="bi bi-chat-square-dots" />
                        </div>

                        <strong>Không tìm thấy bình luận</strong>

                        <p>Thử thay đổi từ khóa hoặc bộ lọc.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  comments.map((item) => (
                    <tr
                      key={item.id}
                      className={
                        selectedIds.includes(item.id) ? "cm-row-selected" : ""
                      }
                    >
                      {/* CHECKBOX */}

                      <td className="cm-checkbox-column">
                        <label className="cm-checkbox">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(item.id)}
                            onChange={() => handleSelect(item.id)}
                          />

                          <span />
                        </label>
                      </td>

                      {/* ID */}

                      <td>
                        <span className="cm-comment-id">#{item.id}</span>
                      </td>

                      {/* USER */}

                      <td>
                        <div className="cm-user-info">
                          <div className="cm-user-avatar">
                            {String(item.full_name || "U")
                              .trim()
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div>
                            <strong>{item.full_name || "Người dùng"}</strong>

                            {item.email && <span>{item.email}</span>}
                          </div>
                        </div>
                      </td>

                      {/* PRODUCT */}

                      <td>
                        <div className="cm-product-info">
                          <i className="bi bi-box-seam" />

                          <span title={item.product_name}>
                            {item.product_name || "Không xác định"}
                          </span>
                        </div>
                      </td>

                      {/* CONTENT */}

                      <td>
                        <div
                          className="cm-comment-content"
                          title={item.content}
                        >
                          {item.content || "--"}
                        </div>
                      </td>

                      {/* RATING */}

                      <td>{renderRating(item.rating)}</td>

                      {/* STATUS */}

                      <td>
                        {Number(item.is_approved) === 1 ? (
                          <span className="cm-status-badge cm-status-approved">
                            <span className="cm-status-dot" />
                            Đã duyệt
                          </span>
                        ) : (
                          <span className="cm-status-badge cm-status-pending">
                            <span className="cm-status-dot" />
                            Chờ duyệt
                          </span>
                        )}
                      </td>

                      {/* DATE */}

                      <td>
                        <div className="cm-date">
                          <i className="bi bi-calendar3" />

                          <span>{formatDate(item.created_at)}</span>
                        </div>
                      </td>

                      {/* ACTION */}

                      <td className="cm-text-center">
                        <div
                          className="cm-action"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <button
                            type="button"
                            className="cm-action-trigger"
                            onClick={() =>
                              setOpenMenuId(
                                openMenuId === item.id ? null : item.id,
                              )
                            }
                          >
                            {actionLoadingId === item.id ? (
                              <span className="cm-mini-spinner" />
                            ) : (
                              <i className="bi bi-three-dots-vertical" />
                            )}
                          </button>

                          {openMenuId === item.id && (
                            <div className="cm-action-menu">
                              <button
                                type="button"
                                className="cm-action-item"
                                onClick={() => handleView(item.id)}
                              >
                                <span className="cm-action-icon cm-action-icon-view">
                                  <i className="bi bi-eye" />
                                </span>

                                <span>Xem chi tiết</span>
                              </button>

                              {Number(item.is_approved) === 0 ? (
                                <button
                                  type="button"
                                  className="cm-action-item"
                                  onClick={() => handleApprove(item.id)}
                                >
                                  <span className="cm-action-icon cm-action-icon-approve">
                                    <i className="bi bi-check-circle" />
                                  </span>

                                  <span>Duyệt</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="cm-action-item"
                                  onClick={() => handleReject(item.id)}
                                >
                                  <span className="cm-action-icon cm-action-icon-reject">
                                    <i className="bi bi-x-circle" />
                                  </span>

                                  <span>Chuyển chờ duyệt</span>
                                </button>
                              )}

                              <button
                                type="button"
                                className="cm-action-item cm-action-delete"
                                onClick={() => openDeleteModal(item.id)}
                              >
                                <span className="cm-action-icon cm-action-icon-delete">
                                  <i className="bi bi-trash3" />
                                </span>

                                <span>Xóa bình luận</span>
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
        </div>

        {/* ===============================================
            PAGINATION
        =============================================== */}

        {pagination.total > 0 && (
          <div className="cm-table-footer">
            <div className="cm-pagination-info">
              Hiển thị <strong>{startResult}</strong> –{" "}
              <strong>{endResult}</strong> trong tổng{" "}
              <strong>{pagination.total}</strong> bình luận
            </div>

            <div className="cm-pagination-controls">
              <button
                type="button"
                className="cm-page-button"
                disabled={page === 1}
                onClick={() => setPage(1)}
                title="Trang đầu"
              >
                <i className="bi bi-chevron-double-left" />
              </button>

              <button
                type="button"
                className="cm-page-button"
                disabled={page === 1}
                onClick={() => setPage((previous) => Math.max(1, previous - 1))}
                title="Trang trước"
              >
                <i className="bi bi-chevron-left" />
              </button>

              {getPageNumbers().map((pageNumber) => (
                <button
                  key={pageNumber}
                  type="button"
                  className={
                    pageNumber === page
                      ? "cm-page-button active"
                      : "cm-page-button"
                  }
                  onClick={() => setPage(pageNumber)}
                >
                  {pageNumber}
                </button>
              ))}

              <button
                type="button"
                className="cm-page-button"
                disabled={page === totalPages}
                onClick={() =>
                  setPage((previous) => Math.min(totalPages, previous + 1))
                }
                title="Trang sau"
              >
                <i className="bi bi-chevron-right" />
              </button>

              <button
                type="button"
                className="cm-page-button"
                disabled={page === totalPages}
                onClick={() => setPage(totalPages)}
                title="Trang cuối"
              >
                <i className="bi bi-chevron-double-right" />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* =================================================
          DETAIL LOADING
      ================================================= */}

      {detailLoading && (
        <div className="cm-detail-loading">
          <span className="cm-loader" />
        </div>
      )}

      {/* =================================================
          DETAIL MODAL
      ================================================= */}

      {showModal && detail && (
        <div
          className="cm-modal-overlay"
          onMouseDown={() => setShowModal(false)}
        >
          <div
            className="cm-detail-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            {/* HEADER */}

            <div className="cm-modal-header">
              <div className="cm-modal-heading">
                <span className="cm-modal-kicker">Review #{detail.id}</span>

                <h2>Chi tiết đánh giá</h2>

                <p>Thông tin đầy đủ về nội dung phản hồi của khách hàng.</p>
              </div>

              <button
                type="button"
                className="cm-modal-close"
                onClick={() => setShowModal(false)}
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>

            {/* PROFILE */}

            <div className="cm-detail-profile">
              <div className="cm-detail-avatar">
                {String(detail.full_name || "U")
                  .trim()
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div className="cm-detail-profile-main">
                <strong>{detail.full_name || "Người dùng"}</strong>

                <span>{detail.email || "Không có email"}</span>

                {renderRating(detail.rating)}
              </div>

              <div>
                {Number(detail.is_approved) === 1 ? (
                  <span className="cm-status-badge cm-status-approved">
                    <span className="cm-status-dot" />
                    Đã duyệt
                  </span>
                ) : (
                  <span className="cm-status-badge cm-status-pending">
                    <span className="cm-status-dot" />
                    Chờ duyệt
                  </span>
                )}
              </div>
            </div>

            {/* INFO */}

            <div className="cm-detail-grid">
              <div className="cm-detail-card">
                <span>Mã bình luận</span>

                <strong>#{detail.id}</strong>
              </div>

              <div className="cm-detail-card">
                <span>Đánh giá</span>

                <strong>{Number(detail.rating || 0)}/5 sao</strong>
              </div>

              <div className="cm-detail-card cm-detail-card-wide">
                <span>Sản phẩm</span>

                <strong>{detail.product_name || "Không xác định"}</strong>
              </div>

              <div className="cm-detail-card">
                <span>Ngày tạo</span>

                <strong>{formatDateTime(detail.created_at)}</strong>
              </div>

              <div className="cm-detail-card">
                <span>Trạng thái</span>

                <strong>
                  {Number(detail.is_approved) === 1 ? "Đã duyệt" : "Chờ duyệt"}
                </strong>
              </div>
            </div>

            {/* CONTENT */}

            <div className="cm-detail-comment">
              <div className="cm-detail-comment-title">
                <i className="bi bi-chat-quote-fill" />

                <span>Nội dung bình luận</span>
              </div>

              <p>{detail.content || "Không có nội dung."}</p>
            </div>

            {/* FOOTER */}

            <div className="cm-modal-footer">
              <button
                type="button"
                className="cm-button cm-button-light"
                onClick={() => setShowModal(false)}
              >
                Đóng
              </button>

              {Number(detail.is_approved) === 0 ? (
                <button
                  type="button"
                  className="cm-button cm-button-success"
                  onClick={async () => {
                    await handleApprove(detail.id);

                    setShowModal(false);
                  }}
                >
                  <i className="bi bi-check-circle" />
                  Duyệt bình luận
                </button>
              ) : (
                <button
                  type="button"
                  className="cm-button cm-button-warning"
                  onClick={async () => {
                    await handleReject(detail.id);

                    setShowModal(false);
                  }}
                >
                  <i className="bi bi-arrow-counterclockwise" />
                  Chuyển chờ duyệt
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Comments;
