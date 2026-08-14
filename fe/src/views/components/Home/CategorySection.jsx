import SectionTitle from "./SectionTitle";

function CategorySection({ categories }) {
  const icons = [
    "bi-cpu",
    "bi-motherboard",
    "bi-memory",
    "bi-gpu-card",
    "bi-device-ssd",
    "bi-plugin",
    "bi-fan",
    "bi-pc-display",
    "bi-headset",
    "bi-keyboard",
  ];

  return (
    <section className="category">
      <SectionTitle title="Danh mục nổi bật" link="Xem tất cả" />

      <div className="category__grid">
        {categories.map((item, index) => (
          <article className="category-card" key={index}>
            <div className="category-card__icon">
              <i className={`bi ${icons[index % icons.length]}`}></i>
            </div>

            <h4 className="category-card__title">{item}</h4>

            <span className="category-card__arrow">
              <i className="bi bi-arrow-right"></i>
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}

export default CategorySection;
