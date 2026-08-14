import "./css/DeleteConfirmModal.css";

function DeleteConfirmModal({
  open,
  title,
  message,
  loading,

  icon = "bi-trash3-fill",
  iconClass = "",

  titleClass = "",

  confirmText = "Xóa",
  confirmClass = "delete-modal-danger-btn",
  loadingText = "Đang xử lý...",

  onCancel,
  onConfirm,
}) {
  if (!open) return null;

  return (
    <div className="delete-modal-overlay">
      <div className="delete-modal">
        <div className={`delete-modal-icon ${iconClass}`}>
          <i className={`bi ${icon}`}></i>
        </div>

        <h3 className={`delete-modal-title ${titleClass}`}>{title}</h3>

        <p className="delete-modal-message">{message}</p>

        <div className="delete-modal-actions">
          <button
            className="delete-modal-cancel"
            onClick={onCancel}
            disabled={loading}
          >
            Hủy
          </button>

          <button
            className={confirmClass}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? loadingText : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteConfirmModal;
