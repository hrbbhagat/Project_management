import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { authService } from "@/services";
import { getToken, onUnauthorized, setToken } from "@/services/api";
import type { User } from "@/types";

type AuthState = {
  user: User | null;
  status: "loading" | "authenticated" | "anonymous";
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthState["status"]>("loading");

  const clear = useCallback(() => {
    setToken(null);
    setUser(null);
    setStatus("anonymous");
  }, []);

  useEffect(() => {
    onUnauthorized(clear);
    const token = getToken();
    if (!token) {
      setStatus("anonymous");
      return;
    }

    authService
      .me()
      .then((u) => {
        setUser(u);
        setStatus("authenticated");
      })
      .catch(() => {
        clear();
      });
  }, [clear]);

  const login = async (email: string, password: string) => {
    const { token, user: loginUser } = await authService.login({ email, password });
    if (token) setToken(token);
    const me = loginUser ?? (await authService.me());
    setUser(me);
    setStatus("authenticated");
  };

  // Returns true if backend signed the user in with a token immediately, false if redirection to /login is required.
  const register = async (fullName: string, email: string, password: string) => {
    const { token, user: regUser } = await authService.register({ full_name: fullName, email, password });
    if (token) {
      setToken(token);
      setUser(regUser ?? (await authService.me()));
      setStatus("authenticated");
      return true;
    }
    return false;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch {
      /* token and user are cleared locally regardless */
    }
    clear();
  };

  return <AuthContext.Provider value={{ user, status, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
