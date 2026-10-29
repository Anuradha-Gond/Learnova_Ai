import { z } from "zod";
import { objectIdSchema } from "./common.js";

/**
 * Quiz Validation Schemas
 *
 * Validates quiz generation parameters, submission answers, and IDs.
 */

export const quizGenerationSchema = z.object({
  questionCount: z.coerce
    .number()
    .int()
    .refine((val) => [5, 10, 15].includes(val), {
      message: "Question count must be 5, 10, or 15",
    })
    .default(5),
  difficulty: z
    .enum(["easy", "medium", "hard", "beginner", "intermediate", "advanced", "mixed"])
    .transform((val) => {
      const mapping = {
        beginner: "easy",
        intermediate: "medium",
        advanced: "hard",
      };
      return mapping[val] || val;
    })
    .default("medium"),
  questionTypes: z
    .array(z.enum(["MCQ", "TRUE_FALSE", "SHORT_ANSWER"]))
    .min(1, "At least one question type must be selected")
    .default(["MCQ"]),
  title: z.string().trim().max(200).optional(),
});

export const quizSubmissionAnswerSchema = z.object({
  questionId: z.string().trim().min(1, "questionId is required"),
  selectedOptionId: z.string().trim().nullable().optional(),
  answerText: z.string().trim().max(2000).optional().default(""),
});

export const quizSubmissionSchema = z.object({
  submittedAnswers: z
    .array(quizSubmissionAnswerSchema)
    .min(1, "At least one answer must be submitted"),
  idempotencyKey: z.string().trim().max(100).optional(),
  durationSeconds: z.coerce.number().int().min(0).max(86400).optional(),
});

export const quizIdParamSchema = z.object({
  id: objectIdSchema,
});
