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
    border: "border-emerald-800/60 bg-[#172033] text-emerald-200",
    icon: CheckCircle2,
    iconColor: "text-emerald-400",
    badge: "bg-emerald-950/80 text-emerald-300",
  },
  error: {
    border: "border-rose-800/60 bg-[#172033] text-rose-200",
    icon: AlertCircle,
    iconColor: "text-rose-400",
    badge: "bg-rose-950/80 text-rose-300",
  },
  warning: {
    border: "border-amber-800/60 bg-[#172033] text-amber-200",
    icon: AlertTriangle,
    iconColor: "text-amber-400",
    badge: "bg-amber-950/80 text-amber-300",
  },
  info: {
    border: "border-brand-800/60 bg-[#172033] text-brand-200",
    icon: Info,
    iconColor: "text-brand-400",
    badge: "bg-brand-950/80 text-brand-300",
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
            className={`pointer-events-auto p-4 rounded-xl border shadow-modal flex items-start gap-3 animate-fade-in ${style.border}`}
          >
            <IconComponent className={`w-5 h-5 shrink-0 mt-0.5 ${style.iconColor}`} />
            <div className="flex-1 min-w-0">
              {toast.title && (
                <h4 className="text-xs font-bold text-slate-100 mb-0.5">
                  {toast.title}
                </h4>
              )}
              <p className="text-xs text-slate-300 leading-relaxed">
                {toast.message}
              </p>
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
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
