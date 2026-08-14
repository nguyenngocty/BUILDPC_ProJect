import { Link } from "react-router-dom";

import { formatPrice, getProductImageUrl } from "../../../utils/productClient";

function ProductRelated({ products = [], onAddToCart }) {
  if (products.length === 0) {
    return null;
  }

  return (
    <section className="related-products">
      <div className="related-header">
        <div>
          <h2 className="related-title">Sản phẩm liên quan</h2>

          <p className="related-subtitle">
            Một số lựa chọn khác trong cùng danh mục.
          </p>
        </div>
      </div>

      <div className="related-grid">
        {products.map((item) => {
          const hasSale = Number(item.sale_price) > 0;

          return (
            <article className="related-card" key={item.id}>
              {Number(item.discount_percent) > 0 && (
                <span className="related-sale">-{item.discount_percent}%</span>
              )}

              <Link to={`/products/${item.slug}`} className="related-image">
                <img
                  src={getProductImageUrl(item.thumbnail)}
                  alt={item.name}
                  onError={(event) => {
                    event.currentTarget.src = "/images/no-image.png";
                  }}
                />
              </Link>

              <div className="related-content">
                <h3 className="related-name">{item.name}</h3>

                <div className="related-price">
                  {formatPrice(hasSale ? item.sale_price : item.price)}
                </div>

                {hasSale && (
                  <div className="related-old-price">
                    {formatPrice(item.price)}
                  </div>
                )}

                <div className="related-action">
                  <Link
                    to={`/products/${item.slug}`}
                    className="related-detail-btn"
                  >
                    Xem chi tiết
                  </Link>

                  <button
                    type="button"
                    className="related-cart-btn"
                    onClick={() => onAddToCart?.(item)}
                  >
                    <i className="bi bi-cart-plus"></i>
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default ProductRelated;
