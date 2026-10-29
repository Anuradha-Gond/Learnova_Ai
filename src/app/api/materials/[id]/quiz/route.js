import { connectDB } from "@/lib/db/index.js";
import Quiz from "@/models/Quiz.js";
import QuizSubmission from "@/models/QuizSubmission.js";
import Material from "@/models/Material.js";
import { requireAuth, AuthError } from "@/lib/auth/server.js";
import { objectIdSchema } from "@/validations/common.js";
import { quizGenerationSchema } from "@/validations/quiz.js";
import { generateQuiz, toPublicQuizDTO } from "@/services/quizService.js";

/**
 * POST /api/materials/[id]/quiz
 *
 * Generates an active-recall quiz from the authorized student's study material.
 * 1. Authenticates student and verifies document ownership.
 * 2. Validates requested question count, difficulty, and question types.
 * 3. Retrieves document chunks and prompts Gemini for structured question generation.
 * 4. Persists separate public Quiz and server-only QuizAnswerKey documents.
 * 5. Returns only the client-safe public quiz DTO (never exposing answer keys).
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
      return Response.json({ error: "Invalid material identifier format" }, { status: 400 });
    }

    let body = {};
    try {
      body = await request.json();
    } catch {
      // Body is optional; default parameters will apply
    }

    const validation = quizGenerationSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.issues?.[0]?.message || "Invalid quiz configuration";
      return Response.json({ error: firstError }, { status: 400 });
    }

    const { questionCount, difficulty, questionTypes, title } = validation.data;

    await connectDB();

    // Verify material exists and belongs to the requesting student
    const material = await Material.findOne({ _id: id, userId: user.id });
    if (!material) {
      return Response.json(
        { error: "Study material not found or access denied." },
        { status: 404 }
      );
    }

    // Verify document has been processed
    if (material.processingStatus !== "ready") {
      return Response.json(
        {
          error:
            "Document must be processed through the ingestion pipeline before generating a quiz. Please process the document first.",
        },
        { status: 422 }
      );
    }

    // Generate the quiz
    try {
      const result = await generateQuiz({
        materialId: id,
        userId: user.id,
        questionCount,
        difficulty,
        questionTypes,
        customTitle: title,
      });

      return Response.json(
        {
          message: "Quiz generated successfully.",
          quiz: result.quiz,
        },
        { status: 201 }
      );
    } catch (genErr) {
      console.error(`[POST /api/materials/${id}/quiz] Generation error:`, genErr.message);
      const isConfigError = genErr.message.includes("GEMINI_API_KEY");
      return Response.json(
        {
          error: genErr.message || "Failed to generate quiz from study material.",
        },
        { status: isConfigError ? 503 : 500 }
      );
    }
  } catch (err) {
    console.error(`[POST /api/materials/${params?.id}/quiz] Unexpected error:`, err.message);
    return Response.json(
      { error: "An unexpected server error occurred during quiz generation." },
      { status: 500 }
    );
  }
}

/**
 * GET /api/materials/[id]/quiz
 *
 * Retrieves all quizzes and latest attempt summaries for the specified study material.
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
      return Response.json({ error: "Invalid material identifier format" }, { status: 400 });
    }

    await connectDB();

    // Verify material ownership
    const material = await Material.findOne({ _id: id, userId: user.id });
    if (!material) {
      return Response.json(
        { error: "Study material not found or access denied." },
        { status: 404 }
      );
    }

    // Retrieve quizzes created for this material
    const quizzes = await Quiz.find({
      materialId: id,
      userId: user.id,
    })
      .sort({ createdAt: -1 })
      .lean();

    // Retrieve submissions for each quiz
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
    console.error(`[GET /api/materials/${params?.id}/quiz] Error:`, err.message);
    return Response.json(
      { error: "Failed to retrieve quizzes for this document." },
      { status: 500 }
    );
  }
}
