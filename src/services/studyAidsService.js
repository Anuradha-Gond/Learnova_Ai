import { connectDB } from "@/lib/db/index.js";
import Material from "@/models/Material.js";
import MaterialChunk from "@/models/MaterialChunk.js";
import { getGenerativeModel, isAIConfigured, AI_MODELS } from "@/lib/ai/index.js";
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
 * Generates or retrieves a structured, document-grounded summary.
 *
 * @param {object} params
 * @param {string} params.materialId - MongoDB ObjectId of the material
 * @param {string} params.userId     - Authenticated student ID
 * @param {boolean} [params.forceRegenerate=false] - Force re-generation via Gemini
 * @returns {Promise<{ summary: string, keyPoints: string[], topicTags: string[], wordCount: number, generatedAt: Date }>}
 */
export async function generateDocumentSummary({ materialId, userId, forceRegenerate = false }) {
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

  // Return cached summary if available and not forced to regenerate
  if (material.summary && !forceRegenerate) {
    return {
      summary: material.summary,
      topicTags: material.topicTags || [],
      wordCount: material.wordCount || 0,
      cached: true,
    };
  }

  if (!isAIConfigured()) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }

  // Fetch document chunks in page/offset order
  const chunks = await MaterialChunk.find({ materialId, userId })
    .sort({ chunkIndex: 1 })
    .lean();

  if (!chunks || chunks.length === 0) {
    throw new Error("No text chunks found for this document. Please reprocess the document.");
  }

  // Sample representative chunks to stay comfortably within Gemini Flash context limits
  let selectedChunks = chunks;
  if (chunks.length > 20) {
    const step = Math.ceil(chunks.length / 20);
    selectedChunks = [];
    for (let i = 0; i < chunks.length; i += step) {
      selectedChunks.push(chunks[i]);
    }
  }

  const documentContext = selectedChunks
    .map((c, idx) => `[Section ${idx + 1} - Page ${c.pageNumber || 1}]:\n${c.chunkText}`)
    .join("\n\n---\n\n");

  const prompt = `You are an expert academic tutor summarizing study material for a student.
Below are extracted excerpts from the student's study document titled "${material.title}".

DOCUMENT EXCERPTS:
${documentContext}

TASK:
Provide a clear, high-quality, comprehensive academic summary grounded STRICTLY in the text above.

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

  const model = getGenerativeModel(AI_MODELS.FLASH, {
    temperature: 0.2,
  });

  let summaryText = "";
  try {
    const result = await model.generateContent(prompt);
    summaryText = result?.response?.text() || "";
  } catch (err) {
    const isRateLimit = err.message?.includes("429") || err.message?.toLowerCase().includes("quota");
    if (isRateLimit) {
      throw new Error("Gemini AI rate limit reached. Please wait a moment and try again.");
    }
    throw new Error(`Failed to generate summary: ${err.message}`);
  }

  if (!summaryText || summaryText.trim().length === 0) {
    throw new Error("Gemini generated an empty summary response. Please try again.");
  }

  const trimmedSummary = summaryText.trim();

  // Persist summary back to Material document
  await Material.updateOne(
    { _id: material._id },
    {
      $set: {
        summary: trimmedSummary,
        updatedAt: new Date(),
      },
    }
  );

  return {
    summary: trimmedSummary,
    topicTags: material.topicTags || [],
    wordCount: material.wordCount || 0,
    cached: false,
  };
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
  });

  let explanationText = "";
  try {
    const result = await model.generateContent(prompt);
    explanationText = result?.response?.text() || "";
  } catch (err) {
    const isRateLimit = err.message?.includes("429") || err.message?.toLowerCase().includes("quota");
    if (isRateLimit) {
      throw new Error("Gemini AI rate limit reached. Please wait a moment and try again.");
    }
    throw new Error(`Failed to simplify concept: ${err.message}`);
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

