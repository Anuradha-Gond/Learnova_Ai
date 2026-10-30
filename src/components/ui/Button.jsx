"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const variants = {
  primary:
    "bg-brand-500 hover:bg-brand-600 text-white shadow-sm hover:shadow-md hover:shadow-brand-500/20 transition-all duration-150 active:scale-[0.98] font-semibold",
  secondary:
    "bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 shadow-subtle active:scale-[0.98] font-medium",
  accent:
    "bg-teal-500 hover:bg-teal-600 text-white shadow-sm hover:shadow transition-all duration-150 active:scale-[0.98] font-semibold",
  violet:
    "bg-violet-500 hover:bg-violet-600 text-white shadow-sm hover:shadow transition-all duration-150 active:scale-[0.98] font-semibold",
  outline:
    "bg-transparent hover:bg-slate-800/80 text-slate-200 border border-slate-700 hover:border-slate-600 shadow-subtle active:scale-[0.98] font-medium",
  ghost:
    "bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white transition-colors font-medium",
  danger:
    "bg-rose-600 hover:bg-rose-700 text-white shadow-sm active:scale-[0.98] font-semibold",
  destructive:
    "bg-rose-600 hover:bg-rose-700 text-white shadow-sm active:scale-[0.98] font-semibold",
};

const sizes = {
  sm: "text-xs px-3 py-1.5 rounded-lg gap-1.5",
  md: "text-sm px-4 py-2 rounded-btn gap-2 font-medium",
  lg: "text-base px-5 py-2.5 rounded-btn gap-2.5 font-medium",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled = false,
  className,
  type = "button",
  onClick,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center transition-all duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 select-none",
        variants[variant] || variants.primary,
        sizes[size] || sizes.md,
        className
      )}
      {...props}
    >
      {isLoading && (
        <Loader2 className="w-4 h-4 animate-spin text-current shrink-0" />
      )}
      {children}
    </button>
  );
}
