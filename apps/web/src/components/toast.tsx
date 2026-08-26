"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { CheckCircle, Info, Warning, X } from "@phosphor-icons/react";

type ToastKind = "success" | "error" | "info";
type Toast = { id: string; message: string; kind: ToastKind };
type ToastContextValue = { show: (message: string, kind?: ToastKind) => void };

const ToastContext = createContext<ToastContextValue>({ show: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) { clearTimeout(timer); timers.current.delete(id); }
  }, []);

  const show = useCallback((message: string, kind: ToastKind = "info") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev.slice(-4), { id, message, kind }]);
    const timer = setTimeout(() => dismiss(id), 4500);
    timers.current.set(id, timer);
  }, [dismiss]);

  useEffect(() => {
    const currentTimers = timers.current;
    return () => { currentTimers.forEach(clearTimeout); };
  }, []);

  const Icon = ({ kind }: { kind: ToastKind }) =>
    kind === "success" ? <CheckCircle size={16} weight="fill" /> :
    kind === "error" ? <Warning size={16} weight="fill" /> :
    <Info size={16} weight="fill" />;

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="toast-container" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.kind}`} role="status">
            <Icon kind={toast.kind} />
            <span>{toast.message}</span>
            <button className="toast-close" onClick={() => dismiss(toast.id)} aria-label="Dismiss">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
