import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { loginSchema, registerClientSchema, registerApiSchema } from "../../src/validations/auth.js";

describe("Learnova AI — Auth Validation Schemas", () => {
  describe("loginSchema", () => {
    test("accepts valid credentials", () => {
      const result = loginSchema.safeParse({
        email: "Student@Example.Com",
        password: "securePassword123",
      });
      assert.equal(result.success, true);
      assert.equal(result.data.email, "student@example.com");
    });

    test("rejects invalid email address", () => {
      const result = loginSchema.safeParse({
        email: "not-an-email",
        password: "securePassword123",
      });
      assert.equal(result.success, false);
      assert.ok(result.error.flatten().fieldErrors.email);
    });

    test("rejects empty password", () => {
      const result = loginSchema.safeParse({
        email: "test@example.com",
        password: "",
      });
      assert.equal(result.success, false);
      assert.ok(result.error.flatten().fieldErrors.password);
    });
  });

  describe("registerClientSchema", () => {
    test("accepts matching password and confirmPassword", () => {
      const result = registerClientSchema.safeParse({
        name: "Jane Doe",
        email: "jane@university.edu",
        password: "password123",
        confirmPassword: "password123",
      });
      assert.equal(result.success, true);
      assert.equal(result.data.email, "jane@university.edu");
    });

    test("rejects mismatched passwords", () => {
      const result = registerClientSchema.safeParse({
        name: "Jane Doe",
        email: "jane@university.edu",
        password: "password123",
        confirmPassword: "differentPassword456",
      });
      assert.equal(result.success, false);
      assert.ok(result.error.flatten().fieldErrors.confirmPassword);
      assert.equal(result.error.flatten().fieldErrors.confirmPassword[0], "Passwords do not match");
    });

    test("rejects short password less than 8 characters", () => {
      const result = registerClientSchema.safeParse({
        name: "Jane Doe",
        email: "jane@university.edu",
        password: "short",
        confirmPassword: "short",
      });
      assert.equal(result.success, false);
      assert.ok(result.error.flatten().fieldErrors.password);
    });
  });

  describe("registerApiSchema", () => {
    test("accepts valid registration payload", () => {
      const result = registerApiSchema.safeParse({
        name: "Alex Smith",
        email: "alex@learnova.ai",
        password: "securePassword2026",
      });
      assert.equal(result.success, true);
      assert.equal(result.data.name, "Alex Smith");
      assert.equal(result.data.email, "alex@learnova.ai");
    });

    test("rejects name under 2 characters", () => {
      const result = registerApiSchema.safeParse({
        name: "A",
        email: "alex@learnova.ai",
        password: "securePassword2026",
      });
      assert.equal(result.success, false);
      assert.ok(result.error.flatten().fieldErrors.name);
    });
  });
});
