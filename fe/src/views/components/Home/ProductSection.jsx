import SectionTitle from "./SectionTitle";
import { Link } from "react-router-dom";

function ProductSection({ products = [] }) {
  // Khai báo sẵn domain của backend (hoặc lấy từ biến môi trường)
  const API_URL = "http://localhost:5000";

  // 1. Sắp xếp sản phẩm theo số lượng bán (sold) giảm dần và lấy tối đa 8 sản phẩm
  const bestSellingProducts = [...products]
    .sort((a, b) => (Number(b.sold) || 0) - (Number(a.sold) || 0))
    .slice(0, 8);

  return (
    <section className="product-section my-4">
      <SectionTitle title="Sản phẩm bán chạy" link="Xem tất cả" />

      {/* 2. Dùng mảng đã sắp xếp và lọc (bestSellingProducts) thay vì products gốc */}
      <div className="d-flex flex-nowrap overflow-x-auto gap-3 pb-3" style={{ scrollSnapType: 'x mandatory' }}>
        {bestSellingProducts.map((item, index) => {
          const hasSale = item.sale_price && Number(item.sale_price) < Number(item.price);
          const discountPercent = hasSale
            ? Math.round(((item.price - item.sale_price) / item.price) * 100)
            : 0;

          const productLink = `/products/${item.slug || item.id}`;

          // Xử lý đường dẫn ảnh
          let imageUrl = item.thumbnail;
          if (imageUrl && !imageUrl.startsWith("http")) {
            imageUrl = `${API_URL}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
          }

          return (
            <article 
              className="product-card card shadow-sm p-2 flex-shrink-0" 
              style={{ width: "230px", scrollSnapAlign: 'start' }} 
              key={item.id || index}
            >
              {hasSale && (
                <span className="badge bg-danger position-absolute m-2 z-1">-{discountPercent}%</span>
              )}

              <Link to={productLink} className="product-card__image text-center py-2 d-block text-decoration-none">
                <img 
                  src={imageUrl} 
                  alt={item.name} 
                  className="img-fluid" 
                  style={{ height: "140px", objectFit: "contain" }} 
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </Link>

              <div className="product-card__body card-body p-2">
                <h3 className="product-card__title fs-6 mb-2">
                  <Link to={productLink} className="text-dark text-decoration-none text-truncate d-block" title={item.name}>
                    {item.name}
                  </Link>
                </h3>

                <div className="product-card__priceGroup mb-2">
                  <span className="product-card__price text-danger fw-bold me-2">
                    {Number(hasSale ? item.sale_price : item.price).toLocaleString('vi-VN')} đ
                  </span>

                  {hasSale && (
                    <del className="product-card__oldPrice text-muted small">
                      {Number(item.price).toLocaleString('vi-VN')} đ
                    </del>
                  )}
                </div>

                <div className="product-card__rating d-flex justify-content-between align-items-center small text-muted mb-2">
                  <div className="product-card__stars text-warning">
                    <i className="bi bi-star-fill"></i>
                    <i className="bi bi-star-fill"></i>
                    <i className="bi bi-star-fill"></i>
                    <i className="bi bi-star-fill"></i>
                    <i className="bi bi-star-fill"></i>
                  </div>
                  <span>Đã bán {item.sold || 0}</span>
                </div>

                <Link 
                  to={productLink} 
                  className="product-card__button btn btn-outline-primary btn-sm w-100 text-decoration-none"
                >
                  <i className="bi bi-eye"></i> Xem chi tiết
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default ProductSection;