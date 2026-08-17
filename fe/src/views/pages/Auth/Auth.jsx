import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import useAuth from "../../../hooks/useAuth";

import {
  forgotPassword as requestPasswordReset,
} from "../../../controllers/authController";

import GoogleSignInButton from "../../components/GoogleSignInButton";

import "./css/style.css";
import "./css/login_register.css";

function Auth({
  isOpen,
  initialTab = "login",
  onClose,
  onAuthenticated,
}) {
  const {
    login,
    register,
  } = useAuth();

  const [activeTab, setActiveTab] =
    useState("login");

  const [message, setMessage] =
    useState("");

  const [messageType, setMessageType] =
    useState("error");

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [loginData, setLoginData] =
    useState({
      email: "",
      password: "",
      remember: false,
    });

  const [registerData, setRegisterData] =
    useState({
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    });

  const [forgotData, setForgotData] =
    useState({
      email: "",
    });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const nextTab =
      initialTab === "register"
        ? "register"
        : "login";

    setActiveTab(nextTab);
    setMessage("");
    setMessageType("error");
  }, [isOpen, initialTab]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (
        event.key === "Escape" &&
        !isSubmitting
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
  }, [
    isOpen,
    isSubmitting,
    onClose,
  ]);

  const changeTab = (tabName) => {
    if (isSubmitting) {
      return;
    }

    setActiveTab(tabName);
    setMessage("");
    setMessageType("error");
  };

  const handleLoginChange = (event) => {
    const {
      name,
      value,
      checked,
      type,
    } = event.target;

    setLoginData((previousData) => ({
      ...previousData,

      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));

    setMessage("");
  };

  const handleRegisterChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setRegisterData(
      (previousData) => ({
        ...previousData,
        [name]: value,
      })
    );

    setMessage("");
  };

  const handleForgotChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setForgotData(
      (previousData) => ({
        ...previousData,
        [name]: value,
      })
    );

    setMessage("");
  };

  const openForgotPassword = () => {
    if (isSubmitting) {
      return;
    }

    setForgotData({
      email: loginData.email,
    });

    setActiveTab("forgot");
    setMessage("");
    setMessageType("error");
  };

  /*
   * ========================================
   * ĐĂNG NHẬP EMAIL + PASSWORD
   * ========================================
   */
  const handleLoginSubmit = async (
    event
  ) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setMessage("");
    setMessageType("error");
    setIsSubmitting(true);

    try {
      const result =
        await login(loginData);

      toast.success(
        result.message ||
          "Đăng nhập thành công!"
      );

      if (
        typeof onAuthenticated ===
        "function"
      ) {
        onAuthenticated(
          result.user
        );
      }

      onClose();
    } catch (error) {
      setMessage(
        error.message ||
          "Không thể đăng nhập."
      );

      setMessageType("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  /*
   * ========================================
   * ĐĂNG NHẬP / ĐĂNG KÝ BẰNG GOOGLE
   * ========================================
   *
   * GoogleSignInButton đã gọi:
   *
   * useAuth()
   *   ↓
   * googleAuthController
   *   ↓
   * googleAuthService
   *   ↓
   * Backend
   *
   * Khi backend thành công, component
   * GoogleSignInButton gọi hàm này.
   */
  const handleGoogleSuccess = (
    result
  ) => {
    setMessage("");
    setMessageType("success");

    toast.success(
      result?.message ||
        "Đăng nhập bằng Google thành công!"
    );

    if (
      typeof onAuthenticated ===
      "function"
    ) {
      onAuthenticated(
        result?.user || null
      );
    }

    onClose();
  };

  /*
   * Google login lỗi.
   */
  const handleGoogleError = (
    error
  ) => {
    const errorMessage =
      error?.message ||
      "Không thể đăng nhập bằng Google.";

    setMessage(errorMessage);
    setMessageType("error");

    toast.error(
      errorMessage,
      {
        id: "google-login-error",
      }
    );
  };

  /*
   * ========================================
   * ĐĂNG KÝ EMAIL + PASSWORD
   * ========================================
   */
  const handleRegisterSubmit = async (
    event
  ) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setMessage("");
    setMessageType("error");
    setIsSubmitting(true);

    try {
      const result =
        await register(
          registerData
        );

      setLoginData(
        (previousData) => ({
          ...previousData,

          email:
            registerData.email
              .trim()
              .toLowerCase(),

          password: "",
        })
      );

      setRegisterData({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
      });

      setActiveTab("login");

      setMessage(
        result.message ||
          "Đăng ký thành công. Bạn có thể đăng nhập ngay bây giờ."
      );

      setMessageType("success");
    } catch (error) {
      setMessage(
        error.message ||
          "Không thể đăng ký tài khoản."
      );

      setMessageType("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  /*
   * ========================================
   * QUÊN MẬT KHẨU
   * ========================================
   */
  const handleForgotSubmit = async (
    event
  ) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setMessage("");
    setMessageType("error");
    setIsSubmitting(true);

    try {
      const result =
        await requestPasswordReset(
          forgotData
        );

      const successMessage =
        result.message ||
        "Đã gửi liên kết đặt lại mật khẩu đến Gmail. Vui lòng kiểm tra Hộp thư đến hoặc Thư rác.";

      setMessage(
        successMessage
      );

      setMessageType(
        "success"
      );

      toast.success(
        successMessage,
        {
          id:
            "forgot-password-success",
        }
      );
    } catch (error) {
      setMessage(
        error.message ||
          "Không thể gửi liên kết đặt lại mật khẩu."
      );

      setMessageType("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  const isForgotTab =
    activeTab === "forgot";

  return (
    <div className="auth-modal is-open">
      <button
        className="auth-backdrop"
        type="button"
        aria-label="Đóng cửa sổ đăng nhập"
        onClick={onClose}
        disabled={isSubmitting}
      />

      <section
        className="auth-card"
        role="dialog"
        aria-modal="true"
        aria-label={
          isForgotTab
            ? "Khôi phục mật khẩu"
            : "Tài khoản"
        }
      >
        <button
          className="auth-close"
          type="button"
          aria-label="Đóng"
          onClick={onClose}
          disabled={isSubmitting}
        >
          &times;
        </button>

        <div className="auth-heading">
          <h1>
            {isForgotTab
              ? "Khôi phục mật khẩu"
              : "Tài khoản"}
          </h1>

          <p>
            {isForgotTab
              ? "Nhập email tài khoản. BuildPC sẽ gửi liên kết đặt lại mật khẩu tới hộp thư của bạn."
              : "Đăng nhập hoặc tạo tài khoản để theo dõi đơn hàng nhanh hơn."}
          </p>
        </div>

        {!isForgotTab && (
          <div
            className="auth-tabs"
            role="tablist"
            aria-label="Chọn biểu mẫu"
          >
            <button
              className={`auth-tab ${
                activeTab ===
                "login"
                  ? "active"
                  : ""
              }`}
              type="button"
              role="tab"
              aria-selected={
                activeTab ===
                "login"
              }
              onClick={() =>
                changeTab(
                  "login"
                )
              }
              disabled={
                isSubmitting
              }
            >
              Đăng nhập
            </button>

            <button
              className={`auth-tab ${
                activeTab ===
                "register"
                  ? "active"
                  : ""
              }`}
              type="button"
              role="tab"
              aria-selected={
                activeTab ===
                "register"
              }
              onClick={() =>
                changeTab(
                  "register"
                )
              }
              disabled={
                isSubmitting
              }
            >
              Đăng ký
            </button>
          </div>
        )}

        {message && (
          <p
            className={`auth-message auth-message-${messageType}`}
            role="alert"
          >
            {message}
          </p>
        )}

        {/* =========================
            FORM ĐĂNG NHẬP
        ========================== */}
        <form
          className={`auth-form ${
            activeTab ===
            "login"
              ? "active"
              : ""
          }`}
          onSubmit={
            handleLoginSubmit
          }
          noValidate
        >
          <div className="auth-field">
            <label
              htmlFor="loginEmail"
            >
              Email
            </label>

            <input
              id="loginEmail"
              name="email"
              type="email"
              placeholder="Nhập email của bạn"
              autoComplete="email"
              value={
                loginData.email
              }
              onChange={
                handleLoginChange
              }
              disabled={
                isSubmitting
              }
            />
          </div>

          <div className="auth-field">
            <label
              htmlFor="loginPassword"
            >
              Mật khẩu
            </label>

            <input
              id="loginPassword"
              name="password"
              type="password"
              placeholder="Nhập mật khẩu"
              autoComplete="current-password"
              value={
                loginData.password
              }
              onChange={
                handleLoginChange
              }
              disabled={
                isSubmitting
              }
            />
          </div>

          <label className="remember-row">
            <input
              name="remember"
              type="checkbox"
              checked={
                loginData.remember
              }
              onChange={
                handleLoginChange
              }
              disabled={
                isSubmitting
              }
            />

            <span>
              Ghi nhớ đăng nhập
            </span>
          </label>

          <button
            className="auth-submit"
            type="submit"
            disabled={
              isSubmitting
            }
          >
            {isSubmitting &&
            activeTab === "login"
              ? "Đang đăng nhập..."
              : "Đăng nhập"}
          </button>

          {/* ========= GOOGLE ========= */}
          <div className="auth-social">
            <div className="auth-divider">
              <span>Hoặc</span>
            </div>

            <GoogleSignInButton
              disabled={
                isSubmitting
              }
              onSuccess={
                handleGoogleSuccess
              }
              onError={
                handleGoogleError
              }
            />
          </div>

          <div className="auth-links">
            <button
              className="auth-link-button"
              type="button"
              onClick={
                openForgotPassword
              }
              disabled={
                isSubmitting
              }
            >
              Quên mật khẩu?
            </button>

            <button
              className="auth-link-button"
              type="button"
              onClick={() =>
                changeTab(
                  "register"
                )
              }
              disabled={
                isSubmitting
              }
            >
              Tạo tài khoản mới
            </button>
          </div>
        </form>

        {/* =========================
            FORM ĐĂNG KÝ
        ========================== */}
        <form
          className={`auth-form ${
            activeTab ===
            "register"
              ? "active"
              : ""
          }`}
          onSubmit={
            handleRegisterSubmit
          }
          noValidate
        >
          <div className="auth-field">
            <label
              htmlFor="registerName"
            >
              Họ và tên
            </label>

            <input
              id="registerName"
              name="name"
              type="text"
              placeholder="Nhập họ tên của bạn"
              autoComplete="name"
              value={
                registerData.name
              }
              onChange={
                handleRegisterChange
              }
              disabled={
                isSubmitting
              }
            />
          </div>

          <div className="auth-field">
            <label
              htmlFor="registerEmail"
            >
              Email
            </label>

            <input
              id="registerEmail"
              name="email"
              type="email"
              placeholder="Nhập email của bạn"
              autoComplete="email"
              value={
                registerData.email
              }
              onChange={
                handleRegisterChange
              }
              disabled={
                isSubmitting
              }
            />
          </div>

          <div className="auth-field">
            <label
              htmlFor="registerPassword"
            >
              Mật khẩu
            </label>

            <input
              id="registerPassword"
              name="password"
              type="password"
              placeholder="Tạo mật khẩu"
              autoComplete="new-password"
              value={
                registerData.password
              }
              onChange={
                handleRegisterChange
              }
              disabled={
                isSubmitting
              }
            />
          </div>

          <div className="auth-field">
            <label
              htmlFor="registerConfirm"
            >
              Nhập lại mật khẩu
            </label>

            <input
              id="registerConfirm"
              name="confirmPassword"
              type="password"
              placeholder="Nhập lại mật khẩu"
              autoComplete="new-password"
              value={
                registerData
                  .confirmPassword
              }
              onChange={
                handleRegisterChange
              }
              disabled={
                isSubmitting
              }
            />
          </div>

          <button
            className="auth-submit"
            type="submit"
            disabled={
              isSubmitting
            }
          >
            {isSubmitting &&
            activeTab ===
              "register"
              ? "Đang đăng ký..."
              : "Đăng ký"}
          </button>

          {/*
           * Google cũng có thể tạo tài khoản mới.
           *
           * Nếu Gmail chưa tồn tại:
           * backend tự tạo CUSTOMER.
           *
           * Nếu Gmail đã tồn tại:
           * backend liên kết Google vào user cũ.
           */}
          <div className="auth-social">
            <div className="auth-divider">
              <span>Hoặc</span>
            </div>

            <GoogleSignInButton
              disabled={
                isSubmitting
              }
              onSuccess={
                handleGoogleSuccess
              }
              onError={
                handleGoogleError
              }
            />
          </div>

          <div className="auth-links single">
            <button
              className="auth-link-button"
              type="button"
              onClick={() =>
                changeTab(
                  "login"
                )
              }
              disabled={
                isSubmitting
              }
            >
              Đã có tài khoản?
              Đăng nhập
            </button>
          </div>
        </form>

        {/* =========================
            FORM QUÊN MẬT KHẨU
        ========================== */}
        <form
          className={`auth-form ${
            activeTab ===
            "forgot"
              ? "active"
              : ""
          }`}
          onSubmit={
            handleForgotSubmit
          }
          noValidate
        >
          <div className="auth-forgot-intro">
            <div>
              <strong>
                Nhận liên kết qua
                Gmail
              </strong>

              <p>
                Liên kết có hiệu
                lực trong 15 phút
                và chỉ sử dụng
                được một lần.
              </p>
            </div>
          </div>

          <div className="auth-field">
            <label
              htmlFor="forgotEmail"
            >
              Email tài khoản
            </label>

            <input
              id="forgotEmail"
              name="email"
              type="email"
              placeholder="Nhập email đã đăng ký"
              autoComplete="email"
              value={
                forgotData.email
              }
              onChange={
                handleForgotChange
              }
              disabled={
                isSubmitting
              }
              autoFocus
            />
          </div>

          <button
            className="auth-submit"
            type="submit"
            disabled={
              isSubmitting
            }
          >
            {isSubmitting &&
            activeTab ===
              "forgot"
              ? "Đang gửi email..."
              : "Gửi liên kết đặt lại mật khẩu"}
          </button>

          <div className="auth-links single">
            <button
              className="auth-link-button auth-back-login"
              type="button"
              onClick={() =>
                changeTab(
                  "login"
                )
              }
              disabled={
                isSubmitting
              }
            >
              <i className="bi bi-arrow-left" />

              Quay lại đăng nhập
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default Auth;