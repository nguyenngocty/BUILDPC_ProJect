import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import * as authController from "../controllers/authController";

import {
  loginWithGoogle as loginWithGoogleController,
} from "../controllers/googleAuthController";

export const AuthContext =
  createContext(null);

export function AuthProvider({
  children,
}) {
  const [
    currentUser,
    setCurrentUser,
  ] = useState(null);

  const [
    isAuthLoading,
    setIsAuthLoading,
  ] = useState(true);

  /**
   * Xóa phiên đăng nhập hiện tại.
   */
  const clearSession = useCallback(
    () => {
      authController.logout();
      setCurrentUser(null);
    },
    []
  );

  /**
   * Khôi phục phiên đăng nhập
   * khi người dùng reload trang.
   */
  useEffect(() => {
    let active = true;

    async function restoreSession() {
      if (!authController.hasToken()) {
        if (active) {
          setCurrentUser(null);
          setIsAuthLoading(false);
        }

        return;
      }

      try {
        const user =
          await authController.getCurrentUser();

        if (active) {
          setCurrentUser(
            user || null
          );
        }
      } catch (error) {
        console.error(
          "Lỗi restore session:",
          error
        );

        if (active) {
          setCurrentUser(null);
        }
      } finally {
        if (active) {
          setIsAuthLoading(false);
        }
      }
    }

    restoreSession();

    return () => {
      active = false;
    };
  }, []);

  /**
   * Khi API trả 401,
   * api.js phát event auth:unauthorized.
   *
   * Context sẽ xóa phiên đăng nhập.
   */
  useEffect(() => {
    window.addEventListener(
      "auth:unauthorized",
      clearSession
    );

    return () => {
      window.removeEventListener(
        "auth:unauthorized",
        clearSession
      );
    };
  }, [clearSession]);

  /**
   * Đăng nhập bằng email + mật khẩu.
   */
  const login = useCallback(
    async (formData) => {
      const result =
        await authController.login(
          formData
        );

      setCurrentUser(
        result.user || null
      );

      return result;
    },
    []
  );

  /**
   * Đăng nhập bằng Google.
   *
   * credential là Google ID Token
   * được Google Identity Services
   * trả về cho frontend.
   */
  const loginWithGoogle =
    useCallback(
      async (credential) => {
        const result =
          await loginWithGoogleController(
            credential
          );

        setCurrentUser(
          result.user || null
        );

        return result;
      },
      []
    );

  /**
   * Đăng ký tài khoản.
   */
  const register = useCallback(
    (formData) => {
      return authController.register(
        formData
      );
    },
    []
  );

  /**
   * Đăng xuất.
   */
  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  /**
   * Lấy lại thông tin user
   * sau khi cập nhật profile/avatar...
   */
  const refreshCurrentUser =
    useCallback(async () => {
      const user =
        await authController.getCurrentUser();

      setCurrentUser(
        user || null
      );

      return user;
    }, []);

  const roleCode = String(
    currentUser?.roleCode ||
      currentUser?.role_code ||
      ""
  ).toUpperCase();

  const value = useMemo(
    () => ({
      currentUser,
      setCurrentUser,

      isAuthLoading,

      isAuthenticated:
        Boolean(currentUser),

      isAdmin:
        roleCode === "ADMIN" ||
        roleCode === "SUPER_ADMIN",

      isSuperAdmin:
        roleCode === "SUPER_ADMIN",

      login,
      loginWithGoogle,
      register,
      logout,
      refreshCurrentUser,
    }),
    [
      currentUser,
      isAuthLoading,
      roleCode,
      login,
      loginWithGoogle,
      register,
      logout,
      refreshCurrentUser,
    ]
  );

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth phải được dùng bên trong AuthProvider"
    );
  }

  return context;
};