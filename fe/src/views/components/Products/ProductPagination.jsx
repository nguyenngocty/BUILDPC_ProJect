function ProductPagination({ pagination, onPageChange }) {
  const currentPage = Number(pagination.page) || 1;

  const totalPages = Number(pagination.totalPages) || 0;

  if (totalPages <= 1) {
    return null;
  }

  const pages = [];

  const start = Math.max(1, currentPage - 2);

  const end = Math.min(totalPages, currentPage + 2);

  for (let page = start; page <= end; page++) {
    pages.push(page);
  }

  return (
    <nav className="product-pagination" aria-label="Phân trang sản phẩm">
      <button
        type="button"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        <i className="bi bi-chevron-left"></i>
      </button>

      {start > 1 && (
        <>
          <button type="button" onClick={() => onPageChange(1)}>
            1
          </button>

          {start > 2 && <span className="pagination-dots">...</span>}
        </>
      )}

      {pages.map((page) => (
        <button
          key={page}
          type="button"
          className={page === currentPage ? "is-active" : ""}
          onClick={() => onPageChange(page)}
        >
          {page}
        </button>
      ))}

      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className="pagination-dots">...</span>}

          <button type="button" onClick={() => onPageChange(totalPages)}>
            {totalPages}
          </button>
        </>
      )}

      <button
        type="button"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        <i className="bi bi-chevron-right"></i>
      </button>
    </nav>
  );
}

export default ProductPagination;
