import {
  useEffect,
  useRef,
  useState,
} from "react";

import useAuth from "../../hooks/useAuth";

import "./GoogleSignInButton.css";

const GOOGLE_SCRIPT_ID =
  "google-identity-services";

const GOOGLE_SCRIPT_SRC =
  "https://accounts.google.com/gsi/client";

function loadGoogleScript() {
  return new Promise(
    (resolve, reject) => {
      /*
       * Nếu Google Identity Services
       * đã được load trước đó thì dùng luôn.
       */
      if (
        window.google?.accounts?.id
      ) {
        resolve();
        return;
      }

      /*
       * Kiểm tra script đã tồn tại chưa.
       */
      const existingScript =
        document.getElementById(
          GOOGLE_SCRIPT_ID
        );

      if (existingScript) {
        existingScript.addEventListener(
          "load",
          () => resolve(),
          {
            once: true,
          }
        );

        existingScript.addEventListener(
          "error",
          () =>
            reject(
              new Error(
                "Không thể tải dịch vụ đăng nhập Google."
              )
            ),
          {
            once: true,
          }
        );

        return;
      }

      /*
       * Tạo Google Identity Services script.
       */
      const script =
        document.createElement(
          "script"
        );

      script.id =
        GOOGLE_SCRIPT_ID;

      script.src =
        GOOGLE_SCRIPT_SRC;

      script.async = true;
      script.defer = true;

      script.onload = () => {
        resolve();
      };

      script.onerror = () => {
        reject(
          new Error(
            "Không thể tải dịch vụ đăng nhập Google."
          )
        );
      };

      document.head.appendChild(
        script
      );
    }
  );
}

function GoogleSignInButton({
  disabled = false,
  onSuccess,
  onError,
}) {
  const {
    loginWithGoogle,
  } = useAuth();

  const buttonRef = useRef(null);

  const callbackRef =
    useRef(null);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    initializationError,
    setInitializationError,
  ] = useState("");

  /*
   * Giữ callback mới nhất mà không cần
   * initialize lại Google mỗi lần component
   * render.
   */
  callbackRef.current = async (
    response
  ) => {
    const credential = String(
      response?.credential || ""
    ).trim();

    if (!credential) {
      const error = new Error(
        "Google không trả về thông tin xác thực."
      );

      if (
        typeof onError ===
        "function"
      ) {
        onError(error);
      }

      return;
    }

    try {
      const result =
        await loginWithGoogle(
          credential
        );

      if (
        typeof onSuccess ===
        "function"
      ) {
        onSuccess(result);
      }
    } catch (error) {
      if (
        typeof onError ===
        "function"
      ) {
        onError(error);
      }
    }
  };

  useEffect(() => {
    let active = true;

    async function initializeGoogle() {
      try {
        setIsLoading(true);

        setInitializationError(
          ""
        );

        const clientId = String(
          process.env
            .REACT_APP_GOOGLE_CLIENT_ID ||
            ""
        ).trim();

        if (!clientId) {
          throw new Error(
            "REACT_APP_GOOGLE_CLIENT_ID chưa được cấu hình."
          );
        }

        await loadGoogleScript();

        if (!active) {
          return;
        }

        if (
          !window.google?.accounts?.id
        ) {
          throw new Error(
            "Google Identity Services chưa sẵn sàng."
          );
        }

        /*
         * Khởi tạo Google Identity Services.
         */
        window.google.accounts.id.initialize(
          {
            client_id: clientId,

            callback: (
              response
            ) => {
              callbackRef.current?.(
                response
              );
            },

            /*
             * Không tự động hiển thị One Tap.
             * Dự án hiện chỉ sử dụng nút Google.
             */
            auto_select: false,

            cancel_on_tap_outside:
              true,
          }
        );

        if (!buttonRef.current) {
          throw new Error(
            "Không tìm thấy vùng hiển thị nút Google."
          );
        }

        /*
         * Xóa nút cũ nếu React effect
         * chạy lại trong development.
         */
        buttonRef.current.innerHTML =
          "";

        /*
         * Google tự render nút chính thức.
         */
        window.google.accounts.id.renderButton(
          buttonRef.current,
          {
            type: "standard",
            theme: "outline",
            size: "large",
            text: "continue_with",
            shape: "rectangular",
            logo_alignment: "left",
            width: 360,
          }
        );

        if (active) {
          setIsLoading(false);
        }
      } catch (error) {
        console.error(
          "[Google Sign-In] Lỗi khởi tạo:",
          error
        );

        if (active) {
          setIsLoading(false);

          setInitializationError(
            error?.message ||
              "Không thể khởi tạo đăng nhập Google."
          );
        }
      }
    }

    initializeGoogle();

    return () => {
      active = false;
    };
  }, []);

  /*
   * Google tự quản lý nút bên trong div.
   * Vì vậy khi form đang submit,
   * ta dùng lớp overlay để chặn click.
   */
  return (
    <div
      className={`google-signin ${
        disabled
          ? "is-disabled"
          : ""
      }`}
    >
      {isLoading && (
        <div className="google-signin-loading">
          Đang tải Google...
        </div>
      )}

      {initializationError ? (
        <div
          className="google-signin-error"
          role="alert"
        >
          {initializationError}
        </div>
      ) : (
        <div
          className="google-signin-button-wrapper"
        >
          <div
            ref={buttonRef}
            className="google-signin-button"
          />

          {disabled && (
            <div
              className="google-signin-disabled-overlay"
              aria-hidden="true"
            />
          )}
        </div>
      )}
    </div>
  );
}

export default GoogleSignInButton;