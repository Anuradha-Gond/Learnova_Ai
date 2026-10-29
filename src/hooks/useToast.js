"use client";

import { useCallback } from "react";
import { showToast } from "@/components/ui/Toast";

/**
 * Hook providing ergonomic helper methods for toast notifications.
 */
export function useToast() {
  const success = useCallback((message, title = "Success") => {
    showToast({ type: "success", title, message });
  }, []);

  const error = useCallback((message, title = "Error") => {
    showToast({ type: "error", title, message });
  }, []);

  const info = useCallback((message, title = "Info") => {
    showToast({ type: "info", title, message });
  }, []);

  const warning = useCallback((message, title = "Warning") => {
    showToast({ type: "warning", title, message });
  }, []);

  return {
    toast: showToast,
    success,
    error,
    info,
    warning,
  };
}
