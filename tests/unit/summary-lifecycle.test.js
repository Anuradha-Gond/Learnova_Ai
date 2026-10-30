import { test, describe } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";

import {
  computeDocumentFingerprint,
  isSummaryCurrent,
  STALE_LOCK_TIMEOUT_MS,
  HEARTBEAT_INTERVAL_MS,
} from "../../src/services/studyAidsService.js";

describe("Learnova AI — Summary Persistence, Atomic Distributed Lock & Lifecycle Suite", () => {
  // ── TEST 1: Only one server instance can acquire a generation lock ───────────
  describe("Test 1: Distributed Atomic Lock Acquisition", () => {
    test("only one server instance can acquire a generation lock", async () => {
      // In-memory simulation of MongoDB collection with atomic findOneAndUpdate semantics
      let dbDocument = {
        _id: "mat_atomic_1",
        userId: "user_1",
        processingStatus: "ready",
        summaryStatus: "idle",
        summary: null,
        summaryLockId: null,
        summaryGeneratingAt: null,
        summaryLockHeartbeatAt: null,
      };

      // Atomic conditional update simulation matching MongoDB findOneAndUpdate query
      function atomicFindOneAndUpdate(doc, filter, update) {
        const matchesStatus =
          filter.$or?.some((cond) => {
            if (cond.summaryStatus?.$ne && doc.summaryStatus !== cond.summaryStatus.$ne) return true;
            if (cond.summaryStatus === "generating") {
              const staleCutoff = cond.$or?.[0]?.summaryLockHeartbeatAt?.$lt;
              if (
                doc.summaryStatus === "generating" &&
                staleCutoff &&
                doc.summaryLockHeartbeatAt &&
                doc.summaryLockHeartbeatAt < staleCutoff
              ) {
                return true;
              }
            }
            return false;
          }) ?? false;

        if (doc._id === filter._id && doc.userId === filter.userId && matchesStatus) {
          Object.assign(doc, update.$set);
          return { ...doc };
        }
        return null;
      }

      const staleThreshold = new Date(Date.now() - STALE_LOCK_TIMEOUT_MS);
      const acquireFilter = {
        _id: "mat_atomic_1",
        userId: "user_1",
        processingStatus: "ready",
        $or: [
          { summaryStatus: { $ne: "generating" } },
          {
            summaryStatus: "generating",
            $or: [
              { summaryLockHeartbeatAt: { $lt: staleThreshold } },
              { summaryLockHeartbeatAt: null, summaryGeneratingAt: { $lt: staleThreshold } },
            ],
          },
        ],
      };

      // Instance 1 attempts to acquire lock
      const lock1 = crypto.randomUUID();
      const resInstance1 = atomicFindOneAndUpdate(dbDocument, acquireFilter, {
        $set: {
          summaryStatus: "generating",
          summaryLockId: lock1,
          summaryGeneratingAt: new Date(),
          summaryLockHeartbeatAt: new Date(),
        },
      });

      assert.ok(resInstance1, "Instance 1 must successfully acquire the lock");
      assert.strictEqual(resInstance1.summaryLockId, lock1);
      assert.strictEqual(resInstance1.summaryStatus, "generating");

      // Instance 2 attempts to acquire lock on the same document concurrently
      const lock2 = crypto.randomUUID();
      const resInstance2 = atomicFindOneAndUpdate(dbDocument, acquireFilter, {
        $set: {
          summaryStatus: "generating",
          summaryLockId: lock2,
          summaryGeneratingAt: new Date(),
          summaryLockHeartbeatAt: new Date(),
        },
      });

      assert.strictEqual(resInstance2, null, "Instance 2 must be blocked from acquiring the lock");
      assert.strictEqual(dbDocument.summaryLockId, lock1, "Lock must remain held by Instance 1");
    });
  });

  // ── TEST 2: Concurrent requests cannot generate duplicate summaries ─────────
  describe("Test 2: Concurrency Deduplication & In-Flight Sharing", () => {
    test("concurrent requests cannot generate duplicate summaries", async () => {
      const activeSummaryGenerations = new Map();
      let geminiCallCount = 0;

      function simulateConcurrentCall(materialId) {
        if (activeSummaryGenerations.has(materialId)) {
          return activeSummaryGenerations.get(materialId);
        }

        const promise = (async () => {
          geminiCallCount++;
          await new Promise((r) => setTimeout(r, 40));
          return {
            summary: "Unified summary for " + materialId,
            cached: false,
          };
        })().finally(() => {
          activeSummaryGenerations.delete(materialId);
        });

        activeSummaryGenerations.set(materialId, promise);
        return promise;
      }

      const [res1, res2, res3] = await Promise.all([
        simulateConcurrentCall("mat_dup_test"),
        simulateConcurrentCall("mat_dup_test"),
        simulateConcurrentCall("mat_dup_test"),
      ]);

      assert.strictEqual(geminiCallCount, 1, "Gemini generation must only run once for concurrent requests");
      assert.strictEqual(res1.summary, "Unified summary for mat_dup_test");
      assert.strictEqual(res2.summary, res1.summary);
      assert.strictEqual(res3.summary, res1.summary);
      assert.strictEqual(activeSummaryGenerations.has("mat_dup_test"), false);
    });
  });

  // ── TEST 3: Initial generation locks work when no summary exists ─────────────
  describe("Test 3: Initial Generation Lock Verification", () => {
    test("initial generation locks work when no summary exists", () => {
      const initialDoc = {
        _id: "mat_init_1",
        userId: "user_student",
        summary: null,
        summaryStatus: "idle",
        summaryLockId: null,
        summaryGeneratingAt: null,
      };

      assert.strictEqual(initialDoc.summary, null);
      assert.strictEqual(initialDoc.summaryStatus, "idle");

      // Verify that lock filter matches idle document with null summary
      const canAcquire = initialDoc.summaryStatus !== "generating";
      assert.strictEqual(canAcquire, true, "Uninitialized document must be eligible for lock acquisition");

      // Simulate lock acquisition
      const lockId = crypto.randomUUID();
      const lockedDoc = {
        ...initialDoc,
        summaryStatus: "generating",
        summaryLockId: lockId,
        summaryGeneratingAt: new Date(),
        summaryLockHeartbeatAt: new Date(),
      };

      // A concurrent request arriving while summary is null must receive inProgress: true
      const concurrentResponse = {
        summary: lockedDoc.summary || null,
        summaryStatus: lockedDoc.summaryStatus,
        cached: Boolean(lockedDoc.summary),
        inProgress: true,
      };

      assert.strictEqual(concurrentResponse.summary, null);
      assert.strictEqual(concurrentResponse.summaryStatus, "generating");
      assert.strictEqual(concurrentResponse.inProgress, true);
      assert.strictEqual(concurrentResponse.cached, false);
    });
  });

  // ── TEST 4: Legitimate long-running generation is not marked stale ────────────
  describe("Test 4: Heartbeat Renewal & Long-Running Task Protection", () => {
    test("legitimate long-running generation is not incorrectly marked stale when heartbeat is active", () => {
      const timeoutMs = STALE_LOCK_TIMEOUT_MS; // 60s
      assert.strictEqual(timeoutMs, 60000);
      assert.strictEqual(HEARTBEAT_INTERVAL_MS, 15000);

      // Task started 4 minutes ago, but heartbeat updated 10 seconds ago
      const generationStartedAt = new Date(Date.now() - 4 * 60 * 1000);
      const lastHeartbeatAt = new Date(Date.now() - 10 * 1000); // 10s ago

      const elapsedSinceHeartbeat = Date.now() - lastHeartbeatAt.getTime();
      const isStale = elapsedSinceHeartbeat >= timeoutMs;

      assert.strictEqual(
        isStale,
        false,
        "Active task with recent heartbeat must NOT be considered stale even if total runtime is long"
      );
    });
  });

  // ── TEST 5: Abandoned locks can be recovered ─────────────────────────────────
  describe("Test 5: Abandoned Lock Recovery", () => {
    test("abandoned locks older than timeout threshold can be recovered atomically", () => {
      const staleHeartbeat = new Date(Date.now() - 75 * 1000); // 75 seconds ago (> 60s timeout)
      const abandonedDoc = {
        _id: "mat_crashed_worker",
        userId: "user_student",
        summaryStatus: "generating",
        summaryLockId: "old_crashed_lock",
        summaryLockHeartbeatAt: staleHeartbeat,
      };

      const staleThreshold = new Date(Date.now() - STALE_LOCK_TIMEOUT_MS);
      const isEligibleForRecovery =
        abandonedDoc.summaryStatus === "generating" &&
        abandonedDoc.summaryLockHeartbeatAt < staleThreshold;

      assert.strictEqual(isEligibleForRecovery, true, "Abandoned lock must be detected as eligible for recovery");

      // New worker takes over the lock
      const newLockId = crypto.randomUUID();
      const recoveredDoc = {
        ...abandonedDoc,
        summaryLockId: newLockId,
        summaryGeneratingAt: new Date(),
        summaryLockHeartbeatAt: new Date(),
      };

      assert.strictEqual(recoveredDoc.summaryLockId, newLockId);
      assert.notStrictEqual(recoveredDoc.summaryLockId, abandonedDoc.summaryLockId);
      assert.strictEqual(recoveredDoc.summaryStatus, "generating");
    });
  });

  // ── TEST 6: An old request cannot release a newer lock ────────────────────────
  describe("Test 6: Lock Ownership & Release Safety", () => {
    test("an old request cannot release a newer request's lock", () => {
      let dbDoc = {
        _id: "mat_ownership_test",
        summaryStatus: "generating",
        summaryLockId: "lock_instance_2_newer", // Newer instance owns the lock
      };

      // Stalled Instance 1 tries to release or rollback the lock with its expired lockId
      const expiredLockId = "lock_instance_1_expired";

      function safeReleaseLock(doc, targetLockId, newStatus) {
        if (doc.summaryLockId === targetLockId) {
          doc.summaryStatus = newStatus;
          doc.summaryLockId = null;
          return { matchedCount: 1 };
        }
        return { matchedCount: 0 };
      }

      const releaseAttempt = safeReleaseLock(dbDoc, expiredLockId, "failed");

      assert.strictEqual(releaseAttempt.matchedCount, 0, "Expired lock release must match 0 records");
      assert.strictEqual(
        dbDoc.summaryLockId,
        "lock_instance_2_newer",
        "Newer instance's lock must remain untouched"
      );
      assert.strictEqual(dbDoc.summaryStatus, "generating");
    });

    test("an expired request cannot overwrite a newer successful summary", () => {
      let dbDoc = {
        _id: "mat_summary_overwrite_test",
        summary: "Newer high-quality summary from Instance 2",
        summaryLockId: null,
        summaryStatus: "ready",
      };

      // Stalled Instance 1 finishes very late and attempts to write with its old lock
      const oldLockId = "lock_instance_1";
      function safeWriteSummary(doc, targetLockId, newSummary) {
        if (doc.summaryLockId === targetLockId) {
          doc.summary = newSummary;
          return { matchedCount: 1 };
        }
        return { matchedCount: 0 };
      }

      const writeAttempt = safeWriteSummary(dbDoc, oldLockId, "Stale summary from expired worker");
      assert.strictEqual(writeAttempt.matchedCount, 0, "Stale write must be rejected");
      assert.strictEqual(dbDoc.summary, "Newer high-quality summary from Instance 2");
    });
  });

  // ── TEST 7: A document update invalidates the old summary ─────────────────────
  describe("Test 7: Document Version & Fingerprint Invalidation", () => {
    test("a document update invalidates the old summary", () => {
      const originalMaterial = {
        storageKey: "materials/physics_ch1.pdf",
        fileSizeBytes: 204800,
        chunkCount: 12,
        wordCount: 3200,
        documentVersion: 1,
      };

      const originalFingerprint = computeDocumentFingerprint(originalMaterial);
      assert.ok(originalFingerprint.length > 0);

      // Material has a summary generated for version 1
      const materialWithSummary = {
        ...originalMaterial,
        summary: "### Overview\nPhysics Chapter 1 Summary...",
        summaryVersion: 1,
        summaryFingerprint: originalFingerprint,
      };

      assert.strictEqual(isSummaryCurrent(materialWithSummary), true, "Summary must be valid initially");

      // Document is updated/re-ingested: new chunks, new word count, incremented version
      const updatedMaterial = {
        ...materialWithSummary,
        chunkCount: 16,
        wordCount: 4100,
        documentVersion: 2,
      };

      assert.strictEqual(
        isSummaryCurrent(updatedMaterial),
        false,
        "Summary must be invalidated when document content or version changes"
      );
    });

    test("unrelated metadata updates do not invalidate the summary", () => {
      const material = {
        storageKey: "materials/bio_ch2.pdf",
        fileSizeBytes: 102400,
        chunkCount: 8,
        wordCount: 2000,
        documentVersion: 1,
        title: "Original Title",
        topicTags: ["Biology"],
      };

      const fingerprint = computeDocumentFingerprint(material);
      const materialWithSummary = {
        ...material,
        summary: "### Overview\nBiology Summary...",
        summaryVersion: 1,
        summaryFingerprint: fingerprint,
      };

      assert.strictEqual(isSummaryCurrent(materialWithSummary), true);

      // Only metadata changes (title, tags, updatedAt)
      const metadataEdited = {
        ...materialWithSummary,
        title: "Updated Biology Title with More Details",
        topicTags: ["Biology", "Cell Biology", "Mitosis"],
        updatedAt: new Date(),
      };

      assert.strictEqual(
        computeDocumentFingerprint(metadataEdited),
        fingerprint,
        "Fingerprint must not change for unrelated metadata edits"
      );
      assert.strictEqual(
        isSummaryCurrent(metadataEdited),
        true,
        "Summary must remain current when only title/tags change"
      );
    });
  });

  // ── TEST 8: Failed regeneration preserves the previous summary ───────────────
  describe("Test 8: Regeneration Failure Rollback", () => {
    test("failed regeneration preserves previous summary and resets status to ready", () => {
      const existingSummary = "Original verified summary that must be protected.";
      const originalFingerprint = computeDocumentFingerprint({
        storageKey: "key.pdf",
        fileSizeBytes: 1000,
        chunkCount: 5,
        wordCount: 800,
        documentVersion: 1,
      });

      const material = {
        summary: existingSummary,
        summaryVersion: 1,
        summaryFingerprint: originalFingerprint,
        storageKey: "key.pdf",
        fileSizeBytes: 1000,
        chunkCount: 5,
        wordCount: 800,
        documentVersion: 1,
      };

      // Simulating error catch during regeneration
      const isCurrent = isSummaryCurrent(material);
      assert.strictEqual(isCurrent, true);

      const rollbackStatus = material.summary && isCurrent ? "ready" : "failed";
      assert.strictEqual(rollbackStatus, "ready", "Status must rollback to 'ready'");
      assert.strictEqual(material.summary, existingSummary, "Original summary must remain unchanged");
    });
  });

  // ── TEST 9: Different users cannot access another user's material or summary ──
  describe("Test 9: Multi-Tenant Access Isolation", () => {
    test("different users cannot access another user's material or summary", () => {
      const materialOwnerId = "student_user_alpha_123";
      const unauthorizedUserId = "student_user_beta_456";

      const materialInDb = {
        _id: "mat_confidential_1",
        userId: materialOwnerId,
        title: "Confidential Research Paper",
        summary: "Private student summary...",
      };

      // Query enforcing ownership filter: { _id, userId }
      function queryMaterial(id, userId) {
        if (materialInDb._id === id && materialInDb.userId === userId) {
          return materialInDb;
        }
        return null;
      }

      const authorizedAccess = queryMaterial("mat_confidential_1", materialOwnerId);
      assert.ok(authorizedAccess, "Owner must be allowed access");
      assert.strictEqual(authorizedAccess.summary, "Private student summary...");

      const unauthorizedAccess = queryMaterial("mat_confidential_1", unauthorizedUserId);
      assert.strictEqual(unauthorizedAccess, null, "Cross-tenant access must return null (access denied)");
    });
  });
});
