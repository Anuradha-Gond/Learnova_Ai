/**
 * Text Extraction Service
 *
 * Server-side text extraction and normalization for PDF and TXT study materials.
 * Uses pdfjs-dist directly for PDF extraction (no native canvas dependencies).
 */

/**
 * Normalizes extracted text:
 * - Unifies line breaks (\r\n, \r -> \n)
 * - Strips null bytes (\x00) and unprintable control characters (except \n, \t)
 * - Collapses excessive blank lines (>2 newlines -> 2 newlines)
 * - Collapses excessive horizontal whitespace
 * - Trims edges while preserving paragraph structure and Unicode text
 *
 * @param {string} rawText
 * @returns {string} Normalized text
 */
export function normalizeText(rawText) {
  if (!rawText || typeof rawText !== "string") {
    return "";
  }

  return rawText
    // Standardize line endings
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    // Remove null bytes and dangerous control characters (keep \t, \n)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    // Normalize non-breaking spaces and tabs
    .replace(/\u00A0/g, " ")
    .replace(/[ \t]+/g, " ")
    // Collapse 3+ consecutive newlines into 2 (clean paragraph breaks)
    .replace(/\n{3,}/g, "\n\n")
    // Clean trailing spaces per line
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

/**
 * Extracts text from a plain text document buffer.
 * Handles UTF-8 byte order mark (BOM) stripping.
 *
 * @param {Buffer|Uint8Array} buffer
 * @returns {Promise<{ success: boolean, text: string, pages: Array<{ pageNumber: number, text: string }>, pageCount: number, error?: string }>}
 */
export async function extractTxtText(buffer) {
  if (!buffer || buffer.length === 0) {
    return {
      success: false,
      text: "",
      pages: [],
      pageCount: 0,
      error: "Text document is empty.",
    };
  }

  try {
    let raw = Buffer.isBuffer(buffer) ? buffer.toString("utf-8") : new TextDecoder("utf-8").decode(buffer);

    // Strip UTF-8 BOM if present
    if (raw.charCodeAt(0) === 0xfeff) {
      raw = raw.slice(1);
    }

    const normalized = normalizeText(raw);

    if (!normalized || normalized.length === 0) {
      return {
        success: false,
        text: "",
        pages: [],
        pageCount: 0,
        error: "Text document contains no readable text content.",
      };
    }

    return {
      success: true,
      text: normalized,
      pages: [{ pageNumber: 1, text: normalized }],
      pageCount: 1,
    };
  } catch (err) {
    return {
      success: false,
      text: "",
      pages: [],
      pageCount: 0,
      error: `Failed to decode plain text document: ${err.message}`,
    };
  }
}
/**
 * Extracts text and page structure from a PDF buffer.
 * Captures page boundaries and validates that extractable text is present.
 * Detects image-only / scanned PDFs where text extraction yields empty content.
 *
 * @param {Buffer|Uint8Array} buffer
 * @returns {Promise<{ success: boolean, text: string, pages: Array<{ pageNumber: number, text: string }>, pageCount: number, error?: string }>}
 */
export async function extractPdfText(buffer) {
  if (!buffer || buffer.length === 0) {
    return { success: false, text: "", pages: [], pageCount: 0, error: "PDF buffer is empty." };
  }

  let pdfDoc = null;
  try {
    const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const data = Buffer.isBuffer(buffer)
      ? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
      : buffer instanceof Uint8Array
        ? buffer
        : new Uint8Array(buffer);
    const loadingTask = getDocument({ data, disableAutoFetch: true });
    pdfDoc = await loadingTask.promise;
    const totalPages = pdfDoc._pdfInfo?.numPages || pdfDoc.numPages || 0;
    const pages = [];
    let combined = "";

    for (let i = 1; i <= totalPages; i++) {
      const page = await pdfDoc.getPage(i);
      const textContent = await page.getTextContent();
      const items = textContent.items;

      let reconstructed = "";
      let lastX = null;
      let lastY = null;
      let lastWidth = 0;
      for (const item of items) {
        const [a, , , , e, f] = item.transform; // a: scaleX, e: x, f: y
        const x = e;
        const y = f;
        const width = item.width !== undefined ? item.width : Math.abs(a);
        if (lastY !== null && Math.abs(y - lastY) > 5) {
          reconstructed += "\n";
        } else if (lastX !== null) {
          const gap = x - (lastX + lastWidth);
          if (gap > 2) reconstructed += " ";
        }
        reconstructed += item.str;
        lastX = x;
        lastY = y;
        lastWidth = width;
      }

      const normalized = normalizeText(reconstructed);
      if (normalized.length > 0) {
        pages.push({ pageNumber: i, text: normalized });
        combined += (combined ? "\n\n" : "") + normalized;
      }
    }

    if (!combined || combined.trim().length === 0) {
      return {
        success: false,
        text: "",
        pages: [],
        pageCount: totalPages,
        error:
          "No extractable text found in PDF. This document may be scanned, image-only, or encrypted. Please upload a searchable text-based PDF.",
      };
    }

    return { success: true, text: combined, pages, pageCount: totalPages || pages.length || 1 };
  } catch (err) {
    const isEncrypted = err.name === "PasswordException" || err.message?.toLowerCase().includes("password");
    const isCorrupt = err.name === "InvalidPDFException" || err.name === "FormatError";
    let errorMessage = "Failed to parse PDF document.";
    if (isEncrypted) errorMessage = "Password-protected or encrypted PDFs cannot be processed.";
    else if (isCorrupt) errorMessage = "Invalid or corrupted PDF file structure.";
    else errorMessage = `PDF extraction error: ${err.message}`;
    return { success: false, text: "", pages: [], pageCount: 0, error: errorMessage };
  } finally {
    if (pdfDoc && typeof pdfDoc.destroy === "function") {
      try { await pdfDoc.destroy(); } catch {}
    }
  }
}
  
/**
 * Universal document extraction dispatcher.
 *
 * @param {Buffer|Uint8Array} buffer
 * @param {"pdf"|"txt"} fileType
 * @returns {Promise<{ success: boolean, text: string, pages: Array<{ pageNumber: number, text: string }>, pageCount: number, error?: string }>}
 */
export async function extractDocumentText(buffer, fileType) {
  const type = (fileType || "").toLowerCase().replace(/^\./, "");

  if (type === "pdf") {
    return extractPdfText(buffer);
  }

  if (type === "txt") {
    return extractTxtText(buffer);
  }

  return {
    success: false,
    text: "",
    pages: [],
    pageCount: 0,
    error: `Unsupported file type for extraction: ${fileType}`,
  };
}
