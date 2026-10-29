import { requireAuth, AuthError } from "@/lib/auth/server.js";
import { getStudentHistory } from "@/services/historyService.js";

/**
 * GET /api/history
 *
 * Retrieves the authenticated student's learning history:
 *  - Unified chronological activity timeline
 *  - Past quiz attempts & scores
 *  - Uploaded study materials
 *  - Completed revision recommendations
 *
 * All records are strictly scoped to the authenticated user.
 */
export async function GET(request) {
  try {
    let user;
    try {
      user = await requireAuth();
    } catch (authErr) {
      if (authErr instanceof AuthError) {
        return authErr.toResponse();
      }
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const historyData = await getStudentHistory(user.id, { limit });

    return Response.json({
      success: true,
      ...historyData,
    });
  } catch (err) {
    console.error("[GET /api/history] Error:", err.message);
    return Response.json(
      { error: "Failed to retrieve student learning history." },
      { status: 500 }
    );
  }
}
