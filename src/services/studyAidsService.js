import crypto from "crypto";
import { connectDB } from "../lib/db/index.js";
import Material from "../models/Material.js";
import MaterialChunk from "../models/MaterialChunk.js";
import { getGenerativeModel, isAIConfigured, AI_MODELS, callGeminiWithRetry } from "../lib/ai/index.js";
import { retrieveRelevantChunks } from "./ragService.js";
import { generateChunkEmbedding } from "./embeddingService.js";

/**
 * Study Aids Service
 *
 * Implements document-grounded AI learning aids:
 * 1. Document Summarization (executive overview, key takeaways, topic tags)
 * 2. Concept Simplification (student-friendly breakdowns with analogies and citations)
 */

/**
 * In-memory map to deduplicate concurrent summary generation requests within the same process.
 * Maps materialId -> Promise<{ summary, summaryGeneratedAt, summaryStatus, cached, ... }>
 */
const activeSummaryGenerations = new Map();

/** Lock timing constants */
export const STALE_LOCK_TIMEOUT_MS = 60 * 1000; // 60 seconds of inactivity = stale/abandoned lock
export const HEARTBEAT_INTERVAL_MS = 15 * 1000; // 15 seconds heartbeat interval for active workers

/**
 * Generates a deterministic content fingerprint for a study material document.
 * Derived solely from content-bearing properties:
 * - storageKey (cloud object location)
 * - fileSizeBytes (file byte size)
 * - chunkCount (number of extracted text chunks)
 * - wordCount (extracted word count)
 * - documentVersion (explicit document content version)
 *
 * Changes to unrelated metadata (title, topicTags, etc.) will NOT alter this fingerprint.
 *
 * @param {object} material - Mongoose Material document or plain object
 * @returns {string} 16-character hexadecimal fingerprint
 */
export function computeDocumentFingerprint(material) {
  if (!material) return "";
  const contentTokens = [
    material.storageKey || "",
    material.fileSizeBytes || 0,
    material.chunkCount || 0,
    material.wordCount || 0,
    material.documentVersion || 1,
  ].join("::");

  return crypto.createHash("sha256").update(contentTokens).digest("hex").slice(0, 16);
}

/**
 * Validates whether an existing summary is current for the provided material document.
 *
 * @param {object} material - Mongoose Material document or plain object
 * @returns {boolean}
 */
export function isSummaryCurrent(material) {
  if (!material || !material.summary) return false;

  const currentFingerprint = computeDocumentFingerprint(material);

  // If a fingerprint is stored, it must match the current document fingerprint
  if (material.summaryFingerprint && material.summaryFingerprint !== currentFingerprint) {
    return false;
  }

  // Version check: summaryVersion must match documentVersion
  const docVersion = material.documentVersion || 1;
  const sumVersion = material.summaryVersion || 1;
  if (sumVersion !== docVersion) {
    return false;
  }

  return true;
}

/**
 * Generates or retrieves a structured, document-grounded summary.
 *
 * @param {object} params
 * @param {string} params.materialId - MongoDB ObjectId of the material
 * @param {string} params.userId     - Authenticated student ID
 * @param {boolean} [params.forceRegenerate=false] - Force re-generation via Gemini
 * @param {number} [params.staleThresholdMs] - Optional override for stale lock timeout
 * @returns {Promise<{ summary: string, summaryGeneratedAt?: Date, summaryStatus: string, keyPoints?: string[], topicTags: string[], wordCount: number, cached: boolean, inProgress?: boolean }>}
 */
export async function generateDocumentSummary({
  materialId,
  userId,
  forceRegenerate = false,
  staleThresholdMs = STALE_LOCK_TIMEOUT_MS,
}) {
  await connectDB();

  const material = await Material.findOne({ _id: materialId, userId });
  if (!material) {
    throw new Error("Study material not found or access denied.");
  }

  if (material.processingStatus !== "ready") {
    throw new Error(
      "Document must be fully processed through the ingestion pipeline before generating a summary."
    );
  }

  const currentFingerprint = computeDocumentFingerprint(material);
  const currentDocVersion = material.documentVersion || 1;
  const summaryIsCurrent = isSummaryCurrent(material);

  // 1. Return cached summary if available, matching current document version/fingerprint, and not forced
  if (summaryIsCurrent && !forceRegenerate) {
    return {
      summary: material.summary,
      summaryGeneratedAt: material.summaryGeneratedAt || material.updatedAt,
      summaryStatus: "ready",
      summaryVersion: material.summaryVersion || currentDocVersion,
      topicTags: material.topicTags || [],
      wordCount: material.wordCount || 0,
      cached: true,
    };
  }

  // 2. Single-process optimization: reuse existing in-flight promise if one is already running locally
  if (activeSummaryGenerations.has(materialId)) {
    console.info(`[studyAidsService] Joining active in-flight summary generation for material: ${materialId}`);
    return await activeSummaryGenerations.get(materialId);
  }

  // 3. Distributed atomic lock acquisition via MongoDB findOneAndUpdate
  const lockId = crypto.randomUUID();
  const now = new Date();
  const staleThreshold = new Date(Date.now() - staleThresholdMs);

  const acquireFilter = {
    _id: material._id,
    userId,
    processingStatus: "ready",
    $or: [
      // Condition A: Not currently generating (idle, ready, failed)
      { summaryStatus: { $ne: "generating" } },
      // Condition B: Marked generating, but lock is stale/abandoned (no heartbeat within threshold)
      {
        summaryStatus: "generating",
        $or: [
          { summaryLockHeartbeatAt: { $lt: staleThreshold } },
          { summaryLockHeartbeatAt: null, summaryGeneratingAt: { $lt: staleThreshold } },
        ],
      },
    ],
  };

  const acquireUpdate = {
    $set: {
      summaryStatus: "generating",
      summaryLockId: lockId,
      summaryGeneratingAt: now,
      summaryLockHeartbeatAt: now,
    },
  };

  const lockedMaterial = await Material.findOneAndUpdate(acquireFilter, acquireUpdate, {
    new: true,
    returnDocument: "after",
  });

  // If another server instance holds an active, non-stale lock:
  if (!lockedMaterial) {
    const current = await Material.findOne({ _id: materialId, userId });
    return {
      summary: current?.summary || null,
      summaryGeneratedAt: current?.summaryGeneratedAt || null,
      summaryStatus: "generating",
      summaryVersion: current?.summaryVersion || currentDocVersion,
      topicTags: current?.topicTags || [],
      wordCount: current?.wordCount || 0,
      cached: Boolean(current?.summary),
      inProgress: true,
    };
  }

  if (!isAIConfigured()) {
    // Release acquired lock before throwing
    await Material.updateOne(
      { _id: material._id, summaryLockId: lockId },
      {
        $set: {
          summaryStatus: material.summary ? "ready" : "failed",
          summaryGeneratingAt: null,
          summaryLockId: null,
          summaryLockHeartbeatAt: null,
        },
      }
    ).catch(() => {});
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }

  // 4. Create generation promise and start heartbeat renewal
  const generationPromise = (async () => {
    let heartbeatTimer = null;

    // Start background heartbeat to prevent legitimate long-running tasks from becoming stale
    heartbeatTimer = setInterval(async () => {
      try {
        await Material.updateOne(
          { _id: material._id, summaryLockId: lockId },
          { $set: { summaryLockHeartbeatAt: new Date() } }
        );
      } catch {
        // Silently swallow transient background heartbeat ping errors
      }
    }, HEARTBEAT_INTERVAL_MS);
    if (heartbeatTimer.unref) heartbeatTimer.unref();

    try {
      // Fetch document chunks in page/offset order
      const chunks = await MaterialChunk.find({ materialId, userId })
        .sort({ chunkIndex: 1 })
        .lean();

      if (!chunks || chunks.length === 0) {
        throw new Error("No text chunks found for this document. Please reprocess the document.");
      }

      // Sample representative chunks to stay comfortably within context limits and minimize latency
      let selectedChunks = chunks;
      if (chunks.length > 15) {
        const step = Math.ceil(chunks.length / 15);
        selectedChunks = [];
        for (let i = 0; i < chunks.length; i += step) {
          selectedChunks.push(chunks[i]);
        }
      }

      const documentContext = selectedChunks
        .map((c, idx) => `[Section ${idx + 1} - Page ${c.pageNumber || 1}]:\n${c.chunkText}`)
        .join("\n\n---\n\n");

      const systemInstruction = `You are an expert academic tutor summarizing study material for a student.
Provide a clear, high-quality, comprehensive academic summary grounded STRICTLY in the provided excerpts.

Format your response in clean Markdown with the following sections:
### Overview
(2-3 paragraphs providing a thorough, clear explanation of the document's main subjects, scope, and objectives.)

### Key Concepts & Definitions
(A bulleted list of 4-8 essential terms or concepts defined in the text, with concise definitions.)

### Core Takeaways & Exam Points
(A numbered or bulleted list of 5-8 crucial points, rules, equations, or takeaways students should remember for revision.)

RULES:
- Ground your summary entirely in the provided text. Never invent facts, formulas, or author claims not present in the excerpts.
- Write in engaging, student-friendly, and academically rigorous prose.`;

      const prompt = `STUDY DOCUMENT: "${material.title}"

DOCUMENT EXCERPTS:
${documentContext}

TASK:
Synthesize the document excerpts above into the structured academic summary according to the required sections.`;

      const model = getGenerativeModel(
        AI_MODELS.FLASH,
        {
          temperature: 0.2,
          maxOutputTokens: 2048,
        },
        systemInstruction
      );

      let summaryText = "";
      const result = await callGeminiWithRetry(() => model.generateContent(prompt), {
        context: "studyAidsService.generateDocumentSummary",
        maxRetries: 2,
        baseDelayMs: 500,
      });
      summaryText = result?.response?.text() || "";

      if (!summaryText || summaryText.trim().length === 0) {
        throw new Error("Gemini generated an empty summary response. Please try again.");
      }

      const trimmedSummary = summaryText.trim();
      const finishTime = new Date();

      // Persist summary ONLY if this worker still holds the lock
      const updateResult = await Material.updateOne(
        {
          _id: material._id,
          summaryLockId: lockId,
        },
        {
          $set: {
            summary: trimmedSummary,
            summaryFingerprint: currentFingerprint,
            summaryVersion: currentDocVersion,
            summaryStatus: "ready",
            summaryGeneratedAt: finishTime,
            summaryGeneratingAt: null,
            summaryLockId: null,
            summaryLockHeartbeatAt: null,
            updatedAt: finishTime,
          },
        }
      );

      // If lock was overtaken or expired, discard this write and safely return latest ground truth
      if (updateResult.matchedCount === 0) {
        console.warn(
          `[studyAidsService] Lock expired or superseded for material: ${materialId} (lockId: ${lockId}). Summary write discarded.`
        );
        const latest = await Material.findOne({ _id: materialId, userId });
        return {
          summary: latest?.summary || trimmedSummary,
          summaryGeneratedAt: latest?.summaryGeneratedAt || finishTime,
          summaryStatus: latest?.summaryStatus || "ready",
          summaryVersion: latest?.summaryVersion || currentDocVersion,
          topicTags: latest?.topicTags || [],
          wordCount: latest?.wordCount || 0,
          cached: true,
        };
      }

      return {
        summary: trimmedSummary,
        summaryGeneratedAt: finishTime,
        summaryStatus: "ready",
        summaryVersion: currentDocVersion,
        topicTags: material.topicTags || [],
        wordCount: material.wordCount || 0,
        cached: false,
      };
    } catch (err) {
      // If regeneration failed but a valid previous summary existed for this version, keep "ready"
      const rollbackStatus = material.summary && summaryIsCurrent ? "ready" : "failed";
      await Material.updateOne(
        {
          _id: material._id,
          summaryLockId: lockId, // Ensures an expired worker cannot overwrite a newer lock
        },
        {
          $set: {
            summaryStatus: rollbackStatus,
            summaryGeneratingAt: null,
            summaryLockId: null,
            summaryLockHeartbeatAt: null,
          },
        }
      ).catch((e) => console.error("[studyAidsService] Failed to reset summaryStatus:", e.message));

      throw err;
    } finally {
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
      activeSummaryGenerations.delete(materialId);
    }
  })();

  activeSummaryGenerations.set(materialId, generationPromise);
  return await generationPromise;
}

/**
 * Simplifies a specific concept from the document using student-friendly language.
 *
 * @param {object} params
 * @param {string} params.materialId - MongoDB ObjectId of the material
 * @param {string} params.userId     - Authenticated student ID
 * @param {string} params.concept    - The concept or term to simplify
 * @param {string} [params.depth="beginner"] - "beginner" | "intermediate"
 * @returns {Promise<{ concept: string, explanation: string, analogy: string, keyPoints: string[], sources: Array }>}
 */
export async function simplifyConcept({ materialId, userId, concept, depth = "beginner" }) {
  if (!concept || typeof concept !== "string" || concept.trim().length === 0) {
    throw new Error("Please specify a concept or topic to simplify.");
  }

  await connectDB();

  const material = await Material.findOne({ _id: materialId, userId });
  if (!material) {
    throw new Error("Study material not found or access denied.");
  }

  if (material.processingStatus !== "ready") {
    throw new Error(
      "Document must be fully processed through the ingestion pipeline before simplifying concepts."
    );
  }

  if (!isAIConfigured()) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }

  // 1. Generate query embedding for the concept
  const queryEmbedding = await generateChunkEmbedding(concept.trim());

  // 2. Retrieve top semantically relevant chunks from this document
  const retrievedChunks = await retrieveRelevantChunks({
    materialId,
    userId,
    queryEmbedding,
    topK: 4,
    threshold: 0.25,
  });

  const excerpts = retrievedChunks.length > 0
    ? retrievedChunks.map((c) => `[Page ${c.pageNumber || 1}]: ${c.chunkText}`).join("\n\n")
    : "No direct excerpt matches found in the text; use document general domain context.";

  const prompt = `You are an award-winning academic educator helping a student understand a challenging concept.
The student is studying the document titled "${material.title}".

TARGET CONCEPT: "${concept.trim()}"
EXPLANATION LEVEL: ${depth === "intermediate" ? "College/Undergraduate clarity with technical precision" : "Beginner-friendly (ELI5) plain English with zero unexplained jargon"}

CONTEXT EXCERPTS FROM STUDY DOCUMENT:
${excerpts}

TASK:
Explain this concept so the student genuinely understands it and can remember it for exams.

Format your response in Markdown with the following clear sections:
### Plain English Explanation
(Explain what this concept actually is and how it works in clear, intuitive terms.)

### Intuitive Analogy / Real-World Example
(Provide an intuitive everyday analogy or concrete example illustrating the concept.)

### Why It Matters
(Explain its significance in the context of this study topic or practical applications.)

### Key Takeaways
(3-4 bullet points summarizing the core mechanics.)

RULES:
- Ground your explanation in the context of the student's study material.
- If the concept is not mentioned in the excerpts, clarify what the term generally means in this academic domain and advise the student where it fits.`;

  const model = getGenerativeModel(AI_MODELS.FLASH, {
    temperature: 0.3,
    maxOutputTokens: 2048,
  });

  let explanationText = "";
  try {
    const result = await callGeminiWithRetry(() => model.generateContent(prompt), {
      context: "studyAidsService.simplifyConcept",
      maxRetries: 1,
      baseDelayMs: 400,
    });
    explanationText = result?.response?.text() || "";
  } catch (err) {
    throw err;
  }

  const sources = retrievedChunks.map((chunk) => {
    const cleanText = chunk.chunkText.replace(/\s+/g, " ").trim();
    const excerpt = cleanText.length > 200 ? `${cleanText.slice(0, 200)}...` : cleanText;
    return {
      chunkId: chunk._id ? chunk._id.toString() : null,
      page: chunk.pageNumber ?? null,
      excerpt,
      score: chunk.score,
    };
  });

  return {
    concept: concept.trim(),
    explanation: explanationText.trim(),
    depth,
    sources,
  };
}

