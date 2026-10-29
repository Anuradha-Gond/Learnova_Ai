import mongoose from "mongoose";
const { Schema, models, model } = mongoose;

/**
 * QuizAnswerKey Model — SERVER-ONLY answer storage.
 *
 * This collection is NEVER queried directly from client-facing API routes.
 * It is only accessed server-side during quiz submission scoring.
 *
 * One QuizAnswerKey document maps 1:1 to one Quiz document.
 */

const AnswerKeyItemSchema = new Schema(
  {
    questionId: {
      type: String,
      required: true,
    },
    questionType: {
      type: String,
      enum: ["MCQ", "TRUE_FALSE", "SHORT_ANSWER"],
      default: "MCQ",
    },
    correctOptionId: {
      type: String,
      default: null,
    },
    referenceAnswer: {
      type: String,
      trim: true,
      default: "",
    },
    rubric: {
      type: String,
      trim: true,
      default: "",
    },
    explanation: {
      type: String,
      trim: true,
      default: "",
    },
    topicTag: {
      type: String,
      trim: true,
      default: "General",
    },
  },
  { _id: false }
);

const QuizAnswerKeySchema = new Schema(
  {
    quizId: {
      type: Schema.Types.ObjectId,
      ref: "Quiz",
      required: [true, "quizId is required"],
      unique: true,   // One key per quiz
      index: true,
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "userId is required"],
      index: true,
    },

    answers: {
      type: [AnswerKeyItemSchema],
      required: true,
      validate: {
        validator: (a) => a.length >= 1,
        message: "Answer key must contain at least one item",
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const QuizAnswerKey =
  models.QuizAnswerKey || model("QuizAnswerKey", QuizAnswerKeySchema);

export default QuizAnswerKey;
