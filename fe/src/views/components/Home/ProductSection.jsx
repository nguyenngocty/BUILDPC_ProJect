import SectionTitle from "./SectionTitle";
import { Link } from "react-router-dom";

function ProductSection({ products = [] }) {
  // Khai báo sẵn domain của backend (hoặc lấy từ biến môi trường)
  const API_URL = "http://localhost:5000"; // Thay đổi nếu cổng backend của bạn khác

  return (
    <section className="product-section my-4">
      <SectionTitle title="Sản phẩm bán chạy" link="Xem tất cả" />

      <div className="d-flex flex-nowrap overflow-x-auto gap-3 pb-3" style={{ scrollSnapType: 'x mandatory' }}>
        {products.map((item, index) => {
          const hasSale = item.sale_price && Number(item.sale_price) < Number(item.price);
          const discountPercent = hasSale
            ? Math.round(((item.price - item.sale_price) / item.price) * 100)
            : 0;

          const productLink = `/products/${item.slug || item.id}`;

          // Xử lý đường dẫn ảnh: Nếu thumbnail không bắt đầu bằng http, tự động nối thêm domain backend
          let imageUrl = item.thumbnail;
          if (imageUrl && !imageUrl.startsWith("http")) {
            // Đảm bảo không bị thừa dấu gạch chéo
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

              {/* Bọc ảnh bằng Link dẫn tới chi tiết sản phẩm */}
              <Link to={productLink} className="product-card__image text-center py-2 d-block text-decoration-none">
                <img 
                  src={item.thumbnail ? (item.thumbnail.startsWith('http') ? item.thumbnail : `http://localhost:5000${item.thumbnail}`) : ""} 
                  alt={item.name} 
                  className="img-fluid" 
                  style={{ height: "140px", objectFit: "contain" }} 
                  // Xóa hoặc thay sự kiện onError để tránh bị lặp vô tận
                  onError={(e) => {
                    e.target.style.display = 'none'; // Ẩn luôn ảnh bị lỗi đi thay vì bắt nó load lại trang ngoài
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

                {/* Thay đổi từ <button> thành <Link> để xem chi tiết */}
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