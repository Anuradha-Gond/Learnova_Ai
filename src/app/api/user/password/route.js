import { connectDB } from "@/lib/db/index.js";
import User from "@/models/User.js";
import { requireAuth, AuthError } from "@/lib/auth/server.js";
import { passwordChangeSchema } from "@/validations/user.js";

/**
 * POST /api/user/password
 *
 * Updates student password after verifying their existing password.
 * New password is automatically hashed via the User model's pre-save hook.
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

    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON in request body." }, { status: 400 });
    }

    const parseResult = passwordChangeSchema.safeParse(body);
    if (!parseResult.success) {
      return Response.json(
        {
          error: "Invalid password data.",
          details: parseResult.error.format(),
        },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = parseResult.data;

    await connectDB();
    const userDoc = await User.findById(user.id).select("+password");

    if (!userDoc) {
      return Response.json({ error: "User account not found." }, { status: 404 });
    }

    const isMatch = await userDoc.comparePassword(currentPassword);
    if (!isMatch) {
      return Response.json(
        { error: "Current password is incorrect." },
        { status: 400 }
      );
    }

    // Set new password (pre('save') hook handles bcrypt hashing)
    userDoc.password = newPassword;
    await userDoc.save();

    return Response.json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (err) {
    console.error("[POST /api/user/password] Error:", err.message);
    return Response.json(
      { error: "Failed to update password." },
      { status: 500 }
    );
  }
}
