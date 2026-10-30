"use client";

import React from "react";
import { cn } from "@/lib/utils";

export function Card({ children, className, hoverEffect = false, ...props }) {
  return (
    <div
      className={cn(
        "edu-card p-6 bg-[#172033] border border-[#334155] rounded-card text-slate-100 shadow-card",
        hoverEffect && "edu-card-hover",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className, ...props }) {
  return (
    <div className={cn("flex flex-col space-y-1.5 pb-4", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className, ...props }) {
  return (
    <h3
      className={cn(
        "text-lg font-bold text-slate-100 font-display tracking-tight",
        className
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({ children, className, ...props }) {
  return (
    <p className={cn("text-xs text-slate-400 leading-relaxed", className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ children, className, ...props }) {
  return <div className={cn("pt-2", className)} {...props}>{children}</div>;
}

export function CardFooter({ children, className, ...props }) {
  return (
    <div
      className={cn("flex items-center pt-4 border-t border-slate-800 mt-4", className)}
      {...props}
    >
      {children}
    </div>
  );
}
