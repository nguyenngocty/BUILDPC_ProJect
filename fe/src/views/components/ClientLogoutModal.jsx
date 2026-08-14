import { useEffect } from "react";
import "./ClientLogoutModal.css";

function ClientLogoutModal({ isOpen, onClose, onConfirm }) {
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.classList.add("client-logout-modal-open");

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.classList.remove("client-logout-modal-open");
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="client-logout-modal" role="presentation">
      <button
        className="client-logout-modal__backdrop"
        type="button"
        aria-label="Đóng hộp thoại đăng xuất"
        onClick={onClose}
      />

      <section
        className="client-logout-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="clientLogoutModalTitle"
        aria-describedby="clientLogoutModalDescription"
      >
        <button
          className="client-logout-modal__close"
          type="button"
          onClick={onClose}
          aria-label="Đóng popup"
        >
          <i className="bi bi-x-lg" />
        </button>

        <div className="client-logout-modal__icon">
          <i className="bi bi-box-arrow-right" />
        </div>

        <h2 id="clientLogoutModalTitle">Xác nhận đăng xuất</h2>

        <p id="clientLogoutModalDescription">
          Bạn có chắc chắn muốn đăng xuất khỏi tài khoản không?
        </p>

        <div className="client-logout-modal__actions">
          <button
            className="client-logout-modal__cancel"
            type="button"
            onClick={onClose}
          >
            Hủy
          </button>

          <button
            className="client-logout-modal__confirm"
            type="button"
            onClick={onConfirm}
          >
            <i className="bi bi-box-arrow-right" />
            Đăng xuất
          </button>
        </div>
      </section>
    </div>
  );
}

export default ClientLogoutModal;