function LogoutModal({ isOpen, onClose, onConfirm }) {
  return (
    <div
      className={["adm-logout-modal", isOpen && "adm-logout-modal--show"]
        .filter(Boolean)
        .join(" ")}
      aria-hidden={!isOpen}
    >
      <button
        type="button"
        className="adm-logout-modal__backdrop"
        onClick={onClose}
        aria-label="Đóng hộp thoại"
        tabIndex={isOpen ? 0 : -1}
      />

      <div
        className="adm-logout-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admLogoutTitle"
        aria-describedby="admLogoutDescription"
      >
        <button
          className="adm-logout-modal__close"
          type="button"
          onClick={onClose}
          aria-label="Đóng"
        >
          <i className="bi bi-x-lg" />
        </button>

        <div className="adm-logout-modal__icon">
          <i className="bi bi-box-arrow-right" />
        </div>

        <div className="adm-logout-modal__content">
          <span className="adm-logout-modal__label">Tài khoản quản trị</span>

          <h2 id="admLogoutTitle">Xác nhận đăng xuất</h2>

          <p id="admLogoutDescription">
            Bạn có chắc chắn muốn đăng xuất khỏi trang quản trị không?
          </p>
        </div>

        <div className="adm-logout-modal__actions">
          <button
            className="adm-button adm-button--secondary"
            type="button"
            onClick={onClose}
          >
            Hủy
          </button>

          <button
            className="adm-button adm-button--danger"
            type="button"
            onClick={onConfirm}
          >
            <i className="bi bi-box-arrow-right" />

            <span>Đăng xuất</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default LogoutModal;
