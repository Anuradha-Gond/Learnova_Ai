# Learnova AI — Project Status

**Current Date / Version:** October 27, 2026 | Milestone 9 Complete  
**Application Architecture:** Next.js 14 App Router, JavaScript (`.js`/`.jsx`), React 18, Tailwind CSS, MongoDB Atlas + Mongoose, NextAuth v4 (Credentials + JWT), Google Gemini API, Cloudflare R2 / AWS S3 Storage Adapter.

---

## Milestone Status Overview

| Milestone | Title | Status | Details |
|---|---|---|---|
| **M1** | Project Architecture & Design System | **Completed** | Full design system with custom brand tokens, UI components, shell layouts. |
| **M2** | Core Backend Foundation | **Completed** | Mongoose models (User, Material, MaterialChunk, Quiz, QuizAnswerKey, QuizSubmission, TopicMastery, RevisionRecommendation), connectDB, NextAuth route handlers & server helpers, Gemini API client, S3/R2 storage adapter. |
| **M3** | Landing Page, Authentication UI & Dashboard Shell | **Completed** | Public marketing landing page, `/login` & `/register` views with Zod validation, `/dashboard` protected shell, session-aware navigation, and 40 passing unit tests. |
| **M4** | Document Upload, Management & Private Storage | **Completed** | Secure upload (`POST /api/materials`), document listing (`GET /api/materials`), document workspace (`/materials/[id]`), presigned URL viewing, automated storage rollback, and 61 passing unit tests. |
| **M5** | Document Processing, Text Extraction, Chunking & Embeddings | **Completed** | Server-side PDF/TXT extraction (`pdf-parse@2.4.5`), semantic chunking (800–1200 chars, 150-char overlap), Gemini `text-embedding-004` 768-dim embeddings, atomic `MaterialChunk` persistence, `POST /api/materials/[id]/process` route, workspace UI integration, and 101 passing unit tests. |
| **M6** | AI Learning Assistant & Retrieval-Augmented Generation (RAG) | **Completed** | Document-grounded Q&A with Gemini Flash, 768-dim vector retrieval with in-app cosine fallback, citation verification, prompt injection defense, ChatMessage persistence, and interactive workspace chat UI. |
| **M7** | Quiz Engine & Scoring System | **Completed** | Grounded active-recall quiz generation via Gemini Flash, MCQ/TF/ShortAnswer support (5, 10, 15 questions; beginner/intermediate/advanced), strict server-only answer key isolation, server-side grading & semantic short-answer evaluation, atomic EMA TopicMastery updates, interactive quiz runner UI (`/quizzes/[id]`), quizzes listing dashboard (`/quizzes`), document quizzes tab, and 154 passing unit tests. |
| **M8** | Learning Analytics, Revision Recommendations & Learning History | **Completed** | Full Milestone 8 delivery: overview metrics, 4-band topic classification, weak-topic diagnostics, idempotent revision recommendations, dedicated Revision Feed (`/revision`), unified Learning History & Activity Log (`/history`), User Profile & Settings (`/settings`), 7 API route handlers, and 188 passing unit tests. |
| **M9** | Integration Testing, Security & UI Polish | **Completed** | Targeted M7–M8 audit completed; live database wiring for `/dashboard` (replaced placeholder metrics); added score progression timeline to `/analytics`; implemented 14-step end-to-end integration test suite (`tests/unit/workflow-integration.test.js`); validated security boundaries (cross-tenant isolation, prompt injection defense, answer key withholding, bcrypt password hashing, mass-assignment defense); **202 passing unit tests / 0 failing**, **0 ESLint errors/warnings**, **22/22 App Router pages built successfully**. Ready for deployment preparation. |

---

## Milestone 9 Implementation Details: Integration Testing, Security & UI Polish

### 1. Targeted Audit & Confirmed Fixes (Milestones 7 & 8)
* **Dashboard Database Wiring (`src/app/dashboard/page.js`)**:
  - Gaps confirmed: Dashboard displayed hardcoded placeholder values (`0` materials, `0` quizzes, `--%` average score) and static modal popups for features already implemented.
  - Fix applied: Wired real live data fetching to `/api/analytics/overview`, `/api/materials?limit=4`, `/api/analytics/weak-topics`, and `/api/history?limit=4`. Quick Action buttons now navigate directly to `/materials`, `/quizzes`, and `/revision`.
* **Analytics Visualizations (`src/app/analytics/page.js`)**:
  - Gaps confirmed: Missing historical assessment timeline and score progression.
  - Fix applied: Integrated a responsive "Recent Assessment Results & Quiz Performance Timeline" fetching from `/api/history?limit=10`, rendering interactive score indicators, question counts, and direct review links.
* **Topic Mastery & EMA Verification**:
  - Verified exact exponential moving average formula in `analyticsService.js` and `quizService.js`: `newMastery = 0.4 × currentAttemptScore + 0.6 × previousMastery`. Initial attempt initializes at `currentAttemptScore`. Atomic MongoDB `$inc: { attemptCount: 1 }` maintains accurate attempt counters.
* **Mastery Threshold Classification**:
  - Verified 4-band criteria: Critical (<40%), Weak (40% to <70%), Developing (70% to <85%), Mastered (≥85%).

### 2. Milestone 9 Security Hardening & Audit
* **Multi-Tenant Ownership & Isolation**: Every database read/write query in API handlers is strictly filtered by authenticated `user._id` (materials, quizzes, submissions, topic mastery, revision recommendations, history, user profile). Cross-user access returns 404 or 403.
* **Quiz Answer Key Withholding**: Public Quiz DTOs strictly omit `QuizAnswerKey` contents (reference answers, rubrics, and explanations). Scoring is performed strictly server-side on submission.
* **Mass-Assignment Defense**: `PATCH /api/user/profile` strictly limits updates to `name`, `academicLevel`, and `targetExam`, preventing elevation of privilege or modification of `role`, `email`, `isActive`, or `password`.
* **Password Hashing & Verification**: `POST /api/user/password` validates current password using bcrypt before hashing new passwords with bcrypt (salt rounds = 12).
* **Prompt Injection & Retrieval Grounding**: System prompt strictly isolates untrusted study material content within `<study_document_content>` tags with explicit anti-injection instructions and source excerpt truncation.
* **Upload Validation**: File uploads are strictly restricted to PDF and TXT with a 15 MB limit and binary signature verification.

### 3. End-to-End Workflow Integration Test Suite (`tests/unit/workflow-integration.test.js`)
* Implemented comprehensive 14-step integration test covering the complete student journey:
  1. User Registration & Password Hashing (bcrypt round verification).
  2. Dashboard Initial State Resolution (zero-division safety).
  3. Material Upload Validation (PDF/TXT acceptance, rejection of invalid extensions & oversized files).
  4. Text Chunking Boundaries (800–1200 char limits with 150-char overlap).
  5. Grounded RAG Chat Prompt Assembly & Injection Defense.
  6. Quiz Answer Isolation (strict omission from client DTO).
  7. Server-Side Quiz Grading & Exponential Moving Average (EMA) Mastery Update (`alpha = 0.4`).
  8. Analytics Overview Aggregation with New Results.
  9. Weak-Topic Identification (<70% detection and priority mapping).
  10. Personalized Revision Recommendation Lifecycle (`pending` → `completed` → `dismissed`).
  11. Unified Activity Timeline Construction (chronological ordering).
  12. Student Profile Settings & Mass-Assignment Protection.
  13. Isolated Password Modification & Re-authentication.
  14. Cross-Tenant Resource Access Defense (strict User B rejection on User A resources).

### 4. Verification Checkpoint
* **Unit & Integration Tests**: `202 passed / 0 failed` across 53 test suites in 10 files (`npm run test:unit`).
* **ESLint**: `0 warnings, 0 errors` (`npm run lint`).
* **Production Build**: Compiled successfully; all 22 static and dynamic App Router routes verified (`npm run build`).

---

## Milestone 8 Implementation Details

### 1. Services Created / Enhanced
* `src/services/analyticsService.js` — Core Analytics & Diagnostics Engine:
  - `classifyMastery(score)`: 4-band topic classification (<40% Critical, 40% to <70% Weak, 70% to <85% Developing, ≥85% Mastered).
  - `calculateTopicMastery(prevScore, newScore, alpha = 0.4)`: Preserved EMA calculation for backward compatibility with `quizService.js`.
  - `calculateOverviewMetrics(submissions, totalMaterials, masteredTopicsCount)`: Pure calculation helper handling zero-division prevention, differing quiz max scores, and never reporting 100% accuracy when 0 questions answered.
  - `getOverviewMetrics(userId)`: Scoped MongoDB aggregation computing Total Study Materials, Completed Quizzes, Average Quiz Score, Total Questions Answered, Overall Accuracy, and Mastered Topics.
  - `getWeakTopics(userId, opts)`: Weak-topic detection filtering to <70% mastery, associating topics with actual study materials via `Quiz` models, computing diagnostic reasons and suggested actions, sorting by urgency (Critical before Weak, lowest score first), and detecting historical score decline only when reliable history exists.
  - `generateRecommendations(userId)`: Idempotent revision card generator creating HIGH/MEDIUM priority recommendations for weak topics, skipping active pending duplicates, and preserving completed/dismissed statuses.
  - `getRecommendations(userId, opts)`: Retrieves recommendations sorted by priority and recency with status and material filters.
  - `updateRecommendationStatus(recommendationId, userId, newStatus)`: Enforces user ownership and validates status transitions across `pending`, `reviewed`, `completed`, and `dismissed`.
  - `getAllTopicMastery(userId)`: Full topic mastery list sorted by score for student transparency.
* `src/services/historyService.js` — Learning History Engine:
  - `buildActivityTimeline(submissions, materials, revisions)`: Pure function constructing a unified, chronologically sorted activity stream (quiz attempts, document uploads, and completed revisions).
  - `getStudentHistory(userId, opts)`: Queries user-scoped quiz attempts, study materials, and completed revision actions with full attempt diagnostics and score summaries.

### 2. Models Enhanced
* `src/models/RevisionRecommendation.js`:
  - Updated `status` enum to `["pending", "reviewed", "completed", "dismissed"]`, ensuring seamless compatibility with both "completed" and "reviewed" conventions.
  - Indexed by `{ userId: 1, status: 1, priority: 1 }` and `{ userId: 1, topicTag: 1 }`.

### 3. API Routes Implemented
* `GET /api/analytics/overview`: Returns user-scoped aggregate overview metrics (`totalMaterials`, `quizzesCompleted`, `averageQuizScore`, `totalQuestionsAnswered`, `overallAccuracy`, `masteredTopics`).
* `GET /api/analytics/weak-topics`: Returns user-scoped weak topics (<70%) with material associations, diagnostic explanations, and suggested next steps.
* `GET /api/analytics/recommendations`: Returns user-scoped personalized revision recommendations with optional status and material filtering.
* `POST /api/analytics/recommendations`: Triggers idempotent recommendation generation for newly identified weak topics.
* `PATCH /api/analytics/recommendations/[id]`: Updates recommendation status (`completed`, `reviewed`, `dismissed`, `pending`) with strict user ownership isolation.
* `GET /api/history`: Returns user-scoped learning history timeline, quiz attempt breakdown, material uploads, and completed revision actions.
* `GET /api/user/profile`: Returns authenticated student profile with academic level, target exam, and account metadata.
* `PATCH /api/user/profile`: Safely updates profile fields (`name`, `academicLevel`, `targetExam`) while strictly defending against modifications to protected fields (`role`, `email`, `isActive`, `password`).
* `POST /api/user/password`: Validates current password via bcrypt and securely hashes new passwords (min 8 characters).

### 4. Validations
* `src/validations/analytics.js`:
  - `recommendationStatusUpdateSchema`: Validates status updates to allowed enum values (`pending`, `reviewed`, `completed`, `dismissed`).
  - `recommendationsQuerySchema`: Validates query parameters (`status`, `materialId`, `limit`).
  - `weakTopicsQuerySchema`: Validates boolean query parameters (`includeDeveloping`, `all`) with safe truthy preprocessing.
  - `recommendationIdParamSchema`: Validates 24-character hexadecimal MongoDB ObjectId.
* `src/validations/user.js`:
  - `profileUpdateSchema`: Validates safe student profile fields (`name`, `academicLevel`, `targetExam`).
  - `passwordChangeSchema`: Validates current password and new password length constraints (8–128 characters).

### 5. UI Features Implemented
* `src/app/analytics/layout.js` & `page.js`: Full-featured analytics dashboard with 6 overview cards, weak-topics spotlight, revision feed, and 4-tier topic mastery visualization.
* `src/app/revision/layout.js` & `page.js`: Dedicated revision hub displaying topics, priority badges, score-at-flag, diagnostic guidance, and direct action triggers ("Notes", "Assistant", "Quiz", "Complete", "Dismiss", "Reopen").
* `src/app/history/layout.js` & `page.js`: Comprehensive student learning history featuring a unified activity timeline, quiz attempts with scores, study materials log, and completed revisions archive.
* `src/app/settings/layout.js` & `page.js`: Account settings page for managing student identity, academic level, target examination goals, and bcrypt password modification.
* `src/components/shell/Sidebar.jsx`: Integrated and marked "Live" for `Progress Analytics` (`/analytics`), `Revision Recommendations` (`/revision`), `Learning History` (`/history`), and `Settings` (`/settings`).
* `src/app/dashboard/page.js`: Direct links to Learning Analytics and Learning History from the dashboard.
* `src/middleware.js`: Route protection updated to guard `/history/:path*` and `/settings/:path*`.

### 6. Automated Testing Suite
* `tests/unit/analytics-service.test.js`: 24 unit tests covering metric calculations, zero-division safety, 4-band classification, weak-topic sorting, revision idempotency, validations, and user isolation.
* `tests/unit/revision-history-settings.test.js`: 10 unit tests covering activity timeline construction, chronological sorting, cross-user isolation, status progression, profile validation, protected field tamper defense, and password constraints.
* Overall test suite: **188 passing tests / 0 failing** across 52 test suites in 9 test files.
* ESLint: **0 warnings, 0 errors**.
* Production Build (`npm run build`): **Compiled successfully** with all 22 static and dynamic App Router pages generated.

### 7. Readiness for Milestone 9
Milestone 8 is 100% complete across all core analytics, weak-topic identification, personalized revision feeds, learning history, user settings, and secure data access layers. The project is verified and fully ready to proceed to **Milestone 9: Integration Testing, Security & UI Polish**.

---

## Milestone 7 Implementation Details

### 1. Services Created / Updated
* `src/services/quizService.js` — Core Quiz Generation, Isolation, and Scoring Engine:
  - `toPublicQuizDTO(quiz)`: Safe public serializer strictly stripping answers, reference texts, rubrics, and explanations.
  - `generateQuiz({ materialId, userId, questionCount, difficulty, questionTypes, customTitle })`: Samples document chunks belonging exclusively to the authenticated user and material, prompts Gemini Flash with structured JSON template, validates questions, separates public `Quiz` and server-only `QuizAnswerKey`, and saves with compensating cleanup on failure.
  - `evaluateShortAnswerWithGemini({ questionText, studentAnswer, referenceAnswer, rubric })`: Server-side semantic grading of student responses against reference answer and rubric using Gemini Flash (`temperature: 0.1`) with deterministic keyword fallback.
  - `evaluateAndScoreSubmission({ quizId, userId, submittedAnswers, idempotencyKey, durationSeconds })`: Server-side grading of MCQs, True/False, and Short Answers; calculates final percentage, correct/incorrect counts, and topic diagnostics; executes atomic Exponential Moving Average (EMA, `alpha = 0.4`) updates to `TopicMastery`; prevents duplicate processing via `idempotencyKey`; persists `QuizSubmission` and returns client-safe result payload.

### 2. Models Enhanced (Backward-Compatible)
* `src/models/Quiz.js`: Added `type` enum (`MCQ`, `TRUE_FALSE`, `SHORT_ANSWER`, default: `MCQ`) to `QuestionSchema`. Updated `options` validator so `SHORT_ANSWER` questions do not require choice options.
* `src/models/QuizAnswerKey.js`: Relaxed `correctOptionId` requirement for non-MCQ questions, added `questionType`, `referenceAnswer`, and `rubric`.
* `src/models/QuizSubmission.js`: Enhanced `GradedAnswerSchema` and `submittedAnswers` to support `answerText`, `feedback`, `score`, and `maxScore`. Added `idempotencyKey` to `QuizSubmissionSchema`.
* Fixed CommonJS `mongoose` named exports across all models to ensure 100% compatibility with native Node.js ESM test runners.

### 3. API Routes Implemented
* `POST /api/materials/[id]/quiz`: Generates active-recall quiz from document chunks using Gemini Flash. Saves public Quiz and private QuizAnswerKey. Returns public DTO (HTTP 201).
* `GET /api/materials/[id]/quiz`: Lists all quizzes created for the specified material with attempt counts and latest scores.
* `GET /api/quizzes/[id]`: Returns client-safe public quiz definition (never exposes answer key).
* `DELETE /api/quizzes/[id]`: Deletes quiz, private answer key, and associated submissions with ownership verification.
* `POST /api/quizzes/[id]/submit`: Evaluates student answers, scores submission, updates `TopicMastery`, and returns authorized results with explanations.
* `GET /api/quizzes/[id]/submissions`: Retrieves previous attempts and performance records for a quiz.
* `GET /api/quizzes`: Lists all quizzes owned by the authenticated student across all study materials.

### 4. Validations
* `src/validations/quiz.js`:
  - `quizGenerationSchema`: Validates question count (5, 10, 15), difficulty (`beginner`, `intermediate`, `advanced` mapped to `easy`, `medium`, `hard`), and question types (`MCQ`, `TRUE_FALSE`, `SHORT_ANSWER`).
  - `quizSubmissionSchema`: Validates submitted answers array, question IDs, selected options or answer texts, optional idempotency key, and elapsed duration.
  - `quizIdParamSchema`: Validates 24-character hexadecimal MongoDB ObjectId.

### 5. UI Features Implemented
* `src/components/materials/QuizGeneratorDialog.jsx`: Interactive modal for configuring quiz parameters (question count, difficulty level, question types) with loading states and error handling.
* `src/app/quizzes/[id]/page.js`: Full-featured interactive quiz runner with question navigation, elapsed timer, progress bar, MCQ/TF option selectors, short-answer textarea, review summary before submission, and rich post-submission results review (overall score, pass/fail status, topic mastery diagnostics, and question-by-question breakdown with explanations).
* `src/app/quizzes/layout.js` & `src/app/quizzes/page.js`: Central quizzes hub listing student quizzes with difficulty badges, question counts, attempt counts, and best scores.
* `src/app/materials/[id]/page.js`: Added "Quizzes" workspace tab with quiz listing and integrated Quiz Generator dialog.
* `src/app/dashboard/page.js` & `src/components/shell/Sidebar.jsx`: Integrated navigation links to `/quizzes` with live status indicators.

---

## Milestone 6 Implementation Details

### 1. Services Created
* `src/services/ragService.js` — Core RAG Orchestrator:
  - `cosineSimilarity(vecA, vecB)`: Pure vector mathematics computing dot product over Euclidean norms with edge-case handling (mismatched dims, zero vectors, NaNs).
  - `retrieveRelevantChunks({ materialId, userId, queryEmbedding, topK=4, threshold=0.35 })`: Dual-layer retrieval trying MongoDB Atlas `$vectorSearch` pipeline with tenant filter (`materialId`, `userId`), falling back seamlessly to exact in-app cosine similarity over `MaterialChunk` records.
  - `retrieveChunksByKeyword({ materialId, userId, queryText, topK=4 })`: Keyword fallback when embeddings are unavailable.
  - `buildRAGPrompt({ question, chunks, materialTitle })`: Strict prompt template enforcing factual grounding, prompt injection defenses against untrusted document content, and inline citation markers.
  - `generateGroundedAnswer({ question, materialId, userId, materialTitle, conversationHistory })`: Full server-side orchestrator coordinating query embedding generation (`text-embedding-004`), chunk retrieval, multi-turn history formatting, Gemini Flash execution, and source excerpt citation extraction.

### 2. Models Created / Updated
* `src/models/ChatMessage.js` — Chat message persistence:
  - Scoped strictly to `userId` and `materialId`.
  - Roles: `user` and `assistant`.
  - Assistant records include `sources: [{ chunkId, chunkIndex, page, excerpt, score }]`.
  - Compound indexes on `{ userId: 1, materialId: 1, createdAt: 1 }` and `{ userId: 1, conversationId: 1, createdAt: 1 }`.
* `src/models/index.js` — Registered `ChatMessage` and `MODEL_NAMES.CHAT_MESSAGE`.

### 3. API Routes Implemented
* `POST /api/materials/[id]/chat` — Handles grounded Q&A:
  - Authenticates via `requireAuth()` (401).
  - Validates `id` with `objectIdSchema` and payload with `chatMessageSchema` (400).
  - Verifies document ownership (`userId`) (404).
  - Enforces `processingStatus === "ready"` and `chunkCount > 0` (422).
  - Multi-turn context: loads last 6 messages for dialogue continuity.
  - Persists query and grounded answer to `ChatMessage`.
  - Returns `{ answer, sources, conversationId }`.
* `GET /api/materials/[id]/chat` — Retrieves student's chat history for document.
* `DELETE /api/materials/[id]/chat` — Clears conversation history without affecting document or chunks.

### 4. Validations
* `src/validations/chat.js`:
  - `chatMessageSchema`: Non-empty message between 1 and 2,000 characters; optional `conversationId`.
  - `chatHistoryQuerySchema`: Optional `conversationId`, default limit 50, max 100.
  - `materialChatParamSchema`: 24-character hex MongoDB ObjectId.

### 5. UI Integration
* `src/components/materials/ChatAssistant.jsx` — Interactive chat interface:
  - Responsive two-state UI: informative guide if document is unprocessed, interactive chat thread if ready.
  - Student vs Assistant styled bubbles with Learnova AI branding.
  - Expandable Verified Source Citations showing excerpt number, chunk index, page number, and quoted passage.
  - Empty state with 4 suggested course-specific starter prompts.
  - Enter-to-send, Shift+Enter for multiline, auto-resizing textarea.
  - Loading animation with animated gradient dots during RAG retrieval and generation.
  - Error state with inline Retry action.
  - Clear history modal dialog with permanent history cleanup.
* `src/app/materials/[id]/page.js`:
  - Added workspace tab switcher: "Document Preview" vs "AI Study Assistant" with live pulse indicator.
  - Connected "Ask AI Assistant" roadmap button directly to live chat view with "Live" badge.

---

## Test & Verification Results

* **Unit Test Suite:** `129/129 tests passing (100%)` across 6 test suites:
  - `tests/unit/rag-chat.test.js` (28 tests) — **NEW (Milestone 6)**
  - `tests/unit/ingestion-service.test.js` (40 tests)
  - `tests/unit/materials-service.test.js` (21 tests)
  - `tests/unit/backend-foundation.test.js` (21 tests)
  - `tests/unit/design-system.test.js` (11 tests)
  - `tests/unit/auth-validation.test.js` (8 tests)
* **ESLint (`npm run lint`):** `0 warnings, 0 errors`.
* **Production Build (`npm run build`):** Exited with code `0`:
  - **14 routes compiled and generated** without errors, including `/api/materials/[id]/chat`.

---

## Required Environment Variables

To enable live cloud storage, AI embeddings, and database connectivity:
* `R2_ACCOUNT_ID` — Cloudflare account identifier
* `R2_ACCESS_KEY_ID` — Cloudflare R2 or S3 API access key ID
* `R2_SECRET_ACCESS_KEY` — Cloudflare R2 or S3 API secret access key
* `R2_BUCKET_NAME` — Target private bucket name
* `R2_ENDPOINT` — R2 endpoint URL (e.g. `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`)
* `GEMINI_API_KEY` — Google Gemini API key (required for `text-embedding-004` and generation features)
* `MONGODB_URI` — MongoDB Atlas connection string
* `NEXTAUTH_SECRET` — Session encryption secret (≥ 32 chars)
* `NEXTAUTH_URL` — Base application URL

### MongoDB Atlas Vector Search Index (Optional for Atlas Search Clusters)
Create a vector search index named `vector_index` on the `materialchunks` collection:
```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 768,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "materialId"
    },
    {
      "type": "filter",
      "path": "userId"
    }
  ]
}
```
*Note: If the Atlas Vector Search index is not yet configured, the system automatically and reliably falls back to in-app exact cosine similarity over the document's stored 768-dim chunks.*

---

## Next Milestone

**Milestone 7 — Quiz Engine & Scoring System**
* Dynamic active-recall quiz generation from document chunks.
* Server-only answer key withholding (`QuizAnswerKey` model).
* Server-side grading and submission evaluation (`QuizSubmission` model).
* Exponential Moving Average (EMA) topic mastery tracking (`TopicMastery` model).
* Personalized revision recommendations (`RevisionRecommendation` model).

---

## Milestone 4 Implementation Details

### 1. Pages Created / Updated
* `src/app/materials/layout.js` — Dedicated materials workspace layout with responsive sidebar, active route highlighting, and student session controls.
* `src/app/materials/page.js` — Comprehensive study materials management interface:
  - Drag-and-drop & file picker upload modal with client-side 15 MB validation.
  - Search input filtering by document title or filename.
  - File-type filter tabs ("All", "PDF", "TXT").
  - Sorting controls ("Newest First", "Oldest First", "Title (A-Z)", "Largest Size").
  - Material card grid with file type icon, formatted size, upload date, and status badges ("Stored", "Processing", "Ready", "Failed").
  - Accessible delete confirmation dialog with permanent cloud storage cleanup.
* `src/app/materials/[id]/page.js` — Protected document workspace:
  - Two-column layout with document preview on the left and metadata/actions on the right.
  - PDF document viewing via short-lived presigned URLs (15-min TTL) with iframe/download fallbacks.
  - TXT document viewing with safely escaped plain text formatting.
  - Metadata panel with original filename, file type, file size, upload timestamp, and status.
  - Future AI action buttons (Summarize, Simplify Concept, Ask AI, Generate Quiz) with clear roadmap dialogs.
  - Workspace delete action with confirmation modal and redirect to `/materials`.

### 2. API Routes Implemented
* `POST /api/materials` — Authenticated multipart document upload:
  - Enforces 15 MB size limit (413 Payload Too Large).
  - Validates extensions and MIME types (`pdf`, `txt` - 415 Unsupported Media Type).
  - Inspects binary signatures (validates `%PDF-` magic bytes, rejects binary content in text files).
  - Generates scoped storage key: `users/{userId}/documents/{materialId}.{ext}`.
  - Uploads to private Cloudflare R2 / AWS S3 storage.
  - Creates `Material` record in MongoDB Atlas.
  - **Automated Rollback:** Deletes uploaded storage object if database write fails to prevent orphaned cloud files.
* `GET /api/materials` — Retrieves user's study materials:
  - Enforces tenant isolation (scoped strictly to `userId: user.id`).
  - Supports query filters (search, fileType, status, sort, order).
  - Omits internal private storage keys from public responses.
* `GET /api/materials/[id]` — Retrieves single material metadata & presigned URL:
  - Verifies ownership (returns 404 if material belongs to another student).
  - Generates 15-minute presigned download/view URL.
  - Reads plain text content for inline TXT rendering.
* `DELETE /api/materials/[id]` — Secure document deletion:
  - Verifies ownership before performing any mutations.
  - Deletes physical object from private storage bucket first.
  - Deletes `Material` record and any child `MaterialChunk` records from MongoDB.
* `PATCH /api/materials/[id]` — Updates material title with Zod validation.

### 3. Services & Storage Adapter Updates
* `src/services/documentService.js`:
  - `validateUploadFile`: Verifies presence, 15 MB limit, and allowed extensions (`pdf`, `txt`).
  - `validateFileSignature`: Inspects `%PDF-` magic bytes and text byte streams.
  - `sanitizeFilename`: Strips path traversal sequences (`..`, `/`, `\`), null bytes, and control characters.
  - `formatFileSize`: Converts bytes to clean human-readable strings ("1 KB", "2.5 MB").
* `src/lib/storage/index.js`:
  - Added `getFileText(storageKey, maxBytes)` for reading plain text documents from private storage.
  - Added idempotent error handling in `deleteFile` (gracefully ignores `NoSuchKey` / 404).
* `src/lib/auth/index.js`:
  - Added `AuthError` and `assertOwnership` helpers.

### 4. Validations & Schemas
* `src/validations/materials.js`:
  - `materialListQuerySchema`: Validates pagination, search, fileType, status, sort, and order.
  - `materialIdParamSchema`: Validates 24-character hexadecimal MongoDB ObjectIds.
  - `materialUpdateSchema`: Enforces non-empty title under 200 characters.

---

## Milestone 5 Implementation Details

### 1. Services Created
* `src/services/extractionService.js` — Server-side text extraction:
  - `normalizeText(rawText)`: Unified LF line endings, strips control/null bytes, collapses excess whitespace, preserves paragraphs and Unicode.
  - `extractTxtText(buffer)`: UTF-8 decode with BOM stripping, empty-content detection.
  - `extractPdfText(buffer)`: PDF parsing via `pdf-parse@2.4.5` (class-based API with `PDFParse`), page-by-page text capture, scanned/encrypted PDF detection.
  - `extractDocumentText(buffer, fileType)`: Dispatcher for PDF and TXT.
* `src/services/chunkingService.js` — Semantic-aware chunker:
  - `CHUNKING_CONFIG`: target 1000, max 1500, min 100, overlap 150 chars.
  - Splitting hierarchy: paragraphs → sentences → words → emergency character slice.
  - `chunkTextBlock()`: page-aware chunks with `startCharOffset`, `endCharOffset`, `pageNumber`, `characterCount`.
  - `createDocumentChunks()`: produces validated, sequentially indexed chunks across full document.
* `src/services/embeddingService.js` — Vector embedding service:
  - Model: `text-embedding-004`, 768 dimensions via `@google/generative-ai`.
  - `isValidEmbeddingVector(vector, expectedDim)`: validates array of 768 finite floats.
  - `generateChunkEmbedding(text, retries)`: exponential backoff with jitter on 429/transient errors.
  - `generateBatchEmbeddings(chunks, options)`: controlled concurrency (5 parallel) batch processing.
* `src/services/ingestionService.js` — Pipeline orchestrator:
  - `countWords(text)`: word count utility.
  - `processMaterialDocument({ materialId, userId })`: full pipeline from storage retrieval → extraction → chunking → embedding → atomic chunk persistence → material status update.
  - Status transitions: `pending` → `processing` → `ready` / `failed`.
  - Race condition guard: prevents duplicate concurrent processing runs.
  - Safe retry: atomic `deleteMany` + `insertMany` on reprocessing.

### 2. Model Updated
* `src/models/MaterialChunk.js` — Added `embeddingModel` field (default `"text-embedding-004"`) for vector versioning.

### 3. Storage Adapter Updated
* `src/lib/storage/index.js` — Added `getFileBuffer(storageKey)`: streams full binary buffer from private R2/S3 for PDF extraction.

### 4. API Route Created
* `POST /api/materials/[id]/process` — Triggers ingestion pipeline:
  - Requires authenticated user (NextAuth).
  - Validates material ID (Zod `objectIdSchema`).
  - Verifies ownership before any operation.
  - Race-condition guard (409 if actively processing within 3-min window).
  - Returns structured JSON with `chunkCount`, `pageCount`, `wordCount`, `embeddingModel`.
  - Records failure in MongoDB on any pipeline error.

### 5. UI Updated
* `src/app/materials/[id]/page.js` — Added AI Ingestion Pipeline card:
  - Pending state: process button.
  - Active processing: animated progress bar with spinner.
  - Ready state: chunk/page/word/model metrics grid + reprocess button.
  - Failed state: error banner + retry button.
  - Metadata panel now shows `chunkCount`, `pageCount`, `wordCount` after processing.
* `src/app/materials/page.js` — Card badges now show chunk count for `ready` documents (e.g., "42 Chunks").

---

## Test & Verification Results

* **Unit Test Suite:** `154/154 tests passing (100%)` across 7 test suites:
  - `tests/unit/quiz-service.test.js` (25 tests) — **NEW (Milestone 7)**
  - `tests/unit/rag-chat.test.js` (28 tests)
  - `tests/unit/ingestion-service.test.js` (40 tests)
  - `tests/unit/materials-service.test.js` (21 tests)
  - `tests/unit/backend-foundation.test.js` (21 tests)
  - `tests/unit/design-system.test.js` (11 tests)
  - `tests/unit/auth-validation.test.js` (8 tests)
* **ESLint (`npm run lint`):** `0 warnings, 0 errors`.
* **Production Build (`npm run build`):** Exited with code `0`:
  - **20 routes compiled and generated** without errors, including `/quizzes`, `/quizzes/[id]`, `/api/materials/[id]/quiz`, `/api/quizzes`, `/api/quizzes/[id]`, `/api/quizzes/[id]/submit`, and `/api/quizzes/[id]/submissions`.

---

## Required Environment Variables

To enable live cloud storage, AI embeddings, quiz generation, and database connectivity:
* `R2_ACCOUNT_ID` — Cloudflare account identifier
* `R2_ACCESS_KEY_ID` — Cloudflare R2 or S3 API access key ID
* `R2_SECRET_ACCESS_KEY` — Cloudflare R2 or S3 API secret access key
* `R2_BUCKET_NAME` — Target private bucket name
* `R2_ENDPOINT` — R2 endpoint URL (e.g. `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`)
* `GEMINI_API_KEY` — Google Gemini API key (required for `text-embedding-004` and `gemini-1.5-flash` generation and short-answer evaluation)
* `MONGODB_URI` — MongoDB Atlas connection string
* `NEXTAUTH_SECRET` — Session encryption secret (≥ 32 chars)
* `NEXTAUTH_URL` — Base application URL

### MongoDB Atlas Vector Search Index (Required for Milestone 6 RAG)
Create a vector search index on the `materialchunks` collection:
```json
{
  "fields": [{ "type": "vector", "path": "embedding", "numDimensions": 768, "similarity": "cosine" }]
}
```

---

## Next Milestone

**Milestone 8 — Learning Analytics, Mastery Graphs & System Hardening**
* Historical mastery and retention visualization using `TopicMastery` metrics.
* Exam readiness index calculation across all study materials.
* Personalized revision recommendations based on identified weak topics.
* Automated scheduled background refreshes and end-to-end regression testing.
* Production deployment verification on Vercel.
