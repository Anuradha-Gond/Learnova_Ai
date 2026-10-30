import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind CSS class names safely avoiding conflicts
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Validates a markdown URL against an explicit allowlist of safe schemes and formats.
 * Allows ONLY:
 * - https://...
 * - http://...
 * - mailto:...
 * - Relative application paths starting with '/' (strictly rejecting protocol-relative '//')
 * - In-page anchor fragments starting with '#'
 * 
 * Rejects:
 * - javascript:, vbscript:, data:, file:, blob:, and unknown schemes
 * - Protocol-relative URLs ('//evil.com' or '/\evil.com')
 * - Leading/trailing whitespace and ASCII control characters
 */
export function isSafeMarkdownUrl(rawUrl) {
  if (typeof rawUrl !== "string") return false;

  // Strip leading and trailing whitespace and control characters (\x00-\x20, \x7F)
  const cleaned = rawUrl.replace(/^[\x00-\x20\x7F]+|[\x00-\x20\x7F]+$/g, "");
  if (!cleaned) return false;

  // Strictly reject protocol-relative URLs (e.g. "//example.com" or "/\example.com")
  if (/^\/\//.test(cleaned) || /^\/\s*\//.test(cleaned) || /^\/\\/.test(cleaned)) {
    return false;
  }

  // 1. Safe in-page anchor (#heading, #section-1)
  if (/^#[a-zA-Z0-9_\-\.:]*$/.test(cleaned)) {
    return true;
  }

  // 2. Safe relative application path: starts with single '/', followed by non-slash/non-backslash
  if (/^\/(?!\/|\\)[^\s"<>]*$/.test(cleaned)) {
    return true;
  }

  // 3. Reject any potential scheme containing dangerous scheme prefixes or encoded characters
  if (/^(javascript|vbscript|data|file|blob):/i.test(cleaned)) {
    return false;
  }

  // 4. Safe absolute URLs with explicit allowed schemes: https, http, mailto
  try {
    const parsed = new URL(cleaned);
    const protocol = parsed.protocol.toLowerCase();

    if (protocol === "https:" || protocol === "http:") {
      return true;
    }
    if (protocol === "mailto:") {
      return parsed.pathname.length > 0 && !parsed.pathname.includes("/");
    }

    return false;
  } catch {
    return false;
  }
}

