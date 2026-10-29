import { z } from "zod";

/**
 * Validates updates to safe user profile fields.
 * Protected fields like role, email, password, and isActive are strictly excluded.
 */
export const profileUpdateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or fewer")
    .optional(),
  academicLevel: z
    .string()
    .trim()
    .max(100, "Academic level must be 100 characters or fewer")
    .optional()
    .nullable(),
  targetExam: z
    .string()
    .trim()
    .max(100, "Target exam must be 100 characters or fewer")
    .optional()
    .nullable(),
});

/**
 * Validates password modification requests.
 */
export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters long")
    .max(128, "Password must not exceed 128 characters"),
});
