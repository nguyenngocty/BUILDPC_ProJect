import { Link } from "react-router-dom";

import { useState } from "react";

import { useCart } from "../../../context/CartContext";

import { useAuth } from "../../../context/AuthContext";

import {
  formatPrice,
  getProductImageUrl,
  getStockLabel,
} from "../../../utils/productClient";

function ProductCard({ product }) {
  const { addToCart } = useCart();

  const { isAuthenticated } = useAuth();

  const [adding, setAdding] = useState(false);

  const [message, setMessage] = useState("");

  const rating = Number(product.rating?.average || 0);

  const reviewCount = Number(product.rating?.count || 0);

  const hasSale = Boolean(product.is_sale) && Number(product.sale_price) > 0;

  const slug = product.slug;

  const detailUrl = slug ? `/products/${slug}` : "#";

  const handleAddCart = async () => {
    if (!isAuthenticated) {
      setMessage("Vui lòng đăng nhập để thêm sản phẩm vào giỏ.");

      return;
    }

    if (!product.in_stock) {
      setMessage("Sản phẩm hiện đã hết hàng.");

      return;
    }

    try {
      setAdding(true);
      setMessage("");

      await addToCart(product.id, 1);

      setMessage("Đã thêm vào giỏ hàng.");
    } catch (error) {
      setMessage(
        error?.response?.data?.message ||
          error?.message ||
          "Không thể thêm sản phẩm vào giỏ.",
      );
    } finally {
      setAdding(false);
    }
  };

  return (
    <article className="pc-card">
      {hasSale && Number(product.discount_percent) > 0 && (
        <span className="pc-card__sale">-{product.discount_percent}%</span>
      )}

      <button
        className="pc-card__favorite"
        type="button"
        aria-label="Yêu thích sản phẩm"
      >
        <i className="bi bi-heart"></i>
      </button>

      <Link
        to={detailUrl}
        className="pc-card__image"
        onClick={(event) => {
          if (!slug) {
            event.preventDefault();
          }
        }}
      >
        <img
          src={getProductImageUrl(product.thumbnail)}
          alt={product.name}
          onError={(event) => {
            event.currentTarget.src = "/images/no-image.png";
          }}
        />
      </Link>

      <div className="pc-card__body">
        <div className="pc-card__meta">
          <span>{product.category_name || "Sản phẩm"}</span>

          <span className={`pc-stock pc-stock--${product.stock_status}`}>
            {getStockLabel(product.stock_status)}
          </span>
        </div>

        <h3 className="pc-card__title">
          <Link
            to={detailUrl}
            onClick={(event) => {
              if (!slug) {
                event.preventDefault();
              }
            }}
          >
            {product.name}
          </Link>
        </h3>

        <div className="pc-card__rating">
          <div className="pc-card__stars">
            <i className="bi bi-star-fill"></i>

            <span>{rating.toFixed(1)}</span>
          </div>

          <small>{reviewCount} đánh giá</small>
        </div>

        <div className="pc-card__price">
          <span className="pc-card__price-current">
            {formatPrice(product.final_price)}
          </span>

          {hasSale && (
            <span className="pc-card__price-old">
              {formatPrice(product.price)}
            </span>
          )}
        </div>

        <div className="pc-card__specs">
          {product.socket && (
            <span>
              <i className="bi bi-cpu"></i>
              Socket {product.socket}
            </span>
          )}

          {product.ram_type && (
            <span>
              <i className="bi bi-memory"></i>

              {product.ram_type}
            </span>
          )}

          <span>
            <i className="bi bi-patch-check-fill"></i>
            Chính hãng
          </span>
        </div>

        <div className="pc-card__actions">
          <Link
            to={detailUrl}
            className="pc-card__quick"
            aria-label="Xem chi tiết sản phẩm"
            onClick={(event) => {
              if (!slug) {
                event.preventDefault();
              }
            }}
          >
            <i className="bi bi-eye"></i>
          </Link>

          <button
            className="pc-card__cart"
            type="button"
            disabled={!product.in_stock || adding}
            onClick={handleAddCart}
          >
            <i className="bi bi-cart-plus"></i>

            <span>
              {adding
                ? "Đang thêm..."
                : product.in_stock
                  ? "Thêm vào giỏ"
                  : "Hết hàng"}
            </span>
          </button>
        </div>

        {message && <small className="pc-card__message">{message}</small>}
      </div>
    </article>
  );
}

export default ProductCard;
