/**
 * Learnova AI — Database Models Registry
 *
 * Central export point for all Mongoose models.
 * Import individual models from here to avoid mongoose OverwriteModelError
 * during Next.js hot-reload.
 */

export { default as User } from "./User.js";
export { default as Material } from "./Material.js";
export { default as MaterialChunk } from "./MaterialChunk.js";
export { default as Quiz } from "./Quiz.js";
export { default as QuizAnswerKey } from "./QuizAnswerKey.js";
export { default as QuizSubmission } from "./QuizSubmission.js";
export { default as TopicMastery } from "./TopicMastery.js";
export { default as RevisionRecommendation } from "./RevisionRecommendation.js";
export { default as ChatMessage } from "./ChatMessage.js";
export { default as Conversation } from "./Conversation.js";
export { default as StorageQuota } from "./StorageQuota.js";
export { default as StorageReservation } from "./StorageReservation.js";

/** Model name constants for use in populate() and ref fields */
export const MODEL_NAMES = {
  USER: "User",
  MATERIAL: "Material",
  MATERIAL_CHUNK: "MaterialChunk",
  QUIZ: "Quiz",
  QUIZ_ANSWER_KEY: "QuizAnswerKey",
  QUIZ_SUBMISSION: "QuizSubmission",
  TOPIC_MASTERY: "TopicMastery",
  REVISION_RECOMMENDATION: "RevisionRecommendation",
  CHAT_MESSAGE: "ChatMessage",
  CONVERSATION: "Conversation",
  STORAGE_QUOTA: "StorageQuota",
  STORAGE_RESERVATION: "StorageReservation",
};
