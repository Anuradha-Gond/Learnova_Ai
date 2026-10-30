import mongoose from "mongoose";
const { Schema, models, model } = mongoose;

/**
 * MaterialChunk Model
 *
 * Stores a single semantic text chunk from a processed document.
 * Each chunk carries a 768-dimensional embedding vector used for
 * Atlas Vector Search (RAG retrieval).
 *
 * Embedding dimension: 768 (Google gemini-embedding-001)
 */

const MaterialChunkSchema = new Schema(
  {
    materialId: {
      type: Schema.Types.ObjectId,
      ref: "Material",
      required: [true, "materialId is required"],
      index: true,
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "userId is required"],
      index: true,
    },

    // The raw text content of this chunk
    chunkText: {
      type: String,
      required: [true, "chunkText is required"],
      trim: true,
    },

    // Zero-based order within the parent document
    chunkIndex: {
      type: Number,
      required: true,
      min: 0,
    },

    // Source metadata for citation / grounding
    pageNumber: {
      type: Number,
      default: null,
    },

    startCharOffset: {
      type: Number,
      default: null,
    },

    endCharOffset: {
      type: Number,
      default: null,
    },

    // 768-dim embedding vector from text-embedding-004
    // Stored as an array of floats for Atlas Vector Search
    embedding: {
      type: [Number],
      default: [],
      // select: false  // Uncomment if you want to exclude by default
    },

    // Flag set to true once the embedding has been generated
    isEmbedded: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Model used to generate vector embeddings (for versioning)
    embeddingModel: {
      type: String,
      default: "gemini-embedding-001",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Compound index: retrieve all chunks for a material, ordered
MaterialChunkSchema.index({ materialId: 1, chunkIndex: 1 });
// Index for finding un-embedded chunks during processing
MaterialChunkSchema.index({ materialId: 1, isEmbedded: 1 });
// Owner-scoped for access verification
MaterialChunkSchema.index({ userId: 1, materialId: 1 });

const MaterialChunk =
  models.MaterialChunk || model("MaterialChunk", MaterialChunkSchema);

export default MaterialChunk;
