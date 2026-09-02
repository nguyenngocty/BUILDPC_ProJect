function Pagination({ total, current, perPage, setCurrent }) {
  const totalPages = Math.ceil(total / perPage);

  if (totalPages <= 1) {
    return null;
  }

  const pages = [];

  const start = Math.max(1, current - 2);

  const end = Math.min(totalPages, current + 2);

  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }

  return (
    <nav className="blog-pagination" aria-label="Phân trang bài viết">
      <button
        type="button"
        className="blog-pagination__button"
        disabled={current <= 1}
        aria-label="Trang trước"
        onClick={() => setCurrent(current - 1)}
      >
        <i className="bi bi-chevron-left" />
      </button>

      {start > 1 && (
        <>
          <button
            type="button"
            className="blog-pagination__button"
            onClick={() => setCurrent(1)}
          >
            1
          </button>

          {start > 2 && <span className="blog-pagination__dots">...</span>}
        </>
      )}

      {pages.map((page) => (
        <button
          key={page}
          type="button"
          className={`blog-pagination__button ${
            current === page ? "is-current" : ""
          }`}
          aria-current={current === page ? "page" : undefined}
          onClick={() => setCurrent(page)}
        >
          {page}
        </button>
      ))}

      {end < totalPages && (
        <>
          {end < totalPages - 1 && (
            <span className="blog-pagination__dots">...</span>
          )}

          <button
            type="button"
            className="blog-pagination__button"
            onClick={() => setCurrent(totalPages)}
          >
            {totalPages}
          </button>
        </>
      )}

      <button
        type="button"
        className="blog-pagination__button"
        disabled={current >= totalPages}
        aria-label="Trang sau"
        onClick={() => setCurrent(current + 1)}
      >
        <i className="bi bi-chevron-right" />
      </button>
    </nav>
  );
}

export default Pagination;
