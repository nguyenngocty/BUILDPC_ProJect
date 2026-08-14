import "./css/CategoryPagination.css";

function CategoryPagination({ pagination, filters, setFilters }) {
  if (!pagination) return null;

  const { page, totalPages, total, limit } = pagination;

  if (totalPages <= 1) return null;

  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  const changePage = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;

    setFilters((prev) => ({
      ...prev,
      page: newPage,
    }));
  };

  const getPages = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (page <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages];
    }

    if (page >= totalPages - 3) {
      return [
        1,
        "...",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }

    return [1, "...", page - 1, page, page + 1, "...", totalPages];
  };

  const pages = getPages();

  return (
    <div className="category-pagination">
      <div className="category-pagination-info">
        Hiển thị <strong>{start}</strong> - <strong>{end}</strong> trên{" "}
        <strong>{total}</strong> danh mục
      </div>

      <div className="category-pagination-actions">
        <button onClick={() => changePage(1)} disabled={page === 1}>
          <i className="bi bi-chevron-double-left"></i>
        </button>

        <button onClick={() => changePage(page - 1)} disabled={page === 1}>
          <i className="bi bi-chevron-left"></i>
        </button>

        {pages.map((item, index) =>
          item === "..." ? (
            <span key={index} className="category-pagination-dots">
              ...
            </span>
          ) : (
            <button
              key={item}
              className={page === item ? "active" : ""}
              onClick={() => changePage(item)}
            >
              {item}
            </button>
          ),
        )}

        <button
          onClick={() => changePage(page + 1)}
          disabled={page === totalPages}
        >
          <i className="bi bi-chevron-right"></i>
        </button>

        <button
          onClick={() => changePage(totalPages)}
          disabled={page === totalPages}
        >
          <i className="bi bi-chevron-double-right"></i>
        </button>
      </div>
    </div>
  );
}

export default CategoryPagination;
