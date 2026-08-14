import { useEffect, useRef, useState } from "react";
import "./css/CategoryActionMenu.css";

function CategoryActionMenu({
  category,
  viewMode = "all",
  onView,
  onEdit,
  onDelete,
  onRestore,
  onForceDelete,
  onToggleStatus,
}) {
  const [open, setOpen] = useState(false);

  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!menuRef.current?.contains(e.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="category-action" ref={menuRef}>
      <button className="action-button" onClick={() => setOpen(!open)}>
        <i className="bi bi-three-dots-vertical"></i>
      </button>

      {open && (
        <div className="action-menu">
          {viewMode === "trash" ? (
            <>
              <button
                onClick={() => {
                  onRestore(category);
                  setOpen(false);
                }}
              >
                <i className="bi bi-arrow-counterclockwise"></i>
                Khôi phục
              </button>

              <button
                className="danger"
                onClick={() => {
                  onForceDelete(category);
                  setOpen(false);
                }}
              >
                <i className="bi bi-trash3-fill"></i>
                Xóa vĩnh viễn
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  onView(category);
                  setOpen(false);
                }}
              >
                <i className="bi bi-eye"></i>
                Xem chi tiết
              </button>

              <button
                onClick={() => {
                  onEdit(category);
                  setOpen(false);
                }}
              >
                <i className="bi bi-pencil-square"></i>
                Chỉnh sửa
              </button>

              <button
                onClick={() => {
                  onToggleStatus(category);
                  setOpen(false);
                }}
              >
                <i className="bi bi-arrow-repeat"></i>

                {Number(category.status) === 1 ? "Tạm khóa" : "Kích hoạt"}
              </button>

              <button
                className="danger"
                onClick={() => {
                  onDelete(category);
                  setOpen(false);
                }}
              >
                <i className="bi bi-trash"></i>
                Xóa
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default CategoryActionMenu;
