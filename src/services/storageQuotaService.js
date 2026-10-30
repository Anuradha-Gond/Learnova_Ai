import { connectDB } from "../lib/db/index.js";
import StorageQuota from "../models/StorageQuota.js";
import StorageReservation from "../models/StorageReservation.js";
import Material from "../models/Material.js";
import { listR2Objects, isStorageConfigured } from "../lib/storage/index.js";

export const MAX_FILE_SIZE_BYTES = 20_000_000; // 20 MB decimal
export const MAX_TOTAL_STORAGE_BYTES = 8_500_000_000; // 8.5 GB decimal
export const RESERVATION_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes TTL

const GLOBAL_QUOTA_ID = "global_storage_quota";

/**
 * Initializes or retrieves the singleton StorageQuota document.
 * If not present, computes initial usedBytes from existing Material records.
 *
 * @returns {Promise<import("mongoose").Document>}
 */
export async function initializeOrGetQuota() {
  await connectDB();

  let quota = await StorageQuota.findById(GLOBAL_QUOTA_ID);
  if (!quota) {
    // Calculate existing usage from Material collection
    const [matAgg] = await Material.aggregate([
      { $group: { _id: null, totalBytes: { $sum: "$fileSizeBytes" } } },
    ]);
    const initialUsedBytes = matAgg?.totalBytes || 0;

    // Calculate any active reserved bytes
    const [resAgg] = await StorageReservation.aggregate([
      {
        $match: {
          status: "reserved",
          expiresAt: { $gt: new Date() },
        },
      },
      { $group: { _id: null, totalReserved: { $sum: "$fileSizeBytes" } } },
    ]);
    const initialReservedBytes = resAgg?.totalReserved || 0;

    quota = await StorageQuota.findOneAndUpdate(
      { _id: GLOBAL_QUOTA_ID },
      {
        $setOnInsert: {
          _id: GLOBAL_QUOTA_ID,
          maxStorageBytes: MAX_TOTAL_STORAGE_BYTES,
          usedBytes: initialUsedBytes,
          reservedBytes: initialReservedBytes,
          lastReconciledAt: new Date(),
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
  }

  return quota;
}

/**
 * Sweeps and expires stale reservations that have passed their TTL.
 * Deducts their byte count from the reservedBytes pool.
 *
 * @returns {Promise<{ expiredCount: number, releasedBytes: number }>}
 */
export async function expireStaleReservations() {
  await connectDB();

  const now = new Date();
  const quotaDoc = await StorageQuota.findById(GLOBAL_QUOTA_ID);
  const activeIdsSet = new Set(quotaDoc?.activeReservations || []);

  let totalReleased = 0;
  let expiredCount = 0;
  const idsToPull = [];

  // 1. Sweeps timed-out 'pending' reservations.
  // Distinguishes allocated pending reservations (crash between quota and activation)
  // from unallocated pending reservations (crash before quota allocation).
  const stalePending = await StorageReservation.find({
    status: "pending",
    expiresAt: { $lte: now },
  });

  for (const res of stalePending) {
    const isAllocated =
      res.quotaAllocated === true || activeIdsSet.has(res._id.toString());

    const updated = await StorageReservation.findOneAndUpdate(
      { _id: res._id, status: "pending" },
      {
        $set: {
          status: "expired",
          releasedAt: now,
          releaseReason: "pending_reservation_timed_out",
          quotaReleased: isAllocated,
        },
      },
      { returnDocument: "after" }
    );
    if (updated) {
      expiredCount += 1;
      if (isAllocated) {
        totalReleased += updated.fileSizeBytes;
        idsToPull.push(updated._id.toString());
      }
    }
  }

  // 2. Sweeps timed-out 'reserved' allocations to restore reserved capacity
  const staleReservations = await StorageReservation.find({
    status: "reserved",
    expiresAt: { $lte: now },
  });

  for (const res of staleReservations) {
    const updated = await StorageReservation.findOneAndUpdate(
      { _id: res._id, status: "reserved" },
      {
        $set: {
          status: "expired",
          releasedAt: now,
          releaseReason: "reservation_ttl_expired",
          quotaReleased: false,
        },
      },
      { returnDocument: "after" }
    );

    if (updated) {
      totalReleased += updated.fileSizeBytes;
      expiredCount += 1;
      idsToPull.push(updated._id.toString());
    }
  }

  // 3. Sweeps interrupted releases (crash after status update but before quota decrement)
  const incompleteReleases = await StorageReservation.find({
    status: { $in: ["expired", "released"] },
    quotaReleased: false,
    quotaAllocated: true,
  });

  for (const inc of incompleteReleases) {
    const isStillAllocated = activeIdsSet.has(inc._id.toString());
    const claimed = await StorageReservation.findOneAndUpdate(
      { _id: inc._id, quotaReleased: false },
      { $set: { quotaReleased: true } },
      { returnDocument: "after" }
    );
    // Only decrement quota and pull ID if the reservation was actually still present in activeReservations
    // If it was already decremented before a previous crash, we simply mark quotaReleased: true without double-decrementing
    if (claimed && isStillAllocated) {
      totalReleased += claimed.fileSizeBytes;
      idsToPull.push(claimed._id.toString());
    }
  }

  if (totalReleased > 0 || idsToPull.length > 0) {
    // Atomically decrement reservedBytes and filter out pulled activeReservations in one write
    await StorageQuota.updateOne(
      { _id: GLOBAL_QUOTA_ID },
      [
        {
          $set: {
            reservedBytes: {
              $max: [0, { $subtract: ["$reservedBytes", totalReleased] }],
            },
            ...(idsToPull.length > 0
              ? {
                  activeReservations: {
                    $filter: {
                      input: { $ifNull: ["$activeReservations", []] },
                      cond: { $not: { $in: ["$$this", idsToPull] } },
                    },
                  },
                }
              : {}),
            version: { $add: [{ $ifNull: ["$version", 0] }, 1] },
          },
        },
      ],
      { updatePipeline: true }
    );

    if (idsToPull.length > 0) {
      await StorageReservation.updateMany(
        { _id: { $in: idsToPull } },
        { $set: { quotaReleased: true } }
      );
    }
  }

  return { expiredCount, releasedBytes: totalReleased };
}

/**
 * Retrieves the current storage usage statistics.
 *
 * @returns {Promise<{
 *   usedBytes: number,
 *   reservedBytes: number,
 *   totalAllocatedBytes: number,
 *   maxStorageBytes: number,
 *   remainingBytes: number,
 *   usagePercentage: number,
 *   maxFileSizeBytes: number,
 *   isFull: boolean,
 *   lastReconciledAt: Date
 * }>}
 */
export async function getStorageUsage() {
  await connectDB();
  await expireStaleReservations();
  const quota = await initializeOrGetQuota();

  const usedBytes = quota.usedBytes || 0;
  const reservedBytes = quota.reservedBytes || 0;
  const totalAllocatedBytes = usedBytes + reservedBytes;
  const remainingBytes = Math.max(0, MAX_TOTAL_STORAGE_BYTES - totalAllocatedBytes);
  const usagePercentage = Number(
    ((usedBytes / MAX_TOTAL_STORAGE_BYTES) * 100).toFixed(2)
  );

  return {
    usedBytes,
    reservedBytes,
    totalAllocatedBytes,
    maxStorageBytes: MAX_TOTAL_STORAGE_BYTES,
    remainingBytes,
    usagePercentage,
    maxFileSizeBytes: MAX_FILE_SIZE_BYTES,
    isFull: totalAllocatedBytes >= MAX_TOTAL_STORAGE_BYTES,
    lastReconciledAt: quota.lastReconciledAt || quota.updatedAt,
  };
}

/**
 * Atomically reserves storage capacity for an incoming file.
 * Enforces: usedBytes + reservedBytes + fileSizeBytes <= MAX_TOTAL_STORAGE_BYTES
 *
 * @param {object} params
 * @param {string|import("mongoose").Types.ObjectId} params.userId
 * @param {number} params.fileSizeBytes
 * @param {string} params.storageKey
 * @returns {Promise<{ success: boolean, reservationId?: string, reason?: string, expiresAt?: Date }>}
 */
export async function reserveStorageCapacity({ userId, fileSizeBytes, storageKey }) {
  if (typeof fileSizeBytes !== "number" || fileSizeBytes <= 0) {
    return { success: false, reason: "INVALID_FILE_SIZE" };
  }

  if (fileSizeBytes > MAX_FILE_SIZE_BYTES) {
    return {
      success: false,
      reason: "FILE_TOO_LARGE",
      maxFileSizeBytes: MAX_FILE_SIZE_BYTES,
    };
  }

  await connectDB();
  await initializeOrGetQuota();
  await expireStaleReservations();

  // 1. Create the reservation in 'pending' status before capacity allocation
  const expiresAt = new Date(Date.now() + RESERVATION_EXPIRY_MS);
  const reservation = await StorageReservation.create({
    userId,
    storageKey,
    fileSizeBytes,
    status: "pending",
    quotaAllocated: false,
    expiresAt,
  });

  // 2. Atomically test-and-increment capacity on singleton quota document
  try {
    const updatedQuota = await StorageQuota.findOneAndUpdate(
      {
        _id: GLOBAL_QUOTA_ID,
        $expr: {
          $lte: [
            { $add: ["$usedBytes", "$reservedBytes", fileSizeBytes] },
            MAX_TOTAL_STORAGE_BYTES,
          ],
        },
      },
      {
        $inc: { reservedBytes: fileSizeBytes, version: 1 },
        $addToSet: { activeReservations: reservation._id.toString() },
        $set: { updatedAt: new Date() },
      },
      { returnDocument: "after" }
    );

    if (!updatedQuota) {
      // Quota exceeded: delete the pending reservation document immediately
      await StorageReservation.deleteOne({ _id: reservation._id });
      return {
        success: false,
        reason: "QUOTA_EXCEEDED",
        maxStorageBytes: MAX_TOTAL_STORAGE_BYTES,
      };
    }

    // 3. Capacity allocated: transition reservation to 'reserved' status
    await StorageReservation.updateOne(
      { _id: reservation._id, status: "pending" },
      { $set: { status: "reserved", quotaAllocated: true, allocatedAt: new Date() } }
    );

    return {
      success: true,
      reservationId: reservation._id.toString(),
      expiresAt,
    };
  } catch (err) {
    // If quota update fails with error, clean up pending reservation
    await StorageReservation.deleteOne({ _id: reservation._id }).catch(() => null);
    throw err;
  }
}

/**
 * Finalizes a reservation after successful storage upload and DB metadata creation.
 * Idempotent: safe to call multiple times without double-counting.
 *
 * @param {string} reservationId
 * @param {object} params
 * @param {string|import("mongoose").Types.ObjectId} params.materialId
 * @returns {Promise<{ success: boolean, alreadyCommitted?: boolean, reason?: string }>}
 */
export async function commitStorageReservation(reservationId, { materialId }) {
  if (!reservationId) {
    return { success: false, reason: "MISSING_RESERVATION_ID" };
  }

  await connectDB();

  // Atomically transition from reserved -> committed exactly once
  const reservation = await StorageReservation.findOneAndUpdate(
    { _id: reservationId, status: "reserved" },
    {
      $set: {
        status: "committed",
        materialId,
        finalizedAt: new Date(),
        quotaCommitted: false,
      },
    },
    { returnDocument: "after" }
  );

  if (reservation) {
    // Exactly one winner transitions status and transfers bytes
    // Atomically transfer bytes and remove from activeReservations in a single operation
    // Only updates if the reservation is still present in activeReservations, preventing concurrent double-counting
    await StorageQuota.updateOne(
      {
        _id: GLOBAL_QUOTA_ID,
        activeReservations: reservation._id.toString(),
      },
      [
        {
          $set: {
            usedBytes: { $add: ["$usedBytes", reservation.fileSizeBytes] },
            reservedBytes: {
              $max: [
                0,
                { $subtract: ["$reservedBytes", reservation.fileSizeBytes] },
              ],
            },
            activeReservations: {
              $filter: {
                input: { $ifNull: ["$activeReservations", []] },
                cond: { $ne: ["$$this", reservation._id.toString()] },
              },
            },
            version: { $add: [{ $ifNull: ["$version", 0] }, 1] },
          },
        },
      ],
      { updatePipeline: true }
    );

    await StorageReservation.updateOne(
      { _id: reservation._id },
      { $set: { quotaCommitted: true } }
    );

    return { success: true, alreadyCommitted: false };
  }

  // Idempotency: if already committed, check if quota transfer finished
  const existing = await StorageReservation.findById(reservationId);
  if (existing && existing.status === "committed") {
    if (!existing.quotaCommitted) {
      await StorageQuota.updateOne(
        {
          _id: GLOBAL_QUOTA_ID,
          activeReservations: existing._id.toString(),
        },
        [
          {
            $set: {
              usedBytes: { $add: ["$usedBytes", existing.fileSizeBytes] },
              reservedBytes: {
                $max: [
                  0,
                  { $subtract: ["$reservedBytes", existing.fileSizeBytes] },
                ],
              },
              activeReservations: {
                $filter: {
                  input: { $ifNull: ["$activeReservations", []] },
                  cond: { $ne: ["$$this", existing._id.toString()] },
                },
              },
              version: { $add: [{ $ifNull: ["$version", 0] }, 1] },
            },
          },
        ],
        { updatePipeline: true }
      );
      await StorageReservation.updateOne(
        { _id: existing._id },
        { $set: { quotaCommitted: true } }
      );
    }
    return { success: true, alreadyCommitted: true };
  }

  return {
    success: false,
    reason: existing
      ? `RESERVATION_ALREADY_${existing.status.toUpperCase()}`
      : "RESERVATION_NOT_FOUND",
  };
}

/**
 * Releases a reserved capacity allocation when an upload is aborted or fails.
 * Idempotent: safe to call multiple times without double-releasing.
 *
 * @param {string} reservationId
 * @param {string} [reason="aborted"]
 * @returns {Promise<{ success: boolean, alreadyReleased?: boolean, reason?: string }>}
 */
export async function releaseStorageReservation(reservationId, reason = "aborted") {
  if (!reservationId) {
    return { success: false, reason: "MISSING_RESERVATION_ID" };
  }

  await connectDB();

  const reservation = await StorageReservation.findOneAndUpdate(
    { _id: reservationId, status: "reserved" },
    {
      $set: {
        status: "released",
        releasedAt: new Date(),
        releaseReason: reason,
        quotaReleased: false,
      },
    },
    { returnDocument: "after" }
  );

  if (reservation) {
    // Atomically decrement reservedBytes and remove from activeReservations in one write
    // Only updates if the reservation is still present in activeReservations, preventing concurrent double-release
    await StorageQuota.updateOne(
      {
        _id: GLOBAL_QUOTA_ID,
        activeReservations: reservation._id.toString(),
      },
      [
        {
          $set: {
            reservedBytes: {
              $max: [
                0,
                { $subtract: ["$reservedBytes", reservation.fileSizeBytes] },
              ],
            },
            activeReservations: {
              $filter: {
                input: { $ifNull: ["$activeReservations", []] },
                cond: { $ne: ["$$this", reservation._id.toString()] },
              },
            },
            version: { $add: [{ $ifNull: ["$version", 0] }, 1] },
          },
        },
      ],
      { updatePipeline: true }
    );

    await StorageReservation.updateOne(
      { _id: reservation._id },
      { $set: { quotaReleased: true } }
    );

    return { success: true, alreadyReleased: false };
  }

  const existing = await StorageReservation.findById(reservationId);
  if (
    existing &&
    (existing.status === "released" || existing.status === "expired")
  ) {
    if (!existing.quotaReleased) {
      await StorageQuota.updateOne(
        {
          _id: GLOBAL_QUOTA_ID,
          activeReservations: existing._id.toString(),
        },
        [
          {
            $set: {
              reservedBytes: {
                $max: [
                  0,
                  { $subtract: ["$reservedBytes", existing.fileSizeBytes] },
                ],
              },
              activeReservations: {
                $filter: {
                  input: { $ifNull: ["$activeReservations", []] },
                  cond: { $ne: ["$$this", existing._id.toString()] },
                },
              },
              version: { $add: [{ $ifNull: ["$version", 0] }, 1] },
            },
          },
        ],
        { updatePipeline: true }
      );
      await StorageReservation.updateOne(
        { _id: existing._id },
        { $set: { quotaReleased: true } }
      );
    }
    return { success: true, alreadyReleased: true };
  }

  return {
    success: false,
    reason: existing
      ? `CANNOT_RELEASE_STATUS_${existing.status.toUpperCase()}`
      : "RESERVATION_NOT_FOUND",
  };
}

/**
 * Releases used storage capacity upon successful document deletion.
 * Ensures usedBytes never goes below zero.
 *
 * @param {number} fileSizeBytes - Bytes of deleted material
 * @param {string} [storageKey] - Storage key for tracing
 * @returns {Promise<{ success: boolean }>}
 */
export async function releaseStorageOnDelete(fileSizeBytes, storageKey) {
  if (typeof fileSizeBytes !== "number" || fileSizeBytes <= 0) {
    return { success: false };
  }

  await connectDB();

  await StorageQuota.updateOne(
    { _id: GLOBAL_QUOTA_ID },
    [
      {
        $set: {
          usedBytes: {
            $max: [0, { $subtract: ["$usedBytes", fileSizeBytes] }],
          },
          version: { $add: [{ $ifNull: ["$version", 0] }, 1] },
        },
      },
    ],
    { updatePipeline: true }
  );

  return { success: true };
}

/**
 * Reconciles storage quota counters against the actual Material records
 * and active StorageReservation records.
 * Uses optimistic version checking to prevent overwriting concurrent updates
 * with stale aggregation snapshots.
 *
 * @param {number} [maxRetries=2]
 * @returns {Promise<{
 *   usedBytes: number,
 *   reservedBytes: number,
 *   staleReservationsExpired: number,
 *   maxStorageBytes: number
 * }>}
 */
export async function reconcileStorageQuota(maxRetries = 2) {
  await connectDB();
  let totalExpiredCount = 0;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // 1. Expire stale reservations
    const { expiredCount } = await expireStaleReservations();
    totalExpiredCount += expiredCount;

    // 2. Fetch baseline version of singleton quota document
    const quotaDoc = await StorageQuota.findById(GLOBAL_QUOTA_ID);
    const expectedVersion = quotaDoc?.version ?? 0;
    const reconcileTimestamp = new Date();

    // 3. Concurrently aggregate actual ground truth from Material and StorageReservation
    const [matAgg, activeReservations] = await Promise.all([
      Material.aggregate([
        { $group: { _id: null, totalBytes: { $sum: "$fileSizeBytes" } } },
      ]),
      StorageReservation.find({
        status: { $in: ["reserved", "pending"] },
        expiresAt: { $gt: reconcileTimestamp },
      })
        .select("_id storageKey fileSizeBytes status quotaAllocated")
        .lean(),
    ]);

    const actualUsedBytes = matAgg[0]?.totalBytes || 0;
    let actualReservedBytes = 0;
    const verifiedActiveIds = [];

    if (activeReservations.length > 0) {
      const resKeys = activeReservations.map((r) => r.storageKey);
      const existingMaterials = await Material.find({
        storageKey: { $in: resKeys },
      })
        .select("storageKey")
        .lean();

      const committedKeySet = new Set(existingMaterials.map((m) => m.storageKey));

      for (const res of activeReservations) {
        if (committedKeySet.has(res.storageKey)) {
          // Material document exists in DB, but process was interrupted before reservation finalization.
          // Its bytes are already counted in actualUsedBytes. Auto-finalize reservation so it is not double-counted.
          await StorageReservation.updateOne(
            { _id: res._id, status: { $in: ["reserved", "pending"] } },
            { $set: { status: "committed", quotaCommitted: true, finalizedAt: new Date() } }
          );
        } else {
          // Truly pending or active in-flight upload reservation
          const isAllocated =
            res.status === "reserved" ||
            res.quotaAllocated === true ||
            quotaDoc?.activeReservations?.includes(res._id.toString());

          if (isAllocated) {
            actualReservedBytes += res.fileSizeBytes;
            verifiedActiveIds.push(res._id.toString());
          }
        }
      }
    }

    // Auto-heal orphaned committed reservations older than 5 minutes where Material was never persisted
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const staleCommitted = await StorageReservation.find({
      status: "committed",
      createdAt: { $lte: fiveMinutesAgo },
    })
      .select("_id storageKey fileSizeBytes")
      .lean();

    if (staleCommitted.length > 0) {
      const commKeys = staleCommitted.map((r) => r.storageKey);
      const matchedMaterials = await Material.find({
        storageKey: { $in: commKeys },
      })
        .select("storageKey")
        .lean();
      const matchedKeySet = new Set(matchedMaterials.map((m) => m.storageKey));

      for (const sc of staleCommitted) {
        if (!matchedKeySet.has(sc.storageKey)) {
          await StorageReservation.updateOne(
            { _id: sc._id, status: "committed" },
            {
              $set: {
                status: "released",
                releasedAt: new Date(),
                releaseReason: "material_never_persisted_orphaned_commit",
              },
            }
          );
        }
      }
    }

    // 4. Atomically update ONLY if no concurrent writes modified StorageQuota during aggregation
    const result = await StorageQuota.updateOne(
      {
        _id: GLOBAL_QUOTA_ID,
        $or: [
          { version: expectedVersion },
          { version: { $exists: false } },
        ],
      },
      {
        $set: {
          usedBytes: actualUsedBytes,
          reservedBytes: actualReservedBytes,
          activeReservations: verifiedActiveIds,
          maxStorageBytes: MAX_TOTAL_STORAGE_BYTES,
          lastReconciledAt: new Date(),
        },
        $inc: { version: 1 },
      },
      { upsert: true }
    );

    // If update succeeded without contention, return cleanly
    if (result.matchedCount > 0 || result.upsertedCount > 0) {
      return {
        usedBytes: actualUsedBytes,
        reservedBytes: actualReservedBytes,
        staleReservationsExpired: totalExpiredCount,
        maxStorageBytes: MAX_TOTAL_STORAGE_BYTES,
      };
    }

    // A concurrent write occurred while aggregating.
    if (attempt === maxRetries) {
      const latestQuota = await StorageQuota.findById(GLOBAL_QUOTA_ID);
      return {
        usedBytes: latestQuota?.usedBytes ?? actualUsedBytes,
        reservedBytes: latestQuota?.reservedBytes ?? actualReservedBytes,
        staleReservationsExpired: totalExpiredCount,
        maxStorageBytes: MAX_TOTAL_STORAGE_BYTES,
      };
    }
  }
}

/**
 * Audits R2 bucket physical objects against database Material records.
 * Identifies:
 * - orphanedObjects: in R2, but not in DB Material and not active reservation
 * - missingObjects: in DB Material, but not found in R2
 * - bucketTotalBytes vs databaseTrackedBytes
 *
 * Safe: Does not delete unknown objects automatically.
 *
 * @returns {Promise<{
 *   isConfigured: boolean,
 *   bucketTotalBytes: number,
 *   databaseTrackedBytes: number,
 *   totalBucketObjects: number,
 *   totalDbMaterials: number,
 *   orphanedObjects: Array<{ key: string, size: number }>,
 *   missingObjects: Array<{ key: string, materialId: string, title: string }>
 * }>}
 */
export async function auditR2Storage() {
  const isConfigured = isStorageConfigured();
  if (!isConfigured) {
    return {
      isConfigured: false,
      bucketTotalBytes: 0,
      databaseTrackedBytes: 0,
      totalBucketObjects: 0,
      totalDbMaterials: 0,
      orphanedObjects: [],
      missingObjects: [],
    };
  }

  await connectDB();

  const [r2Objects, dbMaterials, activeReservations] = await Promise.all([
    listR2Objects(),
    Material.find().select("storageKey fileSizeBytes title").lean(),
    StorageReservation.find({ status: "reserved" }).select("storageKey").lean(),
  ]);

  const r2KeyMap = new Map();
  let bucketTotalBytes = 0;
  for (const obj of r2Objects) {
    r2KeyMap.set(obj.key, obj);
    bucketTotalBytes += obj.size || 0;
  }

  const dbKeyMap = new Map();
  let databaseTrackedBytes = 0;
  for (const m of dbMaterials) {
    dbKeyMap.set(m.storageKey, m);
    databaseTrackedBytes += m.fileSizeBytes || 0;
  }

  const activeResKeys = new Set(activeReservations.map((r) => r.storageKey));

  const orphanedObjects = [];
  const otherFeatureObjects = [];
  let otherFeatureBytes = 0;

  for (const [key, obj] of r2KeyMap.entries()) {
    if (dbKeyMap.has(key) || activeResKeys.has(key)) {
      continue;
    }

    // Distinguish document namespace (users/{userId}/documents/{materialId}.{ext})
    // from objects belonging to other features or namespaces in the bucket
    const isDocumentKey = /^users\/[^/]+\/documents\/[^/]+$/i.test(key);
    if (isDocumentKey) {
      orphanedObjects.push({
        key,
        size: obj.size,
        lastModified: obj.lastModified,
      });
    } else {
      otherFeatureObjects.push({
        key,
        size: obj.size,
        lastModified: obj.lastModified,
      });
      otherFeatureBytes += obj.size || 0;
    }
  }

  const missingObjects = [];
  for (const [key, m] of dbKeyMap.entries()) {
    if (!r2KeyMap.has(key)) {
      missingObjects.push({
        key,
        materialId: m._id.toString(),
        title: m.title,
      });
    }
  }

  return {
    isConfigured: true,
    bucketTotalBytes,
    databaseTrackedBytes,
    otherFeatureBytes,
    totalBucketObjects: r2Objects.length,
    totalDbMaterials: dbMaterials.length,
    matchedMaterialObjects: dbMaterials.length - missingObjects.length,
    activeReservationObjects: activeResKeys.size,
    orphanedObjects,
    otherFeatureObjects,
    missingObjects,
  };
}
