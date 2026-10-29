import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { isAIPlaceholder, isAIConfigured } from "../../src/lib/ai/index.js";

const chatRequestSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Message cannot be empty")
    .max(2000, "Message must be 2000 characters or fewer"),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "model"]),
        parts: z.array(z.object({ text: z.string() })),
      })
    )
    .max(20)
    .optional()
    .default([]),
});

describe("Learnova AI — AI Learning Assistant Unit Tests", () => {
  describe("Request Payload Validation", () => {
    test("accepts valid educational question with default empty history", () => {
      const result = chatRequestSchema.safeParse({
        message: "Explain the difference between DNA and RNA.",
      });
      assert.equal(result.success, true);
      assert.equal(result.data.message, "Explain the difference between DNA and RNA.");
      assert.deepEqual(result.data.history, []);
    });

    test("accepts valid chat history matching Gemini schema", () => {
      const result = chatRequestSchema.safeParse({
        message: "Can you elaborate on transcription?",
        history: [
          {
            role: "user",
            parts: [{ text: "What is the central dogma of biology?" }],
          },
          {
            role: "model",
            parts: [{ text: "The central dogma describes the flow of genetic information: DNA to RNA to protein." }],
          },
        ],
      });
      assert.equal(result.success, true);
      assert.equal(result.data.history.length, 2);
      assert.equal(result.data.history[0].role, "user");
    });

    test("rejects empty or whitespace-only messages", () => {
      const empty = chatRequestSchema.safeParse({ message: "" });
      assert.equal(empty.success, false);

      const whitespace = chatRequestSchema.safeParse({ message: "   \n\t  " });
      assert.equal(whitespace.success, false);
    });

    test("rejects messages exceeding 2000 characters", () => {
      const longMessage = "a".repeat(2001);
      const result = chatRequestSchema.safeParse({ message: longMessage });
      assert.equal(result.success, false);
      assert.ok(result.error.issues[0].message.includes("2000 characters"));
    });

    test("rejects history with invalid roles", () => {
      const result = chatRequestSchema.safeParse({
        message: "Hello",
        history: [{ role: "system", parts: [{ text: "instruction" }] }],
      });
      assert.equal(result.success, false);
    });
  });

  describe("AI Configuration & Safety Verification", () => {
    test("detects placeholder and unconfigured API keys", () => {
      assert.equal(isAIPlaceholder(""), true);
      assert.equal(isAIPlaceholder("your_gemini_api_key_here"), true);
      assert.equal(isAIPlaceholder("<your_api_key>"), true);
      assert.equal(isAIPlaceholder("placeholder_key"), true);
      assert.equal(isAIPlaceholder("AIzaSyValidSampleKey123"), false);
      assert.equal(isAIPlaceholder("AQ.AbCdEf1234567890SampleNewKeyFormat"), false);
    });
  });
});
