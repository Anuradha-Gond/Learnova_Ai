import { connectDB } from "@/lib/db/index.js";
import QuizSubmission from "@/models/QuizSubmission.js";
import Quiz from "@/models/Quiz.js";
import { requireAuth, AuthError } from "@/lib/auth/server.js";
import { objectIdSchema } from "@/validations/common.js";

/**
 * GET /api/quizzes/[id]/submissions
 *
 * Retrieves the authenticated student's previous attempt submissions and results for this quiz.
 */
export async function GET(request, { params }) {
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

    const { id } = params;
    const idValidation = objectIdSchema.safeParse(id);
    if (!idValidation.success) {
      return Response.json({ error: "Invalid quiz identifier format" }, { status: 400 });
    }

    await connectDB();

    // Verify quiz ownership
    const quiz = await Quiz.findOne({ _id: id, userId: user.id });
    if (!quiz) {
      return Response.json(
        { error: "Quiz not found or access denied." },
        { status: 404 }
      );
    }

    const submissions = await QuizSubmission.find({
      quizId: id,
      userId: user.id,
    })
      .sort({ createdAt: -1 })
      .lean();

    const formatted = submissions.map((sub) => ({
      submissionId: sub._id.toString(),
      quizId: sub.quizId.toString(),
      quizTitle: quiz.title,
      scorePercentage: sub.scorePercentage,
      correctCount: sub.correctCount,
      totalQuestions: sub.totalQuestions,
      topicBreakdown: sub.topicBreakdown || [],
      gradedAnswers: sub.gradedAnswers || [],
      durationSeconds: sub.durationSeconds,
      submittedAt: sub.submittedAt,
    }));

    return Response.json({
      submissions: formatted,
      totalAttempts: formatted.length,
    });
  } catch (err) {
    console.error(`[GET /api/quizzes/${params?.id}/submissions] Error:`, err.message);
    return Response.json(
      { error: "Failed to retrieve quiz submission history." },
      { status: 500 }
    );
  }
}
