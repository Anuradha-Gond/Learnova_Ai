"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, RefreshCw, X } from "lucide-react";

const alertStyles = {
  error: {
    container: "bg-rose-950/60 border-rose-800/60 text-rose-200",
    icon: AlertCircle,
    iconColor: "text-rose-400",
  },
  warning: {
    container: "bg-amber-950/60 border-amber-800/60 text-amber-200",
    icon: AlertTriangle,
    iconColor: "text-amber-400",
  },
  info: {
    container: "bg-brand-950/60 border-brand-800/60 text-brand-200",
    icon: Info,
    iconColor: "text-brand-400",
  },
  success: {
    container: "bg-emerald-950/60 border-emerald-800/60 text-emerald-200",
    icon: CheckCircle2,
    iconColor: "text-emerald-400",
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
        {title && <h4 className="font-bold text-slate-100 mb-0.5">{title}</h4>}
        <div>{message || children}</div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 inline-flex items-center gap-1.5 font-semibold text-brand-400 hover:text-brand-300 underline underline-offset-2 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try again</span>
          </button>
        )}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
          aria-label="Dismiss alert"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
