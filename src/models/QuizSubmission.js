import mongoose from "mongoose";
const { Schema, models, model } = mongoose;

/**
 * QuizSubmission Model
 *
 * Records a single student attempt at a quiz.
 * Scores are calculated server-side. Client never receives the answer key.
 */

const GradedAnswerSchema = new Schema(
  {
    questionId: { type: String, required: true },
    questionType: { type: String, enum: ["MCQ", "TRUE_FALSE", "SHORT_ANSWER"], default: "MCQ" },
    selectedOptionId: { type: String, default: null },
    answerText: { type: String, default: "" },
    isCorrect: { type: Boolean, required: true },
    score: { type: Number, default: 0 },
    maxScore: { type: Number, default: 1 },
    feedback: { type: String, default: "" },
    explanation: { type: String, default: "" },
  },
  { _id: false }
);

const TopicBreakdownSchema = new Schema(
  {
    topicTag: { type: String, required: true },
    total: { type: Number, required: true },
    correct: { type: Number, required: true },
    accuracy: { type: Number, required: true }, // 0–100
  },
  { _id: false }
);

const QuizSubmissionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "userId is required"],
      index: true,
    },

    quizId: {
      type: Schema.Types.ObjectId,
      ref: "Quiz",
      required: [true, "quizId is required"],
      index: true,
    },

    materialId: {
      type: Schema.Types.ObjectId,
      ref: "Material",
      required: [true, "materialId is required"],
    },

    // Optional client idempotency key to prevent accidental double-submits
    idempotencyKey: {
      type: String,
      default: null,
      index: true,
    },

    // Raw answers submitted by the student (selectedOptionId or answerText)
    submittedAnswers: [
      {
        questionId: { type: String, required: true },
        selectedOptionId: { type: String, default: null },
        answerText: { type: String, default: "" },
        _id: false,
      },
    ],

    // Graded results (populated by server-side scoring)
    gradedAnswers: {
      type: [GradedAnswerSchema],
      default: [],
    },

    topicBreakdown: {
      type: [TopicBreakdownSchema],
      default: [],
    },

    // Overall score
    totalQuestions: { type: Number, required: true, min: 1 },
    correctCount: { type: Number, required: true, min: 0 },
    scorePercentage: { type: Number, required: true, min: 0, max: 100 },

    // Time tracking
    startedAt: { type: Date, default: null },
    submittedAt: { type: Date, default: Date.now },
    durationSeconds: { type: Number, default: null },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

QuizSubmissionSchema.index({ userId: 1, quizId: 1, createdAt: -1 });
QuizSubmissionSchema.index({ userId: 1, materialId: 1 });

const QuizSubmission =
  models.QuizSubmission || model("QuizSubmission", QuizSubmissionSchema);

export default QuizSubmission;
