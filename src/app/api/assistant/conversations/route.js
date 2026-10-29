import { connectDB } from "@/lib/db/index.js";
import Conversation from "@/models/Conversation.js";
import { requireAuth, AuthError } from "@/lib/auth/server.js";
import { createConversationSchema } from "@/validations/assistant.js";

/**
 * GET /api/assistant/conversations
 *
 * Retrieves all conversations belonging to the authenticated student.
 * Sorted by most recently updated first.
 */
export async function GET() {
  try {
    let user;
    try {
      user = await requireAuth();
    } catch (err) {
      if (err instanceof AuthError) return err.toResponse();
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }

    await connectDB();

    const docs = await Conversation.find({ userId: user.id })
      .sort({ updatedAt: -1 })
      .select("title updatedAt createdAt messages")
      .lean();

    const conversations = docs.map((c) => ({
      id: c._id.toString(),
      title: c.title,
      messageCount: c.messages?.length || 0,
      lastMessage: c.messages?.[c.messages.length - 1]?.content || "",
      updatedAt: c.updatedAt,
      createdAt: c.createdAt,
    }));

    return Response.json({ conversations });
  } catch (err) {
    console.error("[GET /api/assistant/conversations] Error:", err.message);
    return Response.json(
      { error: "Failed to retrieve conversation history." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/assistant/conversations
 *
 * Explicitly creates a new conversation for the authenticated student.
 */
export async function POST(request) {
  try {
    let user;
    try {
      user = await requireAuth();
    } catch (err) {
      if (err instanceof AuthError) return err.toResponse();
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }

    let body = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is acceptable; defaults to "New Conversation"
    }

    const parsed = createConversationSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues?.[0]?.message || "Invalid payload" },
        { status: 400 }
      );
    }

    await connectDB();

    const doc = await Conversation.create({
      userId: user.id,
      title: parsed.data.title || "New Conversation",
      messages: [],
    });

    return Response.json(
      {
        conversation: {
          id: doc._id.toString(),
          title: doc.title,
          messages: [],
          updatedAt: doc.updatedAt,
          createdAt: doc.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/assistant/conversations] Error:", err.message);
    return Response.json(
      { error: "Failed to create conversation." },
      { status: 500 }
    );
  }
}

