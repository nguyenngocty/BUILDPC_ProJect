import {
  formatPrice,
  getStockClass,
  getStockLabel,
} from "../../../utils/productClient";

function ProductStickyBox({ product, actionLoading, onAddToCart, onBuyNow }) {
  const hasSale = product.is_sale && Number(product.sale_price) > 0;

  return (
    <aside className="sticky-product">
      <div className="sticky-card">
        <div className={`sticky-label ${getStockClass(product.stock_status)}`}>
          {getStockLabel(product.stock_status)}
        </div>

        <h3 className="sticky-name">{product.name}</h3>

        <div className="sticky-price-group">
          <div className="sticky-current-price">
            {formatPrice(product.final_price)}
          </div>

          {hasSale && (
            <div className="sticky-old-price">{formatPrice(product.price)}</div>
          )}
        </div>

        <div className="sticky-feature-list">
          <div className="sticky-feature">
            <i className="bi bi-patch-check-fill"></i>

            <span>Chính hãng</span>
          </div>

          <div className="sticky-feature">
            <i className="bi bi-box-seam"></i>

            <span>Tồn kho: {Number(product.quantity || 0)}</span>
          </div>

          <div className="sticky-feature">
            <i className="bi bi-truck"></i>

            <span>Giao hàng toàn quốc</span>
          </div>
        </div>

        <button
          className="sticky-buy-btn"
          type="button"
          disabled={!product.in_stock || actionLoading}
          onClick={onBuyNow}
        >
          <i className="bi bi-lightning-charge-fill"></i>

          {product.in_stock ? "Mua ngay" : "Hết hàng"}
        </button>

        <button
          className="sticky-cart-btn"
          type="button"
          disabled={!product.in_stock || actionLoading}
          onClick={onAddToCart}
        >
          <i className="bi bi-cart-plus"></i>
          Thêm vào giỏ
        </button>
      </div>
    </aside>
  );
}

export default ProductStickyBox;
