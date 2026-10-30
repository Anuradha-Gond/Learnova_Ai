import mongoose from "mongoose";
import { connectDB } from "@/lib/db/index.js";
import Material from "@/models/Material.js";
import StorageReservation from "@/models/StorageReservation.js";
import { requireAuth, AuthError } from "@/lib/auth/server.js";
import {
  uploadFile,
  deleteFile,
  buildStorageKey,
  isStorageConfigured,
  STORAGE_CONFIG,
} from "@/lib/storage/index.js";
import {
  validateUploadFile,
  validateFileSignature,
  sanitizeFilename,
} from "@/services/documentService.js";
import { materialListQuerySchema } from "@/validations/materials.js";
import {
  reserveStorageCapacity,
  commitStorageReservation,
  releaseStorageReservation,
  releaseStorageOnDelete,
  getStorageUsage,
} from "@/services/storageQuotaService.js";

/**
 * POST /api/materials
 *
 * Handles authenticated document upload.
 * 1. Authenticates current student via server session.
 * 2. Parses multipart/form-data safely.
 * 3. Validates file size (20 MB max), allowed extensions (pdf, txt), and file signatures.
 * 4. Generates unique scoped storage key: users/{userId}/documents/{materialId}.{ext}
 * 5. Uploads file buffer to private R2/S3 bucket.
 * 6. Creates Material document in MongoDB Atlas.
 * 7. Performs automatic storage rollback if database write fails.
 * 8. Never exposes internal storage credentials or secrets.
 */
export async function POST(request) {
  let storageKey = null;

  try {
    // 1. Authenticate user
    let user;
    try {
      user = await requireAuth();
    } catch (err) {
      if (err instanceof AuthError) {
        return err.toResponse();
      }
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }

    // 2. Parse multipart form data
    let formData;
    try {
      formData = await request.formData();
    } catch {
      return Response.json(
        { error: "Invalid form data. Please upload using multipart/form-data." },
        { status: 400 }
      );
    }

    const file = formData.get("file");
    if (!file || typeof file === "string") {
      return Response.json(
        { error: "No document file provided for upload." },
        { status: 400 }
      );
    }

    // 3. Client & server file size and extension validation
    const fileValidation = validateUploadFile({
      name: file.name,
      size: file.size,
    });

    if (!fileValidation.valid) {
      const isSizeError = fileValidation.error.includes("20 MB");
      return Response.json(
        { error: fileValidation.error },
        { status: isSizeError ? 413 : 415 }
      );
    }

    const extension = fileValidation.extension;
    const sanitizedName = sanitizeFilename(file.name);
    const customTitle = formData.get("title");
    const title =
      typeof customTitle === "string" && customTitle.trim()
        ? customTitle.trim().substring(0, 200)
        : sanitizedName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 4. File signature inspection (prevent file spoofing)
    const signatureCheck = validateFileSignature(buffer, extension);
    if (!signatureCheck.valid) {
      return Response.json(
        { error: signatureCheck.error },
        { status: 415 }
      );
    }

    // 5. Generate collision-resistant unique material ID & storage key
    const materialId = new mongoose.Types.ObjectId();
    storageKey = buildStorageKey(user.id, materialId.toString(), extension);

    // Determine content type
    const contentType =
      extension === "pdf" ? "application/pdf" : "text/plain; charset=utf-8";

    // 6. Check storage configuration
    if (!isStorageConfigured()) {
      return Response.json(
        {
          error:
            "Private object storage is not configured or contains placeholder credentials. Please verify your Cloudflare R2 environment variables in .env.local before uploading documents.",
        },
        { status: 503 }
      );
    }

    // 7. Atomically reserve storage quota capacity
    await connectDB();
    const reservation = await reserveStorageCapacity({
      userId: user.id,
      fileSizeBytes: file.size,
      storageKey,
    });

    if (!reservation.success) {
      if (reservation.reason === "FILE_TOO_LARGE") {
        return Response.json(
          { error: "File exceeds 20 MB limit." },
          { status: 413 }
        );
      }
      if (reservation.reason === "QUOTA_EXCEEDED") {
        return Response.json(
          {
            error:
              "Application storage quota exceeded (8.5 GB limit). Capacity is full; cannot upload new files.",
            code: "STORAGE_QUOTA_EXCEEDED",
          },
          { status: 413 }
        );
      }
      return Response.json(
        { error: "Failed to allocate storage capacity. Please try again." },
        { status: 500 }
      );
    }

    const reservationId = reservation.reservationId;

    // 8. Upload file to private R2 bucket
    try {
      await uploadFile({
        storageKey,
        body: buffer,
        contentType,
        metadata: {
          userId: user.id,
          materialId: materialId.toString(),
          originalFilename: sanitizedName,
        },
      });
    } catch (uploadErr) {
      console.error("[POST /api/materials] Storage upload failed:", uploadErr.message);
      // Release reservation on upload failure
      try {
        await releaseStorageReservation(reservationId, "upload_failed");
      } catch (relErr) {
        console.error("[POST /api/materials] Failed to release reservation:", relErr.message);
      }
      return Response.json(
        {
          error:
            "Failed to upload document to private storage. Please verify that your Cloudflare R2 credentials and bucket permissions are valid.",
        },
        { status: 502 }
      );
    }

    // 9. Commit the storage reservation before creating Material record
    // Verifies that the reservation has not expired and locks capacity into usedBytes
    const commitResult = await commitStorageReservation(reservationId, {
      materialId,
    });

    if (!commitResult.success) {
      console.warn(
        `[POST /api/materials] Reservation commit failed for material ${materialId} (${commitResult.reason}). Rolling back upload.`
      );
      try {
        await deleteFile(storageKey);
      } catch (cleanupErr) {
        console.error(
          `[CRITICAL ROLLBACK FAILURE] Failed to remove storage object: ${storageKey}`,
          cleanupErr.message
        );
      }
      return Response.json(
        {
          error:
            "Upload took too long and the storage reservation expired. Please try uploading again.",
          code: commitResult.reason || "RESERVATION_EXPIRED",
        },
        { status: 409 }
      );
    }

    // 10. Persist document metadata in MongoDB
    let material;
    try {
      material = await Material.create({
        _id: materialId,
        userId: user.id,
        title,
        originalFilename: sanitizedName,
        fileType: extension,
        fileSizeBytes: file.size,
        storageKey,
        processingStatus: "pending",
      });
    } catch (dbErr) {
      // Scenario C & D: Check if Material was already persisted (e.g. timeout retry or duplicate key)
      const existingMaterial = await Material.findOne({ storageKey });
      if (existingMaterial) {
        console.warn(
          `[Upload Idempotency] Material already exists for storageKey ${storageKey}. Reusing existing record.`
        );
        material = existingMaterial;
      } else {
        // Rollback: delete storage object, mark reservation released, and release committed quota
        console.error(
          `[Upload Error] DB write failed for material ${materialId}. Initiating storage cleanup: ${storageKey}`
        );
        try {
          await deleteFile(storageKey);
          console.info(`[Upload Rollback] Successfully cleaned up storage object: ${storageKey}`);
        } catch (cleanupErr) {
          console.error(
            `[CRITICAL ROLLBACK FAILURE] Failed to remove storage object: ${storageKey}`,
            cleanupErr.message
          );
        }
        try {
          await StorageReservation.updateOne(
            { _id: reservationId },
            { $set: { status: "released", releaseReason: "material_creation_failed" } }
          );
        } catch (resErr) {
          console.error("[Upload Rollback] Failed to update reservation status:", resErr.message);
        }
        try {
          await releaseStorageOnDelete(file.size, storageKey);
        } catch (relErr) {
          console.error("[Upload Rollback] Failed to release quota:", relErr.message);
        }
        throw dbErr;
      }
    }

    // 11. Return safe response (no credentials or internal keys exposed)
    return Response.json(
      {
        message: "Material uploaded successfully",
        material: {
          id: material._id.toString(),
          title: material.title,
          originalFilename: material.originalFilename,
          fileType: material.fileType,
          fileSizeBytes: material.fileSizeBytes,
          processingStatus: material.processingStatus,
          createdAt: material.createdAt,
          updatedAt: material.updatedAt,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/materials] Unexpected upload error:", err.message);
    return Response.json(
      { error: "An unexpected error occurred while processing the upload. Please try again." },
      { status: 500 }
    );
  }
}

/**
 * GET /api/materials
 *
 * Retrieves the authenticated user's study materials.
 * - Enforces tenant isolation (returns only materials owned by the authenticated student).
 * - Supports client filtering (search, fileType, status, sort, order).
 */
export async function GET(request) {
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

    // Parse URL query parameters
    const { searchParams } = new URL(request.url);
    const queryResult = materialListQuerySchema.safeParse({
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 50,
      search: searchParams.get("search") || "",
      fileType: searchParams.get("fileType") || "all",
      status: searchParams.get("status") || "all",
      sort: searchParams.get("sort") || "createdAt",
      order: searchParams.get("order") || "desc",
    });

    if (!queryResult.success) {
      return Response.json(
        { error: "Invalid query parameters", details: queryResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { page, limit, search, fileType, status, sort, order } = queryResult.data;

    await connectDB();

    // Build user-scoped query
    const filter = { userId: user.id };

    if (fileType !== "all") {
      filter.fileType = fileType;
    }

    if (status !== "all") {
      filter.processingStatus = status;
    }

    if (search) {
      const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ title: searchRegex }, { originalFilename: searchRegex }];
    }

    const sortOrder = order === "asc" ? 1 : -1;
    const sortOptions = { [sort]: sortOrder };

    const [materials, totalCount, storageUsage] = await Promise.all([
      Material.find(filter)
        .sort(sortOptions)
        .skip((page - 1) * limit)
        .limit(limit)
        .select("-storageKey") // Do not expose private storageKey in public listing
        .lean(),
      Material.countDocuments(filter),
      getStorageUsage().catch(() => null),
    ]);

    const formattedMaterials = materials.map((m) => ({
      id: m._id.toString(),
      title: m.title,
      originalFilename: m.originalFilename,
      fileType: m.fileType,
      fileSizeBytes: m.fileSizeBytes,
      processingStatus: m.processingStatus,
      processingError: m.processingError,
      pageCount: m.pageCount,
      chunkCount: m.chunkCount,
      wordCount: m.wordCount,
      topicTags: m.topicTags || [],
      summary: m.summary,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    }));

    return Response.json({
      materials: formattedMaterials,
      storage: storageUsage,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
    });
  } catch (err) {
    console.error("[GET /api/materials] Error listing materials:", err.message);
    return Response.json(
      { error: "Failed to retrieve study materials. Please try again." },
      { status: 500 }
    );
  }
}
