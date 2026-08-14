import { useEffect, useState } from "react";

import {
  formatPrice,
  getStockClass,
  getStockLabel,
} from "../../../utils/productClient";

function ProductInfo({
  product,
  rating,
  actionLoading,
  actionMessage,
  onAddToCart,
}) {
  const [qty, setQty] = useState(1);

  useEffect(() => {
    setQty(1);
  }, [product.id]);

  const maxQuantity = Math.max(Number(product.quantity || 0), 0);

  const increase = () => {
    setQty((current) => Math.min(current + 1, Math.max(maxQuantity, 1)));
  };

  const decrease = () => {
    setQty((current) => Math.max(current - 1, 1));
  };

  const handleQuantity = (event) => {
    const value = Number(event.target.value);

    if (!Number.isFinite(value)) {
      return;
    }

    setQty(Math.max(Math.min(Math.floor(value), Math.max(maxQuantity, 1)), 1));
  };

  const hasSale = product.is_sale && Number(product.sale_price) > 0;

  return (
    <section className="product-detail-panel">
      <div className="product-info-topline">
        <span className="product-brand-tag">
          {product.category_name || "Sản phẩm"}
        </span>

        <span
          className={`product-stock-badge ${getStockClass(
            product.stock_status,
          )}`}
        >
          {getStockLabel(product.stock_status)}
        </span>
      </div>

      <h1 className="product-name">{product.name}</h1>

      <div className="product-code-row">
        <span>
          SKU: <strong>{product.sku}</strong>
        </span>

        <span>
          Đã bán: <strong>{Number(product.sold || 0)}</strong>
        </span>
      </div>

      <div className="product-review">
        <div className="product-stars">
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
          ({Number(rating?.total || product.rating?.count || 0)} đánh giá)
        </span>
      </div>

      <div className="price-section">
        <div className="current-price">{formatPrice(product.final_price)}</div>

        {hasSale && (
          <div className="old-price">{formatPrice(product.price)}</div>
        )}
      </div>

      {hasSale && product.discount_percent > 0 && (
        <div className="saving-box">
          Tiết kiệm{" "}
          {formatPrice(Number(product.price) - Number(product.final_price))} (
          {product.discount_percent}
          %)
        </div>
      )}

      {product.short_description && (
        <p className="product-short-description">{product.short_description}</p>
      )}

      <div className="benefit-list">
        <div className="benefit-card">
          <i className="bi bi-patch-check-fill"></i>

          <span>Sản phẩm chính hãng</span>
        </div>

        <div className="benefit-card">
          <i className="bi bi-truck"></i>

          <span>Giao hàng toàn quốc</span>
        </div>

        <div className="benefit-card">
          <i className="bi bi-headset"></i>

          <span>Hỗ trợ kỹ thuật sau bán hàng</span>
        </div>
      </div>

      {product.in_stock && (
        <>
          <div className="product-quantity-label">
            <span>Số lượng</span>

            <small>Tồn kho: {maxQuantity}</small>
          </div>

          <div className="quantity-wrapper">
            <button type="button" onClick={decrease} disabled={qty <= 1}>
              −
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
              onClick={increase}
              disabled={qty >= maxQuantity}
            >
              +
            </button>
          </div>
        </>
      )}

      <div className="action-buttons">
        <button
          className="cart-button"
          type="button"
          disabled={!product.in_stock || actionLoading}
          onClick={() => onAddToCart(qty)}
        >
          <i className="bi bi-cart3"></i>

          {actionLoading
            ? "Đang xử lý..."
            : product.in_stock
              ? "Thêm vào giỏ"
              : "Hết hàng"}
        </button>

        <button
          className="buy-button"
          type="button"
          disabled={!product.in_stock || actionLoading}
          onClick={() =>
            onAddToCart(qty, {
              goCheckout: true,
            })
          }
        >
          Mua ngay
        </button>
      </div>

      {actionMessage && (
        <div className="product-action-message">{actionMessage}</div>
      )}
    </section>
  );
}

export default ProductInfo;
