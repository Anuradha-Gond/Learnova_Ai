import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind CSS class names safely avoiding conflicts
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
