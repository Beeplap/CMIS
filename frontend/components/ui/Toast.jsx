"use client";
import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle, XCircle, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ message, type = "info", duration = 4000 }) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
    return id;
  }, []);

  const toast = useCallback(
    (message, type = "info") => addToast({ message, type }),
    [addToast]
  );
  toast.success = (msg) => addToast({ message: msg, type: "success" });
  toast.error = (msg) => addToast({ message: msg, type: "error" });
  toast.info = (msg) => addToast({ message: msg, type: "info" });

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        <div className="flex flex-col gap-2 pointer-events-auto">
          {toasts.map((t) => (
            <ToastItem key={t.id} {...t} onDismiss={() => dismiss(t.id)} />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ id, message, type, onDismiss }) {
  const config = {
    success: {
      icon: CheckCircle,
      className:
        "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/90 dark:border-emerald-800 dark:text-emerald-100",
      iconClassName: "text-emerald-600 dark:text-emerald-400",
    },
    error: {
      icon: XCircle,
      className:
        "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/90 dark:border-red-800 dark:text-red-100",
      iconClassName: "text-red-600 dark:text-red-400",
    },
    info: {
      icon: AlertCircle,
      className:
        "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/90 dark:border-blue-800 dark:text-blue-100",
      iconClassName: "text-blue-600 dark:text-blue-400",
    },
  };
  const { icon: Icon, className, iconClassName } = config[type] || config.info;

  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg transition-all duration-300",
        className
      )}
    >
      <Icon className={cn("w-5 h-5 shrink-0 mt-0.5", iconClassName)} />
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button
        onClick={onDismiss}
        className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors shrink-0"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      toast: (msg) => console.warn("Toast not available:", msg),
      success: (msg) => console.warn("Toast not available:", msg),
      error: (msg) => console.warn("Toast not available:", msg),
      info: (msg) => console.warn("Toast not available:", msg),
    };
  }
  return ctx.toast;
}
