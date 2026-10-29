"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const variants = {
  primary:
    "bg-brand-700 hover:bg-brand-800 text-white shadow-sm hover:shadow transition-all duration-150 active:scale-[0.98]",
  secondary:
    "bg-surface-100 hover:bg-surface-200 text-surface-800 border border-surface-200 shadow-subtle active:scale-[0.98]",
  accent:
    "bg-teal-600 hover:bg-teal-700 text-white shadow-sm hover:shadow transition-all duration-150 active:scale-[0.98]",
  violet:
    "bg-violet-600 hover:bg-violet-700 text-white shadow-sm hover:shadow transition-all duration-150 active:scale-[0.98]",
  outline:
    "bg-white hover:bg-surface-50 text-surface-700 border border-surface-300 hover:border-surface-400 shadow-subtle active:scale-[0.98]",
  ghost:
    "bg-transparent hover:bg-surface-100 text-surface-600 hover:text-surface-900",
  danger:
    "bg-danger-600 hover:bg-danger-700 text-white shadow-sm active:scale-[0.98]",
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
