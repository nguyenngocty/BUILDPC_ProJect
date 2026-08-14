import { useMemo } from "react";
import "./css/ProductPagination.css";

function ProductPagination({ pagination, filters, setFilters }) {
  const page = pagination.page;

  const totalPages = pagination.totalPages;

  const total = pagination.total;

  const limit = pagination.limit;

  const start = total === 0 ? 0 : (page - 1) * limit + 1;

  const end = Math.min(page * limit, total);

  const changePage = (newPage) => {
    if (newPage < 1) return;

    if (newPage > totalPages) return;

    if (newPage === page) return;

    setFilters((prev) => ({
      ...prev,
      page: newPage,
    }));
  };

  const renderPages = () => {
    const pages = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }

      return pages;
    }

    pages.push(1);

    if (page > 4) {
      pages.push("left-dot");
    }

    const startPage = Math.max(2, page - 1);

    const endPage = Math.min(totalPages - 1, page + 1);

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    if (page < totalPages - 3) {
      pages.push("right-dot");
    }

    pages.push(totalPages);

    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="product-pagination">
      <div className="pagination-info">
        Hiển thị
        <b>
          {" "}
          {start} - {end}{" "}
        </b>
        / <b>{total}</b> sản phẩm
      </div>

      <div className="pagination-buttons">
        <button onClick={() => changePage(1)} disabled={page === 1}>
          «
        </button>

        <button onClick={() => changePage(page - 1)} disabled={page === 1}>
          ‹
        </button>

        {renderPages().map((item) => {
          if (item === "left-dot" || item === "right-dot") {
            return (
              <span key={item} className="pagination-dot">
                ...
              </span>
            );
          }

          return (
            <button
              key={item}
              className={item === page ? "product-pagination-active" : ""}
              onClick={() => changePage(item)}
            >
              {item}
            </button>
          );
        })}

        <button
          onClick={() => changePage(page + 1)}
          disabled={page === totalPages}
        >
          ›
        </button>

        <button
          onClick={() => changePage(totalPages)}
          disabled={page === totalPages}
        >
          »
        </button>
      </div>
    </div>
  );
}

export default ProductPagination;
