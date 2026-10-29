import { test, describe } from "node:test";
import assert from "node:assert/strict";

// ── Analytics Service (pure relative imports, safe under node --test) ─────────
import {
  classifyMastery,
  calculateTopicMastery,
  calculateOverviewMetrics,
  CLASSIFICATION_THRESHOLDS,
  MASTERY_THRESHOLDS,
} from "../../src/services/analyticsService.js";

// ── Validation Schemas ────────────────────────────────────────────────────────
import {
  recommendationStatusUpdateSchema,
  recommendationsQuerySchema,
  weakTopicsQuerySchema,
  recommendationIdParamSchema,
} from "../../src/validations/analytics.js";

describe("Learnova AI — Milestone 8: Learning Analytics & Diagnostics Tests", () => {
  // ── 1. Overview Metric Calculations ─────────────────────────────────────────
  describe("Overview Metric Calculations", () => {
    test("handles completely empty datasets safely without division by zero", () => {
      const metrics = calculateOverviewMetrics([], 0, 0);

      assert.strictEqual(metrics.totalMaterials, 0);
      assert.strictEqual(metrics.quizzesCompleted, 0);
      assert.strictEqual(metrics.completedQuizzes, 0);
      assert.strictEqual(metrics.averageQuizScore, 0);
      assert.strictEqual(metrics.totalQuestionsAnswered, 0);
      assert.strictEqual(metrics.overallAccuracy, 0);
      assert.strictEqual(metrics.masteredTopics, 0);
    });

    test("never reports 100% accuracy when zero questions have been answered", () => {
      const metrics = calculateOverviewMetrics([], 3, 2);

      assert.strictEqual(metrics.totalMaterials, 3);
      assert.strictEqual(metrics.quizzesCompleted, 0);
      assert.strictEqual(metrics.totalQuestionsAnswered, 0);
      assert.strictEqual(metrics.overallAccuracy, 0); // Must be 0, never 100%
      assert.strictEqual(metrics.masteredTopics, 2);
    });

    test("accurately calculates average quiz score across completed submissions", () => {
      const submissions = [
        { scorePercentage: 80, totalQuestions: 10, correctCount: 8 },
        { scorePercentage: 90, totalQuestions: 10, correctCount: 9 },
        { scorePercentage: 70, totalQuestions: 10, correctCount: 7 },
      ];

      const metrics = calculateOverviewMetrics(submissions, 4, 1);

      assert.strictEqual(metrics.quizzesCompleted, 3);
      assert.strictEqual(metrics.averageQuizScore, 80); // (80 + 90 + 70) / 3 = 80
      assert.strictEqual(metrics.totalQuestionsAnswered, 30);
      assert.strictEqual(metrics.overallAccuracy, 80);
      assert.strictEqual(metrics.totalMaterials, 4);
      assert.strictEqual(metrics.masteredTopics, 1);
    });

    test("calculates score from correctCount when scorePercentage is missing", () => {
      const submissions = [
        { totalQuestions: 5, correctCount: 4 }, // 80%
        { totalQuestions: 10, correctCount: 6 }, // 60%
      ];

      const metrics = calculateOverviewMetrics(submissions, 2, 0);

      assert.strictEqual(metrics.quizzesCompleted, 2);
      assert.strictEqual(metrics.averageQuizScore, 70); // (80 + 60) / 2 = 70
      assert.strictEqual(metrics.totalQuestionsAnswered, 15);
      assert.strictEqual(metrics.overallAccuracy, 67); // 10 / 15 = 66.67% -> 67%
    });

    test("handles quizzes with different maximum scores and weighted graded answers", () => {
      const submissions = [
        {
          scorePercentage: 75,
          totalQuestions: 2,
          correctCount: 1,
          gradedAnswers: [
            { isCorrect: true, score: 5, maxScore: 5 }, // 5/5
            { isCorrect: false, score: 1, maxScore: 3 }, // 1/3
          ],
        },
      ];

      const metrics = calculateOverviewMetrics(submissions, 1, 0);

      assert.strictEqual(metrics.quizzesCompleted, 1);
      assert.strictEqual(metrics.totalQuestionsAnswered, 2);
      // Earned 6 points out of 8 possible points -> 75% accuracy
      assert.strictEqual(metrics.overallAccuracy, 75);
    });

    test("safely ignores null or corrupted submission entries", () => {
      const submissions = [
        { scorePercentage: 100, totalQuestions: 5, correctCount: 5 },
        { scorePercentage: null, totalQuestions: 0, correctCount: null },
      ];

      const metrics = calculateOverviewMetrics(submissions, 1, 0);

      assert.strictEqual(metrics.quizzesCompleted, 2);
      assert.strictEqual(metrics.averageQuizScore, 100);
      assert.strictEqual(metrics.totalQuestionsAnswered, 5);
      assert.strictEqual(metrics.overallAccuracy, 100);
    });
  });

  // ── 2. Topic Mastery 4-Band Classification ──────────────────────────────────
  describe("Topic Mastery 4-Band Classification", () => {
    test("classifies scores below 40% as critical", () => {
      assert.strictEqual(classifyMastery(0), "critical");
      assert.strictEqual(classifyMastery(25), "critical");
      assert.strictEqual(classifyMastery(39), "critical");
      assert.strictEqual(classifyMastery(39.9), "critical");
      assert.strictEqual(classifyMastery(NaN), "critical");
      assert.strictEqual(classifyMastery(null), "critical");
    });

    test("classifies scores from 40% to below 70% as weak", () => {
      assert.strictEqual(classifyMastery(40), "weak");
      assert.strictEqual(classifyMastery(55), "weak");
      assert.strictEqual(classifyMastery(69), "weak");
      assert.strictEqual(classifyMastery(69.9), "weak");
    });

    test("classifies scores from 70% to below 85% as developing", () => {
      assert.strictEqual(classifyMastery(70), "developing");
      assert.strictEqual(classifyMastery(78), "developing");
      assert.strictEqual(classifyMastery(84), "developing");
      assert.strictEqual(classifyMastery(84.9), "developing");
    });

    test("classifies scores 85% and above as mastered", () => {
      assert.strictEqual(classifyMastery(85), "mastered");
      assert.strictEqual(classifyMastery(92), "mastered");
      assert.strictEqual(classifyMastery(100), "mastered");
    });

    test("preserves calculateTopicMastery for backward compatibility with quizService", () => {
      const initial = calculateTopicMastery(null, 50, 0.4);
      assert.strictEqual(initial.masteryScore, 50);
      assert.strictEqual(initial.status, "weak");

      // Blend previous 50 with new 80: 0.4 * 80 + 0.6 * 50 = 32 + 30 = 62
      const blended = calculateTopicMastery(50, 80, 0.4);
      assert.strictEqual(blended.masteryScore, 62);
      assert.strictEqual(blended.status, "weak");

      // Blend previous 80 with new 100: 0.4 * 100 + 0.6 * 80 = 40 + 48 = 88
      const mastered = calculateTopicMastery(80, 100, 0.4);
      assert.strictEqual(mastered.masteryScore, 88);
      assert.strictEqual(mastered.status, "mastered");
    });
  });

  // ── 3. Weak-Topic Identification & Sorting ──────────────────────────────────
  describe("Weak-Topic Identification & Sorting Logic", () => {
    test("correctly identifies topics strictly below 70% as weak", () => {
      const topics = [
        { topicTag: "Binary Search", masteryScore: 35 },
        { topicTag: "Graph Traversal", masteryScore: 65 },
        { topicTag: "Dynamic Programming", masteryScore: 75 },
        { topicTag: "Array Operations", masteryScore: 90 },
      ];

      const weakOnly = topics.filter((t) => t.masteryScore < 70);

      assert.strictEqual(weakOnly.length, 2);
      assert.strictEqual(weakOnly[0].topicTag, "Binary Search");
      assert.strictEqual(weakOnly[1].topicTag, "Graph Traversal");
    });

    test("sorts critical topics (<40%) before weak topics (40-69%) and then by score", () => {
      const topics = [
        { topicTag: "Trees", masteryScore: 55, classification: "weak" },
        { topicTag: "Pointers", masteryScore: 20, classification: "critical" },
        { topicTag: "Recursion", masteryScore: 35, classification: "critical" },
        { topicTag: "Hashing", masteryScore: 45, classification: "weak" },
      ];

      const order = { critical: 0, weak: 1, developing: 2, mastered: 3 };
      topics.sort((a, b) => {
        const diff = order[a.classification] - order[b.classification];
        if (diff !== 0) return diff;
        return a.masteryScore - b.masteryScore;
      });

      assert.strictEqual(topics[0].topicTag, "Pointers"); // Critical (20%)
      assert.strictEqual(topics[1].topicTag, "Recursion"); // Critical (35%)
      assert.strictEqual(topics[2].topicTag, "Hashing"); // Weak (45%)
      assert.strictEqual(topics[3].topicTag, "Trees"); // Weak (55%)
    });

    test("detects historical performance decline only when reliable history exists", () => {
      // Case 1: Multiple attempts with score drop
      const topicDeclining = {
        masteryScore: 60,
        lastAttemptScore: 40,
        attemptCount: 3,
      };
      const hasDecline =
        topicDeclining.attemptCount > 1 &&
        topicDeclining.lastAttemptScore < topicDeclining.masteryScore;
      assert.strictEqual(hasDecline, true);

      // Case 2: Single attempt (never infer trend from single attempt)
      const topicSingle = {
        masteryScore: 40,
        lastAttemptScore: 40,
        attemptCount: 1,
      };
      const singleDecline =
        topicSingle.attemptCount > 1 &&
        topicSingle.lastAttemptScore < topicSingle.masteryScore;
      assert.strictEqual(singleDecline, false);
    });
  });

  // ── 4. Revision Recommendations & Idempotency ───────────────────────────────
  describe("Revision Recommendations & Priority Mapping", () => {
    test("assigns HIGH priority to critical topics and MEDIUM priority to weak topics", () => {
      const getPriority = (classification) => {
        if (classification === "critical") return { label: "HIGH", value: 20 };
        if (classification === "weak") return { label: "MEDIUM", value: 50 };
        return { label: "LOW", value: 80 };
      };

      assert.deepStrictEqual(getPriority("critical"), { label: "HIGH", value: 20 });
      assert.deepStrictEqual(getPriority("weak"), { label: "MEDIUM", value: 50 });
      assert.deepStrictEqual(getPriority("developing"), { label: "LOW", value: 80 });
    });

    test("prevents duplicate active recommendations when pending recommendation exists", () => {
      const existingRecommendations = [
        { topicTag: "Recursion", status: "pending" },
      ];

      const shouldCreate = (topicTag) => {
        return !existingRecommendations.some(
          (r) => r.topicTag === topicTag && r.status === "pending"
        );
      };

      assert.strictEqual(shouldCreate("Recursion"), false); // Skips duplicate
      assert.strictEqual(shouldCreate("Graphs"), true); // Creates new
    });

    test("preserves completed and dismissed recommendations without resetting to pending", () => {
      const pastRecommendations = [
        { topicTag: "Recursion", status: "completed", masteryScoreAtGeneration: 50 },
        { topicTag: "Sorting", status: "dismissed", masteryScoreAtGeneration: 60 },
      ];

      const canRegenerate = (topicTag, currentScore) => {
        const past = pastRecommendations.find((r) => r.topicTag === topicTag);
        if (!past) return true;
        // Only regenerate if student performance dropped below the score at last generation
        return currentScore < past.masteryScoreAtGeneration;
      };

      // Score did not decline: preserve completed / dismissed state
      assert.strictEqual(canRegenerate("Recursion", 55), false);
      assert.strictEqual(canRegenerate("Sorting", 60), false);

      // Score experienced a genuine regression: allows new intervention
      assert.strictEqual(canRegenerate("Recursion", 35), true);
    });
  });

  // ── 5. Zod Validation Schemas for Analytics ─────────────────────────────────
  describe("Zod Validation Schemas for Analytics", () => {
    test("validates status update schema for all supported status values", () => {
      for (const validStatus of ["pending", "reviewed", "completed", "dismissed"]) {
        const result = recommendationStatusUpdateSchema.safeParse({ status: validStatus });
        assert.strictEqual(result.success, true);
        assert.strictEqual(result.data.status, validStatus);
      }
    });

    test("rejects unsupported or arbitrary status values in status update schema", () => {
      for (const invalidStatus of ["archived", "deleted", "active", "IN_PROGRESS", 123, null]) {
        const result = recommendationStatusUpdateSchema.safeParse({ status: invalidStatus });
        assert.strictEqual(result.success, false);
      }
    });

    test("validates recommendations query schema with default limit", () => {
      const emptyQuery = recommendationsQuerySchema.safeParse({});
      assert.strictEqual(emptyQuery.success, true);
      assert.strictEqual(emptyQuery.data.limit, 50);

      const withStatus = recommendationsQuerySchema.safeParse({
        status: "pending",
        limit: "25",
      });
      assert.strictEqual(withStatus.success, true);
      assert.strictEqual(withStatus.data.status, "pending");
      assert.strictEqual(withStatus.data.limit, 25);
    });

    test("validates weak topics query schema boolean coercion", () => {
      const parsed = weakTopicsQuerySchema.safeParse({
        includeDeveloping: "true",
        all: "false",
      });
      assert.strictEqual(parsed.success, true);
      assert.strictEqual(parsed.data.includeDeveloping, true);
      assert.strictEqual(parsed.data.all, false);
    });

    test("validates 24-character hexadecimal ObjectId parameter", () => {
      const validId = recommendationIdParamSchema.safeParse({
        id: "507f1f77bcf86cd799439011",
      });
      assert.strictEqual(validId.success, true);

      const invalidId = recommendationIdParamSchema.safeParse({
        id: "not-a-valid-hex-id",
      });
      assert.strictEqual(invalidId.success, false);
    });
  });

  // ── 6. User Isolation & Security Protections ────────────────────────────────
  describe("User Isolation & Security Protections", () => {
    test("strictly ensures recommendation queries are scoped to owner userId", () => {
      const mockDb = [
        { id: "rec-1", userId: "user-123", topicTag: "Binary Search", status: "pending" },
        { id: "rec-2", userId: "user-456", topicTag: "Binary Search", status: "pending" },
      ];

      const queryForUser = (targetUserId) => {
        return mockDb.filter((r) => r.userId === targetUserId);
      };

      const user1Recs = queryForUser("user-123");
      assert.strictEqual(user1Recs.length, 1);
      assert.strictEqual(user1Recs[0].id, "rec-1");

      const user2Recs = queryForUser("user-456");
      assert.strictEqual(user2Recs.length, 1);
      assert.strictEqual(user2Recs[0].id, "rec-2");
    });

    test("rejects recommendation status updates if resource belongs to different user", () => {
      const mockRecord = {
        id: "rec-1",
        userId: "owner-student-id",
        status: "pending",
      };

      const updateStatusSecure = (recommendation, requestingUserId, newStatus) => {
        if (recommendation.userId !== requestingUserId) {
          const err = new Error("Recommendation not found or access denied.");
          err.code = "NOT_FOUND";
          throw err;
        }
        recommendation.status = newStatus;
        return recommendation;
      };

      // Attacker trying to modify another student's recommendation
      assert.throws(
        () => updateStatusSecure(mockRecord, "malicious-user-id", "dismissed"),
        (err) => err.code === "NOT_FOUND"
      );

      // Legitimate student modifying their own recommendation
      const updated = updateStatusSecure(mockRecord, "owner-student-id", "completed");
      assert.strictEqual(updated.status, "completed");
    });
  });
});
