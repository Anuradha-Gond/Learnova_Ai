import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";

// ── Analytics Service (pure relative imports, safe under node --test) ─────────
import {
  calculateTopicMastery,
  MASTERY_THRESHOLDS,
} from "../../src/services/analyticsService.js";

// ── Inlined pure functions from quizService.js to test scoring and serialization
// without triggering node --test module resolution issues on @/ path aliases.

export const QuizDifficulty = {
  EASY: "easy",
  MEDIUM: "medium",
  HARD: "hard",
  MIXED: "mixed",
};

export const QuestionType = {
  MCQ: "MCQ",
  TRUE_FALSE: "TRUE_FALSE",
  SHORT_ANSWER: "SHORT_ANSWER",
};

function toPublicQuizDTO(quiz) {
  if (!quiz) return null;
  const raw = quiz.toObject ? quiz.toObject() : quiz;
  return {
    id: (raw._id || raw.id)?.toString(),
    materialId: raw.materialId?.toString(),
    title: raw.title,
    difficulty: raw.difficulty || "medium",
    questionCount: raw.questionCount || raw.questions?.length || 0,
    topicTags: raw.topicTags || [],
    createdAt: raw.createdAt,
    questions: (raw.questions || []).map((q) => ({
      questionId: q.questionId,
      type: q.type || "MCQ",
      text: q.text,
      options: (q.options || []).map((opt) => ({
        optionId: opt.optionId,
        text: opt.text,
      })),
      topicTag: q.topicTag || "General",
      difficulty: q.difficulty || "medium",
    })),
  };
}

function scoreQuizSubmission(userAnswers, answerKey) {
  if (!Array.isArray(userAnswers) || !Array.isArray(answerKey)) {
    throw new Error("Invalid submission or answer key array");
  }

  const answerMap = new Map();
  for (const item of answerKey) {
    answerMap.set(item.questionId, item);
  }

  let correctCount = 0;
  const gradedAnswers = [];
  const topicStats = new Map();

  for (const userAns of userAnswers) {
    const key = answerMap.get(userAns.questionId);
    const isCorrect = key ? key.correctOptionId === userAns.selectedOptionId : false;

    if (isCorrect) correctCount++;

    gradedAnswers.push({
      questionId: userAns.questionId,
      selectedOptionId: userAns.selectedOptionId,
      isCorrect,
      explanation: key?.explanation || "",
    });

    const topic = key?.topicTag || "General";
    const current = topicStats.get(topic) || { total: 0, correct: 0 };
    current.total++;
    if (isCorrect) current.correct++;
    topicStats.set(topic, current);
  }

  const totalQuestions = userAnswers.length;
  const scorePercentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  const topicBreakdown = [];
  for (const [topic, stats] of topicStats.entries()) {
    const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
    topicBreakdown.push({
      topicTag: topic,
      total: stats.total,
      correct: stats.correct,
      accuracy,
    });
  }

  return {
    totalQuestions,
    correctCount,
    scorePercentage,
    gradedAnswers,
    topicBreakdown,
  };
}

function validateGeneratedQuestions(questions, expectedCount) {
  if (!Array.isArray(questions) || questions.length === 0) {
    return false;
  }

  for (const q of questions) {
    if (!q.questionId || !q.text || !q.type) {
      return false;
    }

    if (!["MCQ", "TRUE_FALSE", "SHORT_ANSWER"].includes(q.type)) {
      return false;
    }

    if (q.type === "MCQ") {
      if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 6) {
        return false;
      }
      const optionIds = new Set(q.options.map((o) => o.optionId));
      if (optionIds.size !== q.options.length) {
        return false; // Duplicate optionIds
      }
      if (!q.correctOptionId || !optionIds.has(q.correctOptionId)) {
        return false; // Correct option not in options
      }
    } else if (q.type === "TRUE_FALSE") {
      if (!Array.isArray(q.options) || q.options.length !== 2) {
        return false;
      }
      const validAnswers = ["true", "false", "True", "False"];
      if (!validAnswers.includes(String(q.correctOptionId).toLowerCase())) {
        return false;
      }
    } else if (q.type === "SHORT_ANSWER") {
      if (!q.referenceAnswer || typeof q.referenceAnswer !== "string") {
        return false;
      }
    }
  }

  return true;
}

// ── Validation schemas from src/validations/quiz.js
const objectIdSchema = z
  .string()
  .trim()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid unique identifier format");

const quizGenerationSchema = z.object({
  questionCount: z.coerce
    .number()
    .int()
    .refine((val) => [5, 10, 15].includes(val), {
      message: "Question count must be 5, 10, or 15",
    })
    .default(5),
  difficulty: z
    .enum(["easy", "medium", "hard", "beginner", "intermediate", "advanced", "mixed"])
    .transform((val) => {
      const mapping = {
        beginner: "easy",
        intermediate: "medium",
        advanced: "hard",
      };
      return mapping[val] || val;
    })
    .default("medium"),
  questionTypes: z
    .array(z.enum(["MCQ", "TRUE_FALSE", "SHORT_ANSWER"]))
    .min(1, "At least one question type must be selected")
    .default(["MCQ"]),
  title: z.string().trim().max(200).optional(),
});

const quizSubmissionAnswerSchema = z.object({
  questionId: z.string().trim().min(1, "questionId is required"),
  selectedOptionId: z.string().trim().nullable().optional(),
  answerText: z.string().trim().max(2000).optional().default(""),
});

const quizSubmissionSchema = z.object({
  submittedAnswers: z
    .array(quizSubmissionAnswerSchema)
    .min(1, "At least one answer must be submitted"),
  idempotencyKey: z.string().trim().max(100).optional(),
  durationSeconds: z.coerce.number().int().min(0).max(86400).optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
describe("Learnova AI — Milestone 7: Quiz Engine & Scoring Tests", () => {
  // ── Answer Key Isolation & Public DTO ───────────────────────────────────────
  describe("Answer Key Isolation & Public DTO", () => {
    const rawQuiz = {
      _id: "507f1f77bcf86cd799439011",
      materialId: "507f191e810c19729de860ea",
      title: "Cellular Biology Mastery Quiz",
      difficulty: "medium",
      questionCount: 2,
      topicTags: ["Organelles", "Bioenergetics"],
      createdAt: new Date(),
      questions: [
        {
          questionId: "q1",
          type: "MCQ",
          text: "Which organelle generates ATP?",
          options: [
            { optionId: "A", text: "Ribosome" },
            { optionId: "B", text: "Mitochondria" },
            { optionId: "C", text: "Golgi Apparatus" },
            { optionId: "D", text: "Lysosome" },
          ],
          topicTag: "Organelles",
          difficulty: "medium",
          correctOptionId: "B", // Internal field that must never leak!
          explanation: "Mitochondria are the powerhouses of the cell.",
        },
        {
          questionId: "q2",
          type: "SHORT_ANSWER",
          text: "Explain oxidative phosphorylation.",
          options: [],
          topicTag: "Bioenergetics",
          difficulty: "hard",
          referenceAnswer: "Electron transport chain drives ATP synthase.",
          rubric: "Full marks for mentioning electron transport and ATP synthase.",
          explanation: "Core mechanism of cellular respiration.",
        },
      ],
    };

    test("toPublicQuizDTO returns clean client-safe structure", () => {
      const dto = toPublicQuizDTO(rawQuiz);

      assert.equal(dto.id, "507f1f77bcf86cd799439011");
      assert.equal(dto.title, "Cellular Biology Mastery Quiz");
      assert.equal(dto.questionCount, 2);
      assert.equal(dto.questions.length, 2);
    });

    test("toPublicQuizDTO strictly excludes correctOptionId from all questions", () => {
      const dto = toPublicQuizDTO(rawQuiz);

      for (const q of dto.questions) {
        assert.equal(q.correctOptionId, undefined);
      }
    });

    test("toPublicQuizDTO strictly excludes referenceAnswer and rubric from short answers", () => {
      const dto = toPublicQuizDTO(rawQuiz);

      for (const q of dto.questions) {
        assert.equal(q.referenceAnswer, undefined);
        assert.equal(q.rubric, undefined);
      }
    });

    test("toPublicQuizDTO strictly excludes private explanations from all questions", () => {
      const dto = toPublicQuizDTO(rawQuiz);

      for (const q of dto.questions) {
        assert.equal(q.explanation, undefined);
      }
    });

    test("toPublicQuizDTO returns null for empty or null quiz input", () => {
      assert.equal(toPublicQuizDTO(null), null);
      assert.equal(toPublicQuizDTO(undefined), null);
    });
  });

  // ── Generated Question Structure Validation ────────────────────────────────
  describe("Structured Question Validation", () => {
    test("validates genuine MCQ questions with 4 unique options and valid correctOptionId", () => {
      const validQuestions = [
        {
          questionId: "q1",
          type: "MCQ",
          text: "What is the primary function of chlorophyll?",
          options: [
            { optionId: "A", text: "Absorb light energy" },
            { optionId: "B", text: "Store glucose" },
            { optionId: "C", text: "Pump protons" },
            { optionId: "D", text: "Synthesize lipids" },
          ],
          correctOptionId: "A",
          topicTag: "Photosynthesis",
        },
      ];

      assert.ok(validateGeneratedQuestions(validQuestions, 1));
    });

    test("validates genuine TRUE_FALSE questions with 2 options and boolean correctOptionId", () => {
      const validTf = [
        {
          questionId: "q1",
          type: "TRUE_FALSE",
          text: "Chloroplasts contain their own circular DNA.",
          options: [
            { optionId: "true", text: "True" },
            { optionId: "false", text: "False" },
          ],
          correctOptionId: "true",
          topicTag: "Photosynthesis",
        },
      ];

      assert.ok(validateGeneratedQuestions(validTf, 1));
    });

    test("validates genuine SHORT_ANSWER questions with referenceAnswer", () => {
      const validSa = [
        {
          questionId: "q1",
          type: "SHORT_ANSWER",
          text: "Why is water split during the light-dependent reactions?",
          options: [],
          referenceAnswer: "To supply electrons to photosystem II and release oxygen.",
          topicTag: "Photosynthesis",
        },
      ];

      assert.ok(validateGeneratedQuestions(validSa, 1));
    });

    test("rejects MCQ question with duplicate optionIds", () => {
      const duplicateOpts = [
        {
          questionId: "q1",
          type: "MCQ",
          text: "Sample text?",
          options: [
            { optionId: "A", text: "Option 1" },
            { optionId: "A", text: "Option 2" }, // Duplicate ID "A"
          ],
          correctOptionId: "A",
        },
      ];

      assert.equal(validateGeneratedQuestions(duplicateOpts, 1), false);
    });

    test("rejects MCQ question where correctOptionId is not in options", () => {
      const mismatchedAnswer = [
        {
          questionId: "q1",
          type: "MCQ",
          text: "Sample text?",
          options: [
            { optionId: "A", text: "Option 1" },
            { optionId: "B", text: "Option 2" },
          ],
          correctOptionId: "Z", // Not in A or B
        },
      ];

      assert.equal(validateGeneratedQuestions(mismatchedAnswer, 1), false);
    });

    test("rejects question with missing required fields", () => {
      assert.equal(validateGeneratedQuestions([{ questionId: "q1" }], 1), false);
      assert.equal(validateGeneratedQuestions([], 1), false);
      assert.equal(validateGeneratedQuestions(null, 1), false);
    });
  });

  // ── Objective Evaluation & Scoring Logic ───────────────────────────────────
  describe("Quiz Scoring Logic (scoreQuizSubmission)", () => {
    const answerKey = [
      { questionId: "q1", correctOptionId: "B", explanation: "Exp 1", topicTag: "Biology" },
      { questionId: "q2", correctOptionId: "true", explanation: "Exp 2", topicTag: "Biology" },
      { questionId: "q3", correctOptionId: "C", explanation: "Exp 3", topicTag: "Chemistry" },
      { questionId: "q4", correctOptionId: "A", explanation: "Exp 4", topicTag: "Chemistry" },
    ];

    test("scores 100% when all answers match the answer key", () => {
      const userAnswers = [
        { questionId: "q1", selectedOptionId: "B" },
        { questionId: "q2", selectedOptionId: "true" },
        { questionId: "q3", selectedOptionId: "C" },
        { questionId: "q4", selectedOptionId: "A" },
      ];

      const result = scoreQuizSubmission(userAnswers, answerKey);
      assert.equal(result.totalQuestions, 4);
      assert.equal(result.correctCount, 4);
      assert.equal(result.scorePercentage, 100);
    });

    test("scores 50% when half of answers are incorrect", () => {
      const userAnswers = [
        { questionId: "q1", selectedOptionId: "B" }, // Correct
        { questionId: "q2", selectedOptionId: "false" }, // Incorrect
        { questionId: "q3", selectedOptionId: "C" }, // Correct
        { questionId: "q4", selectedOptionId: "D" }, // Incorrect
      ];

      const result = scoreQuizSubmission(userAnswers, answerKey);
      assert.equal(result.correctCount, 2);
      assert.equal(result.scorePercentage, 50);
    });

    test("calculates per-topic accuracy correctly", () => {
      const userAnswers = [
        { questionId: "q1", selectedOptionId: "B" }, // Biology Correct
        { questionId: "q2", selectedOptionId: "true" }, // Biology Correct -> Biology 2/2 = 100%
        { questionId: "q3", selectedOptionId: "C" }, // Chemistry Correct
        { questionId: "q4", selectedOptionId: "D" }, // Chemistry Incorrect -> Chemistry 1/2 = 50%
      ];

      const result = scoreQuizSubmission(userAnswers, answerKey);
      const bio = result.topicBreakdown.find((t) => t.topicTag === "Biology");
      const chem = result.topicBreakdown.find((t) => t.topicTag === "Chemistry");

      assert.ok(bio);
      assert.equal(bio.accuracy, 100);
      assert.ok(chem);
      assert.equal(chem.accuracy, 50);
    });

    test("throws on null or non-array inputs", () => {
      assert.throws(() => scoreQuizSubmission(null, answerKey), /Invalid submission/);
      assert.throws(() => scoreQuizSubmission([], null), /Invalid submission/);
    });
  });

  // ── Topic Mastery EMA Diagnostic Algorithm ─────────────────────────────────
  describe("Topic Mastery EMA Calculation (calculateTopicMastery)", () => {
    test("initial attempt uses raw accuracy directly without prior blending", () => {
      const first = calculateTopicMastery(null, 80);
      assert.equal(first.masteryScore, 80);
      assert.equal(first.status, "average");
    });

    test("correctly applies alpha = 0.4 EMA weighting on subsequent attempts", () => {
      // previous: 60, new: 90 -> Math.round(0.4 * 90 + 0.6 * 60) = Math.round(36 + 36) = 72
      const updated = calculateTopicMastery(60, 90, 0.4);
      assert.equal(updated.masteryScore, 72);
      assert.equal(updated.status, "average");
    });

    test("assigns 'weak' status for scores <= 64%", () => {
      const weak = calculateTopicMastery(50, 60);
      assert.ok(weak.masteryScore <= MASTERY_THRESHOLDS.WEAK_MAX);
      assert.equal(weak.status, "weak");
    });

    test("assigns 'mastered' status for scores >= 85%", () => {
      const mastered = calculateTopicMastery(85, 95);
      assert.ok(mastered.masteryScore >= MASTERY_THRESHOLDS.MASTERED_MIN);
      assert.equal(mastered.status, "mastered");
    });
  });

  // ── Zod Validation Schemas for Quizzes ──────────────────────────────────────
  describe("Zod Validation Schemas for Quizzes", () => {
    test("validates quiz generation with 5, 10, or 15 questions", () => {
      assert.ok(quizGenerationSchema.safeParse({ questionCount: 5 }).success);
      assert.ok(quizGenerationSchema.safeParse({ questionCount: 10 }).success);
      assert.ok(quizGenerationSchema.safeParse({ questionCount: 15 }).success);
    });

    test("rejects invalid question counts such as 7 or 20", () => {
      assert.equal(quizGenerationSchema.safeParse({ questionCount: 7 }).success, false);
      assert.equal(quizGenerationSchema.safeParse({ questionCount: 20 }).success, false);
    });

    test("normalizes beginner / intermediate / advanced difficulty enums", () => {
      const parsedBeginner = quizGenerationSchema.safeParse({ difficulty: "beginner" });
      assert.ok(parsedBeginner.success);
      assert.equal(parsedBeginner.data.difficulty, "easy");

      const parsedAdvanced = quizGenerationSchema.safeParse({ difficulty: "advanced" });
      assert.ok(parsedAdvanced.success);
      assert.equal(parsedAdvanced.data.difficulty, "hard");
    });

    test("validates submission with submittedAnswers array", () => {
      const valid = quizSubmissionSchema.safeParse({
        submittedAnswers: [
          { questionId: "q1", selectedOptionId: "A" },
          { questionId: "q2", answerText: "Short answer explanation" },
        ],
        durationSeconds: 120,
      });

      assert.ok(valid.success);
      assert.equal(valid.data.submittedAnswers.length, 2);
    });

    test("rejects empty submittedAnswers array", () => {
      const empty = quizSubmissionSchema.safeParse({ submittedAnswers: [] });
      assert.equal(empty.success, false);
    });

    test("validates 24-character hexadecimal ObjectId parameter", () => {
      assert.ok(objectIdSchema.safeParse("507f1f77bcf86cd799439011").success);
      assert.equal(objectIdSchema.safeParse("invalid-id").success, false);
    });
  });
});
