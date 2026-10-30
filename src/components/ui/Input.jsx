"use client";

import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

const Input = forwardRef(function Input(
  {
    label,
    error,
    helperText,
    icon: Icon,
    rightElement,
    className,
    id,
    type = "text",
    required = false,
    ...props
  },
  ref
) {
  const inputId = id || props.name || Math.random().toString(36).substring(7);

  return (
    <div className="w-full space-y-1.5 text-left">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold text-slate-300 tracking-wide"
        >
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Icon className="w-4 h-4" />
          </div>
        )}

        <input
          id={inputId}
          ref={ref}
          type={type}
          required={required}
          className={cn(
            "w-full bg-[#111827] border text-slate-100 placeholder:text-slate-500 text-sm rounded-btn py-2.5 px-3.5 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-subtle",
            Icon ? "pl-10" : "pl-3.5",
            rightElement ? "pr-10" : "pr-3.5",
            error
              ? "border-rose-500 focus:border-rose-600 focus:ring-rose-500/20"
              : "border-[#334155] focus:border-brand-500 hover:border-slate-600",
            className
          )}
          {...props}
        />

        {rightElement && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            {rightElement}
          </div>
        )}
      </div>

      {error ? (
        <p className="text-xs text-rose-400 font-medium animate-fade-in">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-slate-400">{helperText}</p>
      ) : null}
    </div>
  );
});

export default Input;
