import mongoose from "mongoose";
const { Schema, models, model } = mongoose;

/**
 * ChatMessage Model
 *
 * Persists student conversation history with the AI Learning Assistant.
 * Strictly scoped to the authenticated student (userId) and study document (materialId).
 * Stores assistant source chunk citations for grounded responses.
 */

const SourceReferenceSchema = new Schema(
  {
    chunkId: {
      type: Schema.Types.ObjectId,
      ref: "MaterialChunk",
      default: null,
    },
    chunkIndex: {
      type: Number,
      required: true,
    },
    page: {
      type: Number,
      default: null,
    },
    excerpt: {
      type: String,
      required: true,
      trim: true,
    },
    score: {
      type: Number,
      default: null,
    },
  },
  { _id: false }
);

const ChatMessageSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "userId is required"],
      index: true,
    },

    materialId: {
      type: Schema.Types.ObjectId,
      ref: "Material",
      required: [true, "materialId is required"],
      index: true,
    },

    conversationId: {
      type: String,
      required: [true, "conversationId is required"],
      trim: true,
      index: true,
    },

    role: {
      type: String,
      required: [true, "Message role is required"],
      enum: ["user", "assistant"],
    },

    content: {
      type: String,
      required: [true, "Message content cannot be empty"],
      trim: true,
      maxlength: [10000, "Message content must be 10000 characters or fewer"],
    },

    // Verified source passages that grounded this answer (assistant messages only)
    sources: {
      type: [SourceReferenceSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Compound indexes for fast, isolated retrieval of conversation messages
ChatMessageSchema.index({ userId: 1, materialId: 1, createdAt: 1 });
ChatMessageSchema.index({ userId: 1, conversationId: 1, createdAt: 1 });

const ChatMessage = models.ChatMessage || model("ChatMessage", ChatMessageSchema);

export default ChatMessage;
