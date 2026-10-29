import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { GET } from "../../src/app/api/health/route.js";

describe("Learnova AI — Integration Test Suite", () => {
  describe("GET /api/health", () => {
    test("returns 200 OK with healthy status and metadata", async () => {
      const response = await GET();
      assert.equal(response.status, 200);

      const data = await response.json();
      assert.equal(data.status, "healthy");
      assert.equal(data.platform, "Learnova AI");
      assert.ok(data.timestamp);
    });
  });
});
