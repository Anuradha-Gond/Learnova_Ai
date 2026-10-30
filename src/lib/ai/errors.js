/**
 * Learnova AI — Centralized Gemini Error Classification
 *
 * Provides consistent error classification, retry decisions, and user-facing
 * messages for all Gemini API errors across the application.
 *
 * Usage:
 *   import { classifyGeminiError, GeminiErrorCode, callGeminiWithRetry } from "@/lib/ai/errors.js";
 *   const { code, isRetryable, userMessage, httpStatus } = classifyGeminiError(err);
 */

/** Canonical Gemini error codes used throughout Learnova AI */
export const GeminiErrorCode = {
  /** API key is missing, invalid, or permission-denied */
  KEY_INVALID: "AI_KEY_INVALID",
  /** Gemini API key is not configured in the server environment */
  NOT_CONFIGURED: "AI_NOT_CONFIGURED",
  /** The configured model name is not found / deprecated */
  MODEL_NOT_FOUND: "AI_MODEL_NOT_FOUND",
  /** Temporary rate limit (per-minute) — retryable after a short wait */
  RATE_LIMIT: "AI_RATE_LIMIT",
  /** Daily/monthly quota fully exhausted — not retryable until reset window */
  QUOTA_EXHAUSTED: "AI_QUOTA_EXHAUSTED",
  /** Temporary service high demand (503) — retryable with backoff */
  HIGH_DEMAND: "AI_HIGH_DEMAND",
  /** Network or connection-level error — retryable */
  NETWORK_ERROR: "AI_NETWORK_ERROR",
  /** Gemini returned an empty response */
  EMPTY_RESPONSE: "AI_EMPTY_RESPONSE",
  /** Malformed JSON or parse error from Gemini output */
  PARSE_ERROR: "AI_PARSE_ERROR",
  /** Request timed out */
  TIMEOUT: "AI_TIMEOUT",
  /** Unclassified generation error */
  GENERATION_ERROR: "AI_GEN_ERROR",
};

/**
 * @typedef {object} ClassifiedGeminiError
 * @property {string} code         - GeminiErrorCode constant
 * @property {boolean} isRetryable - Whether it is safe to retry this error immediately
 * @property {string} userMessage  - Safe, user-facing message (no credentials/internals)
 * @property {number} httpStatus   - Appropriate HTTP status for API responses
 * @property {string} logMessage   - Detailed message for server-side logging only
 */

/**
 * Classifies a Gemini SDK error into a structured, actionable object.
 *
 * Handles the following error categories:
 * - 401 / API_KEY_INVALID / PERMISSION_DENIED → key invalid (not retryable)
 * - 404 / model not found / no longer available → model not found (not retryable)
 * - 429 with daily quota/exhausted indicators → quota exhausted (not retryable)
 * - 429 without daily quota indicators → temporary rate limit (retryable)
 * - 503 / high demand / overloaded / unavailable → high demand (retryable with backoff)
 * - network/fetch/timeout errors → network/timeout (retryable)
 * - everything else → generation error (not retryable)
 *
 * @param {Error|any} err - The caught error from the Gemini SDK or fetch
 * @returns {ClassifiedGeminiError}
 */
export function classifyGeminiError(err) {
  if (!err) {
    return {
      code: GeminiErrorCode.GENERATION_ERROR,
      isRetryable: false,
      httpStatus: 500,
      userMessage: "An unexpected AI service error occurred. Please try again.",
      logMessage: "classifyGeminiError received empty/null error",
    };
  }

  const rawMessage = typeof err === "string" ? err : err.message || "";
  const msg = rawMessage.toLowerCase();
  const status = err.status || err.statusCode || err.code;

  // ── 1. Key / Auth errors (401 / 403) ──────────────────────────────────────
  const isKeyInvalid =
    msg.includes("api_key_invalid") ||
    msg.includes("api key not valid") ||
    msg.includes("api key not found") ||
    msg.includes("permission_denied") ||
    status === 401 ||
    status === 403 ||
    String(status) === "401" ||
    String(status) === "403";

  if (isKeyInvalid) {
    return {
      code: GeminiErrorCode.KEY_INVALID,
      isRetryable: false,
      httpStatus: 401,
      userMessage:
        "The AI service credentials are invalid or lack necessary permissions. Please contact your administrator.",
      logMessage: `Gemini authentication failure: ${rawMessage}`,
    };
  }

  // ── 2. Model not found (404) ──────────────────────────────────────────────
  const isModelNotFound =
    status === 404 ||
    String(status) === "404" ||
    msg.includes("not found") ||
    msg.includes("no longer available") ||
    msg.includes("model not supported") ||
    msg.includes("is not supported for this api");

  if (isModelNotFound) {
    return {
      code: GeminiErrorCode.MODEL_NOT_FOUND,
      isRetryable: false,
      httpStatus: 500,
      userMessage:
        "The configured AI model is temporarily unavailable. Please try again later.",
      logMessage: `Gemini model not found or unsupported: ${rawMessage}`,
    };
  }

  // ── 3. Quota / Rate limit (429) ───────────────────────────────────────────
  const is429 =
    status === 429 ||
    String(status) === "429" ||
    msg.includes("429") ||
    msg.includes("quota") ||
    msg.includes("rate limit") ||
    msg.includes("resource_exhausted") ||
    msg.includes("too many requests");

  if (is429) {
    // Detect daily quota exhaustion vs temporary per-minute rate limit
    const isDailyExhausted =
      msg.includes("daily") ||
      msg.includes("per day") ||
      msg.includes("perday") ||
      msg.includes("quota exceeded") ||
      msg.includes("exhausted") ||
      msg.includes("resource has been exhausted") ||
      msg.includes("free tier") ||
      msg.includes("billing") ||
      msg.includes("retry after 1") ||
      msg.includes("retry after 2") ||
      msg.includes("hours") ||
      msg.includes("generaterequestsperday");

    if (isDailyExhausted) {
      return {
        code: GeminiErrorCode.QUOTA_EXHAUSTED,
        isRetryable: false,
        httpStatus: 429,
        userMessage:
          "The daily AI generation quota has been exhausted. AI features will resume once Google resets the quota (typically at midnight Pacific Time).",
        logMessage: `Gemini daily quota exhausted: ${rawMessage}`,
      };
    }

    // Temporary per-minute rate limit
    return {
      code: GeminiErrorCode.RATE_LIMIT,
      isRetryable: true,
      httpStatus: 429,
      userMessage:
        "The AI service is temporarily receiving high traffic. Please wait a moment and try again.",
      logMessage: `Gemini temporary rate limit (RPM): ${rawMessage}`,
    };
  }

  // ── 4. Service unavailable / High demand (503) ────────────────────────────
  const is503 =
    status === 503 ||
    String(status) === "503" ||
    msg.includes("503") ||
    msg.includes("service unavailable") ||
    msg.includes("high demand") ||
    msg.includes("overloaded") ||
    msg.includes("temporarily unavailable") ||
    msg.includes("the model is overloaded");

  if (is503) {
    return {
      code: GeminiErrorCode.HIGH_DEMAND,
      isRetryable: true,
      httpStatus: 503,
      userMessage:
        "The AI service is currently experiencing high demand. Please try again in a few moments.",
      logMessage: `Gemini high demand / 503: ${rawMessage}`,
    };
  }

  // ── 5. Network / Fetch / Connection errors ────────────────────────────────
  const isNetwork =
    err.name === "FetchError" ||
    msg.includes("fetch failed") ||
    msg.includes("network error") ||
    msg.includes("econnreset") ||
    msg.includes("enotfound") ||
    msg.includes("socket hang up");

  if (isNetwork) {
    return {
      code: GeminiErrorCode.NETWORK_ERROR,
      isRetryable: true,
      httpStatus: 503,
      userMessage:
        "Network connection to the AI service failed. Please check your connection and try again.",
      logMessage: `Gemini network error: ${rawMessage}`,
    };
  }

  // ── 6. Timeout (504) ──────────────────────────────────────────────────────
  const isTimeout =
    msg.includes("timeout") ||
    msg.includes("timed out") ||
    msg.includes("deadline exceeded");

  if (isTimeout) {
    return {
      code: GeminiErrorCode.TIMEOUT,
      isRetryable: true,
      httpStatus: 504,
      userMessage:
        "The AI service took too long to respond. Please try again with a shorter request.",
      logMessage: `Gemini timeout: ${rawMessage}`,
    };
  }

  // ── 7. Fallback generation error (500) ────────────────────────────────────
  return {
    code: GeminiErrorCode.GENERATION_ERROR,
    isRetryable: false,
    httpStatus: 500,
    userMessage:
      "Failed to generate response from the AI service. Please try again.",
    logMessage: `Gemini unclassified error: ${rawMessage}`,
  };
}

/**
 * Executes a Gemini API call with bounded retries using exponential backoff.
 * Strictly adheres to retryability rules:
 * - NEVER retries non-retryable errors (429 daily quota exhausted, 401 key invalid, 404 model not found).
 * - Bounded retries only for retryable errors (503 high demand, temporary RPM rate limit, network glitches).
 *
 * @param {() => Promise<any>} fn           - The async Gemini SDK call
 * @param {object}  [options]
 * @param {number}  [options.maxRetries=2]   - Max retries (default 2)
 * @param {number}  [options.baseDelayMs=500]- Base delay in ms
 * @param {string}  [options.context="AI"]   - Context tag for logs
 * @returns {Promise<any>}
 */
export async function callGeminiWithRetry(fn, options = {}) {
  const { maxRetries = 2, baseDelayMs = 500, context = "AI" } = options;
  let lastClassified = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const classified = classifyGeminiError(err);
      lastClassified = classified;

      console.error(
        `[${context}] ${classified.logMessage} (attempt ${attempt + 1}/${maxRetries + 1})`
      );

      // Do NOT retry non-retryable errors
      if (!classified.isRetryable) {
        const error = new Error(classified.userMessage);
        error.code = classified.code;
        error.httpStatus = classified.httpStatus;
        error.isRetryable = false;
        throw error;
      }

      // If we exhausted retries, exit loop
      if (attempt >= maxRetries) {
        break;
      }

      // Bounded exponential backoff with jitter
      const jitter = Math.floor(Math.random() * 200);
      const delay = baseDelayMs * Math.pow(2, attempt) + jitter;
      console.warn(
        `[${context}] Retrying transient error in ${delay}ms (next attempt: ${attempt + 2}/${maxRetries + 1})...`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  const finalError = new Error(lastClassified.userMessage);
  finalError.code = lastClassified.code;
  finalError.httpStatus = lastClassified.httpStatus;
  finalError.isRetryable = false;
  throw finalError;
}
