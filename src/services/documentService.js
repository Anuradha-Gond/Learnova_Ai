/**
 * Document Domain Service
 *
 * Coordinates study material ingestion, validation, status transitions, and storage operations.
 */

export const DocumentStatus = {
  PENDING: "pending",
  PROCESSING: "processing",
  READY: "ready",
  FAILED: "failed",
};

export const MAX_FILE_SIZE_BYTES = 20_000_000; // 20 MB (decimal)
export const MAX_TOTAL_STORAGE_BYTES = 8_500_000_000; // 8.5 GB (decimal)
export const ALLOWED_EXTENSIONS = ["pdf", "txt"];
export const ALLOWED_MIME_TYPES = {
  pdf: ["application/pdf", "application/x-pdf"],
  txt: ["text/plain", "text/plain; charset=utf-8"],
};

/**
 * Validates whether a file object meets upload constraints.
 * Compatible with standard File objects or { name, size, type } plain objects.
 *
 * @param {object} file
 * @param {string} file.name - Filename
 * @param {number} file.size - Size in bytes
 * @returns {{ valid: boolean, extension?: string, error?: string }}
 */
export function validateUploadFile(file) {
  if (!file) {
    return { valid: false, error: "No file provided" };
  }

  if (typeof file.size !== "number" || file.size <= 0) {
    return { valid: false, error: "File cannot be empty" };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: "File exceeds 20 MB limit" };
  }

  const filename = typeof file.name === "string" ? file.name : "";
  const parts = filename.split(".");
  const ext = parts.length > 1 ? parts.pop().toLowerCase().trim() : "";

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { valid: false, error: "Only PDF and TXT files are supported" };
  }

  return { valid: true, extension: ext };
}

/**
 * Validates the binary header / signature of an uploaded file buffer.
 * Rejects obvious file-type spoofing (e.g. executable renamed to .pdf).
 *
 * @param {Buffer|Uint8Array} buffer - File data buffer
 * @param {string} extension - "pdf" or "txt"
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateFileSignature(buffer, extension) {
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: "File buffer is empty" };
  }

  const ext = extension.toLowerCase().replace(/^\./, "");

  if (ext === "pdf") {
    // PDF magic bytes: '%PDF-' (0x25, 0x50, 0x44, 0x46, 0x2D)
    if (buffer.length < 5) {
      return { valid: false, error: "Invalid PDF file structure (file too small)" };
    }

    const header = Buffer.isBuffer(buffer)
      ? buffer.subarray(0, 5).toString("latin1")
      : String.fromCharCode(...buffer.slice(0, 5));

    if (!header.startsWith("%PDF-")) {
      return {
        valid: false,
        error: "Invalid PDF file signature. The file does not appear to be a genuine PDF.",
      };
    }
    return { valid: true };
  }

  if (ext === "txt") {
    // For plain text, verify the buffer doesn't contain null bytes (0x00) within the first 8KB,
    // which indicates binary or executable data disguised as text.
    const checkLength = Math.min(buffer.length, 8192);
    for (let i = 0; i < checkLength; i++) {
      if (buffer[i] === 0) {
        return {
          valid: false,
          error: "Binary content detected in text file. Only plain-text files are supported.",
        };
      }
    }
    return { valid: true };
  }

  return { valid: false, error: `Unsupported file type: ${extension}` };
}

/**
 * Sanitizes an untrusted filename to prevent path traversal and special character exploits.
 *
 * @param {string} rawFilename
 * @returns {string} Sanitized filename
 */
export function sanitizeFilename(rawFilename) {
  if (!rawFilename || typeof rawFilename !== "string") {
    return "untitled_document";
  }

  // Remove any directory paths (both unix and windows)
  const baseName = rawFilename.split(/[/\\]/).pop();

  // Remove control characters, null bytes, and non-printable characters
  const cleaned = baseName
    .replace(/[\x00-\x1f\x7f]/g, "")
    // Replace problematic characters with underscores, keeping alphanumeric, dots, dashes, and underscores
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    // Collapse multiple consecutive underscores
    .replace(/_+/g, "_")
    .trim();

  // Ensure it's not empty and capped at 255 chars
  return cleaned.substring(0, 255) || "study_document";
}

/**
 * Formats byte count into a human-readable string.
 *
 * @param {number} bytes
 * @returns {string} e.g. "2.4 MB" or "350 KB"
 */
export function formatFileSize(bytes) {
  if (typeof bytes !== "number" || isNaN(bytes) || bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const size = bytes / Math.pow(1024, i);

  const formatted = size % 1 === 0 || i === 0 ? Math.round(size) : size.toFixed(1);
  return `${formatted} ${units[i]}`;
}
