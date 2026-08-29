import React, { useCallback, useEffect, useMemo, useState } from "react";

import { Link, useNavigate } from "react-router-dom";

import toast from "react-hot-toast";

import buildPcService from "../../../services/buildPcService";

import { useCart } from "../../../context/CartContext";

import "./AccountBuilds.css";

// ============================================================
// HELPERS
// ============================================================

const normalizeNumber = (value, fallback = 0) => {
  const number = Number(value);

  return Number.isFinite(number) ? number : fallback;
};

const formatPrice = (value) => {
  const number = normalizeNumber(value);

  return `${Math.round(number).toLocaleString("vi-VN")}đ`;
};

const formatDate = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const getResponseData = (response) => {
  return response?.data?.data ?? response?.data ?? {};
};

const getBuildList = (response) => {
  const data = getResponseData(response);

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data.items)) {
    return data.items;
  }

  if (Array.isArray(data.builds)) {
    return data.builds;
  }

  if (Array.isArray(data.data)) {
    return data.data;
  }

  return [];
};

const getPagination = (response) => {
  const data = getResponseData(response);

  const pagination = data?.pagination || response?.data?.pagination || {};

  const page = normalizeNumber(pagination.page ?? data.page ?? 1, 1);

  const limit = normalizeNumber(pagination.limit ?? data.limit ?? 6, 6);

  const total = normalizeNumber(
    pagination.total ??
      pagination.total_items ??
      data.total ??
      data.total_items ??
      0,
  );

  const totalPages = normalizeNumber(
    pagination.total_pages ??
      pagination.totalPages ??
      data.total_pages ??
      data.totalPages ??
      Math.ceil(total / Math.max(limit, 1)),
    1,
  );

  return {
    page: Math.max(1, page),

    limit,

    total,

    totalPages: Math.max(1, totalPages),

    hasNext: pagination.hasNext ?? pagination.has_next ?? page < totalPages,

    hasPrev: pagination.hasPrev ?? pagination.has_prev ?? page > 1,
  };
};

// ============================================================
// COMPONENT
// ============================================================

function AccountBuilds() {
  const navigate = useNavigate();

  const { refreshCart } = useCart();

  // ==========================================================
  // STATE
  // ==========================================================

  const [builds, setBuilds] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [searchInput, setSearchInput] = useState("");

  const [sort, setSort] = useState("newest");

  const [page, setPage] = useState(1);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 6,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  });

  const [addingBuildId, setAddingBuildId] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);

  const [deleting, setDeleting] = useState(false);

  // ==========================================================
  // LOAD BUILDS
  // ==========================================================

  const loadBuilds = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await buildPcService.getMyBuilds({
        page,

        limit: 6,

        search: search || undefined,

        sort,
      });

      setBuilds(getBuildList(response));

      setPagination(getPagination(response));
    } catch (requestError) {
      console.error("Lỗi lấy My Builds:", requestError);

      setBuilds([]);

      setError(
        requestError?.response?.data?.message ||
          "Không thể tải danh sách cấu hình đã lưu.",
      );
    } finally {
      setLoading(false);
    }
  }, [page, search, sort]);

  useEffect(() => {
    loadBuilds();
  }, [loadBuilds]);

  // ==========================================================
  // SEARCH
  // ==========================================================

  const handleSearchSubmit = (event) => {
    event.preventDefault();

    setPage(1);

    setSearch(searchInput.trim());
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setSearch("");
    setPage(1);
  };

  // ==========================================================
  // ADD SAVED BUILD TO CART
  // ==========================================================

  const handleAddToCart = async (build) => {
    const buildId = Number(build?.id);

    if (!buildId) {
      return;
    }

    try {
      setAddingBuildId(buildId);

      await buildPcService.addSavedBuildToCart(buildId);

      if (typeof refreshCart === "function") {
        await refreshCart({
          silent: true,
        });
      }

      toast.success("Đã thêm cấu hình vào giỏ hàng.");
    } catch (requestError) {
      console.error("Lỗi thêm Saved Build vào Cart:", requestError);

      toast.error(
        requestError?.response?.data?.message ||
          requestError?.message ||
          "Không thể thêm cấu hình vào giỏ hàng.",
      );
    } finally {
      setAddingBuildId(null);
    }
  };

  // ==========================================================
  // DELETE
  // ==========================================================

  const handleConfirmDelete = async () => {
    if (!deleteTarget?.id) {
      return;
    }

    try {
      setDeleting(true);

      await buildPcService.deleteMyBuild(deleteTarget.id);

      toast.success("Đã xóa cấu hình.");

      setDeleteTarget(null);

      if (builds.length === 1 && page > 1) {
        setPage((previous) => Math.max(1, previous - 1));

        return;
      }

      await loadBuilds();
    } catch (requestError) {
      console.error("Lỗi xóa Build:", requestError);

      toast.error(
        requestError?.response?.data?.message || "Không thể xóa cấu hình.",
      );
    } finally {
      setDeleting(false);
    }
  };

  // ==========================================================
  // PAGE NUMBERS
  // ==========================================================

  const pageNumbers = useMemo(() => {
    const total = pagination.totalPages;

    if (total <= 5) {
      return Array.from(
        {
          length: total,
        },
        (_, index) => index + 1,
      );
    }

    const start = Math.max(1, Math.min(page - 2, total - 4));

    return Array.from(
      {
        length: 5,
      },
      (_, index) => start + index,
    );
  }, [page, pagination.totalPages]);

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <>
      <section className="account-build-page">
        {/* HEADER */}

        <div className="account-build-hero">
          <div className="account-build-hero-content">
            <span className="account-build-kicker">
              <i className="bi bi-pc-display-horizontal" />
              MY BUILDS
            </span>

            <h1>Cấu hình của tôi</h1>

            <p>
              Quản lý các cấu hình PC bạn đã lưu, xem lại linh kiện hoặc thêm
              toàn bộ cấu hình vào giỏ hàng.
            </p>
          </div>

          <Link to="/build-pc" className="account-build-create-button">
            <i className="bi bi-plus-lg" />
            Tạo cấu hình mới
          </Link>
        </div>

        {/* TOOLBAR */}

        <div className="account-build-toolbar">
          <form className="account-build-search" onSubmit={handleSearchSubmit}>
            <i className="bi bi-search" />

            <input
              type="text"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Tìm theo tên cấu hình..."
            />

            {searchInput && (
              <button
                type="button"
                onClick={handleClearSearch}
                aria-label="Xóa tìm kiếm"
              >
                <i className="bi bi-x-lg" />
              </button>
            )}
          </form>

          <label className="account-build-sort">
            <i className="bi bi-sort-down" />

            <select
              value={sort}
              onChange={(event) => {
                setSort(event.target.value);

                setPage(1);
              }}
            >
              <option value="newest">Mới nhất</option>

              <option value="oldest">Cũ nhất</option>

              <option value="updated">Cập nhật gần đây</option>

              <option value="price_asc">Giá thấp → cao</option>

              <option value="price_desc">Giá cao → thấp</option>

              <option value="name_asc">Tên A → Z</option>

              <option value="name_desc">Tên Z → A</option>
            </select>
          </label>
        </div>

        {/* RESULT BAR */}

        {!loading && !error && (
          <div className="account-build-result-bar">
            <span>
              <strong>{pagination.total}</strong> cấu hình đã lưu
            </span>

            {search && <span>Kết quả cho “{search}”</span>}
          </div>
        )}

        {/* LOADING */}

        {loading && (
          <div className="account-build-state">
            <div className="account-build-spinner" />

            <strong>Đang tải cấu hình</strong>

            <p>Hệ thống đang lấy danh sách Build PC của bạn.</p>
          </div>
        )}

        {/* ERROR */}

        {!loading && error && (
          <div className="account-build-state account-build-state--error">
            <span className="account-build-state-icon">
              <i className="bi bi-exclamation-triangle" />
            </span>

            <strong>Không thể tải cấu hình</strong>

            <p>{error}</p>

            <button type="button" onClick={loadBuilds}>
              <i className="bi bi-arrow-clockwise" />
              Thử lại
            </button>
          </div>
        )}

        {/* EMPTY */}

        {!loading && !error && builds.length === 0 && (
          <div className="account-build-empty">
            <span className="account-build-empty-icon">
              <i className="bi bi-pc-display" />
            </span>

            <span className="account-build-empty-kicker">MY BUILDS</span>

            <h2>
              {search ? "Không tìm thấy cấu hình" : "Bạn chưa lưu cấu hình nào"}
            </h2>

            <p>
              {search
                ? "Hãy thử một từ khóa khác hoặc xóa bộ lọc tìm kiếm."
                : "Hãy tạo bộ PC đầu tiên, kiểm tra tương thích và lưu lại để quản lý tại đây."}
            </p>

            {search ? (
              <button
                type="button"
                className="account-build-empty-action"
                onClick={handleClearSearch}
              >
                <i className="bi bi-x-circle" />
                Xóa tìm kiếm
              </button>
            ) : (
              <Link to="/build-pc" className="account-build-empty-action">
                <i className="bi bi-plus-lg" />
                Bắt đầu Build PC
              </Link>
            )}
          </div>
        )}

        {/* BUILD GRID */}

        {!loading && !error && builds.length > 0 && (
          <div className="account-build-grid">
            {builds.map((build) => {
              const id = Number(build.id);

              const itemCount = normalizeNumber(
                build.item_count ?? build.items_count ?? 0,
              );

              const totalPrice = normalizeNumber(build.total_price);

              const isAdding = addingBuildId === id;

              return (
                <article className="account-build-card" key={id}>
                  <div className="account-build-card-top">
                    <div className="account-build-card-icon">
                      <i className="bi bi-pc-display-horizontal" />
                    </div>

                    <div className="account-build-card-menu">
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(build)}
                        title="Xóa cấu hình"
                        aria-label="Xóa cấu hình"
                      >
                        <i className="bi bi-trash3" />
                      </button>
                    </div>
                  </div>

                  <div className="account-build-card-content">
                    <span className="account-build-card-type">
                      CẤU HÌNH ĐÃ LƯU
                    </span>

                    <h2>{build.name || `Cấu hình #${id}`}</h2>

                    <p>
                      {build.description ||
                        "Cấu hình PC cá nhân đã được lưu trong tài khoản của bạn."}
                    </p>

                    <div className="account-build-card-info">
                      <div>
                        <span>
                          <i className="bi bi-grid-3x3-gap" />
                        </span>

                        <div>
                          <small>Linh kiện</small>

                          <strong>{itemCount} nhóm</strong>
                        </div>
                      </div>

                      <div>
                        <span>
                          <i className="bi bi-clock-history" />
                        </span>

                        <div>
                          <small>Cập nhật</small>

                          <strong>
                            {formatDate(build.updated_at || build.created_at)}
                          </strong>
                        </div>
                      </div>
                    </div>

                    <div className="account-build-card-price">
                      <span>Tổng giá trị</span>

                      <strong>{formatPrice(totalPrice)}</strong>
                    </div>
                  </div>

                  <div className="account-build-card-actions">
                    <button
                      type="button"
                      className="account-build-cart-button"
                      disabled={isAdding}
                      onClick={() => handleAddToCart(build)}
                    >
                      <i
                        className={
                          isAdding
                            ? "bi bi-arrow-repeat account-build-spin-icon"
                            : "bi bi-cart-plus"
                        }
                      />

                      {isAdding ? "Đang thêm..." : "Thêm vào giỏ"}
                    </button>

                    <button
                      type="button"
                      className="account-build-detail-button"
                      onClick={() => navigate(`/account/builds/${id}`)}
                    >
                      Xem chi tiết
                      <i className="bi bi-arrow-right" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* PAGINATION */}

        {!loading && !error && pagination.totalPages > 1 && (
          <div className="account-build-pagination-wrap">
            <div className="account-build-pagination">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((previous) => Math.max(1, previous - 1))}
              >
                <i className="bi bi-chevron-left" />
              </button>

              {pageNumbers.map((number) => (
                <button
                  type="button"
                  key={number}
                  className={page === number ? "account-build-page-active" : ""}
                  onClick={() => setPage(number)}
                >
                  {number}
                </button>
              ))}

              <button
                type="button"
                disabled={page >= pagination.totalPages}
                onClick={() =>
                  setPage((previous) =>
                    Math.min(pagination.totalPages, previous + 1),
                  )
                }
              >
                <i className="bi bi-chevron-right" />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* DELETE MODAL */}

      {deleteTarget && (
        <div
          className="account-build-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deleting) {
              setDeleteTarget(null);
            }
          }}
        >
          <section className="account-build-delete-dialog">
            <button
              type="button"
              className="account-build-modal-close"
              disabled={deleting}
              onClick={() => setDeleteTarget(null)}
            >
              <i className="bi bi-x-lg" />
            </button>

            <div className="account-build-delete-icon">
              <i className="bi bi-trash3" />
            </div>

            <span className="account-build-delete-kicker">XÓA CẤU HÌNH</span>

            <h2>Xóa cấu hình này?</h2>

            <p>
              Cấu hình <strong>“{deleteTarget.name}”</strong> sẽ được xóa khỏi
              tài khoản của bạn. Thao tác này không ảnh hưởng đến sản phẩm đang
              có trong giỏ hàng.
            </p>

            <div className="account-build-delete-actions">
              <button
                type="button"
                className="account-build-delete-cancel"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
              >
                Giữ cấu hình
              </button>

              <button
                type="button"
                className="account-build-delete-confirm"
                disabled={deleting}
                onClick={handleConfirmDelete}
              >
                {deleting ? (
                  <>
                    <span className="account-build-button-spinner" />
                    Đang xóa...
                  </>
                ) : (
                  <>
                    <i className="bi bi-trash3" />
                    Xóa cấu hình
                  </>
                )}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

export default AccountBuilds;
