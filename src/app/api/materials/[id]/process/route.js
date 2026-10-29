import { connectDB } from "@/lib/db/index.js";
import Material from "@/models/Material.js";
import { requireAuth, AuthError } from "@/lib/auth/server.js";
import { objectIdSchema } from "@/validations/common.js";
import { processMaterialDocument } from "@/services/ingestionService.js";

/**
 * POST /api/materials/[id]/process
 *
 * Triggers server-side processing for an uploaded study material:
 * 1. Authenticates student and validates document ownership.
 * 2. Checks current processing status to prevent race conditions.
 * 3. Extracts text from PDF or TXT buffer in private cloud storage.
 * 4. Generates semantic overlapping chunks.
 * 5. Produces Gemini 768-dim embeddings for all chunks.
 * 6. Atomically saves chunks in MongoDB and sets material status to "ready".
 * 7. Records error and sets status to "failed" on any pipeline failure.
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

    await connectDB();

    // Verify document exists and belongs to requesting student
    const material = await Material.findOne({ _id: id, userId: user.id });
    if (!material) {
      return Response.json(
        { error: "Study material not found or access denied." },
        { status: 404 }
      );
    }

    // Check if actively processing to prevent duplicate concurrent runs
    if (material.processingStatus === "processing") {
      const isRecent =
        material.updatedAt && Date.now() - new Date(material.updatedAt).getTime() < 3 * 60 * 1000;
      if (isRecent) {
        return Response.json(
          { error: "Processing is already actively in progress for this document." },
          { status: 409 }
        );
      }
    }

    // Execute processing pipeline
    try {
      const result = await processMaterialDocument({
        materialId: id,
        userId: user.id,
      });

      return Response.json({
        message: "Document processed successfully. Semantic chunks and vector embeddings are ready.",
        ...result,
      });
    } catch (pipelineErr) {
      const isConfigError =
        pipelineErr.message.includes("not configured") ||
        pipelineErr.message.includes(".env.local");

      return Response.json(
        {
          error: pipelineErr.message || "Document processing pipeline encountered an error.",
          materialId: id,
          status: "failed",
        },
        { status: isConfigError ? 503 : 500 }
      );
    }
  } catch (err) {
    console.error(`[POST /api/materials/${params?.id}/process] Unexpected error:`, err.message);
    return Response.json(
      { error: "An unexpected server error occurred during document processing." },
      { status: 500 }
    );
  }
}
