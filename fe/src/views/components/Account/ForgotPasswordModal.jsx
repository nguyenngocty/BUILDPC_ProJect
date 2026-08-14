import {
  useEffect,
  useState,
} from "react";

import {
  forgotPasswordForCurrentUser,
} from "../../../controllers/authController";

import "./ForgotPasswordModal.css";

function ForgotPasswordModal({
  isOpen,
  email,
  onClose,
}) {
  const [status, setStatus] =
    useState("confirm");

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    if (!isOpen) return;

    setStatus("confirm");
    setMessage("");
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (
        event.key === "Escape" &&
        status !== "sending"
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener(
        "keydown",
        handleEscape
      );
    }

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [isOpen, onClose, status]);

  const handleSend = async () => {
    if (status === "sending") return;

    setStatus("sending");
    setMessage("");

    try {
      const result =
        await forgotPasswordForCurrentUser();

      setMessage(
        result.message ||
          `Đã gửi liên kết đặt lại mật khẩu đến Gmail ${email}. Vui lòng kiểm tra Hộp thư đến hoặc Thư rác.`
      );

      setStatus("success");
    } catch (error) {
      setMessage(
        error.message ||
          "Không thể gửi liên kết đặt lại mật khẩu. Vui lòng thử lại."
      );

      setStatus("error");
    }
  };

  const handleBackdropClick = () => {
    if (status !== "sending") {
      onClose();
    }
  };

  if (!isOpen) return null;

  const isSending = status === "sending";
  const isSuccess = status === "success";
  const isError = status === "error";

  return (
    <div
      className="forgot-password-modal"
      role="presentation"
    >
      <button
        type="button"
        className="forgot-password-modal-backdrop"
        aria-label="Đóng hộp thoại"
        onClick={handleBackdropClick}
        disabled={isSending}
      />

      <section
        className="forgot-password-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="forgotPasswordModalTitle"
      >
        <button
          type="button"
          className="forgot-password-modal-close"
          aria-label="Đóng"
          onClick={onClose}
          disabled={isSending}
        >
          &times;
        </button>

        <h2 id="forgotPasswordModalTitle">
          {isSuccess
            ? "Đã gửi email"
            : isError
              ? "Gửi email thất bại"
              : "Gửi liên kết đặt lại mật khẩu?"}
        </h2>

        {!isSuccess && !isError && (
          <>
            <p>
              BuildPC sẽ gửi liên kết xác nhận
              đặt lại mật khẩu đến Gmail:
            </p>

            <strong className="forgot-password-modal-email">
              {email || "Không xác định"}
            </strong>

            <p className="forgot-password-modal-note">
              Liên kết có hiệu lực trong 15 phút
              và chỉ sử dụng được một lần.
            </p>
          </>
        )}

        {(isSuccess || isError) && (
          <p
            className={`forgot-password-modal-message ${
              isSuccess ? "success" : "error"
            }`}
            role="alert"
          >
            {message}
          </p>
        )}

        <div className="forgot-password-modal-actions">
          {isSuccess ? (
            <button
              type="button"
              className="forgot-password-modal-primary"
              onClick={onClose}
            >
              Đã hiểu
            </button>
          ) : (
            <>
              <button
                type="button"
                className="forgot-password-modal-secondary"
                onClick={onClose}
                disabled={isSending}
              >
                Hủy
              </button>

              <button
                type="button"
                className="forgot-password-modal-primary"
                onClick={handleSend}
                disabled={
                  isSending ||
                  !String(email || "").trim()
                }
              >
                <i
                  className={`bi ${
                    isSending
                      ? "bi-arrow-repeat forgot-password-modal-spin"
                      : "bi-send-fill"
                  }`}
                />

                {isSending
                  ? "Đang gửi..."
                  : isError
                    ? "Gửi lại"
                    : "Gửi về Gmail"}
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

export default ForgotPasswordModal;