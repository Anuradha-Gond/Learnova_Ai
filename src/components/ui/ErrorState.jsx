"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, RefreshCw, X } from "lucide-react";

const alertStyles = {
  error: {
    container: "bg-danger-50 border-danger-200 text-danger-900",
    icon: AlertCircle,
    iconColor: "text-danger-600",
  },
  warning: {
    container: "bg-warning-50 border-warning-200 text-warning-900",
    icon: AlertTriangle,
    iconColor: "text-warning-600",
  },
  info: {
    container: "bg-brand-50 border-brand-200 text-brand-900",
    icon: Info,
    iconColor: "text-brand-700",
  },
  success: {
    container: "bg-success-50 border-emerald-200 text-emerald-900",
    icon: CheckCircle2,
    iconColor: "text-emerald-600",
  },
};

export default function ErrorState({
  variant = "error",
  title,
  message,
  children,
  onRetry,
  onClose,
  className,
}) {
  const style = alertStyles[variant] || alertStyles.error;
  const IconComponent = style.icon;

  return (
    <div
      role="alert"
      className={cn(
        "p-4 rounded-xl border flex items-start gap-3 text-xs leading-relaxed animate-fade-in shadow-subtle",
        style.container,
        className
      )}
    >
      <IconComponent className={cn("w-5 h-5 shrink-0 mt-0.5", style.iconColor)} />
      <div className="flex-1 min-w-0">
        {title && <h4 className="font-bold text-surface-900 mb-0.5">{title}</h4>}
        <div>{message || children}</div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 inline-flex items-center gap-1.5 font-semibold text-brand-700 hover:text-brand-800 underline underline-offset-2 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try again</span>
          </button>
        )}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-surface-400 hover:text-surface-700 p-0.5 rounded transition-colors"
          aria-label="Dismiss alert"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
