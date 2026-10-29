"use client";

import React from "react";
import { FolderOpen } from "lucide-react";

export default function EmptyState({
  icon: Icon = FolderOpen,
  title = "No items found",
  description = "Get started by adding your first item.",
  action,
  className,
}) {
  return (
    <div
      className={`rounded-card bg-white border border-dashed border-surface-300 p-8 sm:p-12 text-center flex flex-col items-center justify-center ${className || ""}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-brand-50 border border-brand-100 text-brand-700 flex items-center justify-center mb-4 shadow-subtle">
        <Icon className="w-7 h-7" />
      </div>

      <h3 className="text-base font-bold text-surface-900 font-display">
        {title}
      </h3>
      <p className="text-xs text-surface-500 max-w-sm mx-auto mt-1.5 mb-6 leading-relaxed">
        {description}
      </p>

      {action && <div>{action}</div>}
    </div>
  );
}
