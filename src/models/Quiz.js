import mongoose from "mongoose";
const { Schema, models, model } = mongoose;

/**
 * Quiz Model — PUBLIC question definitions only.
 *
 * Answer keys (correct options + explanations) live in QuizAnswerKey.
 * This document is safe to return to the client during an active session
 * because it never contains correctOptionId or explanations.
 */

const QuestionOptionSchema = new Schema(
  {
    optionId: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const QuestionSchema = new Schema(
  {
    questionId: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["MCQ", "TRUE_FALSE", "SHORT_ANSWER"],
      default: "MCQ",
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    options: {
      type: [QuestionOptionSchema],
      default: [],
      validate: {
        validator: function (opts) {
          if (this.type === "SHORT_ANSWER") {
            return true;
          }
          return Array.isArray(opts) && opts.length >= 2 && opts.length <= 6;
        },
        message: "MCQ and True/False questions must have between 2 and 6 options",
      },
    },
    topicTag: {
      type: String,
      trim: true,
      default: "General",
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
  },
  { _id: false }
);

const QuizSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Owner userId is required"],
      index: true,
    },

    materialId: {
      type: Schema.Types.ObjectId,
      ref: "Material",
      required: [true, "materialId is required"],
      index: true,
    },

    title: {
      type: String,
      required: [true, "Quiz title is required"],
      trim: true,
      maxlength: 200,
    },

    questions: {
      type: [QuestionSchema],
      required: true,
      validate: {
        validator: (qs) => qs.length >= 1 && qs.length <= 50,
        message: "Quiz must have between 1 and 50 questions",
      },
    },

    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard", "mixed"],
      default: "mixed",
    },

    // Topics covered in this quiz
    topicTags: {
      type: [String],
      default: [],
    },

    questionCount: {
      type: Number,
      required: true,
      min: 1,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

QuizSchema.index({ userId: 1, materialId: 1, createdAt: -1 });

const Quiz = models.Quiz || model("Quiz", QuizSchema);

export default Quiz;
