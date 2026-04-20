import React, { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { useAuth } from "../auth/authContext";
import { useToast } from "../ui/ToastContext";

type InventoryItem = {
  productId: string;
  name: string;
  sku?: string;
  qtyOnHand: number;
};

type StockMovement = {
  _id: string;
  productId: string;
  type: "IN" | "OUT";
  quantity: number;
  occurredAt: string;
  unitCost?: number;
  reference?: string;
};

// ─── estilos de tabla compartidos ────────────────────────────────────────────
const tableStyles = `
  .stk-table-wrap { overflow-x: auto; }

  .stk-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
  }

  .stk-table thead tr {
    border-bottom: 1.5px solid var(--border);
  }

  .stk-table thead th {
    padding: 9px 14px;
    text-align: left;
    font-weight: 500;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--muted);
    background: rgba(255, 255, 255, 0.04);
    white-space: nowrap;
  }

  .stk-table thead th.right { text-align: right; }

  .stk-table tbody tr {
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    transition: background 0.1s;
  }

  .stk-table tbody tr:last-child { border-bottom: none; }

  .stk-table tbody tr:hover td {
    background: rgba(96, 165, 250, 0.08);
  }

  .stk-table tbody td {
    padding: 10px 14px;
    color: var(--text) !important;
    vertical-align: middle;
  }

  .stk-table tbody td.right { text-align: right; }

  .stk-table .empty-row td {
    text-align: center;
    padding: 24px 14px;
    color: var(--muted) !important;
    font-size: 13px;
  }

  /* SKU pill */
  .stk-sku {
    display: inline-block;
    margin-left: 6px;
    font-size: 11px;
    font-family: monospace;
    color: var(--muted);
    background: rgba(255, 255, 255, 0.06);
    border: 0.5px solid var(--border);
    border-radius: 4px;
    padding: 1px 6px;
  }

  /* cantidad en stock */
  .stk-qty {
    font-weight: 500;
    font-variant-numeric: tabular-nums;
    color: var(--text);
  }
  .stk-qty.low  { color: var(--danger); }
  .stk-qty.ok   { color: var(--success); }

  /* badge entrada / salida */
  .stk-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 500;
    padding: 3px 9px;
    border-radius: 999px;
    white-space: nowrap;
  }
  .stk-badge.in  {
    background: rgba(52, 211, 153, 0.15);
    color: var(--success);
    border: 0.5px solid rgba(52, 211, 153, 0.35);
  }
  .stk-badge.out {
    background: rgba(251, 113, 133, 0.15);
    color: var(--danger);
    border: 0.5px solid rgba(251, 113, 133, 0.35);
  }

  /* referencia en monospace */
  .stk-ref {
    font-size: 12px;
    font-family: monospace;
    color: var(--muted);
  }

  /* fecha */
  .stk-date {
    font-size: 13px;
    color: var(--muted);
    white-space: nowrap;
  }
`;

function injectStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById("stk-table-styles")) return;
  const el = document.createElement("style");
  el.id = "stk-table-styles";
  el.textContent = tableStyles;
  document.head.appendChild(el);
}

// ─── helpers ─────────────────────────────────────────────────────────────────
const LOW_STOCK_THRESHOLD = 10;

function QtyCell({ qty }: { qty: number }) {
  const cls = qty <= LOW_STOCK_THRESHOLD ? "low" : "ok";
  return (
    <td className="right">
      <span className={`stk-qty ${cls}`}>{qty}</span>
    </td>
  );
}

function BadgeCell({ type }: { type: "IN" | "OUT" }) {
  return (
    <td>
      <span className={`stk-badge ${type === "IN" ? "in" : "out"}`}>
        {type === "IN" ? "↑ Entrada" : "↓ Salida"}
      </span>
    </td>
  );
}

// ─── componente principal ─────────────────────────────────────────────────────
export function StockPage() {
  const { token, refreshMe } = useAuth();
  const { pushToast } = useToast();

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [productId, setProductId] = useState<string>("");
  const [inventorySearch, setInventorySearch] = useState<string>("");
  const [type, setType] = useState<"IN" | "OUT">("IN");
  const [quantity, setQuantity] = useState<string>("");
  const [unitCost, setUnitCost] = useState<string>("");
  const [reference, setReference] = useState<string>("");

  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [movementQuery, setMovementQuery] = useState<string>("");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const didInitRef = useRef(false);

  const productsOptions = useMemo(
    () =>
      inventory.map((i) => ({
        value: i.productId,
        label: `${i.name}${i.sku ? ` (${i.sku})` : ""}`,
      })),
    [inventory]
  );

  const inventoryById = useMemo(() => {
    const m = new Map<string, InventoryItem>();
    for (const i of inventory) m.set(i.productId, i);
    return m;
  }, [inventory]);

  const filteredInventory = useMemo(() => {
    const q = inventorySearch.trim().toLowerCase();
    if (!q) return inventory;
    return inventory.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.sku ?? "").toLowerCase().includes(q)
    );
  }, [inventory, inventorySearch]);

  const filteredMovements = useMemo(() => {
    const mq = movementQuery.trim().toLowerCase();
    if (!mq) return movements;
    return movements.filter((m) => {
      const inv = inventoryById.get(m.productId);
      const label = inv
        ? `${inv.name} ${inv.sku ?? ""}`.toLowerCase()
        : "";
      return (
        (m.reference ?? "").toLowerCase().includes(mq) ||
        m.type.toLowerCase().includes(mq) ||
        label.includes(mq)
      );
    });
  }, [movements, movementQuery, inventoryById]);

  const sortedMovements = useMemo(() => {
    const arr = [...filteredMovements];
    arr.sort((a, b) => {
      const ta = new Date(a.occurredAt).getTime();
      const tb = new Date(b.occurredAt).getTime();
      return sortDir === "desc" ? tb - ta : ta - tb;
    });
    return arr;
  }, [filteredMovements, sortDir]);

  // ── fetch ──
  const fetchInventory = async () => {
    if (!token) return;
    const res = await fetch("/api/inventory", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.message ?? `Error ${res.status}`);
    const items: InventoryItem[] = data.inventory ?? [];
    setInventory(items);
    if (!productId && items.length > 0) setProductId(items[0].productId);
  };

  const fetchMovements = async (opts?: {
    productId?: string;
    from?: string;
    to?: string;
  }) => {
    if (!token) return;
    const params = new URLSearchParams();
    const pid = opts?.productId ?? productId;
    const f = opts?.from ?? from;
    const t = opts?.to ?? to;
    if (pid) params.set("productId", pid);
    if (f) params.set("from", f);
    if (t) params.set("to", t);

    const res = await fetch(`/api/stock-movements?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.message ?? `Error ${res.status}`);
    setMovements(data.movements ?? []);
  };

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      await fetchInventory();
      await fetchMovements({ productId: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      refreshMe().catch(() => {});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!didInitRef.current) {
      didInitRef.current = true;
      return;
    }
    fetchMovements({ from, to, productId: "" }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  // ── submit ──
  const submitMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError(null);

    const q = Number(quantity);
    if (!Number.isFinite(q) || q <= 0) {
      setError("La cantidad debe ser un número > 0");
      return;
    }

    try {
      const inv = inventory.find((i) => i.productId === productId);
      if (type === "OUT" && inv && inv.qtyOnHand < q) {
        const msg = `Stock insuficiente. Disponible: ${inv.qtyOnHand}`;
        setError(msg);
        pushToast({ type: "warning", message: msg });
        return;
      }

      const res = await fetch("/api/stock-movements", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId,
          type,
          quantity: q,
          unitCost: unitCost.trim() ? Number(unitCost) : undefined,
          reference: reference.trim() ? reference.trim() : undefined,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message ?? `Error ${res.status}`);

      setType("IN");
      setQuantity("");
      setUnitCost("");
      setReference("");

      await refresh();
      const sign = type === "OUT" ? "-" : "+";
      pushToast({
        type: "success",
        message: `Movimiento registrado (${sign}${q})`,
      });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Error al registrar movimiento";
      setError(msg);
      if (msg.toLowerCase().includes("stock insuficiente")) {
        pushToast({ type: "warning", message: msg });
      } else {
        pushToast({ type: "error", message: msg });
      }
    }
  };

  // ── export ──
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    const stockRows = inventory.map((i) => ({
      Producto: i.name,
      SKU: i.sku ?? "-",
      "Stock actual": i.qtyOnHand,
    }));
    const wsStock = XLSX.utils.json_to_sheet(stockRows);
    wsStock["!cols"] = [{ wch: 32 }, { wch: 16 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, wsStock, "Stock");

    const movRows = sortedMovements.map((m) => {
      const inv = inventoryById.get(m.productId);
      return {
        Fecha: new Date(m.occurredAt).toLocaleString(),
        Producto: inv ? inv.name : m.productId,
        SKU: inv?.sku ?? "-",
        Tipo: m.type === "IN" ? "Entrada" : "Salida",
        Cantidad: m.quantity,
        "Costo unitario": m.unitCost ?? "-",
        Referencia: m.reference ?? "-",
      };
    });
    const wsMovements = XLSX.utils.json_to_sheet(movRows);
    wsMovements["!cols"] = [
      { wch: 20 },
      { wch: 28 },
      { wch: 14 },
      { wch: 10 },
      { wch: 10 },
      { wch: 14 },
      { wch: 18 },
    ];
    XLSX.utils.book_append_sheet(wb, wsMovements, "Movimientos");

    const fecha = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `stock_${fecha}.xlsx`);
    pushToast({ type: "success", message: "Excel exportado correctamente" });
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="pageGrid" style={{ gridTemplateColumns: "1fr 420px" }}>

      {/* ── Panel izquierdo ── */}
      <div className="card">

        {/* Título + botón export */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <h2 style={{ margin: 0 }}>Stock</h2>
          <button
            type="button"
            className="btnSecondary"
            onClick={exportToExcel}
            disabled={inventory.length === 0}
            title="Exportar stock y movimientos a Excel"
          >
            ⬇ Exportar Excel
          </button>
        </div>

        {loading ? <div>Cargando...</div> : null}
        {error ? <div className="errorText">{error}</div> : null}

        {/* Buscador */}
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 14,
            alignItems: "center",
          }}
        >
          <input
            style={{ flex: 1 }}
            value={inventorySearch}
            onChange={(e) => setInventorySearch(e.target.value)}
            placeholder="Buscar producto en stock…"
          />
          {inventorySearch && (
            <button
              type="button"
              className="btnSecondary"
              onClick={() => setInventorySearch("")}
            >
              Limpiar
            </button>
          )}
        </div>

        {/* ── Tabla de stock ── */}
        <div className="stk-table-wrap">
          <table className="stk-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th className="right">Stock</th>
              </tr>
            </thead>
            <tbody>
              {filteredInventory.map((i) => (
                <tr key={i.productId}>
                  <td>
                    {i.name}
                    {i.sku ? (
                      <span className="stk-sku">{i.sku}</span>
                    ) : null}
                  </td>
                  <QtyCell qty={i.qtyOnHand} />
                </tr>
              ))}
              {filteredInventory.length === 0 && !loading ? (
                <tr className="empty-row">
                  <td colSpan={2}>
                    {inventorySearch.trim()
                      ? `Sin resultados para "${inventorySearch.trim()}".`
                      : "No hay productos todavía."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {/* ── Historial ── */}
        <div style={{ marginTop: 32 }}>
          <h3 style={{ marginBottom: 4 }}>Historial de movimientos</h3>
          <p
            style={{
              fontSize: 12,
              color: "var(--color-text-secondary)",
              marginBottom: 16,
            }}
          >
            Filtrá por <strong>ref</strong>, <strong>producto</strong> o{" "}
            <strong>tipo</strong>.
          </p>

          {/* Filtro fechas */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "160px 160px",
              gap: 12,
              marginBottom: 10,
            }}
          >
            <label style={{ display: "grid", gap: 4 }}>
              Desde
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label style={{ display: "grid", gap: 4 }}>
              Hasta
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 12,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              className="btnSecondary"
              onClick={() =>
                fetchMovements({ from, to, productId: "" }).catch(() => {})
              }
            >
              Aplicar fechas
            </button>
            <button
              type="button"
              className="btnSecondary"
              disabled={!from && !to}
              onClick={() => {
                setFrom("");
                setTo("");
                setMovementQuery("");
                fetchMovements({ from: "", to: "", productId: "" }).catch(
                  () => {}
                );
              }}
            >
              Limpiar fechas
            </button>
          </div>

          {/* Buscador movimientos */}
          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 10,
              alignItems: "flex-end",
              flexWrap: "wrap",
            }}
          >
            <label
              style={{ display: "grid", gap: 4, flex: 1, minWidth: 200 }}
            >
              Buscar (ref / producto / tipo)
              <input
                value={movementQuery}
                onChange={(e) => setMovementQuery(e.target.value)}
                placeholder="ej: COMP-0001 / OUT / tornillo"
              />
            </label>
            <button
              type="button"
              className="btnSecondary"
              disabled={!movementQuery.trim()}
              onClick={() => setMovementQuery("")}
            >
              Limpiar
            </button>
            <button
              type="button"
              className="btnSecondary"
              onClick={() =>
                fetchMovements({ productId: "" }).catch(() => {})
              }
            >
              Refrescar
            </button>
          </div>

          {/* Ordenar / Reset */}
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              marginBottom: 14,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: 12,
                color: "var(--color-text-secondary)",
              }}
            >
              Ordenar por fecha:
            </span>
            <button
              type="button"
              className="btnSecondary"
              onClick={() =>
                setSortDir((p) => (p === "desc" ? "asc" : "desc"))
              }
            >
              {sortDir === "desc" ? "Más recientes primero" : "Más antiguos primero"}
            </button>
            <button
              type="button"
              className="btnSecondary"
              disabled={!from && !to && !movementQuery.trim()}
              onClick={() => {
                setFrom("");
                setTo("");
                setMovementQuery("");
                fetchMovements({ from: "", to: "", productId: "" }).catch(
                  () => {}
                );
              }}
            >
              Reset filtros
            </button>
          </div>

          {/* ── Tabla de movimientos ── */}
          <div className="stk-table-wrap">
            <table className="stk-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Producto</th>
                  <th>Tipo</th>
                  <th className="right">Cantidad</th>
                  <th>Referencia</th>
                </tr>
              </thead>
              <tbody>
                {sortedMovements.map((m) => {
                  const inv = inventoryById.get(m.productId);
                  return (
                    <tr key={m._id}>
                      <td>
                        <span className="stk-date">
                          {new Date(m.occurredAt).toLocaleString()}
                        </span>
                      </td>
                      <td>
                        {inv ? (
                          <>
                            {inv.name}
                            {inv.sku ? (
                              <span className="stk-sku">{inv.sku}</span>
                            ) : null}
                          </>
                        ) : (
                          m.productId
                        )}
                      </td>
                      <BadgeCell type={m.type} />
                      <td className="right">
                        <span className="stk-qty">{m.quantity}</span>
                      </td>
                      <td>
                        {m.reference ? (
                          <span className="stk-ref">{m.reference}</span>
                        ) : (
                          <span
                            style={{
                              color: "var(--color-text-secondary)",
                              fontSize: 13,
                            }}
                          >
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {movements.length === 0 && !loading ? (
                  <tr className="empty-row">
                    <td colSpan={5}>Sin movimientos para esos filtros.</td>
                  </tr>
                ) : null}

                {movements.length > 0 &&
                sortedMovements.length === 0 &&
                !loading ? (
                  <tr className="empty-row">
                    <td colSpan={5}>
                      {movementQuery.trim()
                        ? `Sin resultados para "${movementQuery.trim()}".`
                        : "Sin resultados."}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Panel derecho ── */}
      <div className="card cardAlt">
        <h3>Registrar movimiento</h3>
        <form onSubmit={submitMovement} className="formGrid">
          <label style={{ display: "grid", gap: 6 }}>
            Producto
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              required
            >
              {productsOptions.length === 0 && <option value="">-</option>}
              {productsOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            Tipo
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "IN" | "OUT")}
            >
              <option value="IN">Entrada (IN)</option>
              <option value="OUT">Salida (OUT)</option>
            </select>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            Cantidad
            <input
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              type="number"
              min={1}
              step={1}
              required
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            Costo unitario (opcional)
            <input
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
              type="number"
              step={0.01}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            Referencia (opcional)
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="ej: COMP-0001 / VTA-002"
            />
          </label>

          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button
              type="submit"
              className="btnPrimary"
              style={{ flex: 1 }}
            >
              Guardar movimiento
            </button>
            <button
              type="button"
              onClick={() => refresh().catch(() => {})}
              className="btnSecondary"
            >
              Refrescar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}