import { requireAuth, AuthError } from "@/lib/auth/server.js";
import {
  getStorageUsage,
  reconcileStorageQuota,
  auditR2Storage,
} from "@/services/storageQuotaService.js";
import { isStorageConfigured } from "@/lib/storage/index.js";

/**
 * GET /api/materials/storage
 *
 * Retrieves current storage quota usage, remaining capacity, and limit constants.
 * Scoped to authenticated users.
 */
export async function GET() {
  try {
    try {
      await requireAuth();
    } catch (err) {
      if (err instanceof AuthError) {
        return err.toResponse();
      }
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }

    const usage = await getStorageUsage();

    return Response.json({
      storage: {
        ...usage,
        storageConfigured: isStorageConfigured(),
      },
    });
  } catch (err) {
    console.error("[GET /api/materials/storage] Error:", err.message);
    return Response.json(
      { error: "Failed to retrieve storage quota usage." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/materials/storage
 *
 * Triggers a storage reconciliation check. Reconciles database tracked bytes
 * against actual Material records and active reservations.
 * If audit=true query param is present, also audits physical R2 objects.
 */
export async function POST(request) {
  try {
    try {
      await requireAuth();
    } catch (err) {
      if (err instanceof AuthError) {
        return err.toResponse();
      }
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeAudit = searchParams.get("audit") === "true";

    const reconciled = await reconcileStorageQuota();
    let auditReport = null;

    if (includeAudit) {
      auditReport = await auditR2Storage();
    }

    return Response.json({
      message: "Storage quota reconciled successfully.",
      reconciled,
      audit: auditReport,
    });
  } catch (err) {
    console.error("[POST /api/materials/storage] Reconciliation error:", err.message);
    return Response.json(
      { error: "Failed to reconcile storage quota." },
      { status: 500 }
    );
  }
}

