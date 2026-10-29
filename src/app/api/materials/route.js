import mongoose from "mongoose";
import { connectDB } from "@/lib/db/index.js";
import Material from "@/models/Material.js";
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

/**
 * POST /api/materials
 *
 * Handles authenticated document upload.
 * 1. Authenticates current student via server session.
 * 2. Parses multipart/form-data safely.
 * 3. Validates file size (15 MB max), allowed extensions (pdf, txt), and file signatures.
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
      const isSizeError = fileValidation.error.includes("15 MB");
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

    // 6. Check storage configuration and upload to private bucket
    if (!isStorageConfigured()) {
      return Response.json(
        {
          error:
            "Private object storage is not configured or contains placeholder credentials. Please verify your Cloudflare R2 environment variables in .env.local before uploading documents.",
        },
        { status: 503 }
      );
    }

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
      return Response.json(
        {
          error:
            "Failed to upload document to private storage. Please verify that your Cloudflare R2 credentials and bucket permissions are valid.",
        },
        { status: 502 }
      );
    }

    // 7. Persist document metadata in MongoDB
    await connectDB();

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
      // Rollback: delete orphaned storage object if database write fails
      console.error(
        `[Upload Error] DB write failed for material ${materialId}. Initiating storage cleanup: ${storageKey}`
      );
      try {
        await deleteFile(storageKey);
        console.info(`[Upload Rollback] Successfully cleaned up orphaned storage object: ${storageKey}`);
      } catch (cleanupErr) {
        console.error(
          `[CRITICAL ROLLBACK FAILURE] Failed to remove orphaned storage object: ${storageKey}`,
          cleanupErr.message
        );
      }
      throw dbErr;
    }

    // 8. Return safe response (no credentials or internal keys exposed)
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

    const [materials, totalCount] = await Promise.all([
      Material.find(filter)
        .sort(sortOptions)
        .skip((page - 1) * limit)
        .limit(limit)
        .select("-storageKey") // Do not expose private storageKey in public listing
        .lean(),
      Material.countDocuments(filter),
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
