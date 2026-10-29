import { requireAuth, AuthError } from "@/lib/auth/server.js";
import {
  getRecommendations,
  generateRecommendations,
} from "@/services/analyticsService.js";
import { recommendationsQuerySchema } from "@/validations/analytics.js";

/**
 * GET /api/analytics/recommendations
 *
 * Retrieves personalized revision recommendations for the authenticated student.
 * Supports filtering by status ("pending", "reviewed", "completed", "dismissed")
 * and materialId.
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
    const queryParams = {
      status: searchParams.get("status") || undefined,
      materialId: searchParams.get("materialId") || undefined,
      limit: searchParams.get("limit") || undefined,
    };

    const parseResult = recommendationsQuerySchema.safeParse(queryParams);
    if (!parseResult.success) {
      return Response.json(
        {
          error: "Invalid query parameters.",
          details: parseResult.error.format(),
        },
        { status: 400 }
      );
    }

    // If auto-generation requested or explicit trigger
    if (searchParams.get("autoGenerate") === "true") {
      await generateRecommendations(user.id);
    }

    const recommendations = await getRecommendations(user.id, parseResult.data);

    return Response.json({
      recommendations,
      totalCount: recommendations.length,
    });
  } catch (err) {
    console.error("[GET /api/analytics/recommendations] Error:", err.message);
    return Response.json(
      { error: "Failed to retrieve revision recommendations." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/analytics/recommendations
 *
 * Explicitly triggers idempotent revision recommendation generation for weak topics.
 * Avoids duplicate active recommendations and preserves reviewed/completed/dismissed cards.
 */
export async function POST(request) {
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

    const result = await generateRecommendations(user.id);
    const recommendations = await getRecommendations(user.id);

    return Response.json({
      message: "Recommendations generated successfully.",
      created: result.created,
      skipped: result.skipped,
      recommendations,
      totalCount: recommendations.length,
    });
  } catch (err) {
    console.error("[POST /api/analytics/recommendations] Error:", err.message);
    return Response.json(
      { error: "Failed to generate revision recommendations." },
      { status: 500 }
    );
  }
}
