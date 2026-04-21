import React, { useEffect, useMemo, useState } from "react";

import { useAuth } from "../auth/authContext";
import { useToast } from "../ui/ToastContext";

type Product = {
  _id: string;
  name: string;
  description?: string;
  unitCost?: number;
  supplier?: string;
  invoiceNumber?: string;
};

type ProductInput = {
  name: string;
  description?: string;
  unitCost?: number;
  supplier?: string;
  invoiceNumber?: string;
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
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [unitCost, setUnitCost] = useState<string>("");
  const [supplier, setSupplier] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

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
        (p.description ?? "").toLowerCase().includes(q) ||
        (p.supplier ?? "").toLowerCase().includes(q)
    );
  }, [products, query]);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setDescription("");
    setUnitCost("");
    setSupplier("");
    setInvoiceNumber("");
    setDirty(false);
    setError(null);
  };

  const openNew = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditingId(p._id);
    setName(p.name);
    setDescription(p.description ?? "");
    setUnitCost(p.unitCost != null ? String(p.unitCost) : "");
    setSupplier(p.supplier ?? "");
    setInvoiceNumber(p.invoiceNumber ?? "");
    setDirty(false);
    setError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (dirty) {
      const confirmed = window.confirm("Tenés cambios sin guardar. ¿Cerrar de todas formas?");
      if (!confirmed) return;
    }
    resetForm();
    setModalOpen(false);
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

    if (unitCost.trim()) {
      const parsed = Number(unitCost);
      if (!Number.isFinite(parsed) || parsed < 0) {
        setError("El costo unitario debe ser un número positivo.");
        return;
      }
    }

    const payload: ProductInput = {
      name: name.trim(),
      description: description.trim() ? description.trim() : undefined,
      unitCost: unitCost.trim() ? Number(unitCost) : undefined,
      supplier: supplier.trim() ? supplier.trim() : undefined,
      invoiceNumber: invoiceNumber.trim() ? invoiceNumber.trim() : undefined,
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
      setModalOpen(false);
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

      if (editingId === product._id) {
        resetForm();
        setModalOpen(false);
      }

      await fetchProducts();
      pushToast({ type: "success", message: `"${product.name}" eliminado` });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al eliminar";
      setError(msg);
      pushToast({ type: "error", message: msg });
    }
  };

  return (
    <div className="card">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Productos</h2>
        <button type="button" className="btnPrimary" onClick={openNew}>
          + Nuevo producto
        </button>
      </div>

      {loading ? <div>Cargando...</div> : null}
      {error && !modalOpen ? <div className="errorText">{error}</div> : null}

      {/* Buscador */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "flex-end" }}>
        <label style={{ display: "grid", gap: 6, flex: 1 }}>
          Buscar por nombre, descripción o proveedor
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ej: tornillo / Proveedor SA"
          />
        </label>
        <button type="button" className="btnSecondary" onClick={() => setQuery("")} disabled={!query.trim()}>
          Limpiar
        </button>
        <button type="button" className="btnSecondary" onClick={() => fetchProducts().catch(() => {})}>
          Refrescar
        </button>
      </div>

      {/* Tabla */}
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Descripción</th>
            <th>Proveedor</th>
            <th>Nro Factura</th>
            <th>Costo</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {filteredProducts.map((p) => (
            <tr key={p._id}>
              <td>{p.name}</td>
              <td>{p.description ?? "-"}</td>
              <td>{p.supplier ?? "-"}</td>
              <td>{p.invoiceNumber ?? "-"}</td>
              <td>{formatCost(p.unitCost)}</td>
              <td>
                <div style={{ display: "flex", gap: 6 }}>
                  <button type="button" className="btnSecondary" onClick={() => openEdit(p)}>
                    Editar
                  </button>
                  <button type="button" className="btnDanger" onClick={() => handleDelete(p)}>
                    Eliminar
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {products.length === 0 && !loading ? (
            <tr className="emptyRow"><td colSpan={6}>No hay productos todavía.</td></tr>
          ) : null}
          {products.length > 0 && filteredProducts.length === 0 && !loading ? (
            <tr className="emptyRow"><td colSpan={6}>Sin resultados para "{query.trim()}".</td></tr>
          ) : null}
        </tbody>
      </table>

      {/* Modal */}
      {modalOpen && (
        <div className="modalOverlay" onClick={closeModal}>
          <div className="modalBox" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <h3 style={{ margin: 0 }}>{editingId ? "Editar producto" : "Nuevo producto"}</h3>
              <button type="button" className="modalClose" onClick={closeModal}>✕</button>
            </div>

            {error ? <div className="errorText" style={{ marginBottom: 8 }}>{error}</div> : null}

            <form onSubmit={submit} className="formGrid">
              <label style={{ display: "grid", gap: 6 }}>
                Nombre
                <input value={name} onChange={handleFieldChange(setName)} required />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                Descripción (opcional)
                <input value={description} onChange={handleFieldChange(setDescription)} />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                Proveedor (opcional)
                <input value={supplier} onChange={handleFieldChange(setSupplier)} placeholder="ej: Distribuidora SA" />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                Nro de factura (opcional)
                <input value={invoiceNumber} onChange={handleFieldChange(setInvoiceNumber)} placeholder="ej: 0001-00012345" />
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
                <button type="button" onClick={closeModal} className="btnSecondary">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}