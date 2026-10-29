import { z } from "zod";
import { objectIdSchema } from "./common.js";

/**
 * Chat Validation Schemas
 *
 * Validates chat request payloads, query parameters, and identifiers
 * for student document Q&A assistant endpoints.
 */

export const chatMessageSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Question cannot be empty")
    .max(2000, "Question must be 2000 characters or fewer"),
  conversationId: z
    .string()
    .trim()
    .max(100, "Conversation ID must be 100 characters or fewer")
    .optional(),
});

export const chatHistoryQuerySchema = z.object({
  conversationId: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const materialChatParamSchema = z.object({
  id: objectIdSchema,
});
