# Learnova AI

> An AI-powered personalized learning platform that helps students understand dense study materials, generate structured summaries, ask grounded questions, practice quizzes, evaluate performance, identify weak topics, and receive personalized revision recommendations.

---

## Technology Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Language**: JavaScript only (`.js`, `.jsx`, `.mjs`)
- **Frontend / Styling**: React 18, [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Linting**: ESLint (`eslint-config-next`)
- **Deployment**: Vercel

---

## Getting Started

### Prerequisites

- **Node.js**: v18.17+ or v20+ (Node v22 supported)
- **npm**: v9+ or v10+

### 1. Installation

Clone or open the repository directory and install the project dependencies:

```bash
npm install
```

### 2. Environment Variables

Create your local environment file by copying the template:

```bash
cp .env.example .env.local
```

Configure your local secrets in `.env.local` (this file is excluded from Git).

### 3. Running the Development Server

Start the Next.js local development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application shell.

### 4. Running the Production Build

To verify production compilation and asset optimization:

```bash
npm run build
npm run start
```

### 5. Running Lint Checks

To run the ESLint verification suite:

```bash
npm run lint
```

---

## Project Structure

```
learnova-ai/
├── src/
│   ├── app/                     # Next.js App Router layout, pages & global styles
│   │   ├── layout.js            # Root layout with font imports and metadata
│   │   ├── globals.css          # Tailwind directives, theme variables, glassmorphism
│   │   └── page.js              # Application landing shell & overview
│   ├── components/              # Modular UI components
│   │   ├── shell/               # Navigation, header, sidebar & layout shell wrappers
│   │   └── ui/                  # Reusable accessible buttons, cards, badges, inputs
│   └── lib/                     # Core helper utilities (cn, formatting)
├── .env.example                 # Documented environment variable template
├── .eslintrc.json               # ESLint configuration
├── .gitignore                   # Git exclusion rules
├── AGENTS.md                    # Project-level development instructions & rules
├── jsconfig.json                # Path alias configuration (@/* -> src/*)
├── package.json                 # Dependency manifest & scripts
├── postcss.config.js            # PostCSS configuration
├── README.md                    # Setup and developer documentation
└── tailwind.config.js           # Tailwind theme configuration
```

---

## Development Guidelines

Refer to [AGENTS.md](./AGENTS.md) for mandatory rules, milestone-based execution workflows, and architectural boundaries.
