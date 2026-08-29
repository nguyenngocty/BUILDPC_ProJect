import React, { useEffect } from "react";

const ResetBuildModal = ({ open, itemCount = 0, onClose, onConfirm }) => {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="client-build-action-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}
    >
      <section
        className="client-build-reset-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="client-build-reset-title"
      >
        <button
          type="button"
          className="client-build-reset-close"
          onClick={onClose}
          aria-label="Đóng"
        >
          <i className="bi bi-x-lg" />
        </button>

        <div className="client-build-reset-icon">
          <div className="client-build-reset-icon-ring">
            <i className="bi bi-arrow-counterclockwise" />
          </div>
        </div>

        <div className="client-build-reset-content">
          <span className="client-build-reset-kicker">LÀM MỚI CẤU HÌNH</span>

          <h2 id="client-build-reset-title">Bạn muốn bắt đầu lại?</h2>

          <p>
            Toàn bộ linh kiện đang chọn trong cấu hình hiện tại sẽ được xóa.
            Thao tác này không ảnh hưởng đến các cấu hình bạn đã lưu trước đó.
          </p>

          <div className="client-build-reset-warning">
            <span>
              <i className="bi bi-exclamation-triangle" />
            </span>

            <div>
              <strong>{itemCount} nhóm linh kiện sẽ bị xóa</strong>

              <small>
                Bạn sẽ cần chọn lại các linh kiện nếu muốn tiếp tục Build PC.
              </small>
            </div>
          </div>
        </div>

        <div className="client-build-reset-actions">
          <button
            type="button"
            className="client-build-reset-cancel"
            onClick={onClose}
          >
            Giữ cấu hình
          </button>

          <button
            type="button"
            className="client-build-reset-confirm"
            onClick={onConfirm}
          >
            <i className="bi bi-trash3" />
            Xóa & làm mới
          </button>
        </div>
      </section>
    </div>
  );
};

export default ResetBuildModal;
