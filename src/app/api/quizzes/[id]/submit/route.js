import { connectDB } from "@/lib/db/index.js";
import { requireAuth, AuthError } from "@/lib/auth/server.js";
import { objectIdSchema } from "@/validations/common.js";
import { quizSubmissionSchema } from "@/validations/quiz.js";
import { evaluateAndScoreSubmission } from "@/services/quizService.js";

/**
 * POST /api/quizzes/[id]/submit
 *
 * Submits student answers for server-side evaluation and scoring:
 * 1. Authenticates student and verifies quiz ownership.
 * 2. Validates submitted answers structure.
 * 3. Evaluates MCQs and True/False questions deterministically against private answer key.
 * 4. Evaluates short answers semantically via Gemini using reference answers and rubrics.
 * 5. Calculates total score, percentage, and per-topic breakdowns.
 * 6. Atomically updates student TopicMastery records using EMA formula.
 * 7. Persists QuizSubmission and returns the authorized result summary with explanations.
 */
export async function POST(request, { params }) {
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

    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Malformed JSON in request body" }, { status: 400 });
    }

    const validation = quizSubmissionSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.issues?.[0]?.message || "Invalid submission payload";
      return Response.json({ error: firstError }, { status: 400 });
    }

    const { submittedAnswers, idempotencyKey, durationSeconds } = validation.data;

    await connectDB();

    try {
      const result = await evaluateAndScoreSubmission({
        quizId: id,
        userId: user.id,
        submittedAnswers,
        idempotencyKey,
        durationSeconds,
      });

      return Response.json({
        message: "Quiz submitted and evaluated successfully.",
        result,
      });
    } catch (evalErr) {
      console.error(`[POST /api/quizzes/${id}/submit] Evaluation error:`, evalErr.message);
      const isNotFound = evalErr.message.includes("not found");
      return Response.json(
        { error: evalErr.message || "Failed to evaluate quiz submission." },
        { status: isNotFound ? 404 : 500 }
      );
    }
  } catch (err) {
    console.error(`[POST /api/quizzes/${params?.id}/submit] Error:`, err.message);
    return Response.json(
      { error: "An unexpected server error occurred during quiz evaluation." },
      { status: 500 }
    );
  }
}
