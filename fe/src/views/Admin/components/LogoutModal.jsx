function LogoutModal({ isOpen, onClose, onConfirm }) {
  return (
    <div
      className={`logout-modal ${isOpen ? "show" : ""}`}
      aria-hidden={!isOpen}
    >
      <div
        className="logout-modal__backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="logout-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="logoutModalTitle"
      >
        <button
          className="logout-modal__close"
          type="button"
          onClick={onClose}
          aria-label="Đóng popup"
        >
          <i className="bi bi-x-lg" />
        </button>

        <div className="logout-modal__icon">
          <i className="bi bi-box-arrow-right" />
        </div>

        <h2 id="logoutModalTitle">Xác nhận đăng xuất</h2>

        <p>
          Bạn có chắc chắn muốn đăng xuất khỏi trang quản trị không?
        </p>

        <div className="logout-modal__actions">
          <button
            className="ghost-action"
            type="button"
            onClick={onClose}
          >
            Hủy
          </button>

          <button
            className="primary-action logout-confirm-btn"
            type="button"
            onClick={onConfirm}
          >
            <i className="bi bi-box-arrow-right" />
            Đăng xuất
          </button>
        </div>
      </div>
    </div>
  );
}

export default LogoutModal;