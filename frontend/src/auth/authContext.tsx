import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type User = {
  id: string;
  email: string;
  role: "admin" | "operator";
};

type AuthContextValue = {
  token: string | null;
  user: User | null;
  login: (params: { email: string; password: string }) => Promise<void>;
  logout: () => void;
  refreshMe: (tokenOverride?: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_KEY = "auth_token";

async function apiJson<T>(url: string, options: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = data?.message ?? `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    // No persistimos la sesión entre aperturas del navegador.
    // Esto evita que el usuario pueda "entrar" sin estar logueado.
    const t = sessionStorage.getItem(TOKEN_KEY);
    return t ? t : null;
  });
  const [user, setUser] = useState<User | null>(null);

  const refreshMe = async (tokenOverride?: string) => {
    const effectiveToken = tokenOverride ?? token;
    if (!effectiveToken) {
      setUser(null);
      return;
    }
    const data = await apiJson<{ user: User }>("/api/auth/me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${effectiveToken}`,
      },
    });
    setUser(data.user);
  };

  const login = async (params: { email: string; password: string }) => {
    const data = await apiJson<{ token: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(params),
    });

    setToken(data.token);
    sessionStorage.setItem(TOKEN_KEY, data.token);
    await refreshMe(data.token);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    sessionStorage.removeItem(TOKEN_KEY);
    // Limpieza por compatibilidad: si venías de una sesión anterior persistida.
    localStorage.removeItem(TOKEN_KEY);
  };

  useEffect(() => {
    // Si existe token viejo en localStorage, lo ignoramos.
    localStorage.removeItem(TOKEN_KEY);

    // Si ya existe token en el navegador, intentamos levantar `me`.
    if (token) {
      refreshMe().catch(() => {
        // Si el token expiró, limpiamos la sesión.
        logout();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ token, user, login, logout, refreshMe }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

