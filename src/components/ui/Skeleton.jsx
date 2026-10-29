"use client";

import React from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-surface-200/80",
        className
      )}
      {...props}
    />
  );
}

export function SkeletonText({ lines = 3, className }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-4", i === lines - 1 ? "w-2/3" : "w-full")}
        />
      ))}
    </div>
  );
}

export function SkeletonAvatar({ size = "md", className }) {
  const sizeMap = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
  };

  return (
    <Skeleton
      className={cn("rounded-full", sizeMap[size] || sizeMap.md, className)}
    />
  );
}

export function SkeletonCard({ className }) {
  return (
    <div className={cn("edu-card p-6 space-y-4", className)}>
      <div className="flex items-center gap-3">
        <SkeletonAvatar size="md" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
      <SkeletonText lines={2} />
      <Skeleton className="h-8 w-24 rounded-btn" />
    </div>
  );
}
