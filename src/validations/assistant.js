import { z } from "zod";
import { objectIdSchema } from "./common.js";

/**
 * AI Learning Assistant Validation Schemas
 *
 * Enforces strict validation for assistant chat requests, conversation management,
 * and title renaming.
 */

export const assistantChatSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Message cannot be empty")
    .max(2000, "Message must be 2000 characters or fewer"),
  conversationId: objectIdSchema.optional().nullable(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "model", "assistant"]),
        parts: z.array(z.object({ text: z.string() })),
      })
    )
    .max(20)
    .optional()
    .default([]),
});

export const renameConversationSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title cannot be empty")
    .max(100, "Title must be 100 characters or fewer"),
});

export const createConversationSchema = z.object({
  title: z
    .string()
    .trim()
    .max(100, "Title must be 100 characters or fewer")
    .optional()
    .default("New Conversation"),
});

/**
 * Generates a clean, human-readable conversation title from the first user question.
 * Trims markdown, extra spaces, and trailing punctuation. Fallbacks to a safe default.
 *
 * @param {string} text
 * @returns {string}
 */
export function generateConversationTitle(text) {
  if (!text || typeof text !== "string") return "New Conversation";
  const clean = text
    .replace(/[#*`_~]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!clean) return "New Conversation";

  // Truncate to first 48 characters nicely on word boundary if possible
  if (clean.length <= 48) {
    return clean.replace(/[?!.,;:]+$/, "");
  }

  const truncated = clean.slice(0, 48);
  const lastSpace = truncated.lastIndexOf(" ");
  const base = lastSpace > 20 ? truncated.slice(0, lastSpace) : truncated;
  return base.replace(/[?!.,;:]+$/, "") + "…";
}

