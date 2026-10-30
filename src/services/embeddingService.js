import { getEmbeddingModel, isAIConfigured, AI_MODELS, AI_CONFIG, classifyGeminiError } from "@/lib/ai/index.js";

/**
 * Gemini Vector Embedding Service
 *
 * Generates 768-dimensional dense vector embeddings using Google Gemini's
 * `gemini-embedding-001` model for Atlas Vector Search and RAG retrieval.
 *
 * The model supports `outputDimensionality` to pin output to 768 dims, which
 * matches the existing MongoDB Atlas Vector Search index configuration.
 */

export const EMBEDDING_CONFIG = {
  model: AI_MODELS.EMBEDDINGS,       // "gemini-embedding-001"
  expectedDimensions: AI_CONFIG.embeddingDimensions, // 768
  maxRetries: 3,
  initialBackoffMs: 1000,
  concurrencyLimit: 5,
};

/**
 * Validates that an embedding vector is valid and matches the expected dimension.
 *
 * @param {any} vector
 * @param {number} [expectedDim=768]
 * @returns {boolean}
 */
export function isValidEmbeddingVector(vector, expectedDim = EMBEDDING_CONFIG.expectedDimensions) {
  if (!Array.isArray(vector) || vector.length !== expectedDim) {
    return false;
  }

  for (let i = 0; i < vector.length; i++) {
    const val = vector[i];
    if (typeof val !== "number" || !Number.isFinite(val) || Number.isNaN(val)) {
      return false;
    }
  }

  return true;
}

/**
 * Generates a vector embedding for a single text passage using Gemini.
 * Implements exponential backoff retry for transient rate limits and network errors.
 *
 * @param {string} text - Clean chunk text
 * @param {number} [retries=3]
 * @returns {Promise<number[]>} 768-dimensional numeric embedding vector
 */
export async function generateChunkEmbedding(text, retries = EMBEDDING_CONFIG.maxRetries) {
  if (!text || typeof text !== "string" || text.trim().length === 0) {
    throw new Error("Cannot generate embedding for empty text.");
  }

  if (!isAIConfigured()) {
    throw new Error(
      "GEMINI_API_KEY is not configured. Cannot generate vector embeddings."
    );
  }

  const model = getEmbeddingModel();
  let attempt = 0;

  while (attempt <= retries) {
    try {
      // Pass outputDimensionality so gemini-embedding-001 returns exactly 768-dim
      // vectors, matching the existing MongoDB Atlas Vector Search index.
      // taskType RETRIEVAL_DOCUMENT optimises embeddings for asymmetric search.
      const result = await model.embedContent({
        content: { role: "user", parts: [{ text }] },
        taskType: "RETRIEVAL_DOCUMENT",
        outputDimensionality: EMBEDDING_CONFIG.expectedDimensions,
      });
      const vector = result?.embedding?.values;

      if (!isValidEmbeddingVector(vector, EMBEDDING_CONFIG.expectedDimensions)) {
        throw new Error(
          `Invalid embedding vector returned by Gemini API. Expected array of ${EMBEDDING_CONFIG.expectedDimensions} finite floats, received length ${vector?.length || 0}.`
        );
      }

      return vector;
    } catch (err) {
      attempt++;
      const classified = classifyGeminiError(err);

      if (classified.isRetryable && attempt <= retries) {
        // Exponential backoff with random jitter (1000ms -> 2000ms -> 4000ms + random jitter)
        const jitter = Math.random() * 500;
        const delay = EMBEDDING_CONFIG.initialBackoffMs * Math.pow(2, attempt - 1) + jitter;
        console.warn(
          `[Gemini Embedding] Transient error (${classified.code}) on attempt ${attempt}/${retries}: ${err.message}. Retrying in ${Math.round(delay)}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        const error = new Error(classified.userMessage || `Failed to generate embedding: ${err.message}`);
        error.code = classified.code;
        error.httpStatus = classified.httpStatus;
        throw error;
      }
    }
  }

  throw new Error("Exhausted all retries for chunk embedding generation.");
}

/**
 * Generates vector embeddings for a collection of chunks with controlled concurrency.
 *
 * @param {Array<{ chunkIndex: number, chunkText: string, [key: string]: any }>} chunks
 * @param {object} [options]
 * @param {number} [options.concurrency=5]
 * @returns {Promise<Array<any>>} Chunks augmented with `embedding`, `isEmbedded: true`, and `embeddingModel`
 */
export async function generateBatchEmbeddings(chunks, options = {}) {
  if (!Array.isArray(chunks) || chunks.length === 0) {
    return [];
  }

  const concurrency = options.concurrency || EMBEDDING_CONFIG.concurrencyLimit;
  const results = new Array(chunks.length);

  // Process in chunks of size `concurrency`
  for (let i = 0; i < chunks.length; i += concurrency) {
    const batch = chunks.slice(i, i + concurrency);

    const batchPromises = batch.map(async (chunk, batchIdx) => {
      const globalIdx = i + batchIdx;
      const vector = await generateChunkEmbedding(chunk.chunkText);

      results[globalIdx] = {
        ...chunk,
        embedding: vector,
        isEmbedded: true,
        embeddingModel: EMBEDDING_CONFIG.model,
      };
    });

    await Promise.all(batchPromises);
  }

  return results;
}
