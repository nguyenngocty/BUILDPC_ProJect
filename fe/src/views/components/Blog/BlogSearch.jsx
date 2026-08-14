function BlogSearch({
  search,
  setSearch,
  category,
  setCategory,
  categories = [],
}) {
  return (
    <section className="blog-search">
      <div className="search-box">
        <i className="bi bi-search"></i>

        <input
          type="text"
          placeholder="Tìm kiếm bài viết..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      >
        {categories.map((item) => (
          <option
            key={item}
            value={item}
          >
            {item}
          </option>
        ))}
      </select>
    </section>
  );
}

export default BlogSearch;