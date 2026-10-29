import { z } from "zod";
import { connectDB } from "@/lib/db/index.js";
import User from "@/models/User.js";

/**
 * POST /api/auth/register
 *
 * Registers a new student account.
 * - Validates input with Zod
 * - Normalizes email to lowercase
 * - Hashes password via User model pre-save hook
 * - Returns 409 if email already exists (unique index violation)
 * - Never returns the password hash
 */

const RegisterSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be 100 characters or fewer"),
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address")
    .toLowerCase(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be 128 characters or fewer"),
});

export async function POST(request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { error: "Request body must be valid JSON" },
        { status: 400 }
      );
    }

    // Validate
    const result = RegisterSchema.safeParse(body);
    if (!result.success) {
      return Response.json(
        {
          error: "Validation failed",
          details: result.error.flatten().fieldErrors,
        },
        { status: 422 }
      );
    }

    const { name, email, password } = result.data;

    await connectDB();

    // Check for existing user BEFORE creating, to return a clear 409
    const existing = await User.findOne({ email });
    if (existing) {
      return Response.json(
        { error: "An account with this email address already exists" },
        { status: 409 }
      );
    }

    // Create user — password is hashed by the pre-save hook in User model
    const user = await User.create({ name, email, password });

    // Return safe fields only
    return Response.json(
      {
        message: "Account created successfully",
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    // Mongoose duplicate key error (race condition fallback)
    if (err.code === 11000) {
      return Response.json(
        { error: "An account with this email address already exists" },
        { status: 409 }
      );
    }

    console.error("[/api/auth/register] Unexpected error:", err.message);
    return Response.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
