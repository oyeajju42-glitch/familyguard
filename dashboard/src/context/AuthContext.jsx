import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { disconnectSocket } from "../lib/socket";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("fg_token") || "");
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("fg_user");
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (token) {
      localStorage.setItem("fg_token", token);
    } else {
      localStorage.removeItem("fg_token");
    }
  }, [token]);

  const login = async (email, password) => {
    setLoading(true);
    setError("");
    try {
      const response = await api.post("/api/auth/login", { email, password });
      setToken(response.data.token);
      setUser(response.data.user);
      localStorage.setItem("fg_user", JSON.stringify(response.data.user));
      return true;
    } catch (err) {
      const message = err?.response?.data?.message || "Login failed";
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken("");
    setUser(null);
    localStorage.removeItem("fg_user");
    disconnectSocket();
  };

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      error,
      login,
      logout,
    }),
    [token, user, loading, error],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
