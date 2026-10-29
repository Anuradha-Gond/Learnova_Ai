import { requireAuth, AuthError } from "@/lib/auth/server.js";
import { getWeakTopics } from "@/services/analyticsService.js";
import { weakTopicsQuerySchema } from "@/validations/analytics.js";

/**
 * GET /api/analytics/weak-topics
 *
 * Retrieves weak topics for the authenticated student:
 *  - Below 40%: Critical
 *  - 40% to below 70%: Weak
 *  - Identifies topics below 70% as weak topics
 *  - Includes material association, diagnostic reasons, and suggested actions
 *  - Sorted by urgency (critical first, then weak, then lowest mastery score)
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
    const parseResult = weakTopicsQuerySchema.safeParse({
      includeDeveloping: searchParams.get("includeDeveloping") === "true",
      all: searchParams.get("all") === "true",
    });

    const queryOpts = parseResult.success ? parseResult.data : {};
    const weakTopics = await getWeakTopics(user.id, queryOpts);

    return Response.json({
      weakTopics,
      totalCount: weakTopics.length,
    });
  } catch (err) {
    console.error("[GET /api/analytics/weak-topics] Error:", err.message);
    return Response.json(
      { error: "Failed to retrieve weak-topic diagnostics." },
      { status: 500 }
    );
  }
}
