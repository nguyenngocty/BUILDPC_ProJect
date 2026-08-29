import { useState } from "react";

import { Link } from "react-router-dom";

import toast from "react-hot-toast";

import SectionTitle from "./SectionTitle";

import { useCart } from "../../../context/CartContext";
import { useAuth } from "../../../context/AuthContext";

import {
  formatPrice,
  getProductImageUrl,
  getStockLabel,
} from "../../../utils/productClient";

// ============================================================
// PRODUCT SKELETON
// ============================================================

const ProductSkeleton = ({ index }) => {
  return (
    <article
      className="client-home-product-card client-home-product-card--skeleton"
      aria-hidden="true"
      key={`product-skeleton-${index}`}
    >
      <div className="client-home-skeleton client-home-product-card__skeleton-image" />

      <div className="client-home-product-card__body">
        <div className="client-home-skeleton client-home-product-card__skeleton-small" />

        <div className="client-home-skeleton client-home-product-card__skeleton-title" />

        <div className="client-home-skeleton client-home-product-card__skeleton-title client-home-product-card__skeleton-title--short" />

        <div className="client-home-skeleton client-home-product-card__skeleton-price" />

        <div className="client-home-skeleton client-home-product-card__skeleton-button" />
      </div>
    </article>
  );
};

// ============================================================
// PRODUCT CARD
// ============================================================

const HomeProductCard = ({ product }) => {
  const { addToCart } = useCart();

  const { isAuthenticated } = useAuth();

  const [adding, setAdding] = useState(false);

  const productId = Number(product?.id || 0);

  const slug = String(product?.slug || "").trim();

  const detailUrl = slug ? `/products/${slug}` : "/products";

  const rating = Number(product?.rating?.average || 0);

  const reviewCount = Number(product?.rating?.count || 0);

  const sold = Math.max(Number(product?.sold || 0), 0);

  const hasVariants = Boolean(product?.has_variants);

  const defaultVariantId = Number(
    product?.default_variant_id || product?.default_variant?.id || 0,
  );

  const hasSale =
    Boolean(product?.is_sale) &&
    Number(product?.sale_price || 0) > 0 &&
    Number(product?.sale_price) < Number(product?.price || 0);

  const inStock = Boolean(product?.in_stock);

  // ==========================================================
  // ADD TO CART
  // ==========================================================

  const handleAddToCart = async () => {
    if (hasVariants) {
      return;
    }

    if (!isAuthenticated) {
      toast.error("Vui lòng đăng nhập để thêm sản phẩm vào giỏ.");

      return;
    }

    if (!productId) {
      toast.error("Sản phẩm không hợp lệ.");

      return;
    }

    if (!inStock) {
      toast.error("Sản phẩm hiện đã hết hàng.");

      return;
    }

    /*
     * Backend hiện tại tạo default variant ngay cả cho sản phẩm
     * không có nhiều phiên bản.
     *
     * Nếu API có default_variant_id:
     * gửi variant_id luôn để Cart xác định chính xác item.
     *
     * Nếu dữ liệu legacy không có variant:
     * để null và Backend xử lý.
     */
    try {
      setAdding(true);

      await addToCart({
        product_id: productId,

        variant_id: defaultVariantId > 0 ? defaultVariantId : null,

        quantity: 1,
      });

      toast.success("Đã thêm sản phẩm vào giỏ hàng.");
    } catch (error) {
      console.error("Lỗi thêm sản phẩm từ Home:", error);

      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Không thể thêm sản phẩm vào giỏ hàng.",
      );
    } finally {
      setAdding(false);
    }
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <article className="client-home-product-card">
      <div className="client-home-product-card__visual">
        {hasSale && Number(product.discount_percent || 0) > 0 && (
          <span className="client-home-product-card__discount">
            -{Number(product.discount_percent)}%
          </span>
        )}

        {sold > 0 && (
          <span className="client-home-product-card__sold-badge">
            <i className="bi bi-fire" />
            Đã bán {sold.toLocaleString("vi-VN")}
          </span>
        )}

        <Link to={detailUrl} className="client-home-product-card__image-link">
          <img
            src={getProductImageUrl(product.thumbnail)}
            alt={product.name || "Sản phẩm"}
            loading="lazy"
            onError={(event) => {
              event.currentTarget.src = "/images/no-image.png";
            }}
          />
        </Link>
      </div>

      <div className="client-home-product-card__body">
        <div className="client-home-product-card__meta">
          <Link
            to={
              product.category_slug
                ? `/products?category=${encodeURIComponent(
                    product.category_slug,
                  )}`
                : "/products"
            }
            className="client-home-product-card__category"
          >
            {product.category_name || "Linh kiện PC"}
          </Link>

          <span
            className={`client-home-product-card__stock client-home-product-card__stock--${
              product.stock_status || "in_stock"
            }`}
          >
            {getStockLabel(product.stock_status)}
          </span>
        </div>

        <h3 className="client-home-product-card__title">
          <Link to={detailUrl}>{product.name}</Link>
        </h3>

        <div className="client-home-product-card__rating-row">
          <div className="client-home-product-card__rating">
            <i className="bi bi-star-fill" />

            <strong>{rating.toFixed(1)}</strong>

            <span>({reviewCount})</span>
          </div>

          {hasVariants && (
            <span className="client-home-product-card__variant-label">
              <i className="bi bi-layers" />
              {Number(product.available_variant_count || 0)} phiên bản
            </span>
          )}
        </div>

        <div className="client-home-product-card__price">
          <strong>{formatPrice(product.final_price)}</strong>

          {hasSale && <del>{formatPrice(product.price)}</del>}
        </div>

        <div className="client-home-product-card__features">
          {product.socket && (
            <span>
              <i className="bi bi-cpu" />
              {product.socket}
            </span>
          )}

          {product.ram_type && (
            <span>
              <i className="bi bi-memory" />
              {product.ram_type}
            </span>
          )}

          <span>
            <i className="bi bi-patch-check-fill" />
            Chính hãng
          </span>
        </div>

        <div className="client-home-product-card__actions">
          <Link
            to={detailUrl}
            className="client-home-product-card__detail"
            aria-label={`Xem chi tiết ${product.name}`}
          >
            <i className="bi bi-eye" />
          </Link>

          {hasVariants ? (
            <Link
              to={detailUrl}
              className="client-home-product-card__main-action"
            >
              <i className="bi bi-sliders" />

              <span>Chọn phiên bản</span>
            </Link>
          ) : (
            <button
              type="button"
              className="client-home-product-card__main-action"
              disabled={!inStock || adding}
              onClick={handleAddToCart}
            >
              <i
                className={adding ? "bi bi-arrow-repeat" : "bi bi-cart-plus"}
              />

              <span>
                {adding
                  ? "Đang thêm..."
                  : inStock
                    ? "Thêm vào giỏ"
                    : "Hết hàng"}
              </span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

// ============================================================
// COMPONENT
// ============================================================

function ProductSection({ products = [], loading = false, error = "" }) {
  return (
    <section className="client-home-product-section">
      <SectionTitle
        eyebrow="NỔI BẬT"
        title="Sản phẩm bán chạy"
        description="Những linh kiện được khách hàng lựa chọn nhiều nhất dựa trên các đơn hàng đã hoàn tất."
        link="/products?sort=best_selling"
        linkText="Xem tất cả"
      />

      {loading && (
        <div className="client-home-product-grid">
          {Array.from({ length: 8 }).map((_, index) => (
            <ProductSkeleton key={index} index={index} />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="client-home-section-state client-home-section-state--error">
          <span className="client-home-section-state__icon">
            <i className="bi bi-exclamation-triangle" />
          </span>

          <div>
            <strong>Không thể tải sản phẩm bán chạy</strong>

            <p>{error}</p>
          </div>
        </div>
      )}

      {!loading && !error && products.length === 0 && (
        <div className="client-home-section-state">
          <span className="client-home-section-state__icon">
            <i className="bi bi-box-seam" />
          </span>

          <div>
            <strong>Chưa có sản phẩm bán chạy</strong>

            <p>
              Khi hệ thống có dữ liệu bán hàng, sản phẩm nổi bật sẽ xuất hiện
              tại đây.
            </p>
          </div>
        </div>
      )}

      {!loading && !error && products.length > 0 && (
        <div className="client-home-product-grid">
          {products.map((product) => (
            <HomeProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
}

export default ProductSection;
