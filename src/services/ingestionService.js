import { connectDB } from "@/lib/db/index.js";
import Material from "@/models/Material.js";
import MaterialChunk from "@/models/MaterialChunk.js";
import { getFileBuffer, isStorageConfigured } from "@/lib/storage/index.js";
import { isAIConfigured } from "@/lib/ai/index.js";
import { extractDocumentText, normalizeText } from "./extractionService.js";
import { createDocumentChunks } from "./chunkingService.js";
import { generateBatchEmbeddings, EMBEDDING_CONFIG } from "./embeddingService.js";

/**
 * Document Ingestion Pipeline Orchestrator
 *
 * Coordinates server-side document extraction, semantic chunking, Gemini vector
 * embeddings generation, and atomic MongoDB persistence.
 */

/**
 * Counts total words in a text passage.
 *
 * @param {string} text
 * @returns {number}
 */
export function countWords(text) {
  if (!text || typeof text !== "string") return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Processes an uploaded study material document end-to-end.
 *
 * @param {object} params
 * @param {string} params.materialId - MongoDB ObjectId of the material
 * @param {string} params.userId     - Authenticated student's user ID
 * @returns {Promise<{ success: boolean, materialId: string, chunkCount: number, pageCount: number, wordCount: number, embeddingModel: string, error?: string }>}
 */
export async function processMaterialDocument({ materialId, userId }) {
  await connectDB();

  // 1. Verify material exists and belongs to authenticated student
  const material = await Material.findOne({ _id: materialId, userId });
  if (!material) {
    throw new Error("Study material not found or access denied.");
  }

  // Prevent concurrent ingestion of the same document
  if (material.processingStatus === "processing") {
    // If it started less than 3 minutes ago, consider it actively running
    const recentlyStarted =
      material.updatedAt && Date.now() - new Date(material.updatedAt).getTime() < 3 * 60 * 1000;
    if (recentlyStarted) {
      return {
        success: false,
        materialId,
        status: "processing",
        error: "Document processing is already actively in progress.",
      };
    }
  }

  // 2. Set status to "processing"
  await Material.updateOne(
    { _id: material._id },
    {
      $set: {
        processingStatus: "processing",
        processingError: null,
      },
    }
  );

  try {
    // 3. Verify storage configuration and retrieve document buffer
    if (!isStorageConfigured()) {
      throw new Error(
        "Private cloud storage is not configured. Please add R2/S3 credentials to .env.local."
      );
    }

    const buffer = await getFileBuffer(material.storageKey);
    if (!buffer || buffer.length === 0) {
      throw new Error(`Failed to retrieve document content from storage key: ${material.storageKey}`);
    }

    // 4. Extract text based on file type
    const extractionResult = await extractDocumentText(buffer, material.fileType);
    if (!extractionResult.success) {
      throw new Error(extractionResult.error || "Text extraction failed.");
    }

    const normalized = normalizeText(extractionResult.text);
    if (!normalized || normalized.length === 0) {
      throw new Error("Extracted document text was empty after normalization.");
    }

    // 5. Semantic chunking
    const chunks = createDocumentChunks({
      text: normalized,
      pages: extractionResult.pages,
    });

    if (!chunks || chunks.length === 0) {
      throw new Error("Failed to produce semantic chunks from document text.");
    }

    // 6. Generate Gemini 768-dimensional vector embeddings
    if (!isAIConfigured()) {
      throw new Error(
        "GEMINI_API_KEY environment variable is not configured. Add it to .env.local to generate vector embeddings."
      );
    }

    const embeddedChunks = await generateBatchEmbeddings(chunks);

    // Verify all chunks have valid embeddings
    for (const ec of embeddedChunks) {
      if (!ec.isEmbedded || !Array.isArray(ec.embedding) || ec.embedding.length !== EMBEDDING_CONFIG.expectedDimensions) {
        throw new Error(`Chunk ${ec.chunkIndex} failed embedding validation.`);
      }
    }

    // 7. Atomic MongoDB Persistence
    // Clean up previous chunks if reprocessing
    await MaterialChunk.deleteMany({ materialId: material._id });

    // Prepare Mongoose documents
    const chunkDocuments = embeddedChunks.map((chunk) => ({
      materialId: material._id,
      userId: material.userId,
      chunkIndex: chunk.chunkIndex,
      chunkText: chunk.chunkText,
      pageNumber: chunk.pageNumber,
      startCharOffset: chunk.startCharOffset,
      endCharOffset: chunk.endCharOffset,
      embedding: chunk.embedding,
      isEmbedded: true,
      embeddingModel: EMBEDDING_CONFIG.model,
    }));

    await MaterialChunk.insertMany(chunkDocuments);

    // 8. Update Material record to "ready" with processing metrics
    const totalWords = countWords(normalized);

    await Material.updateOne(
      { _id: material._id },
      {
        $set: {
          processingStatus: "ready",
          pageCount: extractionResult.pageCount || 1,
          chunkCount: chunkDocuments.length,
          wordCount: totalWords,
          processingError: null,
          updatedAt: new Date(),
        },
      }
    );

    return {
      success: true,
      materialId: material._id.toString(),
      status: "ready",
      chunkCount: chunkDocuments.length,
      pageCount: extractionResult.pageCount || 1,
      wordCount: totalWords,
      embeddingModel: EMBEDDING_CONFIG.model,
      embeddingDimension: EMBEDDING_CONFIG.expectedDimensions,
    };
  } catch (err) {
    console.error(`[Ingestion Pipeline Error for ${materialId}]:`, err.message);
    if (err.stack) {
      console.error(err.stack);
    }

    // Record failure status safely in database
    await Material.updateOne(
      { _id: material._id },
      {
        $set: {
          processingStatus: "failed",
          processingError: err.message,
          updatedAt: new Date(),
        },
      }
    );

    throw err;
  }
}
