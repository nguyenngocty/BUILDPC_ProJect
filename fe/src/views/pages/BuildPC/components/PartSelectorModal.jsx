import React, { useEffect, useMemo, useState } from "react";
import api from "../../../../services/api";

const formatPrice = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "Liên hệ";
  }

  return `${number.toLocaleString("vi-VN")}đ`;
};

const getImageUrl = (path) => {
  if (!path) return "";

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
  const originalPrice = Number(part?.product_price || 0);
  const salePrice = Number(part?.product_sale_price || 0);

  return {
    ...part,
    originalPrice,
    salePrice,
    finalPrice: salePrice > 0 ? salePrice : originalPrice,
    stock: Math.max(0, Number(part?.product_quantity || 0)),
    image: getImageUrl(part?.product_thumbnail),
  };
};

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
  const [stockFilter, setStockFilter] = useState("all");
  const [sortBy, setSortBy] = useState("default");
  const [currentPage, setCurrentPage] = useState(1);

  const typeName = partType?.type_name || "Linh kiện";

  useEffect(() => {
    if (!open) return;

    setKeyword("");
    setStockFilter("all");
    setSortBy("default");
    setCurrentPage(1);
  }, [open, partType?.id]);

  useEffect(() => {
    setCurrentPage(1);
  }, [keyword, stockFilter, sortBy]);

  useEffect(() => {
    if (!open) return undefined;

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

  const normalizedParts = useMemo(
    () => (Array.isArray(parts) ? parts.map(normalizePart) : []),
    [parts],
  );

  const filteredParts = useMemo(() => {
    const search = keyword.trim().toLowerCase();

    let result = [...normalizedParts];

    if (search) {
      result = result.filter((part) => {
        const name = String(part.product_name || "").toLowerCase();

        const sku = String(part.product_sku || "").toLowerCase();

        return name.includes(search) || sku.includes(search);
      });
    }

    if (stockFilter === "in_stock") {
      result = result.filter((part) => part.stock > 0);
    }

    if (stockFilter === "out_of_stock") {
      result = result.filter((part) => part.stock <= 0);
    }

    if (sortBy === "price_asc") {
      result.sort((a, b) => a.finalPrice - b.finalPrice);
    }

    if (sortBy === "price_desc") {
      result.sort((a, b) => b.finalPrice - a.finalPrice);
    }

    if (sortBy === "name_asc") {
      result.sort((a, b) => a.product_name.localeCompare(b.product_name, "vi"));
    }

    if (sortBy === "name_desc") {
      result.sort((a, b) => b.product_name.localeCompare(a.product_name, "vi"));
    }

    return result;
  }, [normalizedParts, keyword, stockFilter, sortBy]);

  const size = Math.max(1, Number(pageSize) || 8);

  const totalPages = Math.max(1, Math.ceil(filteredParts.length / size));

  const page = Math.min(currentPage, totalPages);

  const paginatedParts = useMemo(() => {
    const start = (page - 1) * size;

    return filteredParts.slice(start, start + size);
  }, [filteredParts, page, size]);

  const selectedProductIds = useMemo(
    () => new Set(selectedParts.map((item) => String(item.product_id))),
    [selectedParts],
  );

  const pageNumbers = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const start = Math.max(1, Math.min(page - 2, totalPages - 4));

    return Array.from({ length: 5 }, (_, index) => start + index);
  }, [page, totalPages]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="selector-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}
    >
      <section className="selector-dialog" role="dialog" aria-modal="true">
        <header className="selector-header">
          <div>
            <span className="selector-label">
              BUILD PC / {partType?.type_code}
            </span>

            <h2>Chọn {typeName}</h2>

            <p>Chọn một sản phẩm phù hợp cho cấu hình của bạn.</p>
          </div>

          <button type="button" className="selector-close" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="selector-toolbar">
          <div className="selector-search">
            <span>⌕</span>

            <input
              type="text"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder={`Tìm tên hoặc SKU ${typeName}...`}
              autoFocus
            />

            {keyword && (
              <button type="button" onClick={() => setKeyword("")}>
                ×
              </button>
            )}
          </div>

          <select
            value={stockFilter}
            onChange={(event) => setStockFilter(event.target.value)}
          >
            <option value="all">Tất cả sản phẩm</option>
            <option value="in_stock">Còn hàng</option>
            <option value="out_of_stock">Hết hàng</option>
          </select>

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
        </div>

        <div className="selector-result-bar">
          {!loading && !error && (
            <>
              <span>
                Có <strong>{filteredParts.length}</strong> sản phẩm
              </span>

              {keyword && <span>Kết quả cho “{keyword}”</span>}
            </>
          )}
        </div>

        <div className="selector-content">
          {loading && (
            <div className="selector-state">
              <div className="build-spinner" />
              <strong>Đang tải sản phẩm</strong>
              <p>Vui lòng chờ trong giây lát...</p>
            </div>
          )}

          {!loading && error && (
            <div className="selector-state">
              <div className="build-state-icon">!</div>

              <strong>Không thể tải linh kiện</strong>
              <p>{error}</p>

              {onRetry && (
                <button
                  type="button"
                  className="selector-retry"
                  onClick={onRetry}
                >
                  Thử lại
                </button>
              )}
            </div>
          )}

          {!loading && !error && filteredParts.length === 0 && (
            <div className="selector-state">
              <div className="build-state-icon">⌕</div>

              <strong>Không tìm thấy sản phẩm</strong>

              <p>Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc.</p>
            </div>
          )}

          {!loading && !error && paginatedParts.length > 0 && (
            <div className="selector-products">
              {paginatedParts.map((part) => {
                const selected = selectedProductIds.has(
                  String(part.product_id),
                );

                const outOfStock = part.stock <= 0;

                return (
                  <article
                    key={part.id}
                    className={`selector-product-card ${
                      selected ? "selected" : ""
                    }`}
                  >
                    <div className="selector-product-image">
                      {part.image ? (
                        <img
                          src={part.image}
                          alt={part.product_name}
                          loading="lazy"
                        />
                      ) : (
                        <div className="selector-product-no-image">
                          NO IMAGE
                        </div>
                      )}

                      {selected && (
                        <span className="selector-badge selected">
                          Đang chọn
                        </span>
                      )}

                      {outOfStock && (
                        <span className="selector-badge soldout">Hết hàng</span>
                      )}
                    </div>

                    <div className="selector-product-info">
                      <span className="selector-product-sku">
                        {part.product_sku || "BUILD PC"}
                      </span>

                      <h3>{part.product_name}</h3>

                      <div className="selector-product-price">
                        <strong>{formatPrice(part.finalPrice)}</strong>

                        {part.salePrice > 0 &&
                          part.salePrice < part.originalPrice && (
                            <del>{formatPrice(part.originalPrice)}</del>
                          )}
                      </div>

                      <div
                        className={`selector-product-stock ${
                          outOfStock ? "unavailable" : "available"
                        }`}
                      >
                        <i />

                        {outOfStock ? "Hết hàng" : `Còn ${part.stock} sản phẩm`}
                      </div>

                      {part.specifications &&
                        Object.keys(part.specifications).length > 0 && (
                          <div className="selector-specifications">
                            {Object.entries(part.specifications)
                              .slice(0, 3)
                              .map(([key, value]) => (
                                <div key={key}>
                                  <span>{formatSpecName(key)}</span>

                                  <strong>{String(value)}</strong>
                                </div>
                              ))}
                          </div>
                        )}

                      <button
                        type="button"
                        className="selector-choose-product"
                        disabled={selected || outOfStock}
                        onClick={() => onSelect?.(part)}
                      >
                        {selected
                          ? "Đang sử dụng"
                          : outOfStock
                            ? "Hết hàng"
                            : "Chọn linh kiện"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {!loading && !error && filteredParts.length > 0 && (
          <footer className="selector-footer">
            <span>
              Trang <strong>{page}</strong> / {totalPages}
            </span>

            {totalPages > 1 && (
              <div className="selector-pagination">
                <button
                  type="button"
                  disabled={page === 1}
                  onClick={() => setCurrentPage(page - 1)}
                >
                  ‹
                </button>

                {pageNumbers.map((number) => (
                  <button
                    type="button"
                    key={number}
                    className={number === page ? "active" : ""}
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
                  ›
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
