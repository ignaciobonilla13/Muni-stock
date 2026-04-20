import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../auth/authContext";
import { useToast } from "../ui/ToastContext";

export function LoginPage() {
  const nav = useNavigate();
  const { login } = useAuth();
  const { pushToast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ email, password });
      pushToast({ type: "success", message: "Sesión iniciada" });
      nav("/products");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al iniciar sesión";
      setError(msg);
      pushToast({ type: "error", message: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="authCenter">
      <div style={{ width: 420 }} className="card cardAlt authCard">
        <h2>Iniciar sesión</h2>
        <form onSubmit={onSubmit} className="formGrid">
          <label>
            Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          </label>
          <label>
            Contraseña
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
            />
          </label>
          {error ? <div className="errorText">{error}</div> : null}
          <button type="submit" disabled={loading} className="btnPrimary">
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
        <div className="tiny" style={{ marginTop: 12 }}>
          Acceso para administradores y operadores.
        </div>
      </div>
    </div>
  );
}

