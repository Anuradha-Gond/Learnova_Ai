# Learnova AI — Agent & Development Instructions

Learnova AI is a personalized, AI-powered learning platform that helps students understand study materials, generate summaries, ask questions, practice quizzes, evaluate their performance, identify weak topics, and receive personalized revision recommendations.

---

## 1. Mandatory Technology Stack

- **Framework**: Next.js (App Router)
- **Language**: JavaScript only (`.js`, `.jsx`, `.mjs`), **strictly not TypeScript**
- **Frontend / UI**: React, Tailwind CSS, Reusable & accessible UI components
- **Backend / APIs**: Next.js Route Handlers, Node.js
- **Database & ODM**: MongoDB Atlas, Mongoose
- **Validation**: Zod
- **AI & ML**: Gemini API (structured generation, study aids, document embeddings)
- **RAG & Search**: Document chunk embeddings and vector search for RAG (e.g., MongoDB Atlas Vector Search)
- **Storage**: Private object storage (secured document uploads)
- **Deployment Target**: Vercel

---

## 2. Development Rules

1. **Inspect existing files before modifying them**: Never guess file paths or structures. Read and verify before editing.
2. **Follow the approved architecture**: Maintain clean modular code matching established directory conventions.
3. **Strict separation of concerns**: Keep distinct layers for:
   - UI (components, layouts, client state)
   - API routes (Next.js route handlers)
   - Business logic (services, orchestrators, calculators)
   - AI services (Gemini prompts, parsers, embedding handlers)
   - Database models (Mongoose schemas and models)
4. **JavaScript only**: Use JavaScript files (`.js`, `.jsx`, `.mjs`) rather than TypeScript application files (`.ts`, `.tsx`).
5. **No hardcoded secrets**: Never hardcode credentials, connection strings, or API keys. Always use environment variables (`.env.local` / `.env`).
6. **Keep secrets on the server**: Never expose server-side environment variables or keys to the client / browser bundle.
7. **Authenticate and authorize**: Protect every private operation and route handler. Check credentials before processing.
8. **Verify document & resource ownership**: Always check that the authenticated user owns or has explicit permission to read, modify, or delete a resource.
9. **Validate all incoming requests**: Validate request headers, bodies, parameters, and query strings using Zod schemas.
10. **Keep uploaded documents private**: Use signed URLs, private storage buckets, and strict access controls for all uploaded student study materials.
11. **Never expose quiz answer keys**: Withhold correct answer keys and explanations from client responses until a quiz submission has been recorded on the server.
12. **Calculate scores on the server**: Score quizzes, track response timing, and compute mastery levels strictly on the backend.
13. **Use real database-backed data**: Do not rely on mock data in production pathways. Implement and connect real Mongoose models backed by MongoDB.
14. **Resilient UI states**: Every interactive view and component must handle loading, error, empty, and success states gracefully.
15. **Handle AI provider failures & rate limits**: Gracefully handle Gemini API rate limits, network timeouts, format fallbacks, and token boundaries.
16. **Add tests for critical features**: Cover core business logic, quiz scoring, authentication checks, validation schemas, and AI helpers with automated tests.
17. **Avoid unnecessary dependencies and duplicated logic**: Keep bundle sizes lean and centralize shared logic.
18. **Preserve working functionality**: Do not overwrite or regress unrelated working functionality when making changes.
19. **Test before asserting**: Do not claim that a feature or fix works without testing and verifying it.
20. **Run verification suites**: Execute relevant tests and production builds (`npm run build`, test suites) after significant changes to maintain codebase integrity.

---

## 3. Development Workflow

For every milestone or task:

1. **Inspect relevant files**: Check the repository state, configs, dependencies, and related files.
2. **Explain the implementation plan**: Detail the proposed approach, file modifications, and architecture decisions.
3. **Implement only the requested milestone**: Keep changes scoped strictly to the current milestone. Do not build the entire application in one operation.
4. **Run the application and relevant tests**: Validate execution, run builds or tests, and verify outcomes.
5. **Fix errors before proceeding**: Resolve build issues, runtime warnings, or test failures immediately.
6. **Report changes and test outcomes**: Detail files created/modified, tests executed, and passing statuses.
7. **Identify remaining issues & next steps**: Note any technical debt, pending dependencies, or upcoming requirements.
8. **Wait for approval**: Obtain user approval before starting the next major milestone.

---

## 4. Architectural Structure (Standard Layout)

```
learnova-ai/
├── src/
│   ├── app/                 # Next.js App Router pages and route handlers
│   │   ├── api/             # Next.js Route Handlers (auth, materials, quizzes, analytics)
│   │   ├── (auth)/          # Authentication routes (login, register)
│   │   ├── dashboard/       # Student dashboard & analytics
│   │   ├── materials/       # Study materials, summaries, RAG Q&A
│   │   ├── quizzes/         # Quizzes, practice sessions, results
│   │   ├── layout.js        # Root layout with providers & navigation
│   │   └── page.js          # Landing page
│   ├── components/          # Reusable, accessible UI components
│   │   ├── ui/              # Buttons, inputs, modals, alerts, cards, loaders
│   │   └── shared/          # Navigation, headers, sidebars, layout wrappers
│   ├── lib/                 # Core utilities and shared configuration
│   │   ├── db/              # MongoDB connection & Mongoose client
│   │   ├── ai/              # Gemini API client, embedding generators, prompt templates
│   │   ├── storage/         # Private object storage adapter & signed URL helpers
│   │   └── utils.js         # Common helper utilities
│   ├── models/              # Mongoose database models (User, Material, Quiz, Submission, TopicMastery)
│   ├── services/            # Business logic and domain services (scoring, RAG retrieval, recommendation engine)
│   └── validations/         # Zod validation schemas
├── tests/                   # Automated unit and integration tests
├── .env.example             # Documented environment variables template
├── jsconfig.json            # Path aliases (e.g. @/* -> src/*)
├── package.json
└── tailwind.config.js
```
