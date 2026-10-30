import mongoose from "mongoose";
const { Schema, models, model } = mongoose;

/**
 * Material Model
 *
 * Represents an uploaded study document owned by a student.
 * The storage key references the private object in R2/S3.
 * Processing status tracks the document ingestion pipeline stage.
 */

const MaterialSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Owner userId is required"],
      index: true,
    },

    title: {
      type: String,
      required: [true, "Material title is required"],
      trim: true,
      maxlength: [200, "Title must be 200 characters or fewer"],
    },

    originalFilename: {
      type: String,
      required: [true, "Original filename is required"],
      trim: true,
      maxlength: 255,
    },

    fileType: {
      type: String,
      required: [true, "File type is required"],
      enum: ["pdf", "txt"],
      lowercase: true,
    },

    fileSizeBytes: {
      type: Number,
      required: true,
      min: 0,
    },

    // Private storage key in R2/S3 bucket — never expose directly
    storageKey: {
      type: String,
      required: [true, "Storage key is required"],
      trim: true,
    },

    processingStatus: {
      type: String,
      enum: ["pending", "processing", "ready", "failed"],
      default: "pending",
      index: true,
    },

    processingError: {
      type: String,
      default: null,
    },

    // Metadata populated after processing
    pageCount: {
      type: Number,
      default: null,
    },

    chunkCount: {
      type: Number,
      default: 0,
    },

    wordCount: {
      type: Number,
      default: 0,
    },

    // Tags/topics extracted during processing
    topicTags: {
      type: [String],
      default: [],
    },

    // Brief AI-generated summary (populated in later milestone)
    summary: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Compound index for owner + status queries (dashboard listing)
MaterialSchema.index({ userId: 1, createdAt: -1 });
MaterialSchema.index({ userId: 1, processingStatus: 1 });
MaterialSchema.index({ storageKey: 1 }, { unique: true });

const Material = models.Material || model("Material", MaterialSchema);

export default Material;
