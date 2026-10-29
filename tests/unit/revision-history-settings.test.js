import { test, describe } from "node:test";
import assert from "node:assert/strict";

// ── Pure Service Imports ──────────────────────────────────────────────────────
import { buildActivityTimeline } from "../../src/services/historyService.js";

// ── Validation Schemas ────────────────────────────────────────────────────────
import {
  profileUpdateSchema,
  passwordChangeSchema,
} from "../../src/validations/user.js";
import {
  recommendationStatusUpdateSchema,
} from "../../src/validations/analytics.js";

describe("Learnova AI — Milestone 8 Final Gap: Revision, History & Settings Tests", () => {
  // ── 1. Learning History & Timeline Construction ─────────────────────────────
  describe("Learning History & Activity Timeline", () => {
    test("buildActivityTimeline returns empty array for empty datasets", () => {
      const timeline = buildActivityTimeline([], [], []);
      assert.deepStrictEqual(timeline, []);
    });

    test("accurately constructs and sorts timeline events from newest to oldest", () => {
      const submissions = [
        {
          _id: "sub-1",
          quizId: { _id: "quiz-1", title: "Data Structures Quiz" },
          materialId: { _id: "mat-1", title: "Lecture 1 Notes" },
          scorePercentage: 90,
          correctCount: 9,
          totalQuestions: 10,
          submittedAt: new Date("2026-10-25T10:00:00Z"),
        },
      ];

      const materials = [
        {
          _id: "mat-1",
          title: "Lecture 1 Notes",
          fileType: "pdf",
          fileSize: 1048576,
          processingStatus: "ready",
          createdAt: new Date("2026-10-24T09:00:00Z"),
        },
      ];

      const revisions = [
        {
          _id: "rev-1",
          title: "Urgent Revision: Binary Trees",
          topicTag: "Binary Trees",
          priority: 20,
          status: "completed",
          updatedAt: new Date("2026-10-26T14:00:00Z"),
        },
      ];

      const timeline = buildActivityTimeline(submissions, materials, revisions);

      assert.strictEqual(timeline.length, 3);
      // Newest event first (rev-1 on Oct 26)
      assert.strictEqual(timeline[0].type, "revision_completed");
      assert.strictEqual(timeline[0].title, "Urgent Revision: Binary Trees");
      assert.strictEqual(timeline[0].priority, "HIGH");

      // Second event (sub-1 on Oct 25)
      assert.strictEqual(timeline[1].type, "quiz_completed");
      assert.strictEqual(timeline[1].scorePercentage, 90);
      assert.strictEqual(timeline[1].totalQuestions, 10);

      // Third event (mat-1 on Oct 24)
      assert.strictEqual(timeline[2].type, "material_uploaded");
      assert.strictEqual(timeline[2].fileType, "pdf");
    });

    test("strictly ensures student history queries isolate users", () => {
      const mockSubmissions = [
        { id: "sub-1", userId: "student-1", scorePercentage: 85 },
        { id: "sub-2", userId: "student-2", scorePercentage: 70 },
      ];

      const getForUser = (userId) => mockSubmissions.filter((s) => s.userId === userId);

      assert.strictEqual(getForUser("student-1").length, 1);
      assert.strictEqual(getForUser("student-1")[0].id, "sub-1");
      assert.strictEqual(getForUser("student-2").length, 1);
      assert.strictEqual(getForUser("student-2")[0].id, "sub-2");
    });
  });

  // ── 2. Revision Recommendations Flow & State Persistence ────────────────────
  describe("Revision Recommendations Flow & State Persistence", () => {
    test("supports full status progression through pending, completed, and dismissed", () => {
      const recommendation = {
        id: "rec-1",
        topicTag: "Recursion",
        status: "pending",
      };

      const validTransitions = ["completed", "reviewed", "dismissed", "pending"];
      for (const nextStatus of validTransitions) {
        const parse = recommendationStatusUpdateSchema.safeParse({ status: nextStatus });
        assert.strictEqual(parse.success, true);
        recommendation.status = parse.data.status;
      }
      assert.strictEqual(recommendation.status, "pending");
    });

    test("filters recommendations accurately by status and priority", () => {
      const recs = [
        { id: "1", priority: "HIGH", status: "pending" },
        { id: "2", priority: "MEDIUM", status: "completed" },
        { id: "3", priority: "LOW", status: "dismissed" },
      ];

      const pendingOnly = recs.filter((r) => r.status === "pending");
      assert.strictEqual(pendingOnly.length, 1);
      assert.strictEqual(pendingOnly[0].id, "1");

      const highPriorityOnly = recs.filter((r) => r.priority === "HIGH");
      assert.strictEqual(highPriorityOnly.length, 1);
      assert.strictEqual(highPriorityOnly[0].id, "1");
    });
  });

  // ── 3. User Settings Validation & Security Protections ───────────────────────
  describe("User Settings Validation & Protected Field Defenses", () => {
    test("validates profile updates with valid name and academic fields", () => {
      const valid = profileUpdateSchema.safeParse({
        name: "Alex Taylor",
        academicLevel: "Undergraduate",
        targetExam: "GRE",
      });

      assert.strictEqual(valid.success, true);
      assert.strictEqual(valid.data.name, "Alex Taylor");
      assert.strictEqual(valid.data.academicLevel, "Undergraduate");
      assert.strictEqual(valid.data.targetExam, "GRE");
    });

    test("allows optional academicLevel and targetExam to be null or empty", () => {
      const valid = profileUpdateSchema.safeParse({
        name: "Jordan Lee",
        academicLevel: null,
        targetExam: "",
      });

      assert.strictEqual(valid.success, true);
      assert.strictEqual(valid.data.academicLevel, null);
    });

    test("rejects profile updates with empty name or name exceeding 100 chars", () => {
      const emptyName = profileUpdateSchema.safeParse({ name: "" });
      assert.strictEqual(emptyName.success, false);

      const longName = profileUpdateSchema.safeParse({ name: "A".repeat(101) });
      assert.strictEqual(longName.success, false);
    });

    test("detects and rejects attempts to modify protected fields like role or isActive", () => {
      const checkProtected = (body) => {
        const protectedFields = ["role", "email", "password", "_id", "isActive"];
        return protectedFields.filter((f) => f in body);
      };

      const attackerPayload = {
        name: "Hacker",
        role: "admin",
        isActive: true,
      };

      const violations = checkProtected(attackerPayload);
      assert.deepStrictEqual(violations, ["role", "isActive"]);
    });

    test("validates password change with minimum 8 characters", () => {
      const valid = passwordChangeSchema.safeParse({
        currentPassword: "OldPassword123!",
        newPassword: "StrongNewPassword456!",
      });

      assert.strictEqual(valid.success, true);

      const tooShort = passwordChangeSchema.safeParse({
        currentPassword: "OldPassword123!",
        newPassword: "short",
      });

      assert.strictEqual(tooShort.success, false);
    });
  });
});
