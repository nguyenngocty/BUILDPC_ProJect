import React, { useEffect, useMemo, useState } from "react";

import api from "../../../../services/api";

// ============================================================
// HELPERS
// ============================================================

const formatPrice = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "Liên hệ";
  }

  return `${Math.round(number).toLocaleString("vi-VN")}đ`;
};

const getImageUrl = (path) => {
  if (!path) {
    return "/images/no-image.png";
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  try {
    return new URL(path, api.defaults.baseURL).toString();
  } catch {
    return path;
  }
};

const formatSpecName = (value) =>
  String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const normalizePart = (part) => {
  const originalPrice = Number(
    part?.original_price ??
      part?.variant_price ??
      part?.product_price ??
      part?.price ??
      0,
  );

  const salePrice = Number(
    part?.sale_price ??
      part?.variant_sale_price ??
      part?.product_sale_price ??
      0,
  );

  const finalPrice = Number(
    part?.effective_price ??
      part?.current_price ??
      part?.final_price ??
      (salePrice > 0 && salePrice < originalPrice ? salePrice : originalPrice),
  );

  const stock = Math.max(
    0,
    Number(
      part?.stock_quantity ??
        part?.variant_stock ??
        part?.product_quantity ??
        part?.quantity ??
        0,
    ),
  );

  const partId = Number(part?.part_id ?? part?.id ?? 0);

  const displayName =
    part?.display_name ||
    part?.variant_name ||
    part?.product_name ||
    part?.name ||
    "Linh kiện";

  const displaySku =
    part?.display_sku ||
    part?.variant_sku ||
    part?.product_sku ||
    part?.sku ||
    "";

  const image = getImageUrl(
    part?.display_thumbnail ||
      part?.variant_thumbnail ||
      part?.product_thumbnail ||
      part?.thumbnail,
  );

  return {
    ...part,

    id: partId,
    part_id: partId,

    display_name: displayName,

    display_sku: displaySku,

    originalPrice,

    salePrice,

    finalPrice,

    stock,

    image,

    specifications:
      part?.specifications && typeof part.specifications === "object"
        ? part.specifications
        : {},
  };
};

// ============================================================
// COMPONENT
// ============================================================

const PartSelectorModal = ({
  open,
  partType,
  parts = [],
  selectedParts = [],
  loading = false,
  error = "",
  onClose,
  onSelect,
  onRetry,
  pageSize = 8,
}) => {
  const [keyword, setKeyword] = useState("");

  const [stockFilter, setStockFilter] = useState("in_stock");

  const [sortBy, setSortBy] = useState("default");

  const [currentPage, setCurrentPage] = useState(1);

  const typeName = partType?.type_name || "Linh kiện";

  // ==========================================================
  // RESET
  // ==========================================================

  useEffect(() => {
    if (!open) {
      return;
    }

    setKeyword("");
    setStockFilter("in_stock");
    setSortBy("default");
    setCurrentPage(1);
  }, [open, partType?.id]);

  useEffect(() => {
    setCurrentPage(1);
  }, [keyword, stockFilter, sortBy]);

  // ==========================================================
  // ESC + BODY LOCK
  // ==========================================================

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;

      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  // ==========================================================
  // NORMALIZED
  // ==========================================================

  const normalizedParts = useMemo(
    () => (Array.isArray(parts) ? parts.map(normalizePart) : []),
    [parts],
  );

  // ==========================================================
  // FILTER
  // ==========================================================

  const filteredParts = useMemo(() => {
    const search = keyword.trim().toLowerCase();

    let result = [...normalizedParts];

    if (search) {
      result = result.filter((part) => {
        const name = String(part.display_name || "").toLowerCase();

        const sku = String(part.display_sku || "").toLowerCase();

        return name.includes(search) || sku.includes(search);
      });
    }

    if (stockFilter === "in_stock") {
      result = result.filter((part) => part.stock > 0);
    }

    if (stockFilter === "out_of_stock") {
      result = result.filter((part) => part.stock <= 0);
    }

    switch (sortBy) {
      case "price_asc":
        result.sort((a, b) => a.finalPrice - b.finalPrice);
        break;

      case "price_desc":
        result.sort((a, b) => b.finalPrice - a.finalPrice);
        break;

      case "name_asc":
        result.sort((a, b) =>
          a.display_name.localeCompare(b.display_name, "vi"),
        );
        break;

      case "name_desc":
        result.sort((a, b) =>
          b.display_name.localeCompare(a.display_name, "vi"),
        );
        break;

      default:
        break;
    }

    return result;
  }, [normalizedParts, keyword, stockFilter, sortBy]);

  // ==========================================================
  // PAGINATION
  // ==========================================================

  const size = Math.max(1, Number(pageSize) || 8);

  const totalPages = Math.max(1, Math.ceil(filteredParts.length / size));

  const page = Math.min(currentPage, totalPages);

  const paginatedParts = useMemo(() => {
    const start = (page - 1) * size;

    return filteredParts.slice(start, start + size);
  }, [filteredParts, page, size]);

  // ==========================================================
  // CURRENT SELECTION
  // ==========================================================

  const selectedPartIds = useMemo(
    () => new Set(selectedParts.map((item) => String(item.part_id || item.id))),
    [selectedParts],
  );

  const pageNumbers = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from(
        {
          length: totalPages,
        },
        (_, index) => index + 1,
      );
    }

    const start = Math.max(1, Math.min(page - 2, totalPages - 4));

    return Array.from(
      {
        length: 5,
      },
      (_, index) => start + index,
    );
  }, [page, totalPages]);

  if (!open) {
    return null;
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div
      className="client-build-selector-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}
    >
      <section
        className="client-build-selector-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={`Chọn ${typeName}`}
      >
        {/* Header */}

        <header className="client-build-selector-header">
          <div>
            <span className="client-build-selector-kicker">
              <i className="bi bi-grid" />
              BUILD PC / {partType?.type_code}
            </span>

            <h2>Chọn {typeName}</h2>

            <p>Lựa chọn sản phẩm phù hợp cho cấu hình của bạn.</p>
          </div>

          <button
            type="button"
            className="client-build-selector-close"
            onClick={onClose}
            aria-label="Đóng"
          >
            <i className="bi bi-x-lg" />
          </button>
        </header>

        {/* Toolbar */}

        <div className="client-build-selector-toolbar">
          <label className="client-build-selector-search">
            <i className="bi bi-search" />

            <input
              type="text"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder={`Tìm ${typeName}, SKU...`}
              autoFocus
            />

            {keyword && (
              <button
                type="button"
                onClick={() => setKeyword("")}
                aria-label="Xóa tìm kiếm"
              >
                <i className="bi bi-x" />
              </button>
            )}
          </label>

          <label className="client-build-selector-control">
            <i className="bi bi-box-seam" />

            <select
              value={stockFilter}
              onChange={(event) => setStockFilter(event.target.value)}
            >
              <option value="all">Tất cả</option>

              <option value="in_stock">Còn hàng</option>

              <option value="out_of_stock">Hết hàng</option>
            </select>
          </label>

          <label className="client-build-selector-control">
            <i className="bi bi-sort-down" />

            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
            >
              <option value="default">Sắp xếp</option>

              <option value="price_asc">Giá thấp → cao</option>

              <option value="price_desc">Giá cao → thấp</option>

              <option value="name_asc">Tên A → Z</option>

              <option value="name_desc">Tên Z → A</option>
            </select>
          </label>
        </div>

        {/* Result bar */}

        <div className="client-build-selector-result">
          {!loading && !error && (
            <>
              <span>
                Tìm thấy <strong>{filteredParts.length}</strong> linh kiện
              </span>

              {keyword && (
                <span>
                  Từ khóa: <strong>“{keyword}”</strong>
                </span>
              )}
            </>
          )}
        </div>

        {/* Content */}

        <div className="client-build-selector-content">
          {loading && (
            <div className="client-build-selector-state">
              <div className="client-build-spinner" />

              <strong>Đang tải linh kiện</strong>

              <p>Hệ thống đang đồng bộ sản phẩm và tồn kho.</p>
            </div>
          )}

          {!loading && error && (
            <div className="client-build-selector-state">
              <div className="client-build-state-icon">
                <i className="bi bi-exclamation-triangle" />
              </div>

              <strong>Không thể tải linh kiện</strong>

              <p>{error}</p>

              {onRetry && (
                <button
                  type="button"
                  className="client-build-selector-retry"
                  onClick={onRetry}
                >
                  <i className="bi bi-arrow-clockwise" />
                  Thử lại
                </button>
              )}
            </div>
          )}

          {!loading && !error && filteredParts.length === 0 && (
            <div className="client-build-selector-state">
              <div className="client-build-state-icon">
                <i className="bi bi-search" />
              </div>

              <strong>Không tìm thấy linh kiện</strong>

              <p>Hãy thử từ khóa khác hoặc thay đổi bộ lọc.</p>
            </div>
          )}

          {!loading && !error && paginatedParts.length > 0 && (
            <div className="client-build-selector-grid">
              {paginatedParts.map((part) => {
                const selected = selectedPartIds.has(String(part.part_id));

                const outOfStock = part.stock <= 0;

                const specs = Object.entries(part.specifications || {})
                  .filter(
                    ([, value]) =>
                      value !== null && value !== undefined && value !== "",
                  )
                  .slice(0, 3);

                return (
                  <article
                    key={part.part_id}
                    className={`client-build-product-card ${
                      selected ? "client-build-product-card--selected" : ""
                    }`}
                  >
                    <div className="client-build-product-image">
                      <img
                        src={part.image}
                        alt={part.display_name}
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.src = "/images/no-image.png";
                        }}
                      />

                      <div className="client-build-product-badges">
                        {selected && (
                          <span className="client-build-product-badge client-build-product-badge--selected">
                            <i className="bi bi-check-lg" />
                            Đang chọn
                          </span>
                        )}

                        {part.variant_id && (
                          <span className="client-build-product-badge client-build-product-badge--variant">
                            Variant
                          </span>
                        )}

                        {outOfStock && (
                          <span className="client-build-product-badge client-build-product-badge--sold">
                            Hết hàng
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="client-build-product-body">
                      <span className="client-build-product-sku">
                        {part.display_sku || "BUILD-PC"}
                      </span>

                      <h3>{part.display_name}</h3>

                      <div className="client-build-product-price">
                        <strong>{formatPrice(part.finalPrice)}</strong>

                        {part.salePrice > 0 &&
                          part.originalPrice > part.salePrice && (
                            <del>{formatPrice(part.originalPrice)}</del>
                          )}
                      </div>

                      <div
                        className={`client-build-product-stock ${
                          outOfStock
                            ? "client-build-product-stock--out"
                            : "client-build-product-stock--in"
                        }`}
                      >
                        <i />

                        {outOfStock ? "Hết hàng" : `Còn ${part.stock} sản phẩm`}
                      </div>

                      {specs.length > 0 && (
                        <div className="client-build-product-specs">
                          {specs.map(([key, value]) => (
                            <div key={key}>
                              <span>{formatSpecName(key)}</span>

                              <strong>
                                {Array.isArray(value)
                                  ? value.join(", ")
                                  : String(value)}
                              </strong>
                            </div>
                          ))}
                        </div>
                      )}

                      <button
                        type="button"
                        className="client-build-product-select"
                        disabled={selected || outOfStock}
                        onClick={() => onSelect?.(part)}
                      >
                        {selected ? (
                          <>
                            <i className="bi bi-check-lg" />
                            Đang sử dụng
                          </>
                        ) : outOfStock ? (
                          <>
                            <i className="bi bi-x-circle" />
                            Hết hàng
                          </>
                        ) : (
                          <>
                            <i className="bi bi-plus-lg" />
                            Chọn linh kiện
                          </>
                        )}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}

        {!loading && !error && filteredParts.length > 0 && (
          <footer className="client-build-selector-footer">
            <span>
              Trang <strong>{page}</strong> / {totalPages}
            </span>

            {totalPages > 1 && (
              <div className="client-build-selector-pagination">
                <button
                  type="button"
                  disabled={page === 1}
                  onClick={() => setCurrentPage(page - 1)}
                >
                  <i className="bi bi-chevron-left" />
                </button>

                {pageNumbers.map((number) => (
                  <button
                    type="button"
                    key={number}
                    className={
                      number === page
                        ? "client-build-selector-page--active"
                        : ""
                    }
                    onClick={() => setCurrentPage(number)}
                  >
                    {number}
                  </button>
                ))}

                <button
                  type="button"
                  disabled={page === totalPages}
                  onClick={() => setCurrentPage(page + 1)}
                >
                  <i className="bi bi-chevron-right" />
                </button>
              </div>
            )}
          </footer>
        )}
      </section>
    </div>
  );
};

export default PartSelectorModal;
