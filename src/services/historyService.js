import { connectDB } from "../lib/db/index.js";
import QuizSubmission from "../models/QuizSubmission.js";
import Material from "../models/Material.js";
import RevisionRecommendation from "../models/RevisionRecommendation.js";

/**
 * Pure helper to build and sort a unified chronological activity timeline.
 *
 * @param {Array} submissions
 * @param {Array} materials
 * @param {Array} revisions
 * @returns {Array} Sorted activity items (newest first)
 */
export function buildActivityTimeline(submissions = [], materials = [], revisions = []) {
  const activities = [];

  for (const sub of submissions) {
    activities.push({
      id: sub._id?.toString() || sub.id,
      type: "quiz_completed",
      title: sub.quizTitle || sub.quizId?.title || "Practice Quiz",
      scorePercentage: sub.scorePercentage ?? 0,
      correctCount: sub.correctCount ?? 0,
      totalQuestions: sub.totalQuestions ?? 0,
      quizId: sub.quizId?._id?.toString() || sub.quizId?.toString() || null,
      materialId: sub.materialId?._id?.toString() || sub.materialId?.toString() || null,
      timestamp: sub.submittedAt || sub.createdAt || new Date(0),
    });
  }

  for (const mat of materials) {
    activities.push({
      id: mat._id?.toString() || mat.id,
      type: "material_uploaded",
      title: mat.title || mat.originalFilename || "Study Material",
      fileType: mat.fileType || "pdf",
      fileSize: mat.fileSize || 0,
      processingStatus: mat.processingStatus || "pending",
      materialId: mat._id?.toString() || mat.id,
      timestamp: mat.createdAt || new Date(0),
    });
  }

  for (const rev of revisions) {
    activities.push({
      id: rev._id?.toString() || rev.id,
      type: "revision_completed",
      title: rev.title || `Revision: ${rev.topicTag}`,
      topicTag: rev.topicTag,
      priority: rev.priority <= 30 ? "HIGH" : rev.priority <= 60 ? "MEDIUM" : "LOW",
      status: rev.status,
      timestamp: rev.updatedAt || rev.createdAt || new Date(0),
    });
  }

  // Sort newest first
  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return activities;
}

/**
 * Retrieves the complete learning history for the authenticated student.
 * Scoped strictly to records owned by userId.
 *
 * @param {string} userId
 * @param {object} [opts]
 * @param {number} [opts.limit=50]
 * @returns {Promise<object>}
 */
export async function getStudentHistory(userId, opts = {}) {
  await connectDB();
  const limit = Math.min(Math.max(1, opts.limit || 50), 100);

  const [submissions, materials, completedRevisions] = await Promise.all([
    QuizSubmission.find({ userId })
      .populate("quizId", "title difficulty questionCount topicTags")
      .populate("materialId", "title")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean(),

    Material.find({ userId })
      .select("title originalFilename fileType fileSize processingStatus createdAt")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean(),

    RevisionRecommendation.find({
      userId,
      status: { $in: ["completed", "reviewed"] },
    })
      .select("title topicTag priority status createdAt updatedAt")
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean(),
  ]);

  const formattedSubmissions = submissions.map((s) => ({
    id: s._id.toString(),
    quizId: s.quizId?._id?.toString() || s.quizId?.toString() || null,
    quizTitle: s.quizId?.title || "Practice Quiz",
    difficulty: s.quizId?.difficulty || "medium",
    materialId: s.materialId?._id?.toString() || s.materialId?.toString() || null,
    materialTitle: s.materialId?.title || "Study Material",
    scorePercentage: s.scorePercentage ?? 0,
    correctCount: s.correctCount ?? 0,
    totalQuestions: s.totalQuestions ?? 0,
    topicBreakdown: s.topicBreakdown || [],
    durationSeconds: s.durationSeconds,
    submittedAt: s.submittedAt || s.createdAt,
  }));

  const formattedMaterials = materials.map((m) => ({
    id: m._id.toString(),
    title: m.title,
    originalFilename: m.originalFilename,
    fileType: m.fileType,
    fileSize: m.fileSize,
    processingStatus: m.processingStatus,
    createdAt: m.createdAt,
  }));

  const formattedRevisions = completedRevisions.map((r) => ({
    id: r._id.toString(),
    title: r.title,
    topicTag: r.topicTag,
    priority: r.priority <= 30 ? "HIGH" : r.priority <= 60 ? "MEDIUM" : "LOW",
    status: r.status,
    completedAt: r.updatedAt,
  }));

  const timeline = buildActivityTimeline(
    submissions,
    materials,
    completedRevisions
  );

  const totalQuizzes = formattedSubmissions.length;
  const avgScore =
    totalQuizzes > 0
      ? Math.round(
          formattedSubmissions.reduce((sum, s) => sum + s.scorePercentage, 0) / totalQuizzes
        )
      : null;

  return {
    timeline: timeline.slice(0, limit),
    quizAttempts: formattedSubmissions,
    materials: formattedMaterials,
    completedRevisions: formattedRevisions,
    summary: {
      totalQuizAttempts: totalQuizzes,
      totalMaterialsUploaded: formattedMaterials.length,
      totalRevisionsCompleted: formattedRevisions.length,
      averageQuizScore: avgScore,
    },
  };
}
