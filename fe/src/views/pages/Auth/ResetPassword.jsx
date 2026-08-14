import { useState } from "react";
import {
  Link,
  useSearchParams,
} from "react-router-dom";
import toast from "react-hot-toast";

import {
  resetPassword,
} from "../../../controllers/authController";

import "./css/style.css";
import "./css/reset_password.css";

function ResetPassword() {
  const [searchParams] = useSearchParams();

  const token =
    searchParams.get("token") || "";

  const [formData, setFormData] =
    useState({
      token,
      newPassword: "",
      confirmPassword: "",
    });

  const [message, setMessage] =
    useState("");

  const [messageType, setMessageType] =
    useState("error");

  const [submitting, setSubmitting] =
    useState(false);

  const [completed, setCompleted] =
    useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));

    setMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submitting || completed) return;

    setSubmitting(true);
    setMessage("");

    try {
      const result =
        await resetPassword(formData);

      const successMessage =
        result.message ||
        "Đặt lại mật khẩu thành công.";

      setCompleted(true);
      setMessage(successMessage);
      setMessageType("success");

      setFormData((current) => ({
        ...current,
        newPassword: "",
        confirmPassword: "",
      }));

      toast.success(successMessage, {
        id: "reset-password-success",
      });
    } catch (error) {
      setMessage(
        error.message ||
          "Không thể đặt lại mật khẩu."
      );

      setMessageType("error");
    } finally {
      setSubmitting(false);
    }
  };

  const tokenMissing = !token;

  return (
    <main className="reset-password-page">
      <section className="reset-password-card">
        <div className="reset-password-logo">
          <i className="bi bi-shield-lock-fill" />
        </div>

        <span className="reset-password-kicker">
          Bảo mật tài khoản
        </span>

        <h1>Đặt lại mật khẩu</h1>

        <p className="reset-password-description">
          Nhập mật khẩu mới cho tài khoản
          BuildPC của bạn.
        </p>

        {tokenMissing && (
          <div
            className="reset-password-message error"
            role="alert"
          >
            Liên kết đặt lại mật khẩu không
            hợp lệ hoặc bị thiếu mã xác nhận.
          </div>
        )}

        {message && (
          <div
            className={`reset-password-message ${messageType}`}
            role="alert"
          >
            {message}
          </div>
        )}

        {!completed && !tokenMissing && (
          <form
            className="reset-password-form"
            onSubmit={handleSubmit}
            noValidate
          >
            <label>
              <span>
                Mật khẩu mới
                <b aria-label="bắt buộc">
                  *
                </b>
              </span>

              <input
                type="password"
                name="newPassword"
                value={
                  formData.newPassword
                }
                onChange={handleChange}
                autoComplete="new-password"
                placeholder="Từ 8 đến 72 ký tự"
                disabled={submitting}
              />
            </label>

            <label>
              <span>
                Xác nhận mật khẩu mới
                <b aria-label="bắt buộc">
                  *
                </b>
              </span>

              <input
                type="password"
                name="confirmPassword"
                value={
                  formData.confirmPassword
                }
                onChange={handleChange}
                autoComplete="new-password"
                placeholder="Nhập lại mật khẩu mới"
                disabled={submitting}
              />
            </label>

            <small className="reset-password-note">
              Liên kết chỉ sử dụng được một
              lần và hết hạn sau 15 phút.
            </small>

            <button
              type="submit"
              disabled={submitting}
            >
              <i
                className={`bi ${
                  submitting
                    ? "bi-arrow-repeat reset-password-spin"
                    : "bi-key-fill"
                }`}
              />

              {submitting
                ? "Đang cập nhật..."
                : "Đặt lại mật khẩu"}
            </button>
          </form>
        )}

        <Link
          className="reset-password-home-link"
          to="/"
        >
          <i className="bi bi-arrow-left" />
          Về trang chủ để đăng nhập
        </Link>
      </section>
    </main>
  );
}

export default ResetPassword;