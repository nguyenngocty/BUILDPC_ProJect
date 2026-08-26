import {
  formatPrice,
  getStockClass,
  getStockLabel,
} from "../../../utils/productClient";

function ProductStickyBox({
  product,

  selectedVariant,

  hasVariants,

  actionLoading,

  onAddToCart,

  onBuyNow,
}) {
  if (!product) {
    return null;
  }

  const hasSale =
    Boolean(product.is_sale) &&
    Number(product.sale_price) > 0 &&
    Number(product.sale_price) < Number(product.price);

  const available =
    Boolean(product.in_stock) &&
    Number(product.quantity || 0) > 0 &&
    (!hasVariants || Boolean(selectedVariant));

  return (
    <aside className="pd-sticky-product">
      <div className="pd-sticky-card">
        {/* ====================================================
            HEADER
        ==================================================== */}

        <div className="pd-sticky-card__top">
          <span
            className={`pd-sticky-stock ${getStockClass(product.stock_status)}`}
          >
            <span></span>

            {getStockLabel(product.stock_status)}
          </span>

          <div className="pd-sticky-security">
            <i className="bi bi-shield-check"></i>
          </div>
        </div>

        {/* ====================================================
            NAME
        ==================================================== */}

        <h3 className="pd-sticky-name">{product.name}</h3>

        {/* ====================================================
            VARIANT
        ==================================================== */}

        {hasVariants && selectedVariant && (
          <div className="pd-sticky-variant">
            <span className="pd-sticky-variant__icon">
              <i className="bi bi-box-seam"></i>
            </span>

            <div>
              <small>Phiên bản</small>

              <strong>{selectedVariant.variant_name}</strong>
            </div>
          </div>
        )}

        {/* ====================================================
            PRICE
        ==================================================== */}

        <div className="pd-sticky-price">
          <small>Giá bán</small>

          <strong>{formatPrice(product.final_price)}</strong>

          {hasSale && (
            <div className="pd-sticky-price__old">
              <del>{formatPrice(product.price)}</del>

              {Number(product.discount_percent || 0) > 0 && (
                <span>-{product.discount_percent}%</span>
              )}
            </div>
          )}
        </div>

        {/* ====================================================
            INFORMATION
        ==================================================== */}

        <div className="pd-sticky-info">
          <div>
            <span>
              <i className="bi bi-upc-scan"></i>
            </span>

            <div>
              <small>SKU</small>

              <strong>{product.sku || "—"}</strong>
            </div>
          </div>

          <div>
            <span>
              <i className="bi bi-box2"></i>
            </span>

            <div>
              <small>Tồn kho</small>

              <strong>{Number(product.quantity || 0)} sản phẩm</strong>
            </div>
          </div>

          <div>
            <span>
              <i className="bi bi-truck"></i>
            </span>

            <div>
              <small>Vận chuyển</small>

              <strong>Toàn quốc</strong>
            </div>
          </div>
        </div>

        {/* ====================================================
            ACTION
        ==================================================== */}

        <div className="pd-sticky-actions">
          <button
            className="pd-sticky-buy-btn"
            type="button"
            disabled={!available || actionLoading}
            onClick={onBuyNow}
          >
            {actionLoading ? (
              <span className="pd-action-spinner"></span>
            ) : (
              <i className="bi bi-lightning-charge-fill"></i>
            )}

            {available
              ? "Mua ngay"
              : hasVariants && !selectedVariant
                ? "Chọn phiên bản"
                : "Hết hàng"}
          </button>

          <button
            className="pd-sticky-cart-btn"
            type="button"
            disabled={!available || actionLoading}
            onClick={onAddToCart}
          >
            <i className="bi bi-cart-plus"></i>
            Thêm vào giỏ
          </button>
        </div>

        {/* ====================================================
            FOOTER
        ==================================================== */}

        <div className="pd-sticky-footer">
          <i className="bi bi-lock-fill"></i>

          <span>Thanh toán an toàn & bảo mật</span>
        </div>
      </div>
    </aside>
  );
}

export default ProductStickyBox;
