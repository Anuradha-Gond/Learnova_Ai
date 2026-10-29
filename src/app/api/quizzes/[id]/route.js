import { connectDB } from "@/lib/db/index.js";
import Quiz from "@/models/Quiz.js";
import QuizAnswerKey from "@/models/QuizAnswerKey.js";
import QuizSubmission from "@/models/QuizSubmission.js";
import { requireAuth, AuthError } from "@/lib/auth/server.js";
import { objectIdSchema } from "@/validations/common.js";
import { toPublicQuizDTO } from "@/services/quizService.js";

/**
 * GET /api/quizzes/[id]
 *
 * Retrieves public quiz data for taking the quiz.
 * Strictly returns only the client-safe public DTO.
 * Answer keys, rubrics, and explanations are never serialized or returned.
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

    const quiz = await Quiz.findOne({ _id: id, userId: user.id });
    if (!quiz) {
      return Response.json(
        { error: "Quiz not found or access denied." },
        { status: 404 }
      );
    }

    return Response.json({
      quiz: toPublicQuizDTO(quiz),
    });
  } catch (err) {
    console.error(`[GET /api/quizzes/${params?.id}] Error:`, err.message);
    return Response.json(
      { error: "Failed to retrieve quiz details." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/quizzes/[id]
 *
 * Deletes a quiz and its private answer key and submissions for the owner.
 */
export async function DELETE(request, { params }) {
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

    const quiz = await Quiz.findOne({ _id: id, userId: user.id });
    if (!quiz) {
      return Response.json(
        { error: "Quiz not found or access denied." },
        { status: 404 }
      );
    }

    await Promise.all([
      Quiz.deleteOne({ _id: id, userId: user.id }),
      QuizAnswerKey.deleteOne({ quizId: id, userId: user.id }),
      QuizSubmission.deleteMany({ quizId: id, userId: user.id }),
    ]);

    return Response.json({
      message: "Quiz and related attempt history deleted successfully.",
    });
  } catch (err) {
    console.error(`[DELETE /api/quizzes/${params?.id}] Error:`, err.message);
    return Response.json(
      { error: "Failed to delete quiz." },
      { status: 500 }
    );
  }
}
