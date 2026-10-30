import { connectDB } from "@/lib/db/index.js";
import Material from "@/models/Material.js";
import MaterialChunk from "@/models/MaterialChunk.js";
import ChatMessage from "@/models/ChatMessage.js";
import { requireAuth, AuthError } from "@/lib/auth/server.js";
import { objectIdSchema } from "@/validations/common.js";
import { chatMessageSchema, chatHistoryQuerySchema } from "@/validations/chat.js";
import { generateGroundedAnswer } from "@/services/ragService.js";
import { isAIConfigured } from "@/lib/ai/index.js";

/**
 * POST /api/materials/[id]/chat
 *
 * Handles student questions about an uploaded study material:
 * 1. Authenticates student and validates document ownership.
 * 2. Verifies document processing status is "ready" with embedded chunks.
 * 3. Retrieves semantic vector chunks and builds grounded prompt.
 * 4. Generates grounded answer with Gemini and verifies source citations.
 * 5. Persists user query and assistant answer into ChatMessage.
 * 6. Returns structured answer and verified source excerpts.
 */
export async function POST(request, { params }) {
  const resolvedParams = await params;
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

    const { id } = resolvedParams;
    const idValidation = objectIdSchema.safeParse(id);
    if (!idValidation.success) {
      return Response.json({ error: "Invalid material identifier format" }, { status: 400 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Malformed JSON in request body" }, { status: 400 });
    }

    const bodyValidation = chatMessageSchema.safeParse(body);
    if (!bodyValidation.success) {
      const firstError = bodyValidation.error.issues?.[0]?.message || "Invalid chat payload";
      return Response.json({ error: firstError }, { status: 400 });
    }

    const { message, conversationId } = bodyValidation.data;

    await connectDB();

    // Verify document exists and belongs to the requesting student
    const material = await Material.findOne({ _id: id, userId: user.id });
    if (!material) {
      return Response.json(
        { error: "Study material not found or access denied." },
        { status: 404 }
      );
    }

    // Verify document is ready for AI retrieval
    if (material.processingStatus !== "ready") {
      return Response.json(
        {
          error:
            "This document has not been processed yet. Please process the document first to extract semantic chunks and enable AI Q&A.",
          status: material.processingStatus,
        },
        { status: 422 }
      );
    }

    // Check that embedded chunks exist in the database
    const chunkCount = await MaterialChunk.countDocuments({
      materialId: id,
      userId: user.id,
      isEmbedded: true,
    });

    if (chunkCount === 0) {
      return Response.json(
        {
          error:
            "No searchable text chunks were found for this document. Please reprocess the document to generate vector embeddings.",
        },
        { status: 422 }
      );
    }

    if (!isAIConfigured()) {
      return Response.json(
        {
          error: "AI service is not configured on the server. Please add GEMINI_API_KEY to your environment.",
        },
        { status: 503 }
      );
    }

    const activeConversationId =
      conversationId || `conv_${id}_${user.id}`;

    // Load recent conversation history (last 6 messages) for multi-turn dialogue context
    const recentMessages = await ChatMessage.find({
      userId: user.id,
      materialId: id,
      conversationId: activeConversationId,
    })
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();

    recentMessages.reverse();

    // Generate grounded answer using RAG service
    let ragResult;
    try {
      ragResult = await generateGroundedAnswer({
        question: message,
        materialId: id,
        userId: user.id,
        materialTitle: material.title,
        conversationHistory: recentMessages,
      });
    } catch (ragErr) {
      console.error(`[POST /api/materials/${id}/chat] RAG generation error:`, ragErr.message);
      const isRateLimit =
        ragErr.message.includes("rate limit") || ragErr.message.includes("429");
      const status = ragErr.httpStatus || (isRateLimit ? 429 : 500);
      return Response.json(
        {
          error: ragErr.message || "Failed to generate grounded answer.",
          code: ragErr.code || (isRateLimit ? "AI_RATE_LIMIT" : "AI_GEN_ERROR"),
        },
        { status }
      );
    }

    // Persist conversation history
    try {
      await ChatMessage.create([
        {
          userId: user.id,
          materialId: id,
          conversationId: activeConversationId,
          role: "user",
          content: message,
        },
        {
          userId: user.id,
          materialId: id,
          conversationId: activeConversationId,
          role: "assistant",
          content: ragResult.answer,
          sources: ragResult.sources,
        },
      ]);
    } catch (dbErr) {
      // Log persistence error without failing the student's immediate response
      console.warn(`[POST /api/materials/${id}/chat] Failed to save chat history:`, dbErr.message);
    }

    return Response.json({
      answer: ragResult.answer,
      sources: ragResult.sources,
      conversationId: activeConversationId,
    });
  } catch (err) {
    console.error(`[POST /api/materials/${resolvedParams?.id}/chat] Unexpected error:`, err.message);
    return Response.json(
      { error: "An unexpected server error occurred while processing your question." },
      { status: 500 }
    );
  }
}

/**
 * GET /api/materials/[id]/chat
 *
 * Retrieves conversation history for the authenticated student and material.
 */
export async function GET(request, { params }) {
  const resolvedParams = await params;
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

    const { id } = resolvedParams;
    const idValidation = objectIdSchema.safeParse(id);
    if (!idValidation.success) {
      return Response.json({ error: "Invalid material identifier format" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const queryValidation = chatHistoryQuerySchema.safeParse({
      conversationId: searchParams.get("conversationId") || undefined,
      limit: searchParams.get("limit") || 50,
    });

    const limit = queryValidation.success ? queryValidation.data.limit : 50;

    await connectDB();

    // Verify ownership
    const material = await Material.findOne({ _id: id, userId: user.id });
    if (!material) {
      return Response.json(
        { error: "Study material not found or access denied." },
        { status: 404 }
      );
    }

    const filter = {
      userId: user.id,
      materialId: id,
    };

    if (queryValidation.success && queryValidation.data.conversationId) {
      filter.conversationId = queryValidation.data.conversationId;
    }

    const messages = await ChatMessage.find(filter)
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean();

    const formatted = messages.map((m) => ({
      id: m._id.toString(),
      role: m.role,
      content: m.content,
      sources: m.sources || [],
      conversationId: m.conversationId,
      createdAt: m.createdAt,
    }));

    return Response.json({
      messages: formatted,
      conversationId: filter.conversationId || `conv_${id}_${user.id}`,
    });
  } catch (err) {
    console.error(`[GET /api/materials/${resolvedParams?.id}/chat] Error:`, err.message);
    return Response.json(
      { error: "Failed to retrieve conversation history." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/materials/[id]/chat
 *
 * Clears conversation history for the student on this document.
 * Does NOT delete the document or its chunks.
 */
export async function DELETE(request, { params }) {
  const resolvedParams = await params;
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

    const { id } = resolvedParams;
    const idValidation = objectIdSchema.safeParse(id);
    if (!idValidation.success) {
      return Response.json({ error: "Invalid material identifier format" }, { status: 400 });
    }

    await connectDB();

    // Verify ownership
    const material = await Material.findOne({ _id: id, userId: user.id });
    if (!material) {
      return Response.json(
        { error: "Study material not found or access denied." },
        { status: 404 }
      );
    }

    const result = await ChatMessage.deleteMany({
      userId: user.id,
      materialId: id,
    });

    return Response.json({
      message: "Chat history cleared successfully.",
      deletedCount: result.deletedCount || 0,
    });
  } catch (err) {
    console.error(`[DELETE /api/materials/${resolvedParams?.id}/chat] Error:`, err.message);
    return Response.json(
      { error: "Failed to clear conversation history." },
      { status: 500 }
    );
  }
}
