"use client";

import React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = {
  neutral: "bg-slate-800/80 text-slate-300 border-slate-700",
  primary: "bg-brand-950/80 text-brand-300 border-brand-800/60",
  teal: "bg-teal-950/80 text-teal-300 border-teal-800/60",
  violet: "bg-violet-950/80 text-violet-300 border-violet-800/60",
  success: "bg-emerald-950/80 text-emerald-300 border-emerald-800/60",
  warning: "bg-amber-950/80 text-amber-300 border-amber-800/60",
  danger: "bg-rose-950/80 text-rose-300 border-rose-800/60",
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
