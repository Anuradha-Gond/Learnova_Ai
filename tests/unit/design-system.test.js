import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { cn } from "../../src/lib/utils.js";
import { validateUploadFile } from "../../src/services/documentService.js";
import { scoreQuizSubmission } from "../../src/services/quizService.js";
import { calculateTopicMastery } from "../../src/services/analyticsService.js";
import { objectIdSchema, paginationQuerySchema } from "../../src/validations/common.js";

describe("Learnova AI — Unit Test Suite", () => {
  describe("Utility & Class Merging (cn)", () => {
    test("combines and dedupes Tailwind classes cleanly", () => {
      const result = cn("p-4 bg-brand-700 text-white", "p-6 text-slate-900");
      assert.ok(result.includes("p-6"));
      assert.ok(!result.includes("p-4"));
      assert.ok(result.includes("text-slate-900"));
    });
  });

  describe("Document Validation Service", () => {
    test("accepts valid PDF file within 15 MB", () => {
      const mockFile = { name: "syllabus.pdf", size: 4 * 1024 * 1024 };
      const result = validateUploadFile(mockFile);
      assert.equal(result.valid, true);
      assert.equal(result.extension, "pdf");
    });

    test("rejects file exceeding 15 MB", () => {
      const largeFile = { name: "large.pdf", size: 16 * 1024 * 1024 };
      const result = validateUploadFile(largeFile);
      assert.equal(result.valid, false);
      assert.ok(result.error.includes("15 MB"));
    });

    test("rejects unsupported file format", () => {
      const docxFile = { name: "notes.docx", size: 1024 };
      const result = validateUploadFile(docxFile);
      assert.equal(result.valid, false);
      assert.ok(result.error.includes("Only PDF and TXT"));
    });
  });

  describe("Quiz Scoring Service", () => {
    test("accurately calculates score percentage and per-topic accuracy", () => {
      const answerKey = [
        { questionId: "q1", correctOptionId: "opt_b", explanation: "Rule 1", topicTag: "Genetics" },
        { questionId: "q2", correctOptionId: "opt_a", explanation: "Rule 2", topicTag: "Genetics" },
        { questionId: "q3", correctOptionId: "opt_c", explanation: "Rule 3", topicTag: "Ecology" },
      ];

      const userAnswers = [
        { questionId: "q1", selectedOptionId: "opt_b" }, // Correct
        { questionId: "q2", selectedOptionId: "opt_d" }, // Wrong
        { questionId: "q3", selectedOptionId: "opt_c" }, // Correct
      ];

      const scored = scoreQuizSubmission(userAnswers, answerKey);
      assert.equal(scored.totalQuestions, 3);
      assert.equal(scored.correctCount, 2);
      assert.equal(scored.scorePercentage, 67); // 2/3 = 66.6% -> 67%
      assert.equal(scored.gradedAnswers.length, 3);

      const genetics = scored.topicBreakdown.find((t) => t.topicTag === "Genetics");
      assert.ok(genetics);
      assert.equal(genetics.total, 2);
      assert.equal(genetics.correct, 1);
      assert.equal(genetics.accuracy, 50);

      const ecology = scored.topicBreakdown.find((t) => t.topicTag === "Ecology");
      assert.ok(ecology);
      assert.equal(ecology.accuracy, 100);
    });
  });

  describe("Topic Mastery Diagnostic Algorithm (EMA)", () => {
    test("initial attempt sets score directly and evaluates threshold", () => {
      const result = calculateTopicMastery(null, 50); // 50% on first try
      assert.equal(result.masteryScore, 50);
      assert.equal(result.status, "weak"); // < 65% is weak
    });

    test("applies exponential moving average on subsequent attempt", () => {
      // Prior score = 50, New score = 90, Alpha = 0.4
      // Expected = 0.4 * 90 + 0.6 * 50 = 36 + 30 = 66
      const result = calculateTopicMastery(50, 90, 0.4);
      assert.equal(result.masteryScore, 66);
      assert.equal(result.status, "average"); // 65 - 84% is average
    });

    test("flags mastered when score reaches 85% or higher", () => {
      const result = calculateTopicMastery(85, 95);
      assert.equal(result.status, "mastered");
    });
  });

  describe("Zod Validation Schemas", () => {
    test("objectIdSchema validates valid 24-character hex ID", () => {
      const valid = "507f1f77bcf86cd799439011";
      const res = objectIdSchema.safeParse(valid);
      assert.equal(res.success, true);
    });

    test("objectIdSchema rejects invalid string", () => {
      const invalid = "not-an-id";
      const res = objectIdSchema.safeParse(invalid);
      assert.equal(res.success, false);
    });

    test("paginationQuerySchema applies default pagination values", () => {
      const res = paginationQuerySchema.safeParse({});
      assert.equal(res.success, true);
      assert.equal(res.data.page, 1);
      assert.equal(res.data.limit, 20);
      assert.equal(res.data.order, "desc");
    });
  });
});
