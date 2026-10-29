import mongoose from "mongoose";
const { Schema, models, model } = mongoose;

/**
 * RevisionRecommendation Model
 *
 * Auto-generated revision cards for weak topics (mastery < 65%).
 * Each card links back to the source topic and performance data
 * that triggered the recommendation.
 */

const RevisionRecommendationSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "userId is required"],
      index: true,
    },

    topicTag: {
      type: String,
      required: [true, "topicTag is required"],
      trim: true,
      maxlength: 150,
    },

    // Source material that produced this recommendation
    materialId: {
      type: Schema.Types.ObjectId,
      ref: "Material",
      default: null,
    },

    // Source topic mastery record
    topicMasteryId: {
      type: Schema.Types.ObjectId,
      ref: "TopicMastery",
      default: null,
    },

    // AI-generated revision content (populated in M8)
    content: {
      type: String,
      default: null,
    },

    // Concise title for the revision card
    title: {
      type: String,
      required: [true, "Recommendation title is required"],
      trim: true,
      maxlength: 200,
    },

    // Mastery score at the time this recommendation was created (for context)
    masteryScoreAtGeneration: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },

    // Numeric priority (lower = higher priority)
    priority: {
      type: Number,
      default: 50,
      min: 0,
      max: 100,
    },

    status: {
      type: String,
      enum: ["pending", "reviewed", "completed", "dismissed"],
      default: "pending",
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

RevisionRecommendationSchema.index({ userId: 1, status: 1, priority: 1 });
RevisionRecommendationSchema.index({ userId: 1, topicTag: 1 });

const RevisionRecommendation =
  models.RevisionRecommendation ||
  model("RevisionRecommendation", RevisionRecommendationSchema);

export default RevisionRecommendation;
