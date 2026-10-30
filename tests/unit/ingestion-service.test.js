import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

// ── Extraction Service — uses only relative imports, safe to import ────────
import {
  normalizeText,
  extractTxtText,
  extractPdfText,
  extractDocumentText,
} from "../../src/services/extractionService.js";

// ── Chunking Service — uses only relative imports, safe to import ──────────
import {
  CHUNKING_CONFIG,
  chunkTextBlock,
  createDocumentChunks,
} from "../../src/services/chunkingService.js";

// ── Embedding vector validator — inlined here because embeddingService.js
// imports @/lib/ai/index.js which uses path aliases unsupported by node --test.
// This is the exact logic from src/services/embeddingService.js.
function isValidEmbeddingVector(vector, expectedDim = 768) {
  if (!Array.isArray(vector) || vector.length !== expectedDim) {
    return false;
  }
  for (let i = 0; i < vector.length; i++) {
    const val = vector[i];
    if (typeof val !== "number" || !Number.isFinite(val) || Number.isNaN(val)) {
      return false;
    }
  }
  return true;
}

// ── Word count helper — inlined because ingestionService.js also uses @/ imports.
// This is the exact logic from src/services/ingestionService.js.
function countWords(text) {
  if (!text || typeof text !== "string") return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// ─────────────────────────────────────────────────────────────────────────────
describe("Learnova AI — Milestone 5: Ingestion Pipeline Tests", () => {
  // ── Text Normalization ─────────────────────────────────────────────────
  describe("Text Normalization", () => {
    test("returns empty string for null or non-string input", () => {
      assert.equal(normalizeText(null), "");
      assert.equal(normalizeText(undefined), "");
      assert.equal(normalizeText(42), "");
    });

    test("unifies Windows and classic Mac line endings to LF", () => {
      const crlf = "line1\r\nline2\r\nline3";
      const cr = "line1\rline2\rline3";
      assert.ok(normalizeText(crlf).includes("line1\nline2\nline3"));
      assert.ok(normalizeText(cr).includes("line1\nline2\nline3"));
    });

    test("collapses three or more consecutive newlines into exactly two", () => {
      const excessive = "para1\n\n\n\n\npara2";
      const result = normalizeText(excessive);
      assert.ok(!result.includes("\n\n\n"), "Should not have triple newlines");
      assert.ok(result.includes("para1\n\npara2"));
    });

    test("collapses multiple spaces and tabs into a single space", () => {
      const messy = "hello   world\t\tthere";
      const result = normalizeText(messy);
      assert.equal(result, "hello world there");
    });

    test("strips null bytes and control characters while preserving unicode", () => {
      const withNull = "hello\x00world";
      const withCtrl = "hello\x07world";
      const unicode = "café résumé naïve";
      assert.equal(normalizeText(withNull), "helloworld");
      assert.equal(normalizeText(withCtrl), "helloworld");
      assert.equal(normalizeText(unicode), unicode);
    });

    test("trims leading and trailing whitespace", () => {
      assert.equal(normalizeText("  hello world  "), "hello world");
      assert.equal(normalizeText("\n\nhello\n\n"), "hello");
    });

    test("preserves meaningful paragraph boundaries (double newline)", () => {
      const input = "Paragraph one.\n\nParagraph two.";
      const result = normalizeText(input);
      assert.ok(result.includes("Paragraph one.\n\nParagraph two."));
    });
  });

  // ── TXT Text Extraction ────────────────────────────────────────────────
  describe("TXT Text Extraction", () => {
    test("extracts text from a plain UTF-8 buffer", async () => {
      const buf = Buffer.from("Hello world. This is a test document.", "utf-8");
      const result = await extractTxtText(buf);
      assert.equal(result.success, true);
      assert.ok(result.text.includes("Hello world"));
      assert.equal(result.pageCount, 1);
      assert.equal(result.pages.length, 1);
    });

    test("strips UTF-8 BOM from the beginning of the document", async () => {
      const bom = Buffer.from([0xef, 0xbb, 0xbf]);
      const content = Buffer.from("BOM content here.", "utf-8");
      const buf = Buffer.concat([bom, content]);
      const result = await extractTxtText(buf);
      assert.equal(result.success, true);
      assert.ok(!result.text.startsWith("\ufeff"), "BOM should be stripped");
      assert.ok(result.text.includes("BOM content here."));
    });

    test("fails gracefully on an empty buffer", async () => {
      const result = await extractTxtText(Buffer.alloc(0));
      assert.equal(result.success, false);
      assert.ok(typeof result.error === "string" && result.error.length > 0);
    });

    test("fails gracefully on whitespace-only content", async () => {
      const buf = Buffer.from("   \n\n\t\t\n   ", "utf-8");
      const result = await extractTxtText(buf);
      assert.equal(result.success, false);
    });

    test("extractDocumentText dispatches txt files to TXT extractor", async () => {
      const buf = Buffer.from("Dispatch test content.", "utf-8");
      const result = await extractDocumentText(buf, "txt");
      assert.equal(result.success, true);
      assert.ok(result.text.includes("Dispatch test content"));
    });

    test("extractDocumentText dispatches pdf files to PDF extractor", async () => {
      const result = await extractDocumentText(Buffer.alloc(0), "pdf");
      assert.equal(result.success, false);
      assert.equal(result.error, "PDF buffer is empty.");
    });

    test("extractDocumentText returns failure for unsupported file types", async () => {
      const buf = Buffer.from("data");
      assert.equal((await extractDocumentText(buf, "docx")).success, false);
    });
  });

  // ── PDF Text Extraction ────────────────────────────────────────────────
  describe("PDF Text Extraction", () => {
    test("fails gracefully on an empty buffer", async () => {
      const result = await extractPdfText(Buffer.alloc(0));
      assert.equal(result.success, false);
      assert.equal(result.error, "PDF buffer is empty.");
      assert.equal(result.pageCount, 0);
      assert.deepEqual(result.pages, []);
    });

    test("fails gracefully on null or undefined buffer", async () => {
      const resultNull = await extractPdfText(null);
      assert.equal(resultNull.success, false);
      assert.equal(resultNull.error, "PDF buffer is empty.");

      const resultUndef = await extractPdfText(undefined);
      assert.equal(resultUndef.success, false);
      assert.equal(resultUndef.error, "PDF buffer is empty.");
    });

    test("handles corrupted or invalid PDF file structure gracefully", async () => {
      const corruptPdf = Buffer.from("%PDF-1.7 deliberately corrupted invalid structure data");
      const result = await extractPdfText(corruptPdf);
      assert.equal(result.success, false);
      assert.equal(typeof result.error, "string");
      assert.ok(result.error.length > 0);
      assert.equal(result.pageCount, 0);
      assert.deepEqual(result.pages, []);
    });

    test("successfully extracts text, headings, and pages from real multi-page binary PDF fixture", async () => {
      const fixturePath = join(process.cwd(), "tests", "fixtures", "sample.pdf");
      assert.ok(existsSync(fixturePath), "sample.pdf fixture must exist");

      const pdfBuffer = readFileSync(fixturePath);
      assert.ok(pdfBuffer.length > 0, "PDF buffer must be non-empty");

      const result = await extractPdfText(pdfBuffer);
      assert.equal(result.success, true);
      assert.equal(result.pageCount, 2);
      assert.equal(result.pages.length, 2);

      // Verify page ordering
      assert.equal(result.pages[0].pageNumber, 1);
      assert.equal(result.pages[1].pageNumber, 2);

      // Verify page 1 headings, sentences, punctuation, and word spacing
      assert.ok(result.pages[0].text.includes("Chapter 1: Foundations of Machine Learning"));
      assert.ok(result.pages[0].text.includes("Machine learning algorithms analyze structured datasets."));
      assert.ok(result.pages[0].text.includes("training, validation, and testing."));

      // Verify page 2 content and word boundaries
      assert.ok(result.pages[1].text.includes("Chapter 2: Vector Search and RAG"));
      assert.ok(result.pages[1].text.includes("Retrieval-augmented generation grounds responses"));
      assert.ok(result.pages[1].text.includes("Dense vector embeddings enable semantic similarity queries."));

      // Verify combined text preserves inter-page paragraph structure
      assert.ok(result.text.includes("\n\nChapter 2: Vector Search and RAG"));
    });
  });

  // ── Semantic Chunking ──────────────────────────────────────────────────
  describe("Semantic Chunking", () => {
    test("CHUNKING_CONFIG has expected boundary values", () => {
      assert.equal(typeof CHUNKING_CONFIG.targetChunkSize, "number");
      assert.ok(CHUNKING_CONFIG.targetChunkSize >= 800);
      assert.ok(CHUNKING_CONFIG.maxChunkSize >= CHUNKING_CONFIG.targetChunkSize);
      assert.ok(CHUNKING_CONFIG.overlap >= 100 && CHUNKING_CONFIG.overlap <= 300);
      assert.ok(CHUNKING_CONFIG.minChunkSize >= 50);
    });

    test("returns empty array for empty or null text", () => {
      assert.deepEqual(chunkTextBlock(""), []);
      assert.deepEqual(chunkTextBlock(null), []);
      assert.deepEqual(chunkTextBlock("   "), []);
      assert.deepEqual(createDocumentChunks({ text: "" }), []);
    });

    test("short text that fits in one chunk is returned as a single chunk", () => {
      const text = "This is a short document. It fits in one chunk.";
      const chunks = createDocumentChunks({ text });
      assert.equal(chunks.length, 1);
      assert.equal(chunks[0].chunkIndex, 0);
      assert.ok(chunks[0].chunkText.includes("short document"));
    });

    test("each chunk has non-empty chunkText and sequential chunkIndex", () => {
      const longText = "Paragraph content here is quite long. ".repeat(200);
      const chunks = createDocumentChunks({ text: longText });
      assert.ok(chunks.length > 0, "Should produce at least one chunk");
      chunks.forEach((chunk, i) => {
        assert.equal(chunk.chunkIndex, i, `chunkIndex should be ${i}`);
        assert.ok(chunk.chunkText.trim().length > 0, "chunkText should be non-empty");
      });
    });

    test("no chunk exceeds maxChunkSize characters by more than tolerance", () => {
      const longText = "A ".repeat(3000);
      const chunks = createDocumentChunks({ text: longText });
      // Tolerance of 200 chars above maxChunkSize accounts for overlap text prepended
      // during boundary grouping — the chunker does not hard-slice mid-word.
      chunks.forEach((chunk) => {
        assert.ok(
          chunk.characterCount <= CHUNKING_CONFIG.maxChunkSize + 200,
          `Chunk exceeded expected limit: ${chunk.characterCount} chars`
        );
      });
    });

    test("chunks have non-negative startCharOffset and endCharOffset > startCharOffset", () => {
      const text = "Sentence one. Sentence two. ".repeat(100);
      const chunks = createDocumentChunks({ text });
      chunks.forEach((chunk) => {
        assert.ok(chunk.startCharOffset >= 0, "startCharOffset should be >= 0");
        assert.ok(
          chunk.endCharOffset > chunk.startCharOffset,
          "endCharOffset should be > startCharOffset"
        );
      });
    });

    test("chunks from page-array input carry non-null page numbers", () => {
      const pages = [
        { pageNumber: 1, text: "Page one content. ".repeat(10) },
        { pageNumber: 2, text: "Page two content. ".repeat(10) },
      ];
      const text = pages.map((p) => p.text).join("\n\n");
      const chunks = createDocumentChunks({ text, pages });
      const withPages = chunks.filter((c) => c.pageNumber !== null);
      assert.ok(withPages.length > 0, "Some chunks should have page numbers");
    });

    test("chunks Unicode text without corruption", () => {
      const unicode = "मेरे पास एक पुस्तक है। ".repeat(60);
      const chunks = createDocumentChunks({ text: unicode });
      assert.ok(chunks.length >= 1, "Should produce at least one chunk for unicode text");
      chunks.forEach((chunk) => {
        assert.ok(chunk.chunkText.trim().length > 0);
      });
    });

    test("characterCount matches actual trimmed chunkText length", () => {
      const text = "The quick brown fox jumps over the lazy dog. ".repeat(100);
      const chunks = createDocumentChunks({ text });
      chunks.forEach((chunk) => {
        assert.equal(
          chunk.characterCount,
          chunk.chunkText.trim().length,
          "characterCount should equal actual trimmed length"
        );
      });
    });

    test("handles single very long paragraph by breaking it at word boundaries", () => {
      // Single paragraph with no double newlines, longer than maxChunkSize
      const longParagraph = "word ".repeat(600).trim();
      const chunks = createDocumentChunks({ text: longParagraph });
      assert.ok(chunks.length > 1, "Long paragraph should be split into multiple chunks");
      chunks.forEach((chunk) => {
        assert.ok(chunk.chunkText.trim().length > 0);
      });
    });
  });

  // ── Embedding Vector Validation ────────────────────────────────────────
  describe("Embedding Vector Validation", () => {
    test("accepts a valid 768-dimensional array of finite floats", () => {
      const valid = Array.from({ length: 768 }, (_, i) => Math.sin(i));
      assert.equal(isValidEmbeddingVector(valid, 768), true);
    });

    test("rejects an array that is too short", () => {
      const short = Array.from({ length: 512 }, () => 0.1);
      assert.equal(isValidEmbeddingVector(short, 768), false);
    });

    test("rejects an array that is too long", () => {
      const long = Array.from({ length: 1024 }, () => 0.1);
      assert.equal(isValidEmbeddingVector(long, 768), false);
    });

    test("rejects an array containing NaN values", () => {
      const withNaN = Array.from({ length: 768 }, (_, i) => (i === 100 ? NaN : 0.5));
      assert.equal(isValidEmbeddingVector(withNaN, 768), false);
    });

    test("rejects an array containing positive Infinity", () => {
      const withInf = Array.from({ length: 768 }, (_, i) => (i === 50 ? Infinity : 0.1));
      assert.equal(isValidEmbeddingVector(withInf, 768), false);
    });

    test("rejects an array containing negative Infinity", () => {
      const withNegInf = Array.from({ length: 768 }, (_, i) => (i === 50 ? -Infinity : 0.1));
      assert.equal(isValidEmbeddingVector(withNegInf, 768), false);
    });

    test("rejects an array containing string values", () => {
      const withString = Array.from({ length: 768 }, (_, i) => (i === 0 ? "abc" : 0.1));
      assert.equal(isValidEmbeddingVector(withString, 768), false);
    });

    test("rejects non-array input", () => {
      assert.equal(isValidEmbeddingVector(null, 768), false);
      assert.equal(isValidEmbeddingVector("string", 768), false);
      assert.equal(isValidEmbeddingVector(42, 768), false);
      assert.equal(isValidEmbeddingVector({}, 768), false);
    });

    test("defaults to 768 dimensions when no expectedDim given", () => {
      const valid = Array.from({ length: 768 }, () => 0.42);
      assert.equal(isValidEmbeddingVector(valid), true);

      const wrong = Array.from({ length: 512 }, () => 0.42);
      assert.equal(isValidEmbeddingVector(wrong), false);
    });

    test("accepts an all-zero vector as technically valid", () => {
      const zeros = Array.from({ length: 768 }, () => 0);
      assert.equal(isValidEmbeddingVector(zeros, 768), true);
    });

    test("accepts vectors with negative finite float values", () => {
      const negatives = Array.from({ length: 768 }, () => -0.123456);
      assert.equal(isValidEmbeddingVector(negatives, 768), true);
    });
  });

  // ── Word Count Helper ──────────────────────────────────────────────────
  describe("Word Count Helper (countWords)", () => {
    test("returns 0 for null, undefined, or empty input", () => {
      assert.equal(countWords(null), 0);
      assert.equal(countWords(undefined), 0);
      assert.equal(countWords(""), 0);
      assert.equal(countWords("   "), 0);
    });

    test("counts words correctly in a simple sentence", () => {
      assert.equal(countWords("Hello world"), 2);
      assert.equal(countWords("The quick brown fox"), 4);
    });

    test("handles multiple spaces between words", () => {
      assert.equal(countWords("hello   world"), 2);
      assert.equal(countWords("a  b  c  d"), 4);
    });

    test("handles leading and trailing whitespace", () => {
      assert.equal(countWords("  hello world  "), 2);
    });

    test("counts words across newlines and tabs", () => {
      assert.equal(countWords("line one\nline two"), 4);
      assert.equal(countWords("col1\tcol2\tcol3"), 3);
    });

    test("counts a single word correctly", () => {
      assert.equal(countWords("hello"), 1);
    });
  });
});
