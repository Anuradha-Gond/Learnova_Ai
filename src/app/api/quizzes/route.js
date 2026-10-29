import { connectDB } from "@/lib/db/index.js";
import Quiz from "@/models/Quiz.js";
import QuizSubmission from "@/models/QuizSubmission.js";
import Material from "@/models/Material.js";
import { requireAuth, AuthError } from "@/lib/auth/server.js";

/**
 * GET /api/quizzes
 *
 * Lists all quizzes owned by the authenticated student across all study materials.
 */
export async function GET(request) {
  try {
    let user;
    try {
      user = await requireAuth();
    } catch (err) {
      if (err instanceof AuthError) {
        return err.toResponse();
      }
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }

    await connectDB();

    const quizzes = await Quiz.find({ userId: user.id })
      .populate("materialId", "title originalFilename")
      .sort({ createdAt: -1 })
      .lean();

    const quizIds = quizzes.map((q) => q._id);
    const submissions = await QuizSubmission.find({
      quizId: { $in: quizIds },
      userId: user.id,
    })
      .sort({ createdAt: -1 })
      .lean();

    const submissionsByQuiz = new Map();
    for (const sub of submissions) {
      const qId = sub.quizId.toString();
      if (!submissionsByQuiz.has(qId)) {
        submissionsByQuiz.set(qId, []);
      }
      submissionsByQuiz.get(qId).push(sub);
    }

    const items = quizzes.map((q) => {
      const subs = submissionsByQuiz.get(q._id.toString()) || [];
      const latestSub = subs[0];

      return {
        id: q._id.toString(),
        materialId: q.materialId?._id?.toString() || q.materialId?.toString(),
        materialTitle: q.materialId?.title || "Study Material",
        title: q.title,
        difficulty: q.difficulty,
        questionCount: q.questionCount,
        topicTags: q.topicTags || [],
        createdAt: q.createdAt,
        attemptCount: subs.length,
        latestScore: latestSub ? latestSub.scorePercentage : null,
        latestAttemptAt: latestSub ? latestSub.submittedAt : null,
      };
    });

    return Response.json({
      quizzes: items,
      totalCount: items.length,
    });
  } catch (err) {
    console.error("[GET /api/quizzes] Error:", err.message);
    return Response.json(
      { error: "Failed to retrieve student quizzes." },
      { status: 500 }
    );
  }
}
