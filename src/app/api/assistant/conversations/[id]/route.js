import { connectDB } from "@/lib/db/index.js";
import Conversation from "@/models/Conversation.js";
import { requireAuth, AuthError } from "@/lib/auth/server.js";
import { objectIdSchema } from "@/validations/common.js";
import { renameConversationSchema } from "@/validations/assistant.js";

/**
 * GET /api/assistant/conversations/[id]
 *
 * Retrieves a single conversation and its full message history.
 * Enforces ownership: only the owning student can access.
 */
export async function GET(request, { params }) {
  try {
    let user;
    try {
      user = await requireAuth();
    } catch (err) {
      if (err instanceof AuthError) return err.toResponse();
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }

    const { id } = await params;
    const idValidation = objectIdSchema.safeParse(id);
    if (!idValidation.success) {
      return Response.json({ error: "Invalid conversation identifier" }, { status: 400 });
    }

    await connectDB();

    const doc = await Conversation.findOne({ _id: id, userId: user.id }).lean();
    if (!doc) {
      return Response.json(
        { error: "Conversation not found or access denied." },
        { status: 404 }
      );
    }

    const formattedMessages = (doc.messages || []).map((m) => ({
      id: m._id?.toString(),
      role: m.role,
      content: m.content,
      createdAt: m.createdAt,
    }));

    return Response.json({
      conversation: {
        id: doc._id.toString(),
        title: doc.title,
        messages: formattedMessages,
        updatedAt: doc.updatedAt,
        createdAt: doc.createdAt,
      },
    });
  } catch (err) {
    console.error("[GET /api/assistant/conversations/[id]] Error:", err.message);
    return Response.json(
      { error: "Failed to retrieve conversation." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/assistant/conversations/[id]
 *
 * Renames an existing conversation.
 * Enforces ownership: only the owning student can modify.
 */
export async function PATCH(request, { params }) {
  try {
    let user;
    try {
      user = await requireAuth();
    } catch (err) {
      if (err instanceof AuthError) return err.toResponse();
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }

    const { id } = await params;
    const idValidation = objectIdSchema.safeParse(id);
    if (!idValidation.success) {
      return Response.json({ error: "Invalid conversation identifier" }, { status: 400 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Request body must be valid JSON" }, { status: 400 });
    }

    const parsed = renameConversationSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues?.[0]?.message || "Invalid payload" },
        { status: 400 }
      );
    }

    await connectDB();

    const updated = await Conversation.findOneAndUpdate(
      { _id: id, userId: user.id },
      { title: parsed.data.title },
      { returnDocument: "after" }
    ).lean();

    if (!updated) {
      return Response.json(
        { error: "Conversation not found or access denied." },
        { status: 404 }
      );
    }

    return Response.json({
      conversation: {
        id: updated._id.toString(),
        title: updated.title,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (err) {
    console.error("[PATCH /api/assistant/conversations/[id]] Error:", err.message);
    return Response.json(
      { error: "Failed to rename conversation." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/assistant/conversations/[id]
 *
 * Deletes a conversation and all its messages.
 * Enforces ownership: only the owning student can delete.
 */
export async function DELETE(request, { params }) {
  try {
    let user;
    try {
      user = await requireAuth();
    } catch (err) {
      if (err instanceof AuthError) return err.toResponse();
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }

    const { id } = await params;
    const idValidation = objectIdSchema.safeParse(id);
    if (!idValidation.success) {
      return Response.json({ error: "Invalid conversation identifier" }, { status: 400 });
    }

    await connectDB();

    const deleted = await Conversation.findOneAndDelete({ _id: id, userId: user.id });
    if (!deleted) {
      return Response.json(
        { error: "Conversation not found or access denied." },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      message: "Conversation deleted successfully.",
    });
  } catch (err) {
    console.error("[DELETE /api/assistant/conversations/[id]] Error:", err.message);
    return Response.json(
      { error: "Failed to delete conversation." },
      { status: 500 }
    );
  }
}

