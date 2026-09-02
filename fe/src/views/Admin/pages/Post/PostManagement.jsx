import React, { useEffect, useState } from "react";

import { Link } from "react-router-dom";

import toast from "react-hot-toast";

import "./PostManagement.css";

import postService from "../../../../services/postService";
import postCategoryService from "../../../../services/postCategoryService";

// ============================================================
// IMAGE
// ============================================================

const IMAGE_BASE_URL =
  process.env.REACT_APP_API_URL?.replace(/\/api\/?$/, "") ||
  "http://localhost:5000";

const NO_IMAGE_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' rx='12' fill='%23f1f5f9'/%3E%3Cpath d='M22 24h36v32H22z' fill='%23e2e8f0'/%3E%3Ccircle cx='32' cy='34' r='5' fill='%2394a3b8'/%3E%3Cpath d='M26 50l9-9 7 7 5-5 7 7H26z' fill='%2394a3b8'/%3E%3C/svg%3E";

function getImageUrl(image) {
  if (!image) {
    return NO_IMAGE_SVG;
  }

  if (
    image.startsWith("http://") ||
    image.startsWith("https://") ||
    image.startsWith("data:")
  ) {
    return image;
  }

  return `${IMAGE_BASE_URL}${image.startsWith("/") ? image : `/${image}`}`;
}

function PostManagement() {
  const [posts, setPosts] = useState([]);

  const [loading, setLoading] = useState(true);

  const [keyword, setKeyword] = useState("");

  const [postCategoryId, setPostCategoryId] = useState("");

  const [status, setStatus] = useState("");

  const [featured, setFeatured] = useState("");

  const [categoryList, setCategoryList] = useState([]);

  const [page, setPage] = useState(1);

  const [limit, setLimit] = useState(10);

  const [total, setTotal] = useState(0);

  const [openMenuId, setOpenMenuId] = useState(null);

  const [actionLoadingId, setActionLoadingId] = useState(null);

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    postId: null,
    postTitle: "",
  });

  // ============================================================
  // LOAD POST CATEGORIES
  // ============================================================

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await postCategoryService.getActiveCategories();

        setCategoryList(response?.data?.data || []);
      } catch (error) {
        console.error("Lỗi tải danh mục bài viết:", error);

        toast.error("Không tải được danh mục bài viết.");
      }
    };

    fetchCategories();
  }, []);

  // ============================================================
  // LOAD POSTS
  // ============================================================

  const fetchPosts = async () => {
    try {
      setLoading(true);

      const response = await postService.getPosts({
        keyword,

        post_category_id: postCategoryId,

        status,

        is_featured: featured,

        sortBy: "created_at",

        order: "DESC",

        page,
        limit,
      });

      const payload = response?.data || {};

      setPosts(Array.isArray(payload.data) ? payload.data : []);

      setTotal(Number(payload.total ?? payload.pagination?.total ?? 0));

      setOpenMenuId(null);
    } catch (error) {
      console.error(error);

      toast.error(
        error?.response?.data?.message || "Không tải được danh sách bài viết.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [keyword, postCategoryId, status, featured]);

  useEffect(() => {
    fetchPosts();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword, postCategoryId, status, featured, page, limit]);

  // ============================================================
  // DELETE
  // ============================================================

  const handleOpenDeleteConfirm = (post) => {
    setOpenMenuId(null);

    setConfirmModal({
      isOpen: true,
      postId: post.id,
      postTitle: post.title || "",
    });
  };

  const handleCloseDeleteConfirm = () => {
    setConfirmModal({
      isOpen: false,
      postId: null,
      postTitle: "",
    });
  };

  const handleConfirmDelete = async () => {
    const id = confirmModal.postId;

    if (!id) {
      return;
    }

    try {
      setActionLoadingId(id);

      await postService.deletePost(id);

      toast.success("Đã đưa bài viết vào thùng rác.");

      handleCloseDeleteConfirm();

      /*
       * Nếu đang ở trang cuối và xóa item cuối,
       * quay về trang trước.
       */
      if (posts.length === 1 && page > 1) {
        setPage((current) => Math.max(1, current - 1));
      } else {
        await fetchPosts();
      }
    } catch (error) {
      console.error(error);

      toast.error(error?.response?.data?.message || "Không thể xóa bài viết.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // ============================================================
  // TOGGLE STATUS
  // ============================================================

  const handleToggleStatus = async (post) => {
    try {
      setActionLoadingId(post.id);

      setOpenMenuId(null);

      const response = await postService.toggleStatus(post.id);

      toast.success(response?.data?.message || "Đã cập nhật trạng thái.");

      await fetchPosts();
    } catch (error) {
      console.error(error);

      toast.error(
        error?.response?.data?.message || "Không thể thay đổi trạng thái.",
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  // ============================================================
  // TOGGLE FEATURED
  // ============================================================

  const handleToggleFeatured = async (post) => {
    try {
      setActionLoadingId(post.id);

      setOpenMenuId(null);

      const response = await postService.toggleFeatured(post.id);

      toast.success(response?.data?.message || "Đã cập nhật bài viết nổi bật.");

      await fetchPosts();
    } catch (error) {
      console.error(error);

      toast.error(
        error?.response?.data?.message ||
          "Không thể thay đổi trạng thái nổi bật.",
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  // ============================================================
  // FORMAT
  // ============================================================

  const formatDate = (date) => {
    if (!date) {
      return "--";
    }

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return "--";
    }

    return parsed.toLocaleDateString("vi-VN");
  };

  // ============================================================
  // PAGINATION
  // ============================================================

  const totalPages = Math.max(Math.ceil(total / limit), 1);

  const startResult = total === 0 ? 0 : (page - 1) * limit + 1;

  const endResult = Math.min(page * limit, total);

  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from(
        {
          length: totalPages,
        },
        (_, index) => index + 1,
      );
    }

    const pages = [1];

    if (page > 4) {
      pages.push("...");
    }

    const start = Math.max(2, page - 1);

    const end = Math.min(totalPages - 1, page + 1);

    for (let current = start; current <= end; current += 1) {
      pages.push(current);
    }

    if (page < totalPages - 3) {
      pages.push("...");
    }

    pages.push(totalPages);

    return pages;
  };

  return (
    <div className="post-admin-page">
      {/* =================================================
          DELETE CONFIRM
      ================================================= */}

      {confirmModal.isOpen && (
        <div
          className="post-confirm-overlay"
          onMouseDown={handleCloseDeleteConfirm}
        >
          <div
            className="post-confirm-dialog"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="post-confirm-icon">
              <i className="bi bi-trash3" />
            </div>

            <span className="post-confirm-kicker">Xác nhận thao tác</span>

            <h2>Xóa bài viết</h2>

            <p>
              Bài viết <strong>{confirmModal.postTitle}</strong> sẽ được đưa vào
              thùng rác. Bạn có chắc chắn muốn tiếp tục?
            </p>

            <div className="post-confirm-actions">
              <button
                type="button"
                className="post-button post-button-neutral"
                onClick={handleCloseDeleteConfirm}
                disabled={actionLoadingId === confirmModal.postId}
              >
                Hủy
              </button>

              <button
                type="button"
                className="post-button post-button-danger"
                onClick={handleConfirmDelete}
                disabled={actionLoadingId === confirmModal.postId}
              >
                <i className="bi bi-trash3" />

                {actionLoadingId === confirmModal.postId
                  ? "Đang xóa..."
                  : "Xóa bài viết"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================
          HEADER
      ================================================= */}

      <section className="post-page-heading">
        <div className="post-heading-content">
          <span className="post-heading-kicker">
            <i className="bi bi-grid-1x2-fill" />
            Content Center
          </span>

          <h1>Quản lý bài viết</h1>

          <p>
            Quản lý tin tức, hướng dẫn Build PC, nội dung SEO và các bài viết
            trên website.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <Link to="/admin/post-categories" className="post-create-button">
            <i className="bi bi-folder2-open" />
            <span>Danh mục bài viết</span>
          </Link>

          <Link to="/admin/posts/create" className="post-create-button">
            <i className="bi bi-plus-lg" />
            <span>Tạo bài viết mới</span>
          </Link>
        </div>
      </section>

      {/* =================================================
          STATS
      ================================================= */}

      <section className="post-overview-grid">
        <article className="post-overview-card post-overview-card-primary">
          <div className="post-overview-icon">
            <i className="bi bi-journal-richtext" />
          </div>

          <div>
            <span>Tổng bài viết</span>

            <strong>{total}</strong>

            <small>Nội dung trong hệ thống</small>
          </div>
        </article>

        <article className="post-overview-card post-overview-card-green">
          <div className="post-overview-icon">
            <i className="bi bi-broadcast-pin" />
          </div>

          <div>
            <span>Trang hiện tại</span>

            <strong>{page}</strong>

            <small>Tổng {totalPages} trang dữ liệu</small>
          </div>
        </article>

        <article className="post-overview-card post-overview-card-blue">
          <div className="post-overview-icon">
            <i className="bi bi-list-ul" />
          </div>

          <div>
            <span>Hiển thị</span>

            <strong>{posts.length}</strong>

            <small>{limit} bài viết mỗi trang</small>
          </div>
        </article>

        <article className="post-overview-card post-overview-card-yellow">
          <div className="post-overview-icon">
            <i className="bi bi-stars" />
          </div>

          <div>
            <span>Nổi bật</span>

            <strong>
              {posts.filter((post) => Number(post.is_featured) === 1).length}
            </strong>

            <small>Trong trang hiện tại</small>
          </div>
        </article>
      </section>

      {/* =================================================
          CONTENT
      ================================================= */}

      <section className="post-content-card">
        <div className="post-content-header">
          <div>
            <span className="post-section-kicker">Danh sách nội dung</span>

            <h2>Bài viết</h2>

            <p>Tìm kiếm, lọc và quản lý toàn bộ bài viết trên website.</p>
          </div>

          <div className="post-result-chip">
            <i className="bi bi-file-earmark-text" />

            <span>{total} bài viết</span>
          </div>
        </div>

        {/* =================================================
            FILTER
        ================================================= */}

        <div className="post-filter-panel">
          <label className="post-search-field">
            <i className="bi bi-search" />

            <input
              type="search"
              placeholder="Tìm theo tiêu đề bài viết..."
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />

            {keyword && (
              <button
                type="button"
                onClick={() => setKeyword("")}
                aria-label="Xóa từ khóa"
              >
                <i className="bi bi-x-lg" />
              </button>
            )}
          </label>

          <div className="post-filter-select-wrap">
            <i className="bi bi-folder2-open" />

            <select
              value={postCategoryId}
              onChange={(event) => setPostCategoryId(event.target.value)}
            >
              <option value="">Tất cả danh mục bài viết</option>

              {categoryList.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="post-filter-select-wrap">
            <i className="bi bi-toggle2-on" />

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="">Tất cả trạng thái</option>

              <option value="1">Đã xuất bản</option>

              <option value="0">Bản nháp</option>
            </select>
          </div>

          <div className="post-filter-select-wrap">
            <i className="bi bi-star" />

            <select
              value={featured}
              onChange={(event) => setFeatured(event.target.value)}
            >
              <option value="">Tất cả bài viết</option>

              <option value="1">Nổi bật</option>

              <option value="0">Không nổi bật</option>
            </select>
          </div>

          <div className="post-filter-select-wrap post-limit-select">
            <i className="bi bi-layout-text-window" />

            <select
              value={limit}
              onChange={(event) => {
                setLimit(Number(event.target.value));

                setPage(1);
              }}
            >
              <option value={5}>5 / trang</option>

              <option value={10}>10 / trang</option>

              <option value={20}>20 / trang</option>
            </select>
          </div>
        </div>

        {/* =================================================
            TABLE
        ================================================= */}

        <div className="post-table-shell">
          <div className="post-table-scroll">
            <table className="post-data-table">
              <thead>
                <tr>
                  <th className="post-column-content">Bài viết</th>

                  <th>Tác giả</th>

                  <th>Danh mục</th>

                  <th>Ngày đăng</th>

                  <th className="post-text-center">Lượt xem</th>

                  <th className="post-text-center">Nổi bật</th>

                  <th className="post-text-center">Trạng thái</th>

                  <th className="post-text-center">Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="post-table-state">
                      <div className="post-loading-state">
                        <span className="post-loader" />

                        <strong>Đang tải dữ liệu</strong>

                        <p>Hệ thống đang đồng bộ danh sách bài viết...</p>
                      </div>
                    </td>
                  </tr>
                ) : posts.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="post-table-state">
                      <div className="post-empty-state">
                        <div className="post-empty-icon">
                          <i className="bi bi-file-earmark-richtext" />
                        </div>

                        <strong>Không tìm thấy bài viết</strong>

                        <p>
                          Hãy thử thay đổi từ khóa hoặc bộ lọc đang sử dụng.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  posts.map((post) => (
                    <tr key={post.id}>
                      <td>
                        <div className="post-identity">
                          <img
                            src={getImageUrl(post.thumbnail)}
                            alt={post.title || "Bài viết"}
                            className="post-list-thumbnail"
                            onError={(event) => {
                              event.currentTarget.onerror = null;

                              event.currentTarget.src = NO_IMAGE_SVG;
                            }}
                          />

                          <div className="post-identity-content">
                            <strong title={post.title}>{post.title}</strong>

                            <span title={post.slug}>
                              <i className="bi bi-link-45deg" />

                              {post.slug}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="post-author">
                          <i className="bi bi-person-circle" />

                          {post.author || post.author_name || "Không rõ"}
                        </span>
                      </td>

                      <td>
                        <span className="post-category-pill">
                          {post.post_category_name ||
                            post.category_name ||
                            "Chưa phân loại"}
                        </span>
                      </td>

                      <td>
                        <span className="post-date">
                          {formatDate(post.created_at)}
                        </span>
                      </td>

                      <td className="post-text-center">
                        <span className="post-view-count">
                          <i className="bi bi-eye" />

                          {Number(post.views || 0)}
                        </span>
                      </td>

                      <td className="post-text-center">
                        {Number(post.is_featured) === 1 ? (
                          <span className="post-featured-pill">
                            <i className="bi bi-star-fill" />
                            Nổi bật
                          </span>
                        ) : (
                          <span className="post-no-featured">—</span>
                        )}
                      </td>

                      <td className="post-text-center">
                        <span
                          className={
                            Number(post.status) === 1
                              ? "post-status-pill post-status-published"
                              : "post-status-pill post-status-draft"
                          }
                        >
                          <span className="post-status-dot" />

                          {Number(post.status) === 1
                            ? "Đã xuất bản"
                            : "Bản nháp"}
                        </span>
                      </td>

                      <td className="post-text-center">
                        <div className="post-row-action">
                          <button
                            type="button"
                            className="post-action-trigger"
                            disabled={actionLoadingId === post.id}
                            onClick={() =>
                              setOpenMenuId(
                                openMenuId === post.id ? null : post.id,
                              )
                            }
                            aria-label="Mở menu thao tác"
                          >
                            {actionLoadingId === post.id ? (
                              <span className="post-loader" />
                            ) : (
                              <i className="bi bi-three-dots-vertical" />
                            )}
                          </button>

                          {openMenuId === post.id && (
                            <div className="post-action-menu">
                              <Link
                                to={`/admin/posts/edit/${post.id}`}
                                className="post-action-menu-item"
                              >
                                <span className="post-action-menu-icon post-action-menu-icon-edit">
                                  <i className="bi bi-pencil-square" />
                                </span>

                                <span>Chỉnh sửa</span>
                              </Link>

                              <button
                                type="button"
                                className="post-action-menu-item"
                                onClick={() => handleToggleStatus(post)}
                              >
                                <span className="post-action-menu-icon post-action-menu-icon-edit">
                                  <i
                                    className={
                                      Number(post.status) === 1
                                        ? "bi bi-eye-slash"
                                        : "bi bi-eye"
                                    }
                                  />
                                </span>

                                <span>
                                  {Number(post.status) === 1
                                    ? "Chuyển thành bản nháp"
                                    : "Xuất bản"}
                                </span>
                              </button>

                              <button
                                type="button"
                                className="post-action-menu-item"
                                onClick={() => handleToggleFeatured(post)}
                              >
                                <span className="post-action-menu-icon post-action-menu-icon-edit">
                                  <i
                                    className={
                                      Number(post.is_featured) === 1
                                        ? "bi bi-star"
                                        : "bi bi-star-fill"
                                    }
                                  />
                                </span>

                                <span>
                                  {Number(post.is_featured) === 1
                                    ? "Bỏ nổi bật"
                                    : "Đánh dấu nổi bật"}
                                </span>
                              </button>

                              <button
                                type="button"
                                className="post-action-menu-item post-action-menu-delete"
                                onClick={() => handleOpenDeleteConfirm(post)}
                              >
                                <span className="post-action-menu-icon post-action-menu-icon-delete">
                                  <i className="bi bi-trash3" />
                                </span>

                                <span>Xóa bài viết</span>
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

        {/* =================================================
            PAGINATION
        ================================================= */}

        {total > 0 && (
          <div className="post-pagination">
            <div className="post-pagination-info">
              Hiển thị <strong>{startResult}</strong> -{" "}
              <strong>{endResult}</strong> trong tổng <strong>{total}</strong>{" "}
              bài viết
            </div>

            <div className="post-pagination-controls">
              <button
                type="button"
                className="post-page-button"
                disabled={page === 1}
                onClick={() => setPage(1)}
                title="Trang đầu"
              >
                <i className="bi bi-chevron-double-left" />
              </button>

              <button
                type="button"
                className="post-page-button"
                disabled={page === 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                title="Trang trước"
              >
                <i className="bi bi-chevron-left" />
              </button>

              <div className="post-page-numbers">
                {getPageNumbers().map((pageNumber, index) =>
                  pageNumber === "..." ? (
                    <span key={`dots-${index}`} className="post-page-dots">
                      ...
                    </span>
                  ) : (
                    <button
                      key={pageNumber}
                      type="button"
                      className={
                        page === pageNumber
                          ? "post-page-number post-page-number-active"
                          : "post-page-number"
                      }
                      onClick={() => setPage(pageNumber)}
                    >
                      {pageNumber}
                    </button>
                  ),
                )}
              </div>

              <button
                type="button"
                className="post-page-button"
                disabled={page === totalPages}
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                title="Trang sau"
              >
                <i className="bi bi-chevron-right" />
              </button>

              <button
                type="button"
                className="post-page-button"
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
    </div>
  );
}

export default PostManagement;
