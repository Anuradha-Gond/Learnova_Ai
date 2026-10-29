import { test, describe } from "node:test";
import assert from "node:assert/strict";

// ── lib/db ──────────────────────────────────────────────────────────────────
import { isDatabaseConfigured, dbConfig } from "../../src/lib/db/index.js";

// ── lib/auth ─────────────────────────────────────────────────────────────────
import { authConfig, verifyOwnership } from "../../src/lib/auth/index.js";

// ── lib/storage ──────────────────────────────────────────────────────────────
import {
  buildStorageKey,
  STORAGE_CONFIG,
  isStorageConfigured,
} from "../../src/lib/storage/index.js";

// ── lib/ai ────────────────────────────────────────────────────────────────────
import {
  AI_MODELS,
  AI_CONFIG,
  getDefaultModel,
  isAIConfigured,
} from "../../src/lib/ai/index.js";

/**
 * Milestone 2 — Backend Foundation Unit Tests
 *
 * Tests only pure utility functions that don't require live services.
 * No DB connections, no Gemini API calls, no S3 calls.
 */
describe("Learnova AI — M2 Backend Foundation Tests", () => {
  // ── Database config ────────────────────────────────────────────────────────
  describe("Database Configuration (lib/db)", () => {
    test("dbConfig exposes correct pool and timeout settings", () => {
      assert.equal(dbConfig.maxPoolSize, 10);
      assert.equal(dbConfig.serverSelectionTimeoutMS, 5000);
      assert.equal(dbConfig.bufferCommands, false);
    });

    test("isDatabaseConfigured returns false when MONGODB_URI is absent", () => {
      const original = process.env.MONGODB_URI;
      delete process.env.MONGODB_URI;
      assert.equal(isDatabaseConfigured(), false);
      // Restore
      if (original !== undefined) process.env.MONGODB_URI = original;
    });

    test("isDatabaseConfigured returns true when MONGODB_URI is set", () => {
      const original = process.env.MONGODB_URI;
      process.env.MONGODB_URI = "mongodb+srv://test:test@cluster.mongodb.net/test";
      assert.equal(isDatabaseConfigured(), true);
      // Restore
      if (original !== undefined) process.env.MONGODB_URI = original;
      else delete process.env.MONGODB_URI;
    });
  });

  // ── Auth config ────────────────────────────────────────────────────────────
  describe("Authentication Configuration (lib/auth)", () => {
    test("authConfig has correct session strategy and expiry", () => {
      assert.equal(authConfig.sessionStrategy, "jwt");
      assert.equal(authConfig.maxAgeSeconds, 7 * 24 * 60 * 60);
    });

    test("verifyOwnership returns true for matching string IDs", () => {
      const id = "507f1f77bcf86cd799439011";
      assert.equal(verifyOwnership(id, id), true);
    });

    test("verifyOwnership returns false for mismatched IDs", () => {
      assert.equal(
        verifyOwnership("507f1f77bcf86cd799439011", "507f191e810c19729de860ea"),
        false
      );
    });

    test("verifyOwnership returns false for null/undefined inputs", () => {
      assert.equal(verifyOwnership(null, "someId"), false);
      assert.equal(verifyOwnership("someId", undefined), false);
    });
  });

  // ── Storage adapter ────────────────────────────────────────────────────────
  describe("Storage Adapter (lib/storage)", () => {
    test("STORAGE_CONFIG has correct max file size (15 MB)", () => {
      assert.equal(STORAGE_CONFIG.maxFileSizeBytes, 15 * 1024 * 1024);
    });

    test("STORAGE_CONFIG only allows pdf and txt", () => {
      assert.deepEqual(STORAGE_CONFIG.allowedExtensions, ["pdf", "txt"]);
    });

    test("buildStorageKey produces correct scoped path for PDF", () => {
      const key = buildStorageKey("user123", "doc456", "pdf");
      assert.equal(key, "users/user123/documents/doc456.pdf");
    });

    test("buildStorageKey normalizes extension (strips leading dot)", () => {
      const key = buildStorageKey("user123", "doc456", ".txt");
      assert.equal(key, "users/user123/documents/doc456.txt");
    });

    test("buildStorageKey normalizes extension to lowercase", () => {
      const key = buildStorageKey("user123", "doc456", "PDF");
      assert.equal(key, "users/user123/documents/doc456.pdf");
    });

    test("buildStorageKey throws for unsupported extension", () => {
      assert.throws(
        () => buildStorageKey("user123", "doc456", "docx"),
        /Unsupported file extension/
      );
    });

    test("isStorageConfigured returns false when env vars are absent", () => {
      const envKeys = [
        "R2_ACCOUNT_ID",
        "R2_ACCESS_KEY_ID",
        "R2_SECRET_ACCESS_KEY",
        "R2_BUCKET_NAME",
        "R2_ENDPOINT",
      ];
      const originals = {};
      for (const k of envKeys) {
        originals[k] = process.env[k];
        delete process.env[k];
      }
      assert.equal(isStorageConfigured(), false);
      // Restore
      for (const [k, v] of Object.entries(originals)) {
        if (v !== undefined) process.env[k] = v;
      }
    });
  });

  // ── AI client config ───────────────────────────────────────────────────────
  describe("AI Client Configuration (lib/ai)", () => {
    test("AI_MODELS exports expected model identifiers", () => {
      assert.equal(AI_MODELS.FLASH, "gemini-1.5-flash");
      assert.equal(AI_MODELS.PRO, "gemini-1.5-pro");
      assert.equal(AI_MODELS.EMBEDDINGS, "text-embedding-004");
    });

    test("AI_CONFIG has correct embedding dimensions", () => {
      assert.equal(AI_CONFIG.embeddingDimensions, 768);
    });

    test("AI_CONFIG has low temperature for factual grounding", () => {
      assert.ok(AI_CONFIG.temperature <= 0.3, "Temperature should be <= 0.3 for factual grounding");
    });

    test("getDefaultModel returns GEMINI_MODEL env override when set", () => {
      const original = process.env.GEMINI_MODEL;
      process.env.GEMINI_MODEL = "gemini-1.5-pro";
      assert.equal(getDefaultModel(), "gemini-1.5-pro");
      if (original !== undefined) process.env.GEMINI_MODEL = original;
      else delete process.env.GEMINI_MODEL;
    });

    test("getDefaultModel falls back to flash when env is absent", () => {
      const original = process.env.GEMINI_MODEL;
      delete process.env.GEMINI_MODEL;
      assert.equal(getDefaultModel(), "gemini-1.5-flash");
      if (original !== undefined) process.env.GEMINI_MODEL = original;
    });

    test("isAIConfigured returns false when GEMINI_API_KEY is absent", () => {
      const original = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;
      assert.equal(isAIConfigured(), false);
      if (original !== undefined) process.env.GEMINI_API_KEY = original;
    });

    test("getGeminiClient throws a clear error when API key is absent", async () => {
      const { getGeminiClient } = await import("../../src/lib/ai/index.js");
      const original = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;
      assert.throws(() => getGeminiClient(), /GEMINI_API_KEY/);
      if (original !== undefined) process.env.GEMINI_API_KEY = original;
    });
  });
});
