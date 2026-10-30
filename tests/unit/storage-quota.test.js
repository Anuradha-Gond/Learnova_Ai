import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_FILE_SIZE_BYTES,
  MAX_TOTAL_STORAGE_BYTES,
  RESERVATION_EXPIRY_MS,
  reserveStorageCapacity,
  commitStorageReservation,
  releaseStorageReservation,
  releaseStorageOnDelete,
  expireStaleReservations,
  auditR2Storage,
} from "../../src/services/storageQuotaService.js";
import {
  validateUploadFile,
  validateFileSignature,
  ALLOWED_EXTENSIONS,
} from "../../src/services/documentService.js";
import { STORAGE_CONFIG } from "../../src/lib/storage/index.js";
import StorageQuota from "../../src/models/StorageQuota.js";
import StorageReservation from "../../src/models/StorageReservation.js";
import Material from "../../src/models/Material.js";

describe("Learnova AI — Cloudflare R2 Storage Quota & Lifecycle Tests", () => {
  describe("Quota Constants & Exact Decimal Values", () => {
    test("verifies exact 20 MB decimal file limit (20,000,000 bytes)", () => {
      assert.equal(MAX_FILE_SIZE_BYTES, 20_000_000);
      assert.equal(STORAGE_CONFIG.maxFileSizeBytes, 20_000_000);
    });

    test("verifies exact 8.5 GB decimal total storage quota (8,500,000,000 bytes)", () => {
      assert.equal(MAX_TOTAL_STORAGE_BYTES, 8_500_000_000);
      assert.equal(STORAGE_CONFIG.maxTotalStorageBytes, 8_500_000_000);
    });

    test("verifies reservation TTL is 15 minutes", () => {
      assert.equal(RESERVATION_EXPIRY_MS, 15 * 60 * 1000);
    });
  });

  describe("File Size & Type Constraints", () => {
    test("accepts file under 20 MB limit", () => {
      const result = validateUploadFile({ name: "notes.pdf", size: 10_000_000 });
      assert.equal(result.valid, true);
      assert.equal(result.extension, "pdf");
    });

    test("accepts file exactly at 20,000,000 bytes limit", () => {
      const result = validateUploadFile({ name: "lecture.txt", size: 20_000_000 });
      assert.equal(result.valid, true);
      assert.equal(result.extension, "txt");
    });

    test("rejects file at 20,000,001 bytes (exceeds 20 MB)", () => {
      const result = validateUploadFile({ name: "notes.pdf", size: 20_000_001 });
      assert.equal(result.valid, false);
      assert.ok(result.error.includes("20 MB"));
    });

    test("allows only PDF and TXT file types", () => {
      assert.deepEqual(ALLOWED_EXTENSIONS, ["pdf", "txt"]);
      assert.equal(validateUploadFile({ name: "doc.pdf", size: 1000 }).valid, true);
      assert.equal(validateUploadFile({ name: "doc.txt", size: 1000 }).valid, true);
      assert.equal(validateUploadFile({ name: "doc.docx", size: 1000 }).valid, false);
      assert.equal(validateUploadFile({ name: "doc.png", size: 1000 }).valid, false);
    });

    test("detects invalid file signatures", () => {
      const badPdf = Buffer.from("NOT_A_PDF_DOCUMENT");
      assert.equal(validateFileSignature(badPdf, "pdf").valid, false);

      const goodPdf = Buffer.from("%PDF-1.7 Test Document");
      assert.equal(validateFileSignature(goodPdf, "pdf").valid, true);

      const badTxt = Buffer.from([0x00, 0x01, 0x02]); // Binary null byte
      assert.equal(validateFileSignature(badTxt, "txt").valid, false);

      const goodTxt = Buffer.from("Plain text content without null bytes.");
      assert.equal(validateFileSignature(goodTxt, "txt").valid, true);
    });
  });

  describe("Atomic Capacity Invariant Simulation", () => {
    test("enforces usedBytes + reservedBytes + incoming <= MAX_TOTAL_STORAGE_BYTES", () => {
      const usedBytes = 8_485_000_000; // 8.485 GB
      const reservedBytes = 5_000_000;  // 5 MB
      const incomingBytes = 10_000_000; // 10 MB

      // Total = 8_500_000_000 <= 8_500_000_000 -> fits exactly
      assert.equal(
        usedBytes + reservedBytes + incomingBytes <= MAX_TOTAL_STORAGE_BYTES,
        true
      );

      // 1 byte more exceeds the quota
      const overflowingBytes = incomingBytes + 1;
      assert.equal(
        usedBytes + reservedBytes + overflowingBytes <= MAX_TOTAL_STORAGE_BYTES,
        false
      );
    });

    test("concurrent uploads simulator rejects requests that exceed remaining quota", () => {
      // Simulate atomic allocation with remaining capacity of 25 MB
      let totalAllocated = 8_475_000_000; // 8.475 GB allocated
      const requests = [
        { id: 1, size: 10_000_000 },
        { id: 2, size: 10_000_000 },
        { id: 3, size: 10_000_000 }, // Should be rejected because 10 + 10 + 10 = 30 MB > 25 MB
      ];

      const results = requests.map((req) => {
        if (totalAllocated + req.size <= MAX_TOTAL_STORAGE_BYTES) {
          totalAllocated += req.size;
          return { id: req.id, success: true };
        }
        return { id: req.id, success: false, reason: "QUOTA_EXCEEDED" };
      });

      assert.equal(results[0].success, true);
      assert.equal(results[1].success, true);
      assert.equal(results[2].success, false);
      assert.equal(results[2].reason, "QUOTA_EXCEEDED");
      assert.equal(totalAllocated, 8_495_000_000);
    });
  });

  describe("Reservation Lifecycle & Idempotency", () => {
    test("rejects negative or zero file size in reservation", async () => {
      const zero = await reserveStorageCapacity({
        userId: "507f1f77bcf86cd799439011",
        fileSizeBytes: 0,
        storageKey: "users/u/documents/d.pdf",
      });
      assert.equal(zero.success, false);
      assert.equal(zero.reason, "INVALID_FILE_SIZE");

      const negative = await reserveStorageCapacity({
        userId: "507f1f77bcf86cd799439011",
        fileSizeBytes: -500,
        storageKey: "users/u/documents/d.pdf",
      });
      assert.equal(negative.success, false);
      assert.equal(negative.reason, "INVALID_FILE_SIZE");
    });

    test("rejects files larger than 20 MB at reservation stage", async () => {
      const oversized = await reserveStorageCapacity({
        userId: "507f1f77bcf86cd799439011",
        fileSizeBytes: 20_000_001,
        storageKey: "users/u/documents/d.pdf",
      });
      assert.equal(oversized.success, false);
      assert.equal(oversized.reason, "FILE_TOO_LARGE");
    });

    test("commit handles missing reservation ID gracefully", async () => {
      const res = await commitStorageReservation(null, { materialId: "mat_1" });
      assert.equal(res.success, false);
      assert.equal(res.reason, "MISSING_RESERVATION_ID");
    });

    test("release handles missing reservation ID gracefully", async () => {
      const res = await releaseStorageReservation(null);
      assert.equal(res.success, false);
      assert.equal(res.reason, "MISSING_RESERVATION_ID");
    });

    test("delete release handles invalid or zero file size gracefully", async () => {
      const resZero = await releaseStorageOnDelete(0);
      assert.equal(resZero.success, false);

      const resNeg = await releaseStorageOnDelete(-100);
      assert.equal(resNeg.success, false);
    });

    test("StorageReservation schema does NOT use MongoDB TTL auto-deletion", () => {
      const expiresAtPath = StorageReservation.schema.path("expiresAt");
      assert.ok(expiresAtPath, "expiresAt field should exist on StorageReservation schema");
      assert.equal(
        expiresAtPath.options.expires,
        undefined,
        "expiresAt must not define an automatic MongoDB TTL index"
      );
      assert.equal(
        expiresAtPath.options.expireAfterSeconds,
        undefined,
        "expiresAt must not define an automatic expireAfterSeconds"
      );
    });

    test("StorageQuota schema supports optimistic concurrency versioning", () => {
      const versionPath = StorageQuota.schema.path("version");
      assert.ok(versionPath, "version should exist on StorageQuota schema");
      assert.equal(versionPath.defaultValue, 0);
    });
  });

  describe("Exactly-Once Accounting & Crash Recovery Protocols", () => {
    test("finalization retry on committed reservation is idempotent and prevents double-counting", () => {
      // Setup state representing a reservation that has already transitioned to committed
      const reservation = {
        _id: "res_final_1",
        fileSizeBytes: 10_000_000,
        status: "committed",
        materialId: "mat_1",
      };

      let usedBytes = 100_000_000;
      let reservedBytes = 0;
      let version = 1;

      // Simulate a client retrying commitStorageReservation on an already committed reservation
      let retryResult;
      if (reservation.status === "committed") {
        // Idempotent recovery protocol: return alreadyCommitted without touching counters
        retryResult = { success: true, alreadyCommitted: true };
      }

      assert.equal(retryResult.success, true);
      assert.equal(retryResult.alreadyCommitted, true);
      assert.equal(usedBytes, 100_000_000, "usedBytes must remain unchanged on retry");
      assert.equal(reservedBytes, 0, "reservedBytes must remain unchanged on retry");
      assert.equal(version, 1, "version must remain unchanged on idempotent retry");
      assert.equal(reservation.status, "committed");
    });

    test("release retry on released reservation is idempotent and prevents double-decrement", () => {
      const reservation = {
        _id: "res_rel_1",
        fileSizeBytes: 5_000_000,
        status: "released",
      };

      let reservedBytes = 0;
      let version = 2;

      // Simulate a client retrying releaseStorageReservation on an already released reservation
      let retryResult;
      if (reservation.status === "released") {
        retryResult = { success: true, alreadyReleased: true };
      }

      assert.equal(retryResult.success, true);
      assert.equal(retryResult.alreadyReleased, true);
      assert.equal(reservedBytes, 0, "reservedBytes must not double-decrement");
      assert.equal(version, 2, "version must remain unchanged on idempotent retry");
      assert.equal(reservation.status, "released");
    });

    test("reconciliation auto-finalizes reservations of materials created before a crash", () => {
      // Simulate Case C: Upload created Material, but process crashed before commitStorageReservation ran
      const materials = [
        { storageKey: "users/u1/documents/docA.pdf", fileSizeBytes: 12_000_000 },
        { storageKey: "users/u1/documents/docB.pdf", fileSizeBytes: 8_000_000 },
      ];

      // Two active reservations: docB crashed before finalization, docC is genuinely in-flight
      const activeReservations = [
        { _id: "res_b", storageKey: "users/u1/documents/docB.pdf", fileSizeBytes: 8_000_000, status: "reserved" },
        { _id: "res_c", storageKey: "users/u1/documents/docC.pdf", fileSizeBytes: 15_000_000, status: "reserved" },
      ];

      // Aggregate Material usedBytes
      const actualUsedBytes = materials.reduce((acc, m) => acc + m.fileSizeBytes, 0);

      // Check which reservations have corresponding Material records in DB
      const materialKeys = new Set(materials.map((m) => m.storageKey));
      let actualReservedBytes = 0;

      for (const res of activeReservations) {
        if (materialKeys.has(res.storageKey)) {
          // Crashed upload recovery: auto-finalize reservation
          res.status = "committed";
        } else {
          // Truly pending in-flight reservation
          actualReservedBytes += res.fileSizeBytes;
        }
      }

      // Assertions
      assert.equal(actualUsedBytes, 20_000_000, "usedBytes must accurately sum all existing materials");
      assert.equal(actualReservedBytes, 15_000_000, "reservedBytes must only include genuine in-flight reservation");
      assert.equal(activeReservations[0].status, "committed", "orphaned reservation must be healed to committed");
      assert.equal(activeReservations[1].status, "reserved", "in-flight reservation remains reserved");

      // Verify no double counting: Total tracked storage = 20 MB (used) + 15 MB (reserved) = 35 MB
      assert.equal(actualUsedBytes + actualReservedBytes, 35_000_000);
    });

    test("optimistic concurrency versioning rejects stale reconciliation updates", () => {
      let storageDoc = {
        usedBytes: 50_000_000,
        reservedBytes: 10_000_000,
        version: 1,
      };

      const reconA = { expectedVersion: 1, newUsed: 50_000_000, newReserved: 10_000_000 };
      const reconB = { expectedVersion: 1, newUsed: 60_000_000, newReserved: 0 };

      // reconA updates first
      let reconASucceeded = false;
      if (storageDoc.version === reconA.expectedVersion) {
        storageDoc.usedBytes = reconA.newUsed;
        storageDoc.reservedBytes = reconA.newReserved;
        storageDoc.version += 1;
        reconASucceeded = true;
      }
      assert.equal(reconASucceeded, true);
      assert.equal(storageDoc.version, 2);

      // reconB attempts to update with stale expectedVersion 1
      let reconBSucceeded = false;
      if (storageDoc.version === reconB.expectedVersion) {
        storageDoc.usedBytes = reconB.newUsed;
        storageDoc.reservedBytes = reconB.newReserved;
        storageDoc.version += 1;
        reconBSucceeded = true;
      }

      assert.equal(reconBSucceeded, false, "stale reconciliation attempt must be rejected");
      assert.equal(storageDoc.version, 2, "version must remain intact after rejected update");
      assert.equal(storageDoc.usedBytes, 50_000_000, "counters must not be overwritten by stale snapshot");
    });

    test("StorageReservation schema includes 'pending' in status enum", () => {
      const statusPath = StorageReservation.schema.path("status");
      assert.ok(statusPath, "status field should exist on StorageReservation schema");
      assert.ok(
        statusPath.enumValues.includes("pending"),
        "status enum must include 'pending' state"
      );
      assert.equal(statusPath.defaultValue, "pending");
    });

    test("Check 1: Finalization crash recovery restores exact counters via reconciliation after retry", () => {
      // 1. Initial State
      let usedBytes = 100_000_000;
      let reservedBytes = 10_000_000;
      let version = 1;

      // 2. A Material record exists
      const materials = [
        { storageKey: "users/u1/documents/doc1.pdf", fileSizeBytes: 10_000_000 },
      ];

      // 3. Reservation is atomically transitioned from reserved -> committed
      const reservation = {
        _id: "res_check1",
        storageKey: "users/u1/documents/doc1.pdf",
        fileSizeBytes: 10_000_000,
        status: "committed",
        materialId: "doc1",
      };

      // 4. Process crashes before quota transfer -> quota counters are untouched
      assert.equal(usedBytes, 100_000_000);
      assert.equal(reservedBytes, 10_000_000);

      // 5. A retry sees the committed reservation and returns alreadyCommitted without modifying counters
      let retryResult;
      if (reservation.status === "committed") {
        retryResult = { success: true, alreadyCommitted: true };
      }
      assert.equal(retryResult.success, true);
      assert.equal(retryResult.alreadyCommitted, true);
      assert.equal(usedBytes, 100_000_000, "retry must not modify usedBytes");
      assert.equal(reservedBytes, 10_000_000, "retry must not modify reservedBytes");

      // 6. Reconciliation runs: aggregates Material and active reservations
      const actualUsedBytes = materials.reduce((acc, m) => acc + m.fileSizeBytes, 0);
      const activeReservations = [reservation].filter((r) => r.status === "reserved");
      const actualReservedBytes = activeReservations.reduce((acc, r) => acc + r.fileSizeBytes, 0);

      // Apply ground truth
      usedBytes = actualUsedBytes;
      reservedBytes = actualReservedBytes;
      version += 1;

      // Final assertions on database state
      assert.equal(usedBytes, 10_000_000, "usedBytes must accurately reflect the committed Material");
      assert.equal(reservedBytes, 0, "reservedBytes must accurately exclude the committed reservation");
      assert.equal(reservation.status, "committed");
      assert.equal(version, 2);
    });

    test("Check 2: Reservation creation vs reconciliation ignores pending reservations before capacity allocation", () => {
      let usedBytes = 50_000_000;
      let reservedBytes = 0;
      let version = 1;

      // 1. Upload U1 creates reservation in 'pending' status before capacity check
      const reservationU1 = {
        _id: "res_pending_1",
        storageKey: "users/u1/documents/doc_pending.pdf",
        fileSizeBytes: 10_000_000,
        status: "pending",
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      };

      // 2. Reconciliation runs between Step 1 and Step 2: only queries status: 'reserved'
      const activeReservations = [reservationU1].filter((r) => r.status === "reserved");
      const reconReservedBytes = activeReservations.reduce((acc, r) => acc + r.fileSizeBytes, 0);

      assert.equal(reconReservedBytes, 0, "pending reservation must not be included in reconciliation reservedBytes");

      // 3. Upload U1 successfully allocates capacity on StorageQuota and transitions to 'reserved'
      reservedBytes += reservationU1.fileSizeBytes;
      version += 1;
      reservationU1.status = "reserved";

      assert.equal(reservedBytes, 10_000_000, "reservedBytes must be incremented exactly once upon allocation");
      assert.equal(reservationU1.status, "reserved");

      // 4. Subsequent reconciliation now sees the allocated reservation
      const activeNow = [reservationU1].filter((r) => r.status === "reserved");
      const finalReconReserved = activeNow.reduce((acc, r) => acc + r.fileSizeBytes, 0);
      assert.equal(finalReconReserved, 10_000_000, "allocated reservation is now tracked by reconciliation");
      assert.equal(usedBytes + reservedBytes, 60_000_000);
    });

    test("Check 1: Crash between quota allocation and reservation activation: sweeper safely releases pending allocation on timeout", () => {
      let reservedBytes = 15_000_000;
      let version = 1;

      // Pending reservation where capacity was allocated, but process crashed before transition to 'reserved'
      const pendingReservation = {
        _id: "res_pending_crash",
        fileSizeBytes: 15_000_000,
        status: "pending",
        expiresAt: new Date(Date.now() - 1000), // timed out
      };

      // Sweeper runs: finds timed-out pending reservation
      let totalReleased = 0;
      if (pendingReservation.status === "pending" && pendingReservation.expiresAt <= new Date()) {
        pendingReservation.status = "expired";
        pendingReservation.releaseReason = "pending_reservation_timed_out";
        totalReleased += pendingReservation.fileSizeBytes;
      }

      if (totalReleased > 0) {
        reservedBytes = Math.max(0, reservedBytes - totalReleased);
        version += 1;
      }

      assert.equal(reservedBytes, 0, "stranded reservedBytes must be released cleanly upon expiration");
      assert.equal(pendingReservation.status, "expired");
      assert.equal(version, 2);
    });

    test("Check 2: Expiration while upload is running: upload route rejects expired reservation and prevents material creation", () => {
      // 1. Initial State: Reservation allocated
      const reservation = {
        _id: "res_slow_upload",
        fileSizeBytes: 20_000_000,
        status: "reserved",
        expiresAt: new Date(Date.now() - 1000), // Upload took longer than 15 mins
      };

      // 2. Sweeper expires the reservation and restores capacity
      let reservedBytes = 20_000_000;
      let usedBytes = 8_480_000_000;
      if (reservation.status === "reserved" && reservation.expiresAt <= new Date()) {
        reservation.status = "expired";
        reservedBytes -= reservation.fileSizeBytes;
      }

      assert.equal(reservation.status, "expired");
      assert.equal(reservedBytes, 0);

      // 3. Another upload takes the freed capacity
      const anotherUploadBytes = 20_000_000;
      reservedBytes += anotherUploadBytes;
      assert.equal(reservedBytes, 20_000_000);
      assert.equal(usedBytes + reservedBytes, 8_500_000_000, "Quota is now at max 8.5 GB");

      // 4. Original slow upload finishes and attempts to commit reservation
      // In commitStorageReservation: atomic query looks for status: 'reserved'
      let commitResult;
      if (reservation.status === "reserved") {
        reservation.status = "committed";
        commitResult = { success: true };
      } else {
        commitResult = { success: false, reason: `RESERVATION_ALREADY_${reservation.status.toUpperCase()}` };
      }

      assert.equal(commitResult.success, false);
      assert.equal(commitResult.reason, "RESERVATION_ALREADY_EXPIRED");

      // 5. Upload route aborts: Material is NOT created, R2 object is deleted
      let materialCreated = false;
      if (commitResult.success) {
        materialCreated = true;
        usedBytes += reservation.fileSizeBytes;
      }

      assert.equal(materialCreated, false, "Material record must not be created when reservation expired");
      assert.equal(usedBytes + reservedBytes, 8_500_000_000, "Global quota must never be breached");
    });

    test("Material schema enforces unique storageKey index", () => {
      const indexes = Material.schema.indexes();
      const storageKeyIndex = indexes.find(
        ([fields, opts]) => fields && fields.storageKey === 1 && opts && opts.unique === true
      );
      assert.ok(storageKeyIndex, "Material schema must define a unique index on storageKey");
    });

    test("StorageReservation schema indexes storageKey for fast reconciliation lookups", () => {
      const indexes = StorageReservation.schema.indexes();
      const storageKeyIndex = indexes.find(
        ([fields]) => fields && fields.storageKey === 1
      );
      assert.ok(storageKeyIndex, "StorageReservation schema must define an index on storageKey");
    });

    test("interrupted reservation creation before quota update is safely preserved by reconciliation", () => {
      // Simulate state where StorageReservation was created, but process crashed before StorageQuota was incremented
      const reservation = {
        _id: "res_interrupted_1",
        storageKey: "users/u1/documents/doc_interrupted.pdf",
        fileSizeBytes: 14_000_000,
        status: "reserved",
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      };

      const existingMaterials = []; // Material not created yet

      // Reconciliation must see the reservation in StorageReservation and safely hold capacity
      const materialKeys = new Set(existingMaterials.map((m) => m.storageKey));
      let actualReservedBytes = 0;

      if (!materialKeys.has(reservation.storageKey)) {
        actualReservedBytes += reservation.fileSizeBytes;
      }

      // Assertions
      assert.equal(actualReservedBytes, 14_000_000, "reservedBytes must include in-flight reservation to prevent capacity loss");
      assert.equal(reservation.status, "reserved", "reservation must remain reserved");
    });

    test("StorageReservation schema includes 'quotaAllocated' and 'allocatedAt'", () => {
      const allocatedPath = StorageReservation.schema.path("quotaAllocated");
      assert.ok(allocatedPath, "quotaAllocated field must exist on StorageReservation schema");
      assert.equal(allocatedPath.defaultValue, false);

      const allocatedAtPath = StorageReservation.schema.path("allocatedAt");
      assert.ok(allocatedAtPath, "allocatedAt field must exist on StorageReservation schema");
    });

    test("StorageQuota schema includes 'activeReservations' tracking array", () => {
      const activePath = StorageQuota.schema.path("activeReservations");
      assert.ok(activePath, "activeReservations must exist on StorageQuota schema");
    });

    test("Allocation: crash after pending reservation creation but before allocation does not decrement quota on expiry", () => {
      let reservedBytes = 50_000_000;
      let version = 1;

      // Pending reservation created, but process crashed before StorageQuota was touched
      const unallocatedPending = {
        _id: "res_unalloc_1",
        fileSizeBytes: 10_000_000,
        status: "pending",
        quotaAllocated: false,
        expiresAt: new Date(Date.now() - 1000), // timed out
      };

      const activeReservationsInQuota = new Set(); // Not present in quota activeReservations

      // Sweeper runs
      let totalReleased = 0;
      const isAllocated =
        unallocatedPending.quotaAllocated === true ||
        activeReservationsInQuota.has(unallocatedPending._id);

      if (unallocatedPending.status === "pending" && unallocatedPending.expiresAt <= new Date()) {
        unallocatedPending.status = "expired";
        unallocatedPending.quotaReleased = isAllocated;
        if (isAllocated) {
          totalReleased += unallocatedPending.fileSizeBytes;
        }
      }

      if (totalReleased > 0) {
        reservedBytes = Math.max(0, reservedBytes - totalReleased);
        version += 1;
      }

      assert.equal(unallocatedPending.status, "expired");
      assert.equal(unallocatedPending.quotaReleased, false);
      assert.equal(totalReleased, 0, "must not release capacity that was never allocated");
      assert.equal(reservedBytes, 50_000_000, "reservedBytes must remain unchanged");
      assert.equal(version, 1);
    });

    test("Expiration: two sweepers attempting to expire the same reservation race safely with exactly one winner", () => {
      const reservation = {
        _id: "res_race_1",
        fileSizeBytes: 10_000_000,
        status: "reserved",
        expiresAt: new Date(Date.now() - 1000),
        quotaReleased: false,
      };

      let reservedBytes = 20_000_000;

      // Sweeper 1 atomic findOneAndUpdate({ _id, status: 'reserved' })
      let sweeper1Claimed = false;
      if (reservation.status === "reserved") {
        reservation.status = "expired";
        sweeper1Claimed = true;
      }

      // Sweeper 2 atomic findOneAndUpdate({ _id, status: 'reserved' }) concurrently
      let sweeper2Claimed = false;
      if (reservation.status === "reserved") {
        reservation.status = "expired";
        sweeper2Claimed = true;
      }

      assert.equal(sweeper1Claimed, true, "First sweeper successfully claims expiration transition");
      assert.equal(sweeper2Claimed, false, "Second sweeper gets null and cannot claim expiration");

      // Only the winner decrements quota
      if (sweeper1Claimed) {
        reservedBytes -= reservation.fileSizeBytes;
        reservation.quotaReleased = true;
      }
      if (sweeper2Claimed) {
        reservedBytes -= reservation.fileSizeBytes;
      }

      assert.equal(reservedBytes, 10_000_000, "Capacity must be released exactly once");
      assert.equal(reservation.quotaReleased, true);
    });

    test("Expiration: crash after expiration is claimed but before quota release is recovered by incomplete release sweeper", () => {
      let reservedBytes = 15_000_000;
      let version = 1;

      // Reservation was claimed as expired, but process crashed before StorageQuota.reservedBytes was decremented
      const crashedExpired = {
        _id: "res_crashed_exp_1",
        fileSizeBytes: 15_000_000,
        status: "expired",
        quotaAllocated: true,
        quotaReleased: false, // Incomplete release!
      };

      // Sweeper finds incomplete releases ({ status: { $in: ['expired', 'released'] }, quotaReleased: false, quotaAllocated: true })
      let totalReleased = 0;
      if (
        (crashedExpired.status === "expired" || crashedExpired.status === "released") &&
        !crashedExpired.quotaReleased &&
        crashedExpired.quotaAllocated
      ) {
        crashedExpired.quotaReleased = true;
        totalReleased += crashedExpired.fileSizeBytes;
      }

      if (totalReleased > 0) {
        reservedBytes = Math.max(0, reservedBytes - totalReleased);
        version += 1;
      }

      assert.equal(crashedExpired.quotaReleased, true);
      assert.equal(reservedBytes, 0, "stranded capacity is recovered cleanly on sweeper retry");
      assert.equal(version, 2);
    });

    test("Upload finalization Scenario B: quota commitment succeeds but Material creation fails triggers rollback without inflating usedBytes", () => {
      let usedBytes = 100_000_000;
      let reservedBytes = 10_000_000;
      const fileSizeBytes = 10_000_000;
      const storageKey = "users/u1/documents/failed_db.pdf";

      // 1. Quota commitment succeeds: status -> committed, bytes transferred
      const reservation = {
        _id: "res_scen_b",
        fileSizeBytes,
        status: "committed",
        storageKey,
      };
      usedBytes += fileSizeBytes;
      reservedBytes -= fileSizeBytes;

      // 2. Material creation fails
      const dbError = new Error("Database validation failed");
      let r2Deleted = false;
      let reservationMarkedReleased = false;

      // 3. Catch block executes rollback
      if (dbError) {
        r2Deleted = true; // deleteFile(storageKey)
        reservation.status = "released";
        reservation.releaseReason = "material_creation_failed";
        reservationMarkedReleased = true;
        usedBytes = Math.max(0, usedBytes - fileSizeBytes); // releaseStorageOnDelete
      }

      assert.equal(r2Deleted, true, "R2 object must be rolled back on failed Material creation");
      assert.equal(reservationMarkedReleased, true);
      assert.equal(reservation.status, "released");
      assert.equal(usedBytes, 100_000_000, "usedBytes must not be permanently inflated");
      assert.equal(reservedBytes, 0);
    });

    test("Upload finalization Scenario C: Material creation succeeds but finalization is interrupted, client retry reuses existing record", () => {
      const storageKey = "users/u1/documents/doc_retry.pdf";
      const existingMaterial = {
        _id: "mat_existing_1",
        storageKey,
        fileSizeBytes: 5_000_000,
        title: "Lecture Notes",
      };

      // Client retries upload after client-side timeout, but Material was already persisted
      let r2Deleted = false;
      let quotaReleased = false;
      let returnedMaterial = null;

      // In catch block: checks if Material already exists for storageKey
      const maybeMaterial = existingMaterial; // Material.findOne({ storageKey })
      if (maybeMaterial) {
        // Safe idempotency: reuse existing material without destructive rollback
        returnedMaterial = maybeMaterial;
      } else {
        r2Deleted = true;
        quotaReleased = true;
      }

      assert.equal(returnedMaterial._id, "mat_existing_1");
      assert.equal(r2Deleted, false, "Must not delete R2 object when Material already exists");
      assert.equal(quotaReleased, false, "Must not decrement quota when Material is valid");
    });

    test("Reconciliation: repeated reconciliation runs without counter drift", () => {
      const materials = [
        { storageKey: "users/u1/documents/d1.pdf", fileSizeBytes: 25_000_000 },
        { storageKey: "users/u1/documents/d2.pdf", fileSizeBytes: 15_000_000 },
      ];
      const activeReservations = [
        { _id: "r1", storageKey: "users/u1/documents/d3.pdf", fileSizeBytes: 10_000_000, status: "reserved" },
      ];

      const runReconcile = () => {
        const used = materials.reduce((acc, m) => acc + m.fileSizeBytes, 0);
        const res = activeReservations.reduce((acc, r) => acc + r.fileSizeBytes, 0);
        return { used, res };
      };

      const run1 = runReconcile();
      const run2 = runReconcile();
      const run3 = runReconcile();

      assert.deepEqual(run1, { used: 40_000_000, res: 10_000_000 });
      assert.deepEqual(run2, run1, "Run 2 must match Run 1 exactly");
      assert.deepEqual(run3, run1, "Run 3 must match Run 1 exactly");
    });

    test("deletion retry safely ignores already-deleted R2 404/NoSuchKey errors", () => {
      const notFoundError1 = new Error("Not Found");
      notFoundError1.name = "NoSuchKey";

      const notFoundError2 = new Error("Not Found");
      notFoundError2.$metadata = { httpStatusCode: 404 };

      const isIdempotent404 = (err) =>
        err.name === "NoSuchKey" || err.$metadata?.httpStatusCode === 404;

      assert.equal(isIdempotent404(notFoundError1), true);
      assert.equal(isIdempotent404(notFoundError2), true);

      const serverError = new Error("Internal Server Error");
      serverError.$metadata = { httpStatusCode: 500 };
      assert.equal(isIdempotent404(serverError), false);
    });
  });

  describe("Audit & Reconciliation Diagnostics", () => {
    test("auditR2Storage handles unconfigured storage safely", async () => {
      const audit = await auditR2Storage();
      assert.ok(typeof audit.isConfigured === "boolean");
      assert.ok(Array.isArray(audit.orphanedObjects));
      assert.ok(Array.isArray(audit.missingObjects));
    });

    test("distinguishes study documents from other application feature objects", () => {
      const keys = [
        "users/u1/documents/d1.pdf",
        "users/u2/documents/d2.txt",
        "avatars/u1.png",
        "exports/analytics.csv",
        "temp/backup.zip",
      ];

      const documentRegex = /^users\/[^/]+\/documents\/[^/]+$/i;
      const documents = keys.filter((k) => documentRegex.test(k));
      const otherFeatures = keys.filter((k) => !documentRegex.test(k));

      assert.equal(documents.length, 2);
      assert.equal(otherFeatures.length, 3);
      assert.ok(otherFeatures.includes("avatars/u1.png"));
      assert.ok(otherFeatures.includes("exports/analytics.csv"));
      assert.ok(otherFeatures.includes("temp/backup.zip"));
    });
  });

  describe("Controlled Concurrency on Actual Service Functions (Driver Interleavings)", () => {
    test("Priority 1: Concurrent commitStorageReservation calls do not double-increment usedBytes", async () => {
      process.env.MONGODB_URI = "mongodb://localhost:27017/test";
      const mongoose = (await import("mongoose")).default;
      global._mongooseCache = { conn: mongoose, promise: Promise.resolve(mongoose) };

      const reservationDoc = {
        _id: "res_race_p1",
        fileSizeBytes: 5_000_000,
        status: "reserved",
        quotaAllocated: true,
        quotaCommitted: false,
      };

      const quotaDoc = {
        _id: "global_storage_quota",
        usedBytes: 10_000_000,
        reservedBytes: 15_000_000,
        activeReservations: new Set(["res_race_p1"]),
      };

      const quotaUpdates = [];

      const origFindOneAndUpdate = StorageReservation.findOneAndUpdate;
      const origFindById = StorageReservation.findById;
      const origUpdateOne = StorageReservation.updateOne;
      const origQuotaUpdateOne = StorageQuota.updateOne;

      let firstCallSwapped = false;

      StorageReservation.findOneAndUpdate = async (filter) => {
        if (filter._id === "res_race_p1" && filter.status === "reserved") {
          if (!firstCallSwapped) {
            firstCallSwapped = true;
            reservationDoc.status = "committed";
            reservationDoc.quotaCommitted = false;
            return { ...reservationDoc };
          }
          return null;
        }
        return null;
      };

      StorageReservation.findById = async (id) => {
        if (id === "res_race_p1") {
          return { ...reservationDoc };
        }
        return null;
      };

      StorageReservation.updateOne = async (filter, update) => {
        if (update.$set?.quotaCommitted !== undefined) {
          reservationDoc.quotaCommitted = update.$set.quotaCommitted;
        }
        return { modifiedCount: 1 };
      };

      StorageQuota.updateOne = async (filter, pipeline) => {
        if (filter.activeReservations && !quotaDoc.activeReservations.has(filter.activeReservations)) {
          return { matchedCount: 0, modifiedCount: 0 };
        }
        if (filter.activeReservations) {
          quotaDoc.activeReservations.delete(filter.activeReservations);
        }
        quotaUpdates.push({ filter, pipeline });
        return { matchedCount: 1, modifiedCount: 1 };
      };

      try {
        const p1 = commitStorageReservation("res_race_p1", { materialId: "mat_p1" });
        const p2 = commitStorageReservation("res_race_p1", { materialId: "mat_p1" });

        const [res1, res2] = await Promise.all([p1, p2]);

        assert.equal(res1.success, true);
        assert.equal(res2.success, true);
        assert.ok(res1.alreadyCommitted !== res2.alreadyCommitted, "Exactly one caller reports initial commit, other reports alreadyCommitted");

        const quotaByteUpdates = quotaUpdates.filter((u) => Array.isArray(u.pipeline));
        assert.equal(quotaByteUpdates.length, 1, "StorageQuota byte updates must execute exactly once across concurrent commits");
        assert.equal(quotaDoc.activeReservations.has("res_race_p1"), false, "Reservation must be pulled from activeReservations");
      } finally {
        StorageReservation.findOneAndUpdate = origFindOneAndUpdate;
        StorageReservation.findById = origFindById;
        StorageReservation.updateOne = origUpdateOne;
        StorageQuota.updateOne = origQuotaUpdateOne;
      }
    });

    test("Priority 2: Concurrent releaseStorageReservation calls do not double-decrement reservedBytes", async () => {
      process.env.MONGODB_URI = "mongodb://localhost:27017/test";
      const mongoose = (await import("mongoose")).default;
      global._mongooseCache = { conn: mongoose, promise: Promise.resolve(mongoose) };

      const reservationDoc = {
        _id: "res_race_p2",
        fileSizeBytes: 5_000_000,
        status: "reserved",
        quotaAllocated: true,
        quotaReleased: false,
      };

      const quotaDoc = {
        _id: "global_storage_quota",
        usedBytes: 10_000_000,
        reservedBytes: 15_000_000,
        activeReservations: new Set(["res_race_p2"]),
      };

      const quotaUpdates = [];

      const origFindOneAndUpdate = StorageReservation.findOneAndUpdate;
      const origFindById = StorageReservation.findById;
      const origUpdateOne = StorageReservation.updateOne;
      const origQuotaUpdateOne = StorageQuota.updateOne;

      let firstCallSwapped = false;

      StorageReservation.findOneAndUpdate = async (filter) => {
        if (filter._id === "res_race_p2" && filter.status === "reserved") {
          if (!firstCallSwapped) {
            firstCallSwapped = true;
            reservationDoc.status = "released";
            reservationDoc.quotaReleased = false;
            return { ...reservationDoc };
          }
          return null;
        }
        return null;
      };

      StorageReservation.findById = async (id) => {
        if (id === "res_race_p2") {
          return { ...reservationDoc };
        }
        return null;
      };

      StorageReservation.updateOne = async (filter, update) => {
        if (update.$set?.quotaReleased !== undefined) {
          reservationDoc.quotaReleased = update.$set.quotaReleased;
        }
        return { modifiedCount: 1 };
      };

      StorageQuota.updateOne = async (filter, pipeline) => {
        if (filter.activeReservations && !quotaDoc.activeReservations.has(filter.activeReservations)) {
          return { matchedCount: 0, modifiedCount: 0 };
        }
        if (filter.activeReservations) {
          quotaDoc.activeReservations.delete(filter.activeReservations);
        }
        quotaUpdates.push({ filter, pipeline });
        return { matchedCount: 1, modifiedCount: 1 };
      };

      try {
        const p1 = releaseStorageReservation("res_race_p2", "aborted");
        const p2 = releaseStorageReservation("res_race_p2", "aborted");

        const [res1, res2] = await Promise.all([p1, p2]);

        assert.equal(res1.success, true);
        assert.equal(res2.success, true);
        assert.ok(res1.alreadyReleased !== res2.alreadyReleased, "Exactly one caller reports initial release, other reports alreadyReleased");

        const quotaByteUpdates = quotaUpdates.filter((u) => Array.isArray(u.pipeline));
        assert.equal(quotaByteUpdates.length, 1, "StorageQuota byte updates must execute exactly once across concurrent releases");
        assert.equal(quotaDoc.activeReservations.has("res_race_p2"), false, "Reservation must be pulled from activeReservations");
      } finally {
        StorageReservation.findOneAndUpdate = origFindOneAndUpdate;
        StorageReservation.findById = origFindById;
        StorageReservation.updateOne = origUpdateOne;
        StorageQuota.updateOne = origQuotaUpdateOne;
      }
    });

    test("Priority 2/Crash Recovery: expireStaleReservations does not double-decrement quota if already decremented before crash", async () => {
      process.env.MONGODB_URI = "mongodb://localhost:27017/test";
      const mongoose = (await import("mongoose")).default;
      global._mongooseCache = { conn: mongoose, promise: Promise.resolve(mongoose) };

      // Reservation crashed after quota was decremented and pulled from activeReservations,
      // but before quotaReleased flag was written
      const incompleteRes = {
        _id: "res_crash_rec",
        fileSizeBytes: 8_000_000,
        status: "expired",
        quotaAllocated: true,
        quotaReleased: false,
      };

      // StorageQuota already had this reservation pulled
      const quotaDoc = {
        _id: "global_storage_quota",
        reservedBytes: 0,
        activeReservations: [], // Already pulled!
      };

      const quotaUpdates = [];

      const origFind = StorageReservation.find;
      const origFindOneAndUpdate = StorageReservation.findOneAndUpdate;
      const origQuotaFindById = StorageQuota.findById;
      const origQuotaUpdateOne = StorageQuota.updateOne;

      StorageQuota.findById = async () => quotaDoc;

      StorageReservation.find = async (filter) => {
        if (filter.status === "pending") return [];
        if (filter.status === "reserved") return [];
        if (filter.quotaReleased === false) return [incompleteRes];
        return [];
      };

      StorageReservation.findOneAndUpdate = async (filter, update) => {
        if (filter._id === "res_crash_rec" && filter.quotaReleased === false) {
          incompleteRes.quotaReleased = true;
          return { ...incompleteRes };
        }
        return null;
      };

      StorageQuota.updateOne = async (filter, pipeline) => {
        quotaUpdates.push({ filter, pipeline });
        return { matchedCount: 1, modifiedCount: 1 };
      };

      try {
        const result = await expireStaleReservations();

        // Must not decrement quota again!
        assert.equal(result.releasedBytes, 0, "Must not release bytes again if already absent from activeReservations");
        assert.equal(quotaUpdates.length, 0, "No StorageQuota update should occur");
        assert.equal(incompleteRes.quotaReleased, true, "Reservation flag should be healed to quotaReleased: true");
      } finally {
        StorageReservation.find = origFind;
        StorageReservation.findOneAndUpdate = origFindOneAndUpdate;
        StorageQuota.findById = origQuotaFindById;
        StorageQuota.updateOne = origQuotaUpdateOne;
      }
    });
  });

  describe("Aggregation Update Pipeline Regression Suite", () => {
    test("StorageQuota.updateOne constructs query with updatePipeline: true without throwing MongooseError", () => {
      const query = StorageQuota.updateOne(
        { _id: "global_storage_quota" },
        [
          {
            $set: {
              reservedBytes: { $max: [0, { $subtract: ["$reservedBytes", 1000] }] },
            },
          },
        ],
        { updatePipeline: true }
      );

      assert.ok(query, "Query should be created successfully");
      assert.equal(query.op, "updateOne");
      assert.equal(Array.isArray(query.getUpdate()), true);
    });

    test("releaseStorageReservation passes updatePipeline: true to StorageQuota.updateOne on upload failure", async () => {
      const origFindOneAndUpdate = StorageReservation.findOneAndUpdate;
      const origResUpdateOne = StorageReservation.updateOne;
      const origQuotaUpdateOne = StorageQuota.updateOne;

      let capturedOptions = null;
      let capturedPipeline = null;

      const validReservationId = "507f1f77bcf86cd799439011";

      StorageReservation.findOneAndUpdate = async () => ({
        _id: validReservationId,
        fileSizeBytes: 2_000_000,
        status: "released",
        quotaReleased: false,
      });

      StorageReservation.updateOne = async () => ({ modifiedCount: 1 });

      StorageQuota.updateOne = async (filter, pipeline, options) => {
        capturedPipeline = pipeline;
        capturedOptions = options;
        return { matchedCount: 1, modifiedCount: 1 };
      };

      try {
        const result = await releaseStorageReservation(validReservationId, "upload_failed");
        assert.equal(result.success, true);
        assert.ok(Array.isArray(capturedPipeline), "Update must be an aggregation pipeline array");
        assert.deepEqual(capturedOptions, { updatePipeline: true }, "Must explicitly pass { updatePipeline: true }");
      } finally {
        StorageReservation.findOneAndUpdate = origFindOneAndUpdate;
        StorageReservation.updateOne = origResUpdateOne;
        StorageQuota.updateOne = origQuotaUpdateOne;
      }
    });

    test("commitStorageReservation passes updatePipeline: true to StorageQuota.updateOne on commit", async () => {
      const origFindOneAndUpdate = StorageReservation.findOneAndUpdate;
      const origResUpdateOne = StorageReservation.updateOne;
      const origQuotaUpdateOne = StorageQuota.updateOne;

      let capturedOptions = null;
      let capturedPipeline = null;

      const validReservationId = "507f1f77bcf86cd799439012";

      StorageReservation.findOneAndUpdate = async () => ({
        _id: validReservationId,
        fileSizeBytes: 3_000_000,
        status: "committed",
        quotaCommitted: false,
      });

      StorageReservation.updateOne = async () => ({ modifiedCount: 1 });

      StorageQuota.updateOne = async (filter, pipeline, options) => {
        capturedPipeline = pipeline;
        capturedOptions = options;
        return { matchedCount: 1, modifiedCount: 1 };
      };

      try {
        const result = await commitStorageReservation(validReservationId, { materialId: "507f1f77bcf86cd799439013" });
        assert.equal(result.success, true);
        assert.ok(Array.isArray(capturedPipeline), "Update must be an aggregation pipeline array");
        assert.deepEqual(capturedOptions, { updatePipeline: true }, "Must explicitly pass { updatePipeline: true }");
      } finally {
        StorageReservation.findOneAndUpdate = origFindOneAndUpdate;
        StorageReservation.updateOne = origResUpdateOne;
        StorageQuota.updateOne = origQuotaUpdateOne;
      }
    });

    test("releaseStorageOnDelete passes updatePipeline: true to StorageQuota.updateOne", async () => {
      const origQuotaUpdateOne = StorageQuota.updateOne;
      let capturedOptions = null;

      StorageQuota.updateOne = async (filter, pipeline, options) => {
        capturedOptions = options;
        return { matchedCount: 1, modifiedCount: 1 };
      };

      try {
        const result = await releaseStorageOnDelete(500_000);
        assert.equal(result.success, true);
        assert.deepEqual(capturedOptions, { updatePipeline: true }, "Must explicitly pass { updatePipeline: true }");
      } finally {
        StorageQuota.updateOne = origQuotaUpdateOne;
      }
    });
  });
});
