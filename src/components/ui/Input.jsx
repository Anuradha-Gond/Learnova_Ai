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
          className="block text-xs font-semibold text-surface-700 tracking-wide"
        >
          {label} {required && <span className="text-danger-600">*</span>}
        </label>
      )}

      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-surface-400">
            <Icon className="w-4 h-4" />
          </div>
        )}

        <input
          id={inputId}
          ref={ref}
          type={type}
          required={required}
          className={cn(
            "w-full bg-white border text-surface-900 placeholder:text-surface-400 text-sm rounded-btn py-2.5 px-3.5 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-subtle",
            Icon ? "pl-10" : "pl-3.5",
            rightElement ? "pr-10" : "pr-3.5",
            error
              ? "border-danger-500 focus:border-danger-600 focus:ring-danger-500/20"
              : "border-surface-300 focus:border-brand-700 hover:border-surface-400",
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
        <p className="text-xs text-danger-600 font-medium animate-fade-in">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-surface-500">{helperText}</p>
      ) : null}
    </div>
  );
});

export default Input;
