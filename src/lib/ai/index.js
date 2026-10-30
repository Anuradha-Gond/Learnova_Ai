import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Google Gemini AI Client — Server-Side Only
 *
 * Centralizes Gemini API initialization and model configuration.
 * The API key is read from a server-only environment variable.
 *
 * DO NOT import this module in client components or pages marked "use client".
 * DO NOT use NEXT_PUBLIC_* for the API key.
 *
 * Individual AI features (summarization, quiz generation, RAG, embeddings)
 * will import getGeminiClient() or getEmbeddingModel() from this module.
 */

/** Supported model identifiers */
export const AI_MODELS = {
  /** Flash model — fast, cost-efficient for summaries, Q&A, quiz generation */
  FLASH: "gemini-3.5-flash",
  /** Gemini 3 Flash Preview model — active text-generation preview endpoint */
  FLASH_PREVIEW: "gemini-3-flash-preview",
  /** Gemini 3.8 Flash model — high efficiency, active endpoint */
  FLASH_3_8: "gemini-3.8-flash",
  /** Pro model — higher quality for complex reasoning (use sparingly) */
  PRO: "gemini-1.5-pro",
  /** Text embedding model — produces 768-dim vectors for RAG */
  EMBEDDINGS: "gemini-embedding-001",
};

/** Generation configuration defaults */
export const AI_CONFIG = {
  embeddingDimensions: 768,
  maxSummaryTokens: 2048,
  maxQuizTokens: 4096,
  temperature: 0.2,         // Low temperature for factual, grounded output
  topP: 0.8,
  topK: 40,
};

/**
 * Returns the configured model name for chat/generation tasks.
 * Falls back to FLASH if GEMINI_MODEL env var is not set.
 */
export function getDefaultModel() {
  return process.env.GEMINI_MODEL || AI_MODELS.FLASH;
}

/**
 * Checks if a key value is missing, empty, or an unresolved template placeholder.
 *
 * @param {string} val
 * @returns {boolean}
 */
export function isAIPlaceholder(val) {
  if (!val || typeof val !== "string") return true;
  const trimmed = val.trim();
  return (
    trimmed === "" ||
    trimmed.includes("<") ||
    trimmed.includes(">") ||
    trimmed.toLowerCase().startsWith("your_") ||
    trimmed.toLowerCase().endsWith("_here") ||
    trimmed.toLowerCase().includes("placeholder")
  );
}

/**
 * Returns an initialized GoogleGenerativeAI client.
 *
 * @throws {Error} If GEMINI_API_KEY environment variable is not configured or is a placeholder.
 * @returns {GoogleGenerativeAI}
 */
export function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || isAIPlaceholder(apiKey)) {
    throw new Error(
      "[Learnova] GEMINI_API_KEY environment variable is not set or contains a placeholder. " +
        "Add a valid Gemini API key to .env.local before using AI features."
    );
  }

  return new GoogleGenerativeAI(apiKey.trim());
}

/**
 * Returns a configured generative model instance for text generation.
 *
 * @param {string} [modelId] - Optional model override; defaults to GEMINI_MODEL env or flash
 * @param {object} [generationConfig] - Optional generation config overrides
 * @param {string|object} [systemInstruction] - Optional system instruction prompt
 * @returns {import("@google/generative-ai").GenerativeModel}
 */
export function getGenerativeModel(modelId, generationConfig = {}, systemInstruction = undefined) {
  const client = getGeminiClient();
  let model = modelId || getDefaultModel();
  if (model === AI_MODELS.FLASH && process.env.GEMINI_MODEL) {
    model = process.env.GEMINI_MODEL;
  }

  const sysInstruction = systemInstruction || generationConfig?.systemInstruction;
  const cleanedConfig = { ...generationConfig };
  delete cleanedConfig.systemInstruction;

  const modelParams = {
    model,
    generationConfig: {
      temperature: AI_CONFIG.temperature,
      topP: AI_CONFIG.topP,
      topK: AI_CONFIG.topK,
      ...cleanedConfig,
    },
  };

  if (sysInstruction) {
    modelParams.systemInstruction = sysInstruction;
  }

  return client.getGenerativeModel(modelParams);
}

/**
 * Returns a configured embedding model instance.
 *
 * @returns {import("@google/generative-ai").GenerativeModel}
 */
export function getEmbeddingModel() {
  const client = getGeminiClient();
  return client.getGenerativeModel({ model: AI_MODELS.EMBEDDINGS });
}

/**
 * Returns whether the Gemini API key is configured and not a placeholder.
 * Safe to call at any time — does not throw.
 */
export function isAIConfigured() {
  const apiKey = process.env.GEMINI_API_KEY;
  return Boolean(apiKey && !isAIPlaceholder(apiKey));
}

export { classifyGeminiError, callGeminiWithRetry, GeminiErrorCode } from "./errors.js";
