import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  classifyGeminiError,
  callGeminiWithRetry,
  GeminiErrorCode,
} from "../../src/lib/ai/errors.js";
import { validateGeneratedQuestions } from "../../src/services/quizService.js";

describe("Learnova AI — Gemini Error Classification & Resilience Suite", () => {
  describe("1. Error Classification", () => {
    test("classifies daily quota exhaustion as QUOTA_EXHAUSTED and non-retryable", () => {
      const err = new Error(
        "[429 Too Many Requests] Quota exceeded for quota metric 'Generate Content API requests per day per project' and limit 'GenerateRequestsPerDayPerProject'"
      );
      const classified = classifyGeminiError(err);

      assert.equal(classified.code, GeminiErrorCode.QUOTA_EXHAUSTED);
      assert.equal(classified.isRetryable, false);
      assert.equal(classified.httpStatus, 429);
      assert.ok(classified.userMessage.includes("daily AI generation quota has been exhausted"));
    });

    test("classifies 'Resource has been exhausted (e.g. check quota)' as QUOTA_EXHAUSTED", () => {
      const err = new Error(
        "[GoogleGenerativeAI Error]: Resource has been exhausted (e.g. check quota). Please retry after 17 hours."
      );
      const classified = classifyGeminiError(err);

      assert.equal(classified.code, GeminiErrorCode.QUOTA_EXHAUSTED);
      assert.equal(classified.isRetryable, false);
      assert.equal(classified.httpStatus, 429);
    });

    test("classifies temporary per-minute rate limit as RATE_LIMIT and retryable", () => {
      const err = new Error("429 rate limit exceeded. Please slow down requests.");
      const classified = classifyGeminiError(err);

      assert.equal(classified.code, GeminiErrorCode.RATE_LIMIT);
      assert.equal(classified.isRetryable, true);
      assert.equal(classified.httpStatus, 429);
      assert.ok(classified.userMessage.includes("temporarily receiving high traffic"));
    });

    test("classifies HTTP 503 high demand as HIGH_DEMAND and retryable", () => {
      const err = new Error("503 Service Unavailable: The model is overloaded. Please try again later.");
      const classified = classifyGeminiError(err);

      assert.equal(classified.code, GeminiErrorCode.HIGH_DEMAND);
      assert.equal(classified.isRetryable, true);
      assert.equal(classified.httpStatus, 503);
      assert.ok(classified.userMessage.includes("experiencing high demand"));
    });

    test("classifies 404 model not found as MODEL_NOT_FOUND and non-retryable", () => {
      const err = new Error("404 models/gemini-unsupported-model is not found for API version v1beta");
      const classified = classifyGeminiError(err);

      assert.equal(classified.code, GeminiErrorCode.MODEL_NOT_FOUND);
      assert.equal(classified.isRetryable, false);
      assert.equal(classified.httpStatus, 500);
      assert.ok(classified.userMessage.includes("configured AI model is temporarily unavailable"));
    });

    test("classifies API key invalid error as KEY_INVALID and non-retryable", () => {
      const err = new Error("API_KEY_INVALID: API key not valid. Please pass a valid API key.");
      const classified = classifyGeminiError(err);

      assert.equal(classified.code, GeminiErrorCode.KEY_INVALID);
      assert.equal(classified.isRetryable, false);
      assert.equal(classified.httpStatus, 401);
    });

    test("classifies network fetch failure as NETWORK_ERROR and retryable", () => {
      const err = new Error("fetch failed: ECONNRESET");
      err.name = "FetchError";
      const classified = classifyGeminiError(err);

      assert.equal(classified.code, GeminiErrorCode.NETWORK_ERROR);
      assert.equal(classified.isRetryable, true);
      assert.equal(classified.httpStatus, 503);
    });

    test("classifies request timeout as TIMEOUT and retryable", () => {
      const err = new Error("Deadline exceeded: Request timed out");
      const classified = classifyGeminiError(err);

      assert.equal(classified.code, GeminiErrorCode.TIMEOUT);
      assert.equal(classified.isRetryable, true);
      assert.equal(classified.httpStatus, 504);
    });
  });

  describe("2. Retry Mechanism & Quota Protection", () => {
    test("does NOT retry daily quota exhaustion error — fails immediately on first attempt", async () => {
      let callCount = 0;
      const failingFn = async () => {
        callCount++;
        throw new Error(
          "429 Quota exceeded for quota metric 'Generate Content API requests per day per project'"
        );
      };

      await assert.rejects(
        async () => {
          await callGeminiWithRetry(failingFn, { maxRetries: 3, baseDelayMs: 10 });
        },
        (err) => {
          assert.equal(err.code, GeminiErrorCode.QUOTA_EXHAUSTED);
          assert.equal(err.httpStatus, 429);
          return true;
        }
      );

      // Must be called exactly ONCE: zero retries when quota is exhausted
      assert.equal(callCount, 1);
    });

    test("does NOT retry API key invalid errors", async () => {
      let callCount = 0;
      const failingFn = async () => {
        callCount++;
        throw new Error("API_KEY_INVALID: permission_denied");
      };

      await assert.rejects(
        async () => {
          await callGeminiWithRetry(failingFn, { maxRetries: 3, baseDelayMs: 10 });
        },
        (err) => {
          assert.equal(err.code, GeminiErrorCode.KEY_INVALID);
          assert.equal(err.httpStatus, 401);
          return true;
        }
      );

      assert.equal(callCount, 1);
    });

    test("retries transient 503 error and succeeds if second attempt succeeds", async () => {
      let callCount = 0;
      const retryFn = async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error("503 Service Unavailable: High demand");
        }
        return { response: { text: () => "Success on retry" } };
      };

      const result = await callGeminiWithRetry(retryFn, { maxRetries: 2, baseDelayMs: 10 });
      assert.equal(result.response.text(), "Success on retry");
      assert.equal(callCount, 2);
    });

    test("retries transient 503 up to maxRetries and throws classified error if all fail", async () => {
      let callCount = 0;
      const retryFn = async () => {
        callCount++;
        throw new Error("503 Service Unavailable");
      };

      await assert.rejects(
        async () => {
          await callGeminiWithRetry(retryFn, { maxRetries: 2, baseDelayMs: 10 });
        },
        (err) => {
          assert.equal(err.code, GeminiErrorCode.HIGH_DEMAND);
          assert.equal(err.httpStatus, 503);
          return true;
        }
      );

      // Initial attempt (1) + 2 retries = 3 calls
      assert.equal(callCount, 3);
    });
  });

  describe("3. Quiz Question Validation & Parsing", () => {
    test("validates valid MCQ questions structure", () => {
      const validQuestions = [
        {
          questionId: "q1",
          type: "MCQ",
          text: "What is DNA?",
          options: [
            { optionId: "A", text: "Deoxyribonucleic acid" },
            { optionId: "B", text: "Ribonucleic acid" },
          ],
          correctOptionId: "A",
        },
      ];
      assert.equal(validateGeneratedQuestions(validQuestions, 1), true);
    });

    test("rejects MCQ question with missing correctOptionId in options", () => {
      const invalidQuestions = [
        {
          questionId: "q1",
          type: "MCQ",
          text: "What is DNA?",
          options: [
            { optionId: "A", text: "Deoxyribonucleic acid" },
            { optionId: "B", text: "Ribonucleic acid" },
          ],
          correctOptionId: "C", // Not in options
        },
      ];
      assert.equal(validateGeneratedQuestions(invalidQuestions, 1), false);
    });

    test("validates TRUE_FALSE question structure", () => {
      const validTF = [
        {
          questionId: "q1",
          type: "TRUE_FALSE",
          text: "Is DNA double stranded?",
          options: [
            { optionId: "true", text: "True" },
            { optionId: "false", text: "False" },
          ],
          correctOptionId: "true",
        },
      ];
      assert.equal(validateGeneratedQuestions(validTF, 1), true);
    });

    test("validates SHORT_ANSWER question structure", () => {
      const validSA = [
        {
          questionId: "q1",
          type: "SHORT_ANSWER",
          text: "Explain osmosis.",
          referenceAnswer: "Movement of water across a semipermeable membrane.",
          options: [],
        },
      ];
      assert.equal(validateGeneratedQuestions(validSA, 1), true);
    });
  });
});

