import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { PDFParse } = require("pdf-parse");

/**
 * Text Extraction Service
 *
 * Server-side text extraction and normalization for PDF and TXT study materials.
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
    return {
      success: false,
      text: "",
      pages: [],
      pageCount: 0,
      error: "PDF buffer is empty.",
    };
  }

  let parser = null;
  try {
    parser = new PDFParse({ data: buffer });
    const result = await parser.getText();

    const rawPages = result?.pages || [];
    const totalPages = result?.total || rawPages.length || 0;

    const parsedPages = [];
    let combinedNormalized = "";

    for (let i = 0; i < rawPages.length; i++) {
      const p = rawPages[i];
      const pageNum = p.num || i + 1;
      const pageNormalized = normalizeText(p.text || "");

      if (pageNormalized.length > 0) {
        parsedPages.push({
          pageNumber: pageNum,
          text: pageNormalized,
        });
        combinedNormalized += (combinedNormalized ? "\n\n" : "") + pageNormalized;
      }
    }

    // Verify if any readable text was extracted
    if (!combinedNormalized || combinedNormalized.trim().length === 0) {
      return {
        success: false,
        text: "",
        pages: [],
        pageCount: totalPages,
        error:
          "No extractable text found in PDF. This document may be scanned, image-only, or encrypted. Please upload a searchable text-based PDF.",
      };
    }

    return {
      success: true,
      text: combinedNormalized,
      pages: parsedPages,
      pageCount: totalPages || parsedPages.length || 1,
    };
  } catch (err) {
    const isEncrypted = err.name === "PasswordException" || err.message?.toLowerCase().includes("password");
    const isCorrupt = err.name === "InvalidPDFException" || err.name === "FormatError";

    let errorMessage = "Failed to parse PDF document.";
    if (isEncrypted) {
      errorMessage = "Password-protected or encrypted PDFs cannot be processed.";
    } else if (isCorrupt) {
      errorMessage = "Invalid or corrupted PDF file structure.";
    } else {
      errorMessage = `PDF extraction error: ${err.message}`;
    }

    return {
      success: false,
      text: "",
      pages: [],
      pageCount: 0,
      error: errorMessage,
    };
  } finally {
    if (parser && typeof parser.destroy === "function") {
      try {
        await parser.destroy();
      } catch {
        // Safe destroy cleanup
      }
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
