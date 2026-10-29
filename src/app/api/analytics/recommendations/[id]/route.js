import { requireAuth, AuthError } from "@/lib/auth/server.js";
import { updateRecommendationStatus } from "@/services/analyticsService.js";
import {
  recommendationIdParamSchema,
  recommendationStatusUpdateSchema,
} from "@/validations/analytics.js";

/**
 * PATCH /api/analytics/recommendations/[id]
 *
 * Updates the status of a revision recommendation ("pending", "reviewed", "completed", "dismissed").
 * Strictly enforces user ownership and validates status values.
 */
export async function PATCH(request, { params }) {
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

    // 1. Validate route parameter ID
    const paramResult = recommendationIdParamSchema.safeParse(params);
    if (!paramResult.success) {
      return Response.json(
        { error: "Invalid recommendation identifier format." },
        { status: 400 }
      );
    }

    // 2. Validate request body
    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { error: "Invalid JSON in request body." },
        { status: 400 }
      );
    }

    const bodyResult = recommendationStatusUpdateSchema.safeParse(body);
    if (!bodyResult.success) {
      return Response.json(
        {
          error: "Invalid request payload.",
          details: bodyResult.error.format(),
        },
        { status: 400 }
      );
    }

    // 3. Update status with ownership isolation
    try {
      const updated = await updateRecommendationStatus(
        paramResult.data.id,
        user.id,
        bodyResult.data.status
      );

      return Response.json({
        success: true,
        recommendation: updated,
      });
    } catch (serviceErr) {
      if (serviceErr.code === "NOT_FOUND") {
        return Response.json(
          { error: "Recommendation not found or access denied." },
          { status: 404 }
        );
      }
      if (serviceErr.code === "INVALID_STATUS") {
        return Response.json(
          { error: serviceErr.message },
          { status: 400 }
        );
      }
      throw serviceErr;
    }
  } catch (err) {
    console.error("[PATCH /api/analytics/recommendations/:id] Error:", err.message);
    return Response.json(
      { error: "Failed to update recommendation status." },
      { status: 500 }
    );
  }
}
