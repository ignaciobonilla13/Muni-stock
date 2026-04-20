import React, { createContext, useContext, useMemo, useState } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

export type Toast = {
  id: string;
  type: ToastType;
  message: string;
};

type ToastContextValue = {
  pushToast: (t: { type: ToastType; message: string; durationMs?: number }) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const pushToast = (t: { type: ToastType; message: string; durationMs?: number }) => {
    const toast: Toast = { id: makeId(), type: t.type, message: t.message };
    const durationMs = t.durationMs ?? 4200;

    setToasts((prev) => [toast, ...prev].slice(0, 5));

    window.setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== toast.id));
    }, durationMs);
  };

  const value = useMemo<ToastContextValue>(() => ({ pushToast }), []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toastViewport" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast" data-type={t.type}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

