import SectionTitle from "./SectionTitle";

function ProductSection({ products }) {
  return (
    <section className="product-section">
      <SectionTitle title="Sản phẩm bán chạy" link="Xem tất cả" />

      <div className="product-section__grid">
        {products.map((item, index) => (
          <article className="product-card" key={index}>
            <span className="product-card__discount">-{item.sale}%</span>

            <div className="product-card__image">
              <img src={item.img} alt={item.name} />
            </div>

            <div className="product-card__body">
              <h3 className="product-card__title">{item.name}</h3>

              <div className="product-card__priceGroup">
                <span className="product-card__price">{item.price}</span>

                <del className="product-card__oldPrice">{item.old}</del>
              </div>

              <div className="product-card__rating">
                <div className="product-card__stars">
                  <i className="bi bi-star-fill"></i>
                  <i className="bi bi-star-fill"></i>
                  <i className="bi bi-star-fill"></i>
                  <i className="bi bi-star-fill"></i>
                  <i className="bi bi-star-fill"></i>
                </div>

                <span>Đã bán {item.sold}</span>
              </div>

              <button className="product-card__button">
                <i className="bi bi-cart-plus"></i>
                Thêm vào giỏ hàng
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default ProductSection;
