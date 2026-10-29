import { z } from "zod";
import { objectIdSchema } from "./common.js";

/**
 * Validates query parameters for listing materials (GET /api/materials).
 */
export const materialListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().trim().max(100).optional().default(""),
  fileType: z.enum(["all", "pdf", "txt"]).optional().default("all"),
  status: z.enum(["all", "pending", "processing", "ready", "failed"]).optional().default("all"),
  sort: z.enum(["createdAt", "updatedAt", "title", "fileSizeBytes"]).optional().default("createdAt"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
});

/**
 * Validates document ID route parameter.
 */
export const materialIdParamSchema = z.object({
  id: objectIdSchema,
});

/**
 * Validates updating material title.
 */
export const materialUpdateSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title cannot be empty")
    .max(200, "Title must be 200 characters or fewer"),
});
