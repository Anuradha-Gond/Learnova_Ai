"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from "lucide-react";

const TOAST_EVENT = "learnova:toast";

/**
 * Triggers a global toast notification from anywhere in the application
 */
export function showToast({ title, message, type = "info", duration = 4000 }) {
  if (typeof window === "undefined") return;
  const event = new CustomEvent(TOAST_EVENT, {
    detail: {
      id: Math.random().toString(36).substring(7),
      title,
      message,
      type,
      duration,
    },
  });
  window.dispatchEvent(event);
}

const toastStyles = {
  success: {
    border: "border-emerald-200 bg-white",
    icon: CheckCircle2,
    iconColor: "text-emerald-600",
    badge: "bg-emerald-50 text-emerald-700",
  },
  error: {
    border: "border-rose-200 bg-white",
    icon: AlertCircle,
    iconColor: "text-rose-600",
    badge: "bg-rose-50 text-rose-700",
  },
  warning: {
    border: "border-amber-200 bg-white",
    icon: AlertTriangle,
    iconColor: "text-amber-600",
    badge: "bg-amber-50 text-amber-700",
  },
  info: {
    border: "border-brand-200 bg-white",
    icon: Info,
    iconColor: "text-brand-700",
    badge: "bg-brand-50 text-brand-700",
  },
};

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleNewToast = (e) => {
      const newToast = e.detail;
      setToasts((prev) => [...prev, newToast]);

      if (newToast.duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
        }, newToast.duration);
      }
    };

    window.addEventListener(TOAST_EVENT, handleNewToast);
    return () => window.removeEventListener(TOAST_EVENT, handleNewToast);
  }, []);

  const dismissToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((toast) => {
        const style = toastStyles[toast.type] || toastStyles.info;
        const IconComponent = style.icon;

        return (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto p-4 rounded-xl border shadow-dropdown flex items-start gap-3 animate-fade-in ${style.border}`}
          >
            <IconComponent className={`w-5 h-5 shrink-0 mt-0.5 ${style.iconColor}`} />
            <div className="flex-1 min-w-0">
              {toast.title && (
                <h4 className="text-xs font-bold text-surface-900 mb-0.5">
                  {toast.title}
                </h4>
              )}
              <p className="text-xs text-surface-600 leading-relaxed">
                {toast.message}
              </p>
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="text-surface-400 hover:text-surface-700 p-0.5 rounded transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
