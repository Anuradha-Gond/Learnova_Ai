/**
 * Analytics & Weak-Topic Identification Service — Milestone 8
 *
 * Core capabilities:
 *  - Overview metric aggregations (materials, quizzes, average score, accuracy, mastered topics)
 *  - 4-band topic classification (<40% Critical, 40-70% Weak, 70-85% Developing, >=85% Mastered)
 *  - Weak-topic identification (<70%) with material association & trend diagnostics
 *  - Deterministic revision recommendation generation with duplicate prevention
 *  - Recommendation retrieval and status updates (pending, reviewed, completed, dismissed)
 *
 * All database operations strictly scope queries to the authenticated userId.
 */

import { connectDB } from "../lib/db/index.js";
import Material from "../models/Material.js";
import QuizSubmission from "../models/QuizSubmission.js";
import TopicMastery from "../models/TopicMastery.js";
import RevisionRecommendation from "../models/RevisionRecommendation.js";
import Quiz from "../models/Quiz.js";

// Legacy thresholds preserved for backward compatibility with quizService.js
export const MASTERY_THRESHOLDS = {
  WEAK_MAX: 64,
  AVERAGE_MIN: 65,
  MASTERED_MIN: 85,
};

// Milestone 8 four-band classification
export const CLASSIFICATION_THRESHOLDS = {
  CRITICAL_MAX: 39,
  WEAK_MAX: 69,
  DEVELOPING_MAX: 84,
  MASTERED_MIN: 85,
};

/**
 * Classifies a numerical mastery score (0-100) into a 4-band tier:
 *  - Below 40%: Critical
 *  - 40% to below 70%: Weak
 *  - 70% to below 85%: Developing
 *  - 85% and above: Mastered
 *
 * @param {number} score
 * @returns {"critical" | "weak" | "developing" | "mastered"}
 */
export function classifyMastery(score) {
  if (typeof score !== "number" || isNaN(score) || score < 40) {
    return "critical";
  }
  if (score < 70) {
    return "weak";
  }
  if (score < 85) {
    return "developing";
  }
  return "mastered";
}

/**
 * Exponential Moving Average (EMA) topic mastery calculation.
 * Preserved for quizService.js backward compatibility.
 *
 * @param {number | null} previousScore
 * @param {number} newScore
 * @param {number} [alpha=0.4]
 * @returns {{ masteryScore: number, status: string }}
 */
export function calculateTopicMastery(previousScore, newScore, alpha = 0.4) {
  const current =
    previousScore === null || previousScore === undefined
      ? newScore
      : Math.round(alpha * newScore + (1 - alpha) * previousScore);
  let status = "average";
  if (current <= MASTERY_THRESHOLDS.WEAK_MAX) status = "weak";
  else if (current >= MASTERY_THRESHOLDS.MASTERED_MIN) status = "mastered";
  return { masteryScore: current, status };
}

/**
 * Pure calculation function for overview metrics.
 * Safely handles empty datasets, missing values, and varying quiz max scores.
 *
 * @param {Array<object>} submissions
 * @param {number} totalMaterials
 * @param {number} masteredTopicsCount
 * @returns {object} Calculated metrics
 */
export function calculateOverviewMetrics(
  submissions = [],
  totalMaterials = 0,
  masteredTopicsCount = 0
) {
  const quizzesCompleted = submissions.length;

  let totalEarnedScore = 0;
  let totalPossibleScore = 0;
  let totalAnswered = 0;
  let totalCorrect = 0;
  let totalQuizPercentages = 0;
  let eligibleQuizzes = 0;

  for (const sub of submissions) {
    // 1. Quiz percentage scoring for average score
    if (typeof sub.scorePercentage === "number" && !isNaN(sub.scorePercentage)) {
      totalQuizPercentages += sub.scorePercentage;
      eligibleQuizzes++;
    } else if (
      typeof sub.totalQuestions === "number" &&
      sub.totalQuestions > 0 &&
      typeof sub.correctCount === "number"
    ) {
      totalQuizPercentages += Math.round((sub.correctCount / sub.totalQuestions) * 100);
      eligibleQuizzes++;
    }

    // 2. Question-level aggregation for questions answered and accuracy
    const graded = Array.isArray(sub.gradedAnswers) ? sub.gradedAnswers : [];
    if (graded.length > 0) {
      totalAnswered += graded.length;
      for (const a of graded) {
        if (a && a.isCorrect) totalCorrect++;
        const s = typeof a?.score === "number" ? a.score : a?.isCorrect ? 1 : 0;
        const maxS = typeof a?.maxScore === "number" && a.maxScore > 0 ? a.maxScore : 1;
        totalEarnedScore += s;
        totalPossibleScore += maxS;
      }
    } else {
      const qCount = typeof sub.totalQuestions === "number" ? sub.totalQuestions : 0;
      const cCount = typeof sub.correctCount === "number" ? sub.correctCount : 0;
      totalAnswered += qCount;
      totalCorrect += cCount;
      totalEarnedScore += cCount;
      totalPossibleScore += qCount;
    }
  }

  const averageQuizScore =
    eligibleQuizzes > 0 ? Math.round(totalQuizPercentages / eligibleQuizzes) : 0;

  // Never report 100% when there are zero eligible answers
  const overallAccuracy =
    totalAnswered > 0 && totalPossibleScore > 0
      ? Math.round((totalEarnedScore / totalPossibleScore) * 100)
      : totalAnswered > 0
      ? Math.round((totalCorrect / totalAnswered) * 100)
      : 0;

  return {
    totalMaterials: Math.max(0, totalMaterials),
    quizzesCompleted,
    completedQuizzes: quizzesCompleted,
    averageQuizScore,
    totalQuestionsAnswered: totalAnswered,
    overallAccuracy,
    masteredTopics: Math.max(0, masteredTopicsCount),
  };
}

/**
 * Retrieves aggregate learning analytics for the authenticated user.
 *
 * @param {string} userId
 * @returns {Promise<object>} Overview metrics
 */
export async function getOverviewMetrics(userId) {
  await connectDB();
  const [totalMaterials, submissions, masteredTopicsCount] = await Promise.all([
    Material.countDocuments({ userId }),
    QuizSubmission.find({ userId })
      .select("scorePercentage totalQuestions correctCount gradedAnswers")
      .lean(),
    TopicMastery.countDocuments({
      userId,
      masteryScore: { $gte: CLASSIFICATION_THRESHOLDS.MASTERED_MIN },
    }),
  ]);

  return calculateOverviewMetrics(submissions, totalMaterials, masteredTopicsCount);
}

/**
 * Builds a lookup map associating topic tags to their source materials.
 * Looks up quizzes created by the user and associates topic tags to material info.
 *
 * @param {string} userId
 * @returns {Promise<Map<string, { materialId: string, materialTitle: string }>>}
 */
async function buildTopicToMaterialMap(userId) {
  const quizzes = await Quiz.find({ userId })
    .select("materialId topicTags")
    .populate("materialId", "title _id")
    .lean();

  const map = new Map();
  for (const quiz of quizzes) {
    if (!quiz.materialId) continue;
    const materialId =
      quiz.materialId._id?.toString() || quiz.materialId.toString();
    const materialTitle = quiz.materialId.title || "Study Material";

    for (const tag of quiz.topicTags || []) {
      const key = tag.trim().toLowerCase();
      if (!map.has(key)) {
        map.set(key, { materialId, materialTitle });
      }
    }
  }
  return map;
}

/**
 * Formulates a clear diagnostic reason for a topic's flagged status.
 */
function buildFlagReason(score, classification, mastery) {
  let trend = "";
  if (
    typeof mastery.lastAttemptScore === "number" &&
    typeof mastery.masteryScore === "number" &&
    mastery.attemptCount > 1
  ) {
    if (mastery.lastAttemptScore < mastery.masteryScore) {
      trend = ` Recent quiz score declined to ${mastery.lastAttemptScore}%.`;
    } else if (mastery.lastAttemptScore > mastery.masteryScore) {
      trend = ` Recent quiz score showed improvement to ${mastery.lastAttemptScore}%.`;
    }
  }

  if (classification === "critical") {
    return `Mastery is critically low at ${score}%. Immediate revision required.${trend}`;
  }
  if (classification === "weak") {
    return `Mastery of ${score}% is below the 70% proficiency threshold.${trend}`;
  }
  return `Topic is developing at ${score}% — reinforcement practice recommended.${trend}`;
}

/**
 * Formulates actionable next steps for a topic.
 */
function buildSuggestedAction(classification, materialInfo) {
  if (!materialInfo) {
    if (classification === "critical") {
      return "Generate a focused quiz to practice this topic.";
    }
    return "Review related materials and take a practice quiz.";
  }
  if (classification === "critical") {
    return `Revisit "${materialInfo.materialTitle}", then generate an active recall quiz on this topic.`;
  }
  if (classification === "weak") {
    return `Generate a new practice quiz for "${materialInfo.materialTitle}" to strengthen understanding.`;
  }
  return `Ask the AI Assistant questions about this topic or take a reinforcement quiz.`;
}

/**
 * Retrieves weak topics for the authenticated user (<70% mastery).
 * Classified into 'critical' (<40%) and 'weak' (40-69%).
 *
 * @param {string} userId
 * @param {object} [opts]
 * @param {boolean} [opts.includeDeveloping=false] Include developing (70-84%) topics
 * @param {boolean} [opts.all=false] Include all topics regardless of score
 * @returns {Promise<Array<object>>} Weak topics list
 */
export async function getWeakTopics(userId, opts = {}) {
  await connectDB();
  const masteries = await TopicMastery.find({ userId }).lean();
  if (masteries.length === 0) return [];

  const topicToMaterial = await buildTopicToMaterialMap(userId);
  const results = [];

  for (const mastery of masteries) {
    const score = mastery.masteryScore ?? 0;
    const classification = classifyMastery(score);

    // Filter to weak topics (<70%) unless explicit option provided
    if (!opts.all) {
      if (classification === "mastered") continue;
      if (classification === "developing" && !opts.includeDeveloping) continue;
    }

    const key = (mastery.topicTag || "").trim().toLowerCase();
    const materialInfo = topicToMaterial.get(key) || null;

    results.push({
      id: mastery._id?.toString(),
      topicTag: mastery.topicTag,
      masteryScore: score,
      classification,
      materialId: materialInfo?.materialId || null,
      materialTitle: materialInfo?.materialTitle || null,
      attemptCount: mastery.attemptCount || 0,
      lastAttemptScore: mastery.lastAttemptScore,
      lastAttemptAt: mastery.lastAttemptAt,
      reason: buildFlagReason(score, classification, mastery),
      suggestedAction: buildSuggestedAction(classification, materialInfo),
    });
  }

  // Sort: Critical (0) -> Weak (1) -> Developing (2) -> Mastered (3), then lowest score first
  const order = { critical: 0, weak: 1, developing: 2, mastered: 3 };
  results.sort((a, b) => {
    const diff = (order[a.classification] ?? 4) - (order[b.classification] ?? 4);
    if (diff !== 0) return diff;
    return a.masteryScore - b.masteryScore;
  });

  return results;
}

const PRIORITY_MAP = {
  HIGH: 20,
  MEDIUM: 50,
  LOW: 80,
};

/**
 * Idempotently generates rule-based revision recommendations for weak topics.
 * Avoids duplicate active recommendations and preserves completed/reviewed/dismissed statuses.
 *
 * @param {string} userId
 * @returns {Promise<{ created: number, skipped: number }>}
 */
export async function generateRecommendations(userId) {
  await connectDB();
  const weakTopics = await getWeakTopics(userId);
  let created = 0;
  let skipped = 0;

  for (const topic of weakTopics) {
    // Critical (<40%) -> HIGH priority, Weak (40-69%) -> MEDIUM priority
    const priorityValue =
      topic.classification === "critical"
        ? PRIORITY_MAP.HIGH
        : topic.classification === "weak"
        ? PRIORITY_MAP.MEDIUM
        : PRIORITY_MAP.LOW;

    // Check for existing active pending recommendation
    const activeExisting = await RevisionRecommendation.findOne({
      userId,
      topicTag: topic.topicTag,
      materialId: topic.materialId || null,
      status: "pending",
    }).lean();

    if (activeExisting) {
      skipped++;
      continue;
    }

    // Check if previously reviewed/completed/dismissed
    const completedPreviously = await RevisionRecommendation.findOne({
      userId,
      topicTag: topic.topicTag,
      materialId: topic.materialId || null,
      status: { $in: ["reviewed", "completed", "dismissed"] },
    })
      .sort({ updatedAt: -1 })
      .lean();

    if (completedPreviously) {
      const prevScore = completedPreviously.masteryScoreAtGeneration ?? 100;
      // Do not regenerate if student hasn't experienced a performance drop
      if (topic.masteryScore >= prevScore) {
        skipped++;
        continue;
      }
    }

    const priorityLabel =
      topic.classification === "critical"
        ? "Urgent Revision"
        : topic.classification === "weak"
        ? "Focused Practice"
        : "Reinforcement";

    const matLabel = topic.materialTitle ? ` in "${topic.materialTitle}"` : "";
    const title = `${priorityLabel}: ${topic.topicTag}`;
    const content = `Your mastery of "${topic.topicTag}"${matLabel} is at ${topic.masteryScore}%. ${topic.reason} ${topic.suggestedAction}`;

    await RevisionRecommendation.create({
      userId,
      topicTag: topic.topicTag,
      materialId: topic.materialId || null,
      title,
      content,
      masteryScoreAtGeneration: topic.masteryScore,
      priority: priorityValue,
      status: "pending",
    });

    created++;
  }

  return { created, skipped };
}

/**
 * Retrieves recommendations for the authenticated user.
 *
 * @param {string} userId
 * @param {object} [opts]
 * @param {string} [opts.status]
 * @param {string} [opts.materialId]
 * @param {number} [opts.limit=50]
 * @returns {Promise<Array<object>>}
 */
export async function getRecommendations(userId, opts = {}) {
  await connectDB();
  const { status, materialId, limit = 50 } = opts;
  const query = { userId };

  if (status && ["pending", "reviewed", "completed", "dismissed"].includes(status)) {
    query.status = status;
  }
  if (materialId) {
    query.materialId = materialId;
  }

  const recs = await RevisionRecommendation.find(query)
    .sort({ priority: 1, createdAt: -1 })
    .limit(limit)
    .lean();

  return recs.map((r) => ({
    id: r._id.toString(),
    topicTag: r.topicTag,
    materialId: r.materialId?.toString() || null,
    title: r.title,
    content: r.content,
    masteryScoreAtGeneration: r.masteryScoreAtGeneration,
    priority: r.priority <= 30 ? "HIGH" : r.priority <= 60 ? "MEDIUM" : "LOW",
    priorityValue: r.priority,
    status: r.status,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
}

/**
 * Updates a recommendation's status (pending, reviewed, completed, dismissed).
 * Verifies that the recommendation exists and belongs to the authenticated user.
 *
 * @param {string} recommendationId
 * @param {string} userId
 * @param {string} newStatus
 * @returns {Promise<object>}
 */
export async function updateRecommendationStatus(recommendationId, userId, newStatus) {
  await connectDB();
  const allowedStatuses = ["pending", "reviewed", "completed", "dismissed"];
  if (!allowedStatuses.includes(newStatus)) {
    const err = new Error(
      `Invalid status "${newStatus}". Must be one of: ${allowedStatuses.join(", ")}`
    );
    err.code = "INVALID_STATUS";
    throw err;
  }

  const rec = await RevisionRecommendation.findOneAndUpdate(
    { _id: recommendationId, userId },
    { status: newStatus },
    { returnDocument: "after", lean: true }
  );

  if (!rec) {
    const err = new Error("Recommendation not found or access denied.");
    err.code = "NOT_FOUND";
    throw err;
  }

  return {
    id: rec._id.toString(),
    topicTag: rec.topicTag,
    title: rec.title,
    status: rec.status,
    updatedAt: rec.updatedAt,
  };
}

/**
 * Retrieves all topic masteries for the user, sorted from highest to lowest score.
 *
 * @param {string} userId
 * @returns {Promise<Array<object>>}
 */
export async function getAllTopicMastery(userId) {
  await connectDB();
  const masteries = await TopicMastery.find({ userId })
    .sort({ masteryScore: -1 })
    .lean();

  return masteries.map((m) => ({
    id: m._id?.toString(),
    topicTag: m.topicTag,
    masteryScore: m.masteryScore ?? 0,
    classification: classifyMastery(m.masteryScore ?? 0),
    attemptCount: m.attemptCount || 0,
    lastAttemptScore: m.lastAttemptScore,
    lastAttemptAt: m.lastAttemptAt,
  }));
}
