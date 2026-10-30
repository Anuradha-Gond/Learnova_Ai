import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { isSafeMarkdownUrl } from "../../src/lib/utils.js";

describe("Learnova AI — Markdown Link Security Suite (Task A)", () => {
  describe("Allowed Safe URLs (Explicit Allowlist)", () => {
    test("allows standard HTTPS links", () => {
      assert.equal(isSafeMarkdownUrl("https://learnova.ai"), true);
      assert.equal(isSafeMarkdownUrl("https://example.org/docs/page?query=test#heading"), true);
    });

    test("allows standard HTTP links", () => {
      assert.equal(isSafeMarkdownUrl("http://example.com"), true);
      assert.equal(isSafeMarkdownUrl("http://localhost:3000/test"), true);
    });

    test("allows mailto links without slashes in path", () => {
      assert.equal(isSafeMarkdownUrl("mailto:support@learnova.ai"), true);
      assert.equal(isSafeMarkdownUrl("mailto:student@university.edu"), true);
    });

    test("allows relative application paths starting with a single slash", () => {
      assert.equal(isSafeMarkdownUrl("/materials/671fd89a123"), true);
      assert.equal(isSafeMarkdownUrl("/dashboard"), true);
      assert.equal(isSafeMarkdownUrl("/quizzes"), true);
      assert.equal(isSafeMarkdownUrl("/revision?filter=pending"), true);
    });

    test("allows safe in-page anchor hash links", () => {
      assert.equal(isSafeMarkdownUrl("#summary"), true);
      assert.equal(isSafeMarkdownUrl("#section-1"), true);
      assert.equal(isSafeMarkdownUrl("#takeaways"), true);
    });

    test("allows safe URLs with leading or trailing whitespace (trimmed safely)", () => {
      assert.equal(isSafeMarkdownUrl("   https://example.com/safe   "), true);
      assert.equal(isSafeMarkdownUrl("\t/materials/abc\n"), true);
    });
  });

  describe("Rejected Dangerous Schemes & Attack Vectors", () => {
    test("rejects javascript: URLs with case variants and whitespace", () => {
      assert.equal(isSafeMarkdownUrl("javascript:alert(1)"), false);
      assert.equal(isSafeMarkdownUrl("JAVASCRIPT:alert(document.cookie)"), false);
      assert.equal(isSafeMarkdownUrl("  javascript:alert(1)  "), false);
      assert.equal(isSafeMarkdownUrl("javascript :alert(1)"), false);
    });

    test("rejects control characters and null bytes in URLs", () => {
      assert.equal(isSafeMarkdownUrl("\x00javascript:alert(1)"), false);
      assert.equal(isSafeMarkdownUrl("\x1Fjavascript:alert(1)"), false);
      assert.equal(isSafeMarkdownUrl("jav\x09ascript:alert(1)"), false);
    });

    test("rejects vbscript: URLs", () => {
      assert.equal(isSafeMarkdownUrl("vbscript:msgbox(1)"), false);
      assert.equal(isSafeMarkdownUrl("VBSCRIPT:msgbox(1)"), false);
    });

    test("rejects data: URLs to prevent embedded HTML/script execution", () => {
      assert.equal(isSafeMarkdownUrl("data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=="), false);
      assert.equal(isSafeMarkdownUrl("DATA:text/html,<script>alert(1)</script>"), false);
    });

    test("rejects file: and blob: schemes", () => {
      assert.equal(isSafeMarkdownUrl("file:///etc/passwd"), false);
      assert.equal(isSafeMarkdownUrl("file:///C:/Windows/win.ini"), false);
      assert.equal(isSafeMarkdownUrl("blob:https://learnova.ai/f47ac10b-58cc-4372-a567-0e02b2c3d479"), false);
    });

    test("rejects protocol-relative URLs (//) and backslash variants", () => {
      assert.equal(isSafeMarkdownUrl("//attacker.com"), false);
      assert.equal(isSafeMarkdownUrl("//evil.com/payload"), false);
      assert.equal(isSafeMarkdownUrl("/\\attacker.com"), false);
      assert.equal(isSafeMarkdownUrl("/  /attacker.com"), false);
    });

    test("rejects unknown or unsupported URL schemes", () => {
      assert.equal(isSafeMarkdownUrl("ftp://ftp.example.com"), false);
      assert.equal(isSafeMarkdownUrl("ssh://git@github.com"), false);
      assert.equal(isSafeMarkdownUrl("telnet://192.168.1.1"), false);
      assert.equal(isSafeMarkdownUrl("custom-scheme://test"), false);
    });

    test("rejects encoded scheme bypasses and invalid inputs", () => {
      assert.equal(isSafeMarkdownUrl("javascript%3aalert(1)"), false);
      assert.equal(isSafeMarkdownUrl("jav&#09;ascript:alert(1)"), false);
      assert.equal(isSafeMarkdownUrl(""), false);
      assert.equal(isSafeMarkdownUrl(null), false);
      assert.equal(isSafeMarkdownUrl(undefined), false);
      assert.equal(isSafeMarkdownUrl(12345), false);
    });
  });
});

