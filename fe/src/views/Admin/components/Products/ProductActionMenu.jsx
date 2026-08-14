import { useState, useRef, useEffect } from "react";
import "./css/ProductActionMenu.css";

function ProductActionMenu({
  viewMode,
  onView,
  onEdit,
  onDuplicate,
  onStock,
  onStockHistory,
  onDelete,
  onRestore,
  onForceDelete,
}) {
  const [open, setOpen] = useState(false);

  const ref = useRef();

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };

    document.addEventListener("click", handleClick);

    return () => {
      document.removeEventListener("click", handleClick);
    };
  }, []);

  return (
    <div className="product-action" ref={ref}>
      <button className="product-action-btn" onClick={() => setOpen(!open)}>
        <i className="bi bi-three-dots-vertical" />
      </button>

      {open && (
        <div className="product-action-menu">
          {viewMode === "trash" ? (
            <>
              <button onClick={onRestore}>
                <i className="bi bi-arrow-counterclockwise" />
                Khôi phục
              </button>

              <button className="product-action-danger" onClick={onForceDelete}>
                <i className="bi bi-trash3-fill" />
                Xóa vĩnh viễn
              </button>
            </>
          ) : (
            <>
              <button onClick={onView}>
                <i className="bi bi-eye" />
                Xem
              </button>

              <button onClick={onEdit}>
                <i className="bi bi-pencil" />
                Chỉnh sửa
              </button>

              <button onClick={onDuplicate}>
                <i className="bi bi-files" />
                Nhân bản
              </button>

              <button onClick={onStock}>
                <i className="bi bi-box" />
                Điều chỉnh kho
              </button>

              <button onClick={onStockHistory}>
                <i className="bi bi-clock-history" />
                Lịch sử kho
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default ProductActionMenu;
