import { requireAuth, AuthError } from "@/lib/auth/server.js";
import { getOverviewMetrics } from "@/services/analyticsService.js";

/**
 * GET /api/analytics/overview
 *
 * Retrieves aggregate learning analytics for the authenticated student:
 *  - totalMaterials
 *  - completedQuizzes (quizzesCompleted)
 *  - averageQuizScore
 *  - totalQuestionsAnswered
 *  - overallAccuracy
 *  - masteredTopics
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

    const metrics = await getOverviewMetrics(user.id);

    return Response.json({
      overview: metrics,
      ...metrics,
    });
  } catch (err) {
    console.error("[GET /api/analytics/overview] Error:", err.message);
    return Response.json(
      { error: "Failed to retrieve learning analytics overview." },
      { status: 500 }
    );
  }
}
