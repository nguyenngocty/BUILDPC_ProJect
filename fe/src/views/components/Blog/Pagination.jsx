function Pagination({
  total,
  current,
  perPage,
  setCurrent,
}) {
  const totalPages = Math.ceil(total / perPage);

  if (totalPages <= 1) return null;

  const pages = [];

  for (let i = 1; i <= totalPages; i++) {
    pages.push(i);
  }

  return (
    <div className="blog-pagination">

      {/* Previous */}

      <button
        disabled={current === 1}
        onClick={() => setCurrent(current - 1)}
      >
        <i className="bi bi-chevron-left"></i>
      </button>

      {pages.map((page) => (
        <button
          key={page}
          className={current === page ? "active" : ""}
          onClick={() => setCurrent(page)}
        >
          {page}
        </button>
      ))}

      {/* Next */}

      <button
        disabled={current === totalPages}
        onClick={() => setCurrent(current + 1)}
      >
        <i className="bi bi-chevron-right"></i>
      </button>

    </div>
  );
}

export default Pagination;