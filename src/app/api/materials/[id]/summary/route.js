import { connectDB } from "@/lib/db/index.js";
import Material from "@/models/Material.js";
import { requireAuth, AuthError } from "@/lib/auth/server.js";
import { objectIdSchema } from "@/validations/common.js";
import { generateDocumentSummary } from "@/services/studyAidsService.js";

/**
 * GET /api/materials/[id]/summary
 *
 * Retrieves the existing saved summary for the document, if generated.
 */
export async function GET(request, { params }) {
  const resolvedParams = await params;
  try {
    let user;
    try {
      user = await requireAuth();
    } catch (err) {
      if (err instanceof AuthError) return err.toResponse();
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }

    const { id } = resolvedParams;
    const idValidation = objectIdSchema.safeParse(id);
    if (!idValidation.success) {
      return Response.json({ error: "Invalid material identifier format" }, { status: 400 });
    }

    await connectDB();

    const material = await Material.findOne({ _id: id, userId: user.id });
    if (!material) {
      return Response.json({ error: "Study material not found or access denied." }, { status: 404 });
    }

    return Response.json({
      summary: material.summary || null,
      processingStatus: material.processingStatus,
      topicTags: material.topicTags || [],
      wordCount: material.wordCount || 0,
    });
  } catch (err) {
    console.error(`[GET /api/materials/${resolvedParams?.id}/summary] Error:`, err.message);
    return Response.json({ error: "Failed to retrieve summary." }, { status: 500 });
  }
}

/**
 * POST /api/materials/[id]/summary
 *
 * Triggers generation of an academic summary using Gemini Flash grounded in document chunks.
 */
export async function POST(request, { params }) {
  const resolvedParams = await params;
  try {
    let user;
    try {
      user = await requireAuth();
    } catch (err) {
      if (err instanceof AuthError) return err.toResponse();
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }

    const { id } = resolvedParams;
    const idValidation = objectIdSchema.safeParse(id);
    if (!idValidation.success) {
      return Response.json({ error: "Invalid material identifier format" }, { status: 400 });
    }

    let forceRegenerate = false;
    try {
      const body = await request.json();
      forceRegenerate = Boolean(body?.forceRegenerate);
    } catch {
      // Body is optional
    }

    await connectDB();

    const material = await Material.findOne({ _id: id, userId: user.id });
    if (!material) {
      return Response.json({ error: "Study material not found or access denied." }, { status: 404 });
    }

    if (material.processingStatus !== "ready") {
      return Response.json(
        {
          error: "Document must be processed before generating a summary. Please process the document first.",
          status: material.processingStatus,
        },
        { status: 422 }
      );
    }

    const summaryResult = await generateDocumentSummary({
      materialId: id,
      userId: user.id,
      forceRegenerate,
    });

    return Response.json({
      message: "Summary generated successfully.",
      ...summaryResult,
    });
  } catch (err) {
    console.error(`[POST /api/materials/${resolvedParams?.id}/summary] Error:`, err.message);
    const isConfigError = err.message.includes("GEMINI_API_KEY");
    const status = err.httpStatus || (isConfigError ? 503 : 500);
    return Response.json(
      {
        error: err.message || "Failed to generate summary from study material.",
        code: err.code || (isConfigError ? "AI_NOT_CONFIGURED" : "AI_GEN_ERROR"),
      },
      { status }
    );
  }
}

