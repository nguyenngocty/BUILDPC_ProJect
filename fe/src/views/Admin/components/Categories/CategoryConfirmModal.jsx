import "./css/CategoryConfirmModal.css";

function CategoryConfirmModal({
  open,
  type = "delete",
  title,
  message,
  category,
  loading = false,
  onClose,
  onConfirm,
}) {
  if (!open) return null;

  const config = {
    delete: {
      icon: "bi-trash3-fill",
      color: "danger",
      button: "Xóa",
    },

    restore: {
      icon: "bi-arrow-counterclockwise",
      color: "success",
      button: "Khôi phục",
    },

    force: {
      icon: "bi-exclamation-triangle-fill",
      color: "warning",
      button: "Xóa vĩnh viễn",
    },

    status: {
      icon: "bi-arrow-repeat",
      color: "primary",
      button: "Xác nhận",
    },
  };

  const current = config[type];

  return (
    <div className="ccm-overlay" onClick={onClose}>
      <div className="ccm-container" onClick={(e) => e.stopPropagation()}>
        {/* ICON */}

        <div className={`ccm-icon ${current.color}`}>
          <i className={`bi ${current.icon}`}></i>
        </div>

        {/* TITLE */}

        <h2 className="ccm-title">{title}</h2>

        {/* MESSAGE */}

        <p className="ccm-message">{message}</p>

        {/* CATEGORY */}

        {category && (
          <div className="ccm-card">
            {category.image ? (
              <img
                src={`http://localhost:5000${category.image}`}
                alt={category.name}
                className="ccm-image"
              />
            ) : (
              <div className="ccm-image-empty">
                <i className="bi bi-image"></i>
              </div>
            )}

            <div className="ccm-info">
              <h3>{category.name}</h3>

              <span>{category.slug}</span>
            </div>
          </div>
        )}

        {/* BUTTON */}

        <div className="ccm-footer">
          <button
            className="ccm-btn ccm-btn-cancel"
            onClick={onClose}
            disabled={loading}
          >
            <i className="bi bi-x-circle"></i>

            <span>Hủy</span>
          </button>

          <button
            className={`ccm-btn ccm-btn-${current.color}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <i className="bi bi-arrow-repeat ccm-spin"></i>

                <span>Đang xử lý...</span>
              </>
            ) : (
              <>
                <i className={`bi ${current.icon}`}></i>

                <span>{current.button}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CategoryConfirmModal;
