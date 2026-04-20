import React, { useEffect, useMemo, useState } from "react";

import { useAuth } from "../auth/authContext";
import { useToast } from "../ui/ToastContext";

type Product = {
  _id: string;
  name: string;
  sku?: string;
  unitCost?: number;
};

type ProductInput = {
  name: string;
  sku?: string;
  unitCost?: number;
};

function formatCost(value?: number): string {
  if (value == null) return "-";
  return value.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

export function ProductsPage() {
  const { token, user, refreshMe } = useAuth();
  const { pushToast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [unitCost, setUnitCost] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false); // hay cambios sin guardar en el form

  const fetchProducts = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/products", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message ?? `Error ${res.status}`);
      setProducts(data.products ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      refreshMe().catch(() => {});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku ? p.sku.toLowerCase().includes(q) : false) ||
        String(p.unitCost ?? "").toLowerCase().includes(q)
    );
  }, [products, query]);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setSku("");
    setUnitCost("");
    setDirty(false);
  };

  const handleCancelEdit = () => {
    if (dirty) {
      const confirmed = window.confirm("Tenés cambios sin guardar. ¿Cancelar de todas formas?");
      if (!confirmed) return;
    }
    resetForm();
  };

  const handleFieldChange = <T,>(setter: React.Dispatch<React.SetStateAction<T>>) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(e.target.value as unknown as T);
      setDirty(true);
    };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError(null);

    // Validar costo
    if (unitCost.trim()) {
      const parsed = Number(unitCost);
      if (!Number.isFinite(parsed) || parsed < 0) {
        setError("El costo unitario debe ser un número positivo.");
        return;
      }
    }

    const payload: ProductInput = {
      name: name.trim(),
      sku: sku.trim() ? sku.trim() : undefined,
      unitCost: unitCost.trim() ? Number(unitCost) : undefined,
    };

    try {
      const method = editingId ? "PATCH" : "POST";
      const url = editingId ? `/api/products/${editingId}` : `/api/products`;

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message ?? `Error ${res.status}`);

      resetForm();
      await fetchProducts();
      pushToast({
        type: "success",
        message: editingId ? "Producto actualizado" : "Producto creado",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al guardar";
      setError(msg);
      pushToast({ type: "error", message: msg });
    }
  };

  const handleDelete = async (product: Product) => {
    if (!token) return;
    const confirmed = window.confirm(`¿Eliminár "${product.name}"? Esta acción no se puede deshacer.`);
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/products/${product._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message ?? `Error ${res.status}`);

      // Si estábamos editando ese producto, limpiamos el form
      if (editingId === product._id) resetForm();

      await fetchProducts();
      pushToast({ type: "success", message: `"${product.name}" eliminado` });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al eliminar";
      setError(msg);
      pushToast({ type: "error", message: msg });
    }
  };

  return (
    <div className="pageGrid">
      <div className="card">
        <h2>Productos</h2>
        {loading ? <div>Cargando...</div> : null}
        {error ? <div className="errorText">{error}</div> : null}

        {/* Buscador */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "flex-end" }}>
          <label style={{ display: "grid", gap: 6, flex: 1 }}>
            Buscar por nombre o SKU
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ej: tornillo / ABC123"
            />
          </label>
          <button
            type="button"
            className="btnSecondary"
            onClick={() => setQuery("")}
            disabled={!query.trim()}
          >
            Limpiar
          </button>
          <button
            type="button"
            className="btnSecondary"
            onClick={() => fetchProducts().catch(() => {})}
          >
            Refrescar
          </button>
        </div>

        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>SKU</th>
              <th>Costo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((p) => (
              <tr
                key={p._id}
                style={
                  editingId === p._id
                    ? { outline: "2px solid var(--color-accent, #4f8ef7)", borderRadius: 4 }
                    : undefined
                }
              >
                <td>{p.name}</td>
                <td>{p.sku ?? "-"}</td>
                <td>{formatCost(p.unitCost)}</td>
                <td>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      type="button"
                      className="btnSecondary"
                      onClick={() => {
                        setEditingId(p._id);
                        setName(p.name);
                        setSku(p.sku ?? "");
                        setUnitCost(p.unitCost != null ? String(p.unitCost) : "");
                        setDirty(false);
                      }}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="btnDanger"
                      onClick={() => handleDelete(p)}
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {products.length === 0 && !loading ? (
              <tr>
                <td colSpan={4}>No hay productos todavía.</td>
              </tr>
            ) : null}
            {products.length > 0 && filteredProducts.length === 0 && !loading ? (
              <tr>
                <td colSpan={4}>Sin resultados para "{query.trim()}".</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* ── Panel derecho ── */}
      <div className="card cardAlt">
        <h3>{editingId ? "Editar producto" : "Nuevo producto"}</h3>
        <form onSubmit={submit} className="formGrid">
          <label style={{ display: "grid", gap: 6 }}>
            Nombre
            <input value={name} onChange={handleFieldChange(setName)} required />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            SKU (opcional)
            <input value={sku} onChange={handleFieldChange(setSku)} />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            Costo unitario (opcional)
            <input
              value={unitCost}
              onChange={handleFieldChange(setUnitCost)}
              inputMode="decimal"
              type="number"
              min={0}
              step={0.01}
            />
          </label>

          {user?.role ? (
            <div className="tiny">Rol actual: {user.role}. (La API controlará permisos)</div>
          ) : null}

          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button type="submit" className="btnPrimary" style={{ flex: 1 }}>
              {editingId ? "Guardar cambios" : "Crear"}
            </button>
            {editingId ? (
              <button type="button" onClick={handleCancelEdit} className="btnSecondary">
                Cancelar
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
}