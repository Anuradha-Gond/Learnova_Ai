import { z } from "zod";
import { objectIdSchema } from "./common.js";

/**
 * Validates request body for updating a revision recommendation status.
 */
export const recommendationStatusUpdateSchema = z.object({
  status: z.enum(["pending", "reviewed", "completed", "dismissed"], {
    errorMap: () => ({
      message: 'Status must be one of: "pending", "reviewed", "completed", "dismissed"',
    }),
  }),
});

/**
 * Validates query parameters for fetching recommendations.
 */
export const recommendationsQuerySchema = z.object({
  status: z.enum(["pending", "reviewed", "completed", "dismissed"]).optional(),
  materialId: objectIdSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const booleanQueryParam = z.preprocess(
  (val) => val === true || val === "true" || val === 1 || val === "1",
  z.boolean()
);

/**
 * Validates query parameters for weak topics analysis.
 */
export const weakTopicsQuerySchema = z.object({
  includeDeveloping: booleanQueryParam.default(false),
  all: booleanQueryParam.default(false),
});

/**
 * Validates recommendation ObjectId route parameter.
 */
export const recommendationIdParamSchema = z.object({
  id: objectIdSchema,
});
