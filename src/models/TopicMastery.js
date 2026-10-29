import mongoose from "mongoose";
const { Schema, models, model } = mongoose;

/**
 * TopicMastery Model
 *
 * Tracks per-topic Exponential Moving Average (EMA) mastery score for a student.
 * Compatible with the existing analyticsService.calculateTopicMastery() function.
 *
 * One document per (userId + topicTag) pair — enforced by a unique compound index.
 */

const TopicMasterySchema = new Schema(
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

    // Current EMA-blended mastery score (0–100)
    masteryScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0,
    },

    // 'weak' | 'average' | 'mastered' — derived from masteryScore thresholds
    status: {
      type: String,
      enum: ["weak", "average", "mastered"],
      required: true,
      default: "weak",
    },

    // Number of quiz attempts contributing to this score
    attemptCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Latest raw accuracy from most recent attempt (for audit)
    lastAttemptScore: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
    },

    lastAttemptAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// One mastery record per user-topic pair
TopicMasterySchema.index({ userId: 1, topicTag: 1 }, { unique: true });
// Dashboard query: fetch all weak topics for a user
TopicMasterySchema.index({ userId: 1, status: 1 });
TopicMasterySchema.index({ userId: 1, masteryScore: 1 });

const TopicMastery =
  models.TopicMastery || model("TopicMastery", TopicMasterySchema);

export default TopicMastery;
