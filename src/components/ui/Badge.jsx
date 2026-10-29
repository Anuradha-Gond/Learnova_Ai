"use client";

import React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = {
  neutral: "bg-surface-100 text-surface-700 border-surface-200",
  primary: "bg-brand-50 text-brand-800 border-brand-200",
  teal: "bg-teal-50 text-teal-800 border-teal-200",
  violet: "bg-violet-50 text-violet-800 border-violet-200",
  success: "bg-success-50 text-success-700 border-emerald-200",
  warning: "bg-warning-50 text-warning-700 border-amber-200",
  danger: "bg-danger-50 text-danger-700 border-rose-200",
};

export default function Badge({
  children,
  variant = "neutral",
  size = "sm",
  className,
  ...props
}) {
  const sizeClasses =
    size === "sm"
      ? "text-[11px] px-2.5 py-0.5 rounded-full"
      : "text-xs px-3 py-1 rounded-full";

  return (
    <span
      className={cn(
        "inline-flex items-center font-semibold border gap-1 select-none",
        badgeVariants[variant] || badgeVariants.neutral,
        sizeClasses,
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
