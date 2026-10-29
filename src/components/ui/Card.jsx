"use client";

import React from "react";
import { cn } from "@/lib/utils";

export function Card({ children, className, hoverEffect = false, ...props }) {
  return (
    <div
      className={cn(
        "edu-card p-6",
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
        "text-lg font-bold text-surface-900 font-display tracking-tight",
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
    <p className={cn("text-xs text-surface-500 leading-relaxed", className)} {...props}>
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
      className={cn("flex items-center pt-4 border-t border-surface-200 mt-4", className)}
      {...props}
    >
      {children}
    </div>
  );
}
