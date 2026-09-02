function PopularTags({ tags = [], selectedTag = "", onSelectTag }) {
  return (
    <section className="bp-tags">
      <div className="bp-tags__header">
        <h3 className="bp-tags__title">
          <i className="bi bi-tags-fill" />
          Chủ đề nổi bật
        </h3>

        <p className="bp-tags__subtitle">
          Khám phá nhanh các chủ đề được quan tâm.
        </p>
      </div>

      <div className="bp-tags__list">
        {tags.map((tag) => (
          <button
            key={tag}
            type="button"
            className={`bp-tags__item ${
              selectedTag === tag ? "is-selected" : ""
            }`}
            onClick={() => onSelectTag?.(tag)}
          >
            <span className="bp-tags__hash">#</span>

            {tag}
          </button>
        ))}
      </div>
    </section>
  );
}

export default PopularTags;
