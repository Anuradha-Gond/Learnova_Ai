import { connectDB } from "@/lib/db/index.js";
import Material from "@/models/Material.js";
import { requireAuth, AuthError } from "@/lib/auth/server.js";
import { objectIdSchema } from "@/validations/common.js";
import { simplifyConcept } from "@/services/studyAidsService.js";
import { z } from "zod";

const simplifyRequestSchema = z.object({
  concept: z.string().trim().min(2, "Concept name must be at least 2 characters").max(150, "Concept name too long"),
  depth: z.enum(["beginner", "intermediate"]).default("beginner"),
});

/**
 * POST /api/materials/[id]/simplify
 *
 * Explains a specific concept from the document in student-friendly terms with analogies and citations.
 */
export async function POST(request, { params }) {
  try {
    let user;
    try {
      user = await requireAuth();
    } catch (err) {
      if (err instanceof AuthError) return err.toResponse();
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }

    const { id } = params;
    const idValidation = objectIdSchema.safeParse(id);
    if (!idValidation.success) {
      return Response.json({ error: "Invalid material identifier format" }, { status: 400 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Request body must be valid JSON" }, { status: 400 });
    }

    const parsed = simplifyRequestSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues?.[0]?.message || "Invalid simplify payload";
      return Response.json({ error: firstError }, { status: 400 });
    }

    await connectDB();

    const material = await Material.findOne({ _id: id, userId: user.id });
    if (!material) {
      return Response.json({ error: "Study material not found or access denied." }, { status: 404 });
    }

    if (material.processingStatus !== "ready") {
      return Response.json(
        {
          error: "Document must be processed before simplifying concepts. Please process the document first.",
          status: material.processingStatus,
        },
        { status: 422 }
      );
    }

    const result = await simplifyConcept({
      materialId: id,
      userId: user.id,
      concept: parsed.data.concept,
      depth: parsed.data.depth,
    });

    return Response.json({
      message: "Concept simplified successfully.",
      ...result,
    });
  } catch (err) {
    console.error(`[POST /api/materials/${params?.id}/simplify] Error:`, err.message);
    const isConfigError = err.message.includes("GEMINI_API_KEY");
    return Response.json(
      { error: err.message || "Failed to simplify concept." },
      { status: isConfigError ? 503 : 500 }
    );
  }
}

