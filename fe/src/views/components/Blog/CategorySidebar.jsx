function CategorySidebar({
  categories = [],
  category,
  setCategory,
  counts = {},
}) {
  return (
    <section className="blog-widget">
      <div className="blog-widget__heading">
        <span className="blog-widget__heading-icon">
          <i className="bi bi-grid" />
        </span>

        <div>
          <h3>Danh mục</h3>

          <p>Khám phá theo chủ đề</p>
        </div>
      </div>

      <ul className="category-list">
        {categories.map((item) => (
          <li key={item}>
            <button
              type="button"
              className={`category-list__button ${
                category === item ? "is-selected" : ""
              }`}
              onClick={() => setCategory(item)}
            >
              <span>{item}</span>

              <small>{Number(counts[item] || 0)}</small>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default CategorySidebar;
