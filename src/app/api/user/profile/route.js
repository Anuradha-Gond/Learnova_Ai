import { connectDB } from "@/lib/db/index.js";
import User from "@/models/User.js";
import { requireAuth, AuthError } from "@/lib/auth/server.js";
import { profileUpdateSchema } from "@/validations/user.js";

/**
 * GET /api/user/profile
 *
 * Retrieves the authenticated user's profile information.
 */
export async function GET(request) {
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

    await connectDB();
    const userDoc = await User.findById(user.id)
      .select("name email role academicLevel targetExam createdAt updatedAt")
      .lean();

    if (!userDoc) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    return Response.json({
      user: {
        id: userDoc._id.toString(),
        name: userDoc.name,
        email: userDoc.email,
        role: userDoc.role,
        academicLevel: userDoc.academicLevel || "",
        targetExam: userDoc.targetExam || "",
        createdAt: userDoc.createdAt,
        updatedAt: userDoc.updatedAt,
      },
    });
  } catch (err) {
    console.error("[GET /api/user/profile] Error:", err.message);
    return Response.json(
      { error: "Failed to retrieve user profile." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/user/profile
 *
 * Safely updates editable student profile fields (name, academicLevel, targetExam).
 * Rejects any client attempt to modify protected fields like role, email, password, or isActive.
 */
export async function PATCH(request) {
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

    // Explicit rejection of protected field tampering
    const protectedFields = ["role", "email", "password", "_id", "isActive"];
    const foundProtected = protectedFields.filter((f) => f in body);
    if (foundProtected.length > 0) {
      return Response.json(
        {
          error: `Cannot modify protected fields: ${foundProtected.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const parseResult = profileUpdateSchema.safeParse(body);
    if (!parseResult.success) {
      return Response.json(
        {
          error: "Invalid profile data.",
          details: parseResult.error.format(),
        },
        { status: 400 }
      );
    }

    await connectDB();

    const updateFields = {};
    if (parseResult.data.name !== undefined) {
      updateFields.name = parseResult.data.name;
    }
    if (parseResult.data.academicLevel !== undefined) {
      updateFields.academicLevel = parseResult.data.academicLevel || "";
    }
    if (parseResult.data.targetExam !== undefined) {
      updateFields.targetExam = parseResult.data.targetExam || "";
    }

    const updated = await User.findByIdAndUpdate(
      user.id,
      { $set: updateFields },
      { new: true, runValidators: true }
    )
      .select("name email role academicLevel targetExam createdAt updatedAt")
      .lean();

    if (!updated) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    return Response.json({
      success: true,
      user: {
        id: updated._id.toString(),
        name: updated.name,
        email: updated.email,
        role: updated.role,
        academicLevel: updated.academicLevel || "",
        targetExam: updated.targetExam || "",
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (err) {
    console.error("[PATCH /api/user/profile] Error:", err.message);
    return Response.json(
      { error: "Failed to update profile." },
      { status: 500 }
    );
  }
}
