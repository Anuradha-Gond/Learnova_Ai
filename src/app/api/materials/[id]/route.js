import { connectDB } from "@/lib/db/index.js";
import Material from "@/models/Material.js";
import MaterialChunk from "@/models/MaterialChunk.js";
import { requireAuth, AuthError } from "@/lib/auth/server.js";
import {
  deleteFile,
  getSignedDownloadUrl,
  getFileText,
  isStorageConfigured,
} from "@/lib/storage/index.js";
import { objectIdSchema } from "@/validations/common.js";
import { materialUpdateSchema } from "@/validations/materials.js";

/**
 * GET /api/materials/[id]
 *
 * Retrieves a single study material owned by the authenticated student.
 * - Enforces strict tenant isolation (returns 404 if material belongs to another student).
 * - Generates a time-limited (15-min) presigned download/preview URL only after ownership check.
 * - For TXT files, safely reads plain text content for inline rendering.
 * - Never exposes storage credentials or permanent object URLs.
 */
export async function GET(request, { params }) {
  try {
    let user;
    try {
      user = await requireAuth();
    } catch (err) {
      if (err instanceof AuthError) {
        return err.toResponse();
      }
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }

    const { id } = params;
    const idValidation = objectIdSchema.safeParse(id);
    if (!idValidation.success) {
      return Response.json({ error: "Invalid material identifier" }, { status: 400 });
    }

    await connectDB();

    // Query scoped strictly to the authenticated student
    const material = await Material.findOne({ _id: id, userId: user.id });
    if (!material) {
      return Response.json(
        { error: "Study material not found or access denied." },
        { status: 404 }
      );
    }

    let previewUrl = null;
    let textContent = null;

    if (isStorageConfigured()) {
      try {
        previewUrl = await getSignedDownloadUrl(material.storageKey, 900); // 15 mins
      } catch (storageErr) {
        console.error(`[GET /api/materials/${id}] Error generating presigned URL:`, storageErr.message);
      }

      if (material.fileType === "txt") {
        try {
          textContent = await getFileText(material.storageKey, 512 * 1024);
        } catch (txtErr) {
          console.error(`[GET /api/materials/${id}] Error reading text content:`, txtErr.message);
        }
      }
    }

    return Response.json({
      material: {
        id: material._id.toString(),
        title: material.title,
        originalFilename: material.originalFilename,
        fileType: material.fileType,
        fileSizeBytes: material.fileSizeBytes,
        processingStatus: material.processingStatus,
        processingError: material.processingError,
        pageCount: material.pageCount,
        chunkCount: material.chunkCount,
        wordCount: material.wordCount,
        topicTags: material.topicTags || [],
        summary: material.summary,
        createdAt: material.createdAt,
        updatedAt: material.updatedAt,
      },
      previewUrl,
      textContent,
      storageConfigured: isStorageConfigured(),
    });
  } catch (err) {
    console.error(`[GET /api/materials/[id]] Unexpected error:`, err.message);
    return Response.json(
      { error: "An unexpected error occurred while retrieving the document." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/materials/[id]
 *
 * Securely deletes a study material and its private storage object.
 * 1. Authenticates student and verifies document ownership.
 * 2. Deletes physical file from private R2/S3 storage first.
 * 3. Removes Material record and any child MaterialChunk records from MongoDB.
 * 4. Ensures idempotent and safe error handling.
 */
export async function DELETE(request, { params }) {
  try {
    let user;
    try {
      user = await requireAuth();
    } catch (err) {
      if (err instanceof AuthError) {
        return err.toResponse();
      }
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }

    const { id } = params;
    const idValidation = objectIdSchema.safeParse(id);
    if (!idValidation.success) {
      return Response.json({ error: "Invalid material identifier" }, { status: 400 });
    }

    await connectDB();

    // Verify ownership before any deletion
    const material = await Material.findOne({ _id: id, userId: user.id });
    if (!material) {
      return Response.json(
        { error: "Study material not found or access denied." },
        { status: 404 }
      );
    }

    // 1. Delete object from private storage bucket
    if (isStorageConfigured()) {
      try {
        await deleteFile(material.storageKey);
      } catch (storageErr) {
        console.error(
          `[DELETE /api/materials/${id}] Storage deletion failed for key ${material.storageKey}:`,
          storageErr.message
        );
        return Response.json(
          { error: "Failed to delete document from storage. Please try again." },
          { status: 500 }
        );
      }
    }

    // 2. Remove database record and any chunks
    await Promise.all([
      Material.deleteOne({ _id: id, userId: user.id }),
      MaterialChunk.deleteMany({ materialId: id }),
    ]);

    return Response.json({
      message: "Study material deleted successfully.",
      id,
    });
  } catch (err) {
    console.error(`[DELETE /api/materials/[id]] Unexpected error:`, err.message);
    return Response.json(
      { error: "An unexpected error occurred during document deletion." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/materials/[id]
 *
 * Allows renaming a study material title.
 */
export async function PATCH(request, { params }) {
  try {
    let user;
    try {
      user = await requireAuth();
    } catch (err) {
      if (err instanceof AuthError) {
        return err.toResponse();
      }
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }

    const { id } = params;
    const idValidation = objectIdSchema.safeParse(id);
    if (!idValidation.success) {
      return Response.json({ error: "Invalid material identifier" }, { status: 400 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const result = materialUpdateSchema.safeParse(body);
    if (!result.success) {
      return Response.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    await connectDB();

    const updated = await Material.findOneAndUpdate(
      { _id: id, userId: user.id },
      { $set: { title: result.data.title } },
      { new: true }
    );

    if (!updated) {
      return Response.json(
        { error: "Study material not found or access denied." },
        { status: 404 }
      );
    }

    return Response.json({
      message: "Material title updated successfully.",
      material: {
        id: updated._id.toString(),
        title: updated.title,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (err) {
    console.error(`[PATCH /api/materials/[id]] Unexpected error:`, err.message);
    return Response.json(
      { error: "An unexpected error occurred while updating the document title." },
      { status: 500 }
    );
  }
}
