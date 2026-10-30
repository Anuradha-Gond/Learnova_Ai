import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  validateUploadFile,
  validateFileSignature,
  sanitizeFilename,
  formatFileSize,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_EXTENSIONS,
} from "../../src/services/documentService.js";
import {
  materialListQuerySchema,
  materialIdParamSchema,
  materialUpdateSchema,
} from "../../src/validations/materials.js";
import {
  buildStorageKey,
  STORAGE_CONFIG,
  isStoragePlaceholder,
  isValidStorageEndpoint,
  getStorageDiagnostics,
} from "../../src/lib/storage/index.js";
import { isAIPlaceholder } from "../../src/lib/ai/index.js";
import { assertOwnership, verifyOwnership, AuthError } from "../../src/lib/auth/index.js";

describe("Learnova AI — Milestone 4: Materials Domain & Security Tests", () => {
  describe("File Validation & Constraints", () => {
    test("rejects missing or empty file object", () => {
      assert.equal(validateUploadFile(null).valid, false);
      assert.equal(validateUploadFile(undefined).valid, false);
      assert.equal(validateUploadFile({ name: "test.pdf", size: 0 }).valid, false);
    });

    test("enforces maximum file size limit of 20 MB", () => {
      assert.equal(MAX_FILE_SIZE_BYTES, 20_000_000);
      const exactLimit = validateUploadFile({ name: "notes.pdf", size: 20_000_000 });
      assert.equal(exactLimit.valid, true);

      const oversized = validateUploadFile({ name: "notes.pdf", size: 20_000_000 + 1 });
      assert.equal(oversized.valid, false);
      assert.ok(oversized.error.includes("20 MB"));
    });

    test("allows only PDF and TXT file extensions", () => {
      assert.deepEqual(ALLOWED_EXTENSIONS, ["pdf", "txt"]);

      assert.equal(validateUploadFile({ name: "syllabus.PDF", size: 1024 }).valid, true);
      assert.equal(validateUploadFile({ name: "lecture.txt", size: 1024 }).valid, true);

      assert.equal(validateUploadFile({ name: "script.exe", size: 1024 }).valid, false);
      assert.equal(validateUploadFile({ name: "malicious.js", size: 1024 }).valid, false);
      assert.equal(validateUploadFile({ name: "archive.zip", size: 1024 }).valid, false);
    });
  });

  describe("File Signature Inspection (Spoofing Prevention)", () => {
    test("accepts genuine PDF buffer starting with %PDF-", () => {
      const validPdfBuffer = Buffer.from("%PDF-1.7\nSample content");
      const check = validateFileSignature(validPdfBuffer, "pdf");
      assert.equal(check.valid, true);
    });

    test("rejects spoofed file with .pdf extension lacking %PDF- header", () => {
      const spoofedBuffer = Buffer.from("MZ\x90\x00\x03\x00\x00\x00"); // Windows PE executable header
      const check = validateFileSignature(spoofedBuffer, "pdf");
      assert.equal(check.valid, false);
      assert.ok(check.error.includes("signature"));
    });

    test("accepts genuine plain text buffer without null bytes", () => {
      const textBuffer = Buffer.from("Chapter 1: Principles of Molecular Genetics\nDNA is a double helix.");
      const check = validateFileSignature(textBuffer, "txt");
      assert.equal(check.valid, true);
    });

    test("rejects binary content disguised as text containing null bytes", () => {
      const binaryDisguised = Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x00, 0x57, 0x6f]); // Contains 0x00
      const check = validateFileSignature(binaryDisguised, "txt");
      assert.equal(check.valid, false);
      assert.ok(check.error.includes("Binary content detected"));
    });
  });

  describe("Filename Sanitization (Path Traversal Protection)", () => {
    test("strips directory path traversal sequences", () => {
      assert.equal(sanitizeFilename("../../etc/passwd"), "passwd");
      assert.equal(sanitizeFilename("..\\..\\Windows\\System32\\calc.exe"), "calc.exe");
    });

    test("removes control and non-printable characters", () => {
      assert.equal(sanitizeFilename("lecture\x00notes\x1f.pdf"), "lecturenotes.pdf");
    });

    test("normalizes safe characters and preserves extension", () => {
      assert.equal(sanitizeFilename("Bio 101 - Lecture #4 (Cell Biology).pdf"), "Bio_101_-_Lecture_4_Cell_Biology_.pdf");
    });
  });

  describe("Storage Key Generation & Scoping", () => {
    test("builds correct deterministic user-scoped path", () => {
      const userId = "507f1f77bcf86cd799439011";
      const docId = "507f191e810c19729de860ea";
      const key = buildStorageKey(userId, docId, "pdf");
      assert.equal(key, `users/${userId}/documents/${docId}.pdf`);
    });

    test("strips leading dot from file extension", () => {
      const userId = "507f1f77bcf86cd799439011";
      const docId = "507f191e810c19729de860ea";
      const key = buildStorageKey(userId, docId, ".txt");
      assert.equal(key, `users/${userId}/documents/${docId}.txt`);
    });

    test("throws on unsupported extension in buildStorageKey", () => {
      assert.throws(() => {
        buildStorageKey("user123", "doc123", "exe");
      }, /Unsupported file extension/);
    });
  });

  describe("Ownership Protection & Security", () => {
    test("verifyOwnership returns true when user IDs match", () => {
      assert.equal(verifyOwnership("user_abc_123", "user_abc_123"), true);
    });

    test("verifyOwnership returns false when user IDs differ", () => {
      assert.equal(verifyOwnership("user_abc_123", "user_xyz_999"), false);
    });

    test("assertOwnership does not throw when tenant IDs match", () => {
      assert.doesNotThrow(() => {
        assertOwnership("tenant_123", "tenant_123");
      });
    });

    test("assertOwnership throws 403 AuthError on mismatch", () => {
      assert.throws(
        () => {
          assertOwnership("tenant_123", "attacker_456");
        },
        (err) => {
          assert.equal(err instanceof AuthError, true);
          assert.equal(err.status, 403);
          return true;
        }
      );
    });
  });

  describe("Zod Validation Schemas for Materials", () => {
    test("materialListQuerySchema applies default pagination and sorting", () => {
      const result = materialListQuerySchema.safeParse({});
      assert.equal(result.success, true);
      assert.equal(result.data.page, 1);
      assert.equal(result.data.limit, 50);
      assert.equal(result.data.fileType, "all");
      assert.equal(result.data.status, "all");
      assert.equal(result.data.sort, "createdAt");
      assert.equal(result.data.order, "desc");
    });

    test("materialIdParamSchema validates 24-char ObjectId", () => {
      const valid = materialIdParamSchema.safeParse({ id: "507f1f77bcf86cd799439011" });
      assert.equal(valid.success, true);

      const invalid = materialIdParamSchema.safeParse({ id: "non-hex-id" });
      assert.equal(invalid.success, false);
    });

    test("materialUpdateSchema enforces non-empty title under 200 chars", () => {
      const valid = materialUpdateSchema.safeParse({ title: "Updated Cell Biology" });
      assert.equal(valid.success, true);

      const empty = materialUpdateSchema.safeParse({ title: "   " });
      assert.equal(empty.success, false);
    });
  });

  describe("Storage & AI Configuration and Endpoint Validation", () => {
    test("isStoragePlaceholder detects missing, empty, and template placeholders", () => {
      assert.equal(isStoragePlaceholder(""), true);
      assert.equal(isStoragePlaceholder(null), true);
      assert.equal(isStoragePlaceholder(undefined), true);
      assert.equal(isStoragePlaceholder("<your_account_id>"), true);
      assert.equal(isStoragePlaceholder("your_cloudflare_account_id_here"), true);
      assert.equal(isStoragePlaceholder("your_r2_access_key_id_here"), true);
      assert.equal(isStoragePlaceholder("https://<your_account_id>.r2.cloudflarestorage.com"), true);
      assert.equal(isStoragePlaceholder("my-real-bucket"), false);
      assert.equal(isStoragePlaceholder("0123456789abcdef0123456789abcdef"), false);
    });

    test("isValidStorageEndpoint detects invalid URLs and unresolved placeholders", () => {
      assert.equal(isValidStorageEndpoint(""), false);
      assert.equal(isValidStorageEndpoint("not-a-url"), false);
      assert.equal(isValidStorageEndpoint("https://<your_account_id>.r2.cloudflarestorage.com"), false);
      assert.equal(isValidStorageEndpoint("https://your_account.r2.cloudflarestorage.com"), false);
      assert.equal(isValidStorageEndpoint("ftp://my-account.r2.cloudflarestorage.com"), false);
      assert.equal(isValidStorageEndpoint("https://0123456789abcdef.r2.cloudflarestorage.com"), true);
    });

    test("isAIPlaceholder detects template placeholders for Gemini API key", () => {
      assert.equal(isAIPlaceholder(""), true);
      assert.equal(isAIPlaceholder(null), true);
      assert.equal(isAIPlaceholder("your_gemini_api_key_here"), true);
      assert.equal(isAIPlaceholder("<your_gemini_api_key>"), true);
      assert.equal(isAIPlaceholder("AIzaSyFakeKeyForTesting12345"), false);
    });
  });

  describe("Utility Formatting", () => {
    test("formatFileSize formats bytes correctly", () => {
      assert.equal(formatFileSize(0), "0 B");
      assert.equal(formatFileSize(512), "512 B");
      assert.equal(formatFileSize(1024), "1 KB");
      assert.equal(formatFileSize(2.5 * 1024 * 1024), "2.5 MB");
      assert.equal(formatFileSize(15 * 1024 * 1024), "15 MB");
    });
  });
});
