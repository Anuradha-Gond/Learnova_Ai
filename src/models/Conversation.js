import mongoose from "mongoose";
const { Schema, models, model } = mongoose;

/**
 * Message Sub-Schema
 *
 * Stores individual user questions and AI assistant responses within a conversation.
 */
const MessageSchema = new Schema(
  {
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
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

/**
 * Conversation Model
 *
 * Persists student conversations with the AI Learning Assistant.
 * Strictly scoped to the authenticated student (userId).
 * Supports multi-turn dialogue restoration, renaming, and history retrieval.
 */
const ConversationSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "userId is required"],
      index: true,
    },
    title: {
      type: String,
      required: [true, "title is required"],
      trim: true,
      default: "New Conversation",
      maxlength: [100, "Title must be 100 characters or fewer"],
    },
    messages: {
      type: [MessageSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Compound index for fast, isolated retrieval of conversations sorted newest first
ConversationSchema.index({ userId: 1, updatedAt: -1 });

const Conversation = models.Conversation || model("Conversation", ConversationSchema);

export default Conversation;

