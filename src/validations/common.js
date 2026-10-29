import { z } from "zod";

/**
 * Validates a standard 24-character hex MongoDB ObjectId string.
 */
export const objectIdSchema = z
  .string()
  .trim()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid unique identifier format");

/**
 * Validates standard pagination query parameters.
 */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional().default(""),
  sort: z.enum(["createdAt", "updatedAt", "title", "score"]).optional().default("createdAt"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
});

/**
 * Validates standard study material status filters.
 */
export const statusFilterSchema = z
  .enum(["all", "pending", "processing", "ready", "failed"])
  .default("all");
