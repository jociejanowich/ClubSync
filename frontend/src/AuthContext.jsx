import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, setToken } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api.me();
      setUser(data.user ?? data);
      setMemberships(data.memberships ?? []);
    } catch {
      setUser(null);
      setMemberships([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (username, password) => {
    const data = await api.login({ username, password });
    setToken(data.token);
    await refresh();
  };

  const register = async (payload) => {
    const data = await api.register(payload);
    setToken(data.token);
    await refresh();
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // ignore - we're clearing the token locally regardless
    }
    setToken(null);
    setUser(null);
    setMemberships([]);
  };

  return (
    <AuthContext.Provider
      value={{ user, memberships, loading, login, register, logout, refresh }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside an AuthProvider");
  return ctx;
}
