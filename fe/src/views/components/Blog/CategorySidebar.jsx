function CategorySidebar({
  categories = [],
  category,
  setCategory,
  counts = {},
}) {
  return (
    <div className="blog-widget">
      <h3>Danh mục</h3>

      <ul className="category-list">
        {categories.map((item) => (
          <li
            key={item}
            className={category === item ? "active" : ""}
            onClick={() => setCategory(item)}
          >
            <span>{item}</span>

            {item !== "Tất cả" && (
              <small>{counts[item] || 0}</small>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default CategorySidebar;