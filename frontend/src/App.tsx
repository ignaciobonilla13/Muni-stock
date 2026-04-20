import React from "react";
import { Navigate, Route, Routes, Link } from "react-router-dom";

import { useAuth } from "./auth/authContext";
import { LoginPage } from "./pages/LoginPage";
import { ProductsPage } from "./pages/ProductsPage";
import { StockPage } from "./pages/StockPage";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function App() {
  const { user, logout } = useAuth();

  return (
    <div className="pageShell">
      {user ? (
        <div className="topBar">
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <strong>{user.email}</strong> ({user.role})
          </div>
          <nav className="topNav">
            <Link to="/products">Productos</Link>
            <Link to="/stock">Stock</Link>
          </nav>
          <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
            <button type="button" onClick={logout} className="btnSecondary">
              Salir
            </button>
          </div>
        </div>
      ) : null}

      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Navigate to="/products" replace />
            </PrivateRoute>
          }
        />
        <Route
          path="/products"
          element={
            <PrivateRoute>
              <ProductsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/stock"
          element={
            <PrivateRoute>
              <StockPage />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

