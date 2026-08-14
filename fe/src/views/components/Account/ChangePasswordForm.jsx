// V7: giữ phiên đăng nhập và mở modal xác nhận gửi Gmail.
import {
  useEffect,
  useState,
} from "react";
import toast from "react-hot-toast";

import { useChangePasswordController } from "../../../controllers/accountController";
import useAuth from "../../../hooks/useAuth";
import ForgotPasswordModal from "./ForgotPasswordModal";

function ChangePasswordForm({ admin = false }) {
  const { currentUser } = useAuth();

  const {
    formData,
    message,
    messageType,
    submitting,
    handleChange,
    handleSubmit,
  } = useChangePasswordController();

  const [
    forgotPasswordModalOpen,
    setForgotPasswordModalOpen,
  ] = useState(false);

  useEffect(() => {
    if (
      !message ||
      messageType !== "success"
    ) {
      return;
    }

    toast.success(message, {
      id: "change-password-success",
    });
  }, [message, messageType]);

  return (
    <>
      <section
        className={`account-card password-card ${
          admin ? "account-card-admin" : ""
        }`}
      >
        <div className="account-simple-heading">
          <span className="account-heading-icon">
            <i className="bi bi-shield-lock-fill" />
          </span>

          <div>
            <span className="account-kicker">
              Bảo mật
            </span>

            <h1>Đổi mật khẩu</h1>

            <p>
              Sau khi đổi thành công, phiên đăng nhập hiện tại
              vẫn được giữ nguyên.
            </p>
          </div>
        </div>

        {message && messageType === "error" && (
          <div
            className="account-message error"
            role="alert"
          >
            {message}
          </div>
        )}

        <form
          className="account-form password-form"
          onSubmit={handleSubmit}
          noValidate
        >
          <label className="account-field">
            <span>
              Mật khẩu hiện tại
              <b
                className="required-mark"
                aria-label="bắt buộc"
              >
                *
              </b>
            </span>

            <input
              type="password"
              name="currentPassword"
              autoComplete="current-password"
              value={formData.currentPassword}
              onChange={handleChange}
              disabled={submitting}
              required
            />
          </label>

          <label className="account-field">
            <span>
              Mật khẩu mới
              <b
                className="required-mark"
                aria-label="bắt buộc"
              >
                *
              </b>
            </span>

            <input
              type="password"
              name="newPassword"
              autoComplete="new-password"
              value={formData.newPassword}
              onChange={handleChange}
              disabled={submitting}
              required
            />

            <small>
              Từ 8 đến 72 ký tự và khác mật khẩu hiện tại.
            </small>
          </label>

          <label className="account-field">
            <span>
              Xác nhận mật khẩu mới
              <b
                className="required-mark"
                aria-label="bắt buộc"
              >
                *
              </b>
            </span>

            <input
              type="password"
              name="confirmPassword"
              autoComplete="new-password"
              value={formData.confirmPassword}
              onChange={handleChange}
              disabled={submitting}
              required
            />
          </label>

          <div className="account-form-actions account-form-actions-between">
            <button
              className="account-forgot-button"
              type="button"
              onClick={() =>
                setForgotPasswordModalOpen(true)
              }
              disabled={submitting}
            >
              <i className="bi bi-envelope-fill" />
              Quên mật khẩu?
            </button>

            <button
              className="account-primary-button"
              type="submit"
              disabled={submitting}
            >
              <i
                className={`bi ${
                  submitting
                    ? "bi-arrow-repeat profile-spin"
                    : "bi-key-fill"
                }`}
              />

              {submitting
                ? "Đang cập nhật..."
                : "Đổi mật khẩu"}
            </button>
          </div>
        </form>
      </section>

      <ForgotPasswordModal
        isOpen={forgotPasswordModalOpen}
        email={currentUser?.email}
        onClose={() =>
          setForgotPasswordModalOpen(false)
        }
      />
    </>
  );
}

export default ChangePasswordForm;