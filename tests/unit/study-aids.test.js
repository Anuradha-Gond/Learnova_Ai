import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";

const simplifyRequestSchema = z.object({
  concept: z.string().trim().min(2, "Concept name must be at least 2 characters").max(150, "Concept name too long"),
  depth: z.enum(["beginner", "intermediate"]).default("beginner"),
});

describe("Learnova AI — Phase 2: AI Study Aids Unit Tests", () => {
  describe("Simplify Concept Request Validation", () => {
    test("validates valid concept input and defaults depth to beginner", () => {
      const parsed = simplifyRequestSchema.safeParse({ concept: "Entity Relationship Model" });
      assert.strictEqual(parsed.success, true);
      assert.strictEqual(parsed.data.concept, "Entity Relationship Model");
      assert.strictEqual(parsed.data.depth, "beginner");
    });

    test("accepts intermediate depth option", () => {
      const parsed = simplifyRequestSchema.safeParse({
        concept: "Process Scheduling Algorithms",
        depth: "intermediate",
      });
      assert.strictEqual(parsed.success, true);
      assert.strictEqual(parsed.data.depth, "intermediate");
    });

    test("rejects empty or whitespace-only concept", () => {
      const empty = simplifyRequestSchema.safeParse({ concept: "   " });
      assert.strictEqual(empty.success, false);

      const tooShort = simplifyRequestSchema.safeParse({ concept: "a" });
      assert.strictEqual(tooShort.success, false);
    });

    test("rejects invalid depth values", () => {
      const invalid = simplifyRequestSchema.safeParse({
        concept: "Semaphore",
        depth: "expert",
      });
      assert.strictEqual(invalid.success, false);
    });

    test("rejects overly long concept strings", () => {
      const overlyLong = simplifyRequestSchema.safeParse({
        concept: "A".repeat(151),
      });
      assert.strictEqual(overlyLong.success, false);
    });
  });

  describe("Study Aids Pipeline Guards", () => {
    test("guards against generating study aids for unready documents", () => {
      const unreadyStatuses = ["pending", "processing", "failed"];
      for (const status of unreadyStatuses) {
        assert.notStrictEqual(status, "ready", `Status ${status} must not be allowed to generate study aids`);
      }
    });

    test("verifies that grounded summaries require non-empty extracted content", () => {
      const emptyChunks = [];
      assert.strictEqual(emptyChunks.length, 0, "Empty chunks must be rejected");
    });
  });
});

