import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as authController from "../controllers/authController";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const clearSession = useCallback(() => {
    authController.logout();
    setCurrentUser(null);
  }, []);

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
        const user = await authController.getCurrentUser();

        if (active) {
          setCurrentUser(user || null);
        }
      } catch (error) {
        console.error("Lỗi restore session:", error);

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

  useEffect(() => {
    window.addEventListener("auth:unauthorized", clearSession);

    return () => {
      window.removeEventListener("auth:unauthorized", clearSession);
    };
  }, [clearSession]);

  const login = useCallback(async (formData) => {
    const result = await authController.login(formData);

    setCurrentUser(result.user || null);

    return result;
  }, []);

  const register = useCallback((formData) => {
    return authController.register(formData);
  }, []);

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const refreshCurrentUser = useCallback(async () => {
    const user = await authController.getCurrentUser();

    setCurrentUser(user || null);

    return user;
  }, []);

  const roleCode = String(currentUser?.roleCode || currentUser?.role_code || "")
    .toUpperCase();

  const value = useMemo(
    () => ({
      currentUser,
      setCurrentUser,
      isAuthLoading,
      isAuthenticated: Boolean(currentUser),
      isAdmin: roleCode === "ADMIN" || roleCode === "SUPER_ADMIN",
      isSuperAdmin: roleCode === "SUPER_ADMIN",
      login,
      register,
      logout,
      refreshCurrentUser,
    }),
    [
      currentUser,
      isAuthLoading,
      roleCode,
      login,
      register,
      logout,
      refreshCurrentUser,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth phải được dùng bên trong AuthProvider");
  }

  return context;
};