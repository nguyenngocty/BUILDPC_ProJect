import { useEffect, useMemo, useState } from "react";

import {
  formatPrice,
  getStockClass,
  getStockLabel,
} from "../../../utils/productClient";

function ProductInfo({
  product,

  baseProduct,

  options = [],

  selectedValues = {},

  selectedVariant,

  hasVariants = false,

  rating,

  actionLoading,

  actionMessage,

  onSelectOption,

  isOptionValueAvailable,

  onAddToCart,
}) {
  const [qty, setQty] = useState(1);

  // ============================================================
  // RESET QUANTITY
  //
  // Khi đổi Variant:
  // quantity về 1.
  // ============================================================

  useEffect(() => {
    setQty(1);
  }, [product?.id, selectedVariant?.id]);

  // ============================================================
  // STOCK
  // ============================================================

  const maxQuantity = Math.max(Number(product?.quantity || 0), 0);

  // ============================================================
  // SALE
  // ============================================================

  const hasSale =
    Boolean(product?.is_sale) &&
    Number(product?.sale_price) > 0 &&
    Number(product?.sale_price) < Number(product?.price);

  // ============================================================
  // OPTIONS
  // ============================================================

  const variantOptions = useMemo(() => {
    if (!hasVariants || !Array.isArray(options)) {
      return [];
    }

    return options.filter(
      (option) => Array.isArray(option?.values) && option.values.length > 0,
    );
  }, [options, hasVariants]);

  // ============================================================
  // QUANTITY
  // ============================================================

  const increase = () => {
    setQty((current) =>
      Math.min(
        current + 1,

        Math.max(maxQuantity, 1),
      ),
    );
  };

  const decrease = () => {
    setQty((current) => Math.max(current - 1, 1));
  };

  const handleQuantity = (event) => {
    const value = Number(event.target.value);

    if (!Number.isFinite(value)) {
      return;
    }

    setQty(
      Math.max(
        Math.min(
          Math.floor(value),

          Math.max(maxQuantity, 1),
        ),

        1,
      ),
    );
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <section className="pd-info-panel">
      {/* ======================================================
          TOP
      ====================================================== */}

      <div className="pd-info-topline">
        <span className="pd-category-pill">
          {baseProduct?.category_name || product?.category_name || "Sản phẩm"}
        </span>

        <span
          className={`pd-stock-pill ${getStockClass(product?.stock_status)}`}
        >
          <span className="pd-stock-pill__dot"></span>

          {getStockLabel(product?.stock_status)}
        </span>
      </div>

      {/* ======================================================
          TITLE
      ====================================================== */}

      <div className="pd-title-block">
        <h1 className="pd-product-title">{baseProduct?.name}</h1>

        {selectedVariant && hasVariants && (
          <div className="pd-current-variant">
            <span className="pd-current-variant__icon">
              <i className="bi bi-box-seam"></i>
            </span>

            <div>
              <small>Phiên bản đang chọn</small>

              <strong>{selectedVariant.variant_name}</strong>
            </div>

            {Number(selectedVariant.is_default) === 1 && (
              <span className="pd-default-variant-badge">Mặc định</span>
            )}
          </div>
        )}
      </div>

      {/* ======================================================
          META
      ====================================================== */}

      <div className="pd-meta-row">
        <div className="pd-meta-item">
          <i className="bi bi-upc-scan"></i>

          <span>SKU</span>

          <strong>{product?.sku || "—"}</strong>
        </div>

        <div className="pd-meta-divider"></div>

        <div className="pd-meta-item">
          <i className="bi bi-bag-check"></i>

          <span>Đã bán</span>

          <strong>{Number(baseProduct?.sold || product?.sold || 0)}</strong>
        </div>
      </div>

      {/* ======================================================
          REVIEW
      ====================================================== */}

      <div className="pd-rating-row">
        <div className="pd-rating-stars">
          {Array.from({
            length: 5,
          }).map((_, index) => {
            const filled = index < Math.round(Number(rating?.average || 0));

            return (
              <i
                key={index}
                className={`bi ${filled ? "bi-star-fill" : "bi-star"}`}
              ></i>
            );
          })}
        </div>

        <strong>{Number(rating?.average || 0).toFixed(1)}</strong>

        <span>
          ({Number(rating?.total || baseProduct?.rating?.count || 0)} đánh giá)
        </span>
      </div>

      {/* ======================================================
          PRICE
      ====================================================== */}

      <div className="pd-price-card">
        <div className="pd-price-card__main">
          <span className="pd-price-label">Giá hiện tại</span>

          <div className="pd-price-line">
            <strong>{formatPrice(product?.final_price)}</strong>

            {hasSale && <del>{formatPrice(product?.price)}</del>}
          </div>
        </div>

        {hasSale && Number(product?.discount_percent) > 0 && (
          <div className="pd-discount-badge">
            <i className="bi bi-lightning-charge-fill"></i>-
            {Number(product.discount_percent)}%
          </div>
        )}

        {hasSale && (
          <div className="pd-saving-line">
            Bạn tiết kiệm{" "}
            <strong>
              {formatPrice(
                Number(product?.price || 0) - Number(product?.final_price || 0),
              )}
            </strong>
          </div>
        )}
      </div>

      {/* ======================================================
          VARIANT SELECTOR
      ====================================================== */}

      {variantOptions.length > 0 && (
        <div className="pd-variant-box">
          <div className="pd-variant-box__heading">
            <div className="pd-variant-heading-icon">
              <i className="bi bi-sliders2"></i>
            </div>

            <div>
              <strong>Chọn phiên bản</strong>

              <span>Giá và tồn kho sẽ thay đổi theo lựa chọn</span>
            </div>
          </div>

          <div className="pd-variant-options">
            {variantOptions.map((option) => {
              const code = String(option?.code || "");

              const selectedValue = selectedValues[code];

              return (
                <div className="pd-variant-group" key={option.id || code}>
                  <div className="pd-variant-group__label">
                    <span>{option.name}</span>

                    {selectedValue && <strong>{selectedValue}</strong>}
                  </div>

                  <div className="pd-variant-values">
                    {(option.values || []).map((value) => {
                      const active =
                        String(selectedValue || "").toLowerCase() ===
                        String(value.value || "").toLowerCase();

                      const available =
                        typeof isOptionValueAvailable === "function"
                          ? isOptionValueAvailable(code, value.value)
                          : true;

                      return (
                        <button
                          key={value.id || value.value}
                          type="button"
                          className={`pd-variant-value ${
                            active ? "pd-variant-value--active" : ""
                          } ${!available ? "pd-variant-value--disabled" : ""}`}
                          disabled={!available}
                          onClick={() => onSelectOption(code, value.value)}
                        >
                          {option.display_type === "color" &&
                            value.color_code && (
                              <span
                                className="pd-variant-color-dot"
                                style={{
                                  backgroundColor: value.color_code,
                                }}
                              ></span>
                            )}

                          <span>{value.label || value.value}</span>

                          {active && <i className="bi bi-check-lg"></i>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {selectedVariant ? (
            <div className="pd-selected-variant-summary">
              <div className="pd-selected-variant-summary__icon">
                <i className="bi bi-check2-circle"></i>
              </div>

              <div className="pd-selected-variant-summary__content">
                <span>Phiên bản phù hợp</span>

                <strong>{selectedVariant.variant_name}</strong>
              </div>

              <div className="pd-selected-variant-summary__stock">
                <small>Tồn kho</small>

                <strong>{Number(selectedVariant.quantity || 0)}</strong>
              </div>
            </div>
          ) : (
            <div className="pd-variant-warning">
              <i className="bi bi-exclamation-triangle"></i>

              <span>Tổ hợp này hiện không có phiên bản phù hợp.</span>
            </div>
          )}
        </div>
      )}

      {/* ======================================================
          DESCRIPTION
      ====================================================== */}

      {baseProduct?.short_description && (
        <p className="pd-short-description">{baseProduct.short_description}</p>
      )}

      {/* ======================================================
          BENEFITS
      ====================================================== */}

      <div className="pd-benefit-grid">
        <div className="pd-benefit-item">
          <span>
            <i className="bi bi-patch-check-fill"></i>
          </span>

          <div>
            <strong>Chính hãng</strong>

            <small>Cam kết nguồn gốc</small>
          </div>
        </div>

        <div className="pd-benefit-item">
          <span>
            <i className="bi bi-truck"></i>
          </span>

          <div>
            <strong>Giao toàn quốc</strong>

            <small>Đóng gói an toàn</small>
          </div>
        </div>

        <div className="pd-benefit-item">
          <span>
            <i className="bi bi-headset"></i>
          </span>

          <div>
            <strong>Hỗ trợ kỹ thuật</strong>

            <small>Đồng hành sau mua</small>
          </div>
        </div>
      </div>

      {/* ======================================================
          QUANTITY
      ====================================================== */}

      {product?.in_stock && maxQuantity > 0 && (
        <div className="pd-buy-area">
          <div className="pd-buy-area__top">
            <div>
              <strong>Số lượng</strong>

              <span>Chọn số lượng muốn mua</span>
            </div>

            <div className="pd-stock-counter">
              <i className="bi bi-box2"></i>
              Còn <strong>{maxQuantity}</strong> sản phẩm
            </div>
          </div>

          <div className="pd-quantity-control">
            <button
              type="button"
              aria-label="Giảm số lượng"
              disabled={qty <= 1}
              onClick={decrease}
            >
              <i className="bi bi-dash-lg"></i>
            </button>

            <input
              type="number"
              min="1"
              max={maxQuantity}
              value={qty}
              onChange={handleQuantity}
            />

            <button
              type="button"
              aria-label="Tăng số lượng"
              disabled={qty >= maxQuantity}
              onClick={increase}
            >
              <i className="bi bi-plus-lg"></i>
            </button>
          </div>
        </div>
      )}

      {/* ======================================================
          ACTION
      ====================================================== */}

      <div className="pd-action-grid">
        <button
          className="pd-add-cart-btn"
          type="button"
          disabled={
            !product?.in_stock ||
            maxQuantity <= 0 ||
            actionLoading ||
            (hasVariants && !selectedVariant)
          }
          onClick={() => onAddToCart(qty)}
        >
          {actionLoading ? (
            <>
              <span className="pd-action-spinner"></span>
              Đang xử lý
            </>
          ) : (
            <>
              <i className="bi bi-cart-plus"></i>
              Thêm vào giỏ
            </>
          )}
        </button>

        <button
          className="pd-buy-now-btn"
          type="button"
          disabled={
            !product?.in_stock ||
            maxQuantity <= 0 ||
            actionLoading ||
            (hasVariants && !selectedVariant)
          }
          onClick={() =>
            onAddToCart(qty, {
              goCheckout: true,
            })
          }
        >
          <i className="bi bi-lightning-charge-fill"></i>
          Mua ngay
        </button>
      </div>

      {/* ======================================================
          MESSAGE
      ====================================================== */}

      {actionMessage && (
        <div className="pd-action-message">
          <i className="bi bi-info-circle"></i>

          <span>{actionMessage}</span>
        </div>
      )}
    </section>
  );
}

export default ProductInfo;
