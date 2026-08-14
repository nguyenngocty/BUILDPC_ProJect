const buildPaginationItems = (
  page,
  totalPages
) => {
  if (totalPages <= 7) {
    return Array.from(
      {
        length: totalPages,
      },
      (_, index) => index + 1
    );
  }

  const items = [1];

  const start = Math.max(
    page - 1,
    2
  );

  const end = Math.min(
    page + 1,
    totalPages - 1
  );

  if (start > 2) {
    items.push("left-ellipsis");
  }

  for (
    let number = start;
    number <= end;
    number += 1
  ) {
    items.push(number);
  }

  if (
    end <
    totalPages - 1
  ) {
    items.push("right-ellipsis");
  }

  items.push(totalPages);

  return items;
};

function OrderPagination({
  page,
  totalPages,
  onPageChange,
  disabled = false,
}) {
  if (totalPages <= 1) {
    return null;
  }

  const items =
    buildPaginationItems(
      page,
      totalPages
    );

  return (
    <nav
      className="account-order-pagination"
      aria-label="Phân trang đơn hàng"
    >
      <button
        type="button"
        onClick={() =>
          onPageChange(page - 1)
        }
        disabled={
          disabled ||
          page <= 1
        }
        aria-label="Trang trước"
      >
        <i className="bi bi-chevron-left" />
      </button>

      {items.map((item) => {
        if (
          typeof item === "string"
        ) {
          return (
            <span
              className="account-order-pagination-ellipsis"
              key={item}
            >
              …
            </span>
          );
        }

        return (
          <button
            type="button"
            className={
              item === page
                ? "active"
                : ""
            }
            key={item}
            onClick={() =>
              onPageChange(item)
            }
            disabled={disabled}
            aria-current={
              item === page
                ? "page"
                : undefined
            }
          >
            {item}
          </button>
        );
      })}

      <button
        type="button"
        onClick={() =>
          onPageChange(page + 1)
        }
        disabled={
          disabled ||
          page >= totalPages
        }
        aria-label="Trang sau"
      >
        <i className="bi bi-chevron-right" />
      </button>
    </nav>
  );
}

export default OrderPagination;