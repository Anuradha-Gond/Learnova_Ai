"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Sparkles,
  BookOpen,
  Brain,
  HelpCircle,
  BarChart3,
  Flame,
  ArrowRight,
  Upload,
  CheckCircle2,
  ChevronDown,
  Layers,
  ShieldCheck,
  Zap,
  GraduationCap,
  FileText,
  Clock,
  Menu,
  X,
  Target,
  LineChart,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

export default function LandingPage() {
  const { data: session, status } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);

  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated";

  const coreFeatures = [
    {
      title: "Smart Study Materials",
      description: "Organize learning materials and prepare them for AI-assisted study.",
      icon: BookOpen,
      badge: "Milestone 4",
      highlight: "Document Upload & Processing",
    },
    {
      title: "AI Concept Simplification",
      description: "Understand difficult topics through clear, student-friendly explanations.",
      icon: Brain,
      badge: "Milestone 4",
      highlight: "Adaptive Complexity",
    },
    {
      title: "Document-Grounded AI Assistant",
      description: "Ask questions about study materials and receive relevant answers with supporting sources when available.",
      icon: Sparkles,
      badge: "Milestone 6",
      highlight: "Grounded RAG Q&A",
    },
    {
      title: "Personalized Quizzes",
      description: "Practice with questions generated from learning materials.",
      icon: HelpCircle,
      badge: "Milestone 5",
      highlight: "Active Recall",
    },
    {
      title: "Learning Analytics",
      description: "Track quiz performance and identify topics that need more attention.",
      icon: BarChart3,
      badge: "Milestone 5",
      highlight: "Topic Diagnostics",
    },
    {
      title: "Smart Revision",
      description: "Receive revision suggestions based on learning activity and topic mastery.",
      icon: Flame,
      badge: "Milestone 6",
      highlight: "Targeted Mastery",
    },
  ];

  const steps = [
    {
      step: "01",
      title: "Upload your study materials",
      description: "Upload PDFs or lecture notes into your secure, private personal workspace.",
      icon: Upload,
    },
    {
      step: "02",
      title: "Let Learnova AI prepare your content",
      description: "Our AI breaks down complex concepts, organizes key topics, and indexes knowledge chunks.",
      icon: Layers,
    },
    {
      step: "03",
      title: "Ask questions and practice quizzes",
      description: "Ask grounded questions directly to your documents and test yourself with AI-generated quizzes.",
      icon: HelpCircle,
    },
    {
      step: "04",
      title: "Track progress and revise weak topics",
      description: "Diagnose learning gaps via adaptive analytics and receive smart revision recommendations.",
      icon: Target,
    },
  ];

  const benefits = [
    {
      title: "Easier understanding of difficult concepts",
      description: "Digest complex academic literature through multi-level explanations and step-by-step concept breakdowns.",
      icon: Brain,
    },
    {
      title: "Less time spent organizing study notes",
      description: "Centralize your textbooks, lecture slides, and notes in one unified, searchable study repository.",
      icon: FileText,
    },
    {
      title: "Focused practice based on study material",
      description: "Practice active recall with questions grounded specifically in your own curriculum, not generic web tests.",
      icon: Target,
    },
    {
      title: "Better awareness of learning gaps",
      description: "Identify exact subtopics that pull down your average before walking into test day.",
      icon: LineChart,
    },
    {
      title: "More structured revision",
      description: "Prioritized review queues ensure you spend study time where mastery improvements have the biggest impact.",
      icon: Flame,
    },
    {
      title: "A unified learning workspace",
      description: "Everything from document ingestion to AI doubt clearing and progress metrics lives under one cohesive roof.",
      icon: GraduationCap,
    },
  ];

  const faqs = [
    {
      question: "What is Learnova AI?",
      answer:
        "Learnova AI is a personalized educational platform designed to help students master academic subjects faster. By combining document parsing, AI concept simplification, grounded question-answering, and adaptive quizzing, Learnova AI turns passive reading into active, measurable learning.",
    },
    {
      question: "Who can use Learnova AI?",
      answer:
        "Learnova AI is tailored for university and high school students, self-directed learners, and exam candidates who need to digest dense study materials and build genuine mastery over difficult topics.",
    },
    {
      question: "Can I upload my own study materials?",
      answer:
        "Yes! You can upload your own lecture notes and syllabi in PDF and text formats up to 15 MB. Your documents are stored privately in encrypted cloud storage and are accessible only by your authenticated account.",
    },
    {
      question: "How does the AI assistant help students?",
      answer:
        "The AI assistant is strictly grounded in the materials you provide. When you ask questions, it retrieves relevant passages from your uploaded documents to provide factual explanations with citations, minimizing AI hallucinations.",
    },
    {
      question: "Can Learnova AI generate quizzes?",
      answer:
        "Yes. Learnova AI generates active-recall multiple-choice and conceptual practice questions directly from your notes, providing immediate server-graded feedback and explanations.",
    },
    {
      question: "How can I track my learning progress?",
      answer:
        "Every quiz submission updates your topic mastery using an exponential moving average (EMA) algorithm, highlighting strong topics and surfacing weak areas that need revision.",
    },
    {
      question: "Are all features available yet?",
      answer:
        "Learnova AI is being developed systematically in milestone releases. The Core Backend Foundation and Authentication UI are live today. Document upload and chunking (Milestone 4), quizzes and analytics (Milestone 5), and grounded RAG Q&A (Milestone 6) are releasing sequentially on the product roadmap.",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-brand-500/30 selection:text-brand-200">
      {/* ── A1. Public Navigation Bar ─────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-700 via-brand-600 to-teal-500 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-200">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col text-left">
              <span className="font-display font-extrabold text-lg tracking-tight text-white flex items-center gap-1.5">
                Learnova <span className="text-brand-400">AI</span>
              </span>
              <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase -mt-1">
                Personalized Learning
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-slate-300">
            <Link href="/" className="hover:text-white transition-colors">
              Home
            </Link>
            <Link href="#features" className="hover:text-white transition-colors">
              Features
            </Link>
            <Link href="#how-it-works" className="hover:text-white transition-colors">
              How It Works
            </Link>
            <Link href="#benefits" className="hover:text-white transition-colors">
              Benefits
            </Link>
            <Link href="#faq" className="hover:text-white transition-colors">
              FAQ
            </Link>
          </nav>

          {/* Session-Aware CTA Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            {isLoading ? (
              // Neutral skeleton during session hydration — prevents button flicker
              <div className="h-8 w-28 rounded-lg bg-slate-800 animate-pulse" />
            ) : isAuthenticated ? (
              <Link href="/dashboard">
                <Button variant="primary" size="sm" className="gap-2">
                  <span>Go to Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="outline" size="sm" className="bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white">
                    Login
                  </Button>
                </Link>
                <Link href="/register">
                  <Button variant="primary" size="sm" className="gap-1.5 shadow-brand-500/20 shadow-md">
                    <span>Start Learning</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-slate-800 bg-slate-900 px-4 py-4 space-y-3 animate-fade-in shadow-xl">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800"
            >
              Home
            </Link>
            <Link
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800"
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800"
            >
              How It Works
            </Link>
            <Link
              href="#benefits"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800"
            >
              Benefits
            </Link>
            <Link
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800"
            >
              FAQ
            </Link>

            <div className="pt-2 border-t border-slate-800 flex flex-col gap-2">
              {isAuthenticated ? (
                <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" size="md" className="w-full">
                    Go to Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" size="md" className="w-full bg-slate-950 border-slate-700 text-slate-200">
                      Login
                    </Button>
                  </Link>
                  <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="primary" size="md" className="w-full">
                      Start Learning
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── A2. Hero Section ────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28">
        {/* Ambient Gradient Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-brand-600/15 via-teal-500/10 to-transparent blur-3xl -z-10 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-950/70 border border-brand-800/60 text-brand-300 text-xs font-semibold shadow-subtle animate-fade-in">
            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
            <span>AI-Powered Learning Platform for Students</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold font-display tracking-tight text-white max-w-4xl mx-auto leading-tight sm:leading-none">
            Learn Smarter. Understand Faster.{" "}
            <span className="bg-gradient-to-r from-brand-400 via-teal-300 to-indigo-300 bg-clip-text text-transparent">
              Improve Continuously.
            </span>
          </h1>

          {/* Supporting Description */}
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Turn your study materials into personalized learning experiences. Upload your documents, simplify complex concepts, ask AI-powered questions, practice quizzes, and track your progress — all in one place.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link href={isAuthenticated ? "/dashboard" : "/register"} className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto gap-2 text-base px-7 py-3 bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-500/25">
                <span>{isAuthenticated ? "Go to Dashboard" : "Start Learning"}</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="#features" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-base px-6 py-3 bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800">
                Explore Features
              </Button>
            </Link>
          </div>

          {/* Learning Dashboard Interactive Preview Mockup */}
          <div className="pt-10 max-w-5xl mx-auto">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-2xl p-4 sm:p-6 backdrop-blur-xl relative">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="text-xs text-slate-400 ml-2 font-mono">Learnova Workspace — Molecular Biology</span>
                </div>
                <Badge variant="teal" size="sm">Active Study Session</Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-5 text-left">
                {/* Panel 1: Document */}
                <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-brand-400 text-xs font-semibold">
                    <FileText className="w-4 h-4" />
                    <span>Uploaded Material</span>
                  </div>
                  <h4 className="text-sm font-bold text-white">Cellular_Respiration_Notes.pdf</h4>
                  <p className="text-xs text-slate-400 line-clamp-3">
                    Glycolysis occurs in the cytoplasm and breaks down glucose into pyruvate, yielding 2 ATP and 2 NADH molecules without requiring oxygen...
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
                    <span>12 chunks indexed</span>
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Ready
                    </span>
                  </div>
                </div>

                {/* Panel 2: AI Grounded Doubt-Clearing */}
                <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-teal-400 text-xs font-semibold">
                    <Brain className="w-4 h-4" />
                    <span>AI Simplification</span>
                  </div>
                  <h4 className="text-sm font-bold text-white">Question: Why is oxygen needed?</h4>
                  <p className="text-xs text-slate-300 bg-teal-950/30 border border-teal-800/40 p-2.5 rounded-lg leading-relaxed">
                    Oxygen acts as the final electron acceptor in the electron transport chain, allowing ATP synthase to generate 30+ ATP.
                  </p>
                  <div className="text-[10px] text-slate-400 font-mono">Source: Page 4, Section 3.2</div>
                </div>

                {/* Panel 3: Adaptive Quiz & Mastery */}
                <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold">
                    <HelpCircle className="w-4 h-4" />
                    <span>Active Recall Quiz</span>
                  </div>
                  <h4 className="text-sm font-bold text-white">Net ATP from Glycolysis?</h4>
                  <div className="space-y-1.5 text-xs">
                    <div className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-400">A) 4 ATP</div>
                    <div className="p-2 rounded bg-emerald-950/60 border border-emerald-500/50 text-emerald-200 font-semibold flex items-center justify-between">
                      <span>B) 2 ATP (Net)</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Topic Mastery:</span>
                    <span className="text-brand-400 font-bold">88% (Mastered)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── A3. Core Features Section ──────────────────────────────── */}
      <section id="features" className="py-20 border-t border-slate-900 bg-slate-950/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <Badge variant="primary" size="sm">Product Capabilities</Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-display text-white">
              Everything You Need to Master Your Studies
            </h2>
            <p className="text-sm text-slate-400">
              A comprehensive toolkit engineered to transition study materials from static reading into active, diagnostic learning cycles.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coreFeatures.map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 space-y-4 hover:border-slate-700 transition-all duration-200 flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-brand-950 border border-brand-800/60 text-brand-400 flex items-center justify-center shadow-sm">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        {feat.badge}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white font-display">{feat.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">{feat.description}</p>
                  </div>

                  <div className="pt-4 border-t border-slate-800/60 text-[11px] font-semibold text-brand-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-brand-500" />
                    <span>{feat.highlight}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── A4. How It Works Section ──────────────────────────────── */}
      <section id="how-it-works" className="py-20 border-t border-slate-900 bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <Badge variant="teal" size="sm">Simple 4-Step Process</Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-display text-white">
              How Learnova AI Works
            </h2>
            <p className="text-sm text-slate-400">
              Turn any syllabus or lecture document into a personalized study plan in minutes.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((st) => {
              const Icon = st.icon;
              return (
                <div
                  key={st.step}
                  className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 space-y-4 relative flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <span className="text-3xl font-extrabold font-mono text-slate-700">
                      {st.step}
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-teal-950 border border-teal-800/60 text-teal-400 flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-white font-display">{st.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">{st.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── A5. Student Benefits Section ──────────────────────────── */}
      <section id="benefits" className="py-20 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <Badge variant="violet" size="sm">Real Student Outcomes</Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-display text-white">
              Engineered for Focused, Stress-Free Studying
            </h2>
            <p className="text-sm text-slate-400">
              Clear learning advantages backed by active recall and cognitive spacing principles.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((b) => {
              const Icon = b.icon;
              return (
                <div
                  key={b.title}
                  className="rounded-2xl bg-slate-900/40 border border-slate-800 p-6 space-y-3 hover:border-slate-700 transition-colors"
                >
                  <div className="w-9 h-9 rounded-xl bg-violet-950 border border-violet-800/60 text-violet-400 flex items-center justify-center">
                    <Icon className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-white font-display">{b.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{b.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── A6. FAQ Section ────────────────────────────────────────── */}
      <section id="faq" className="py-20 border-t border-slate-900 bg-slate-900/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3">
            <Badge variant="neutral" size="sm">Frequently Asked Questions</Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-display text-white">
              Got Questions? We Have Answers.
            </h2>
            <p className="text-sm text-slate-400">
              Everything you need to know about Learnova AI and our release roadmap.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={faq.question}
                  className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden transition-all duration-200"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full px-5 py-4 text-left flex items-center justify-between text-sm font-bold text-white hover:text-brand-300 transition-colors"
                    aria-expanded={isOpen}
                  >
                    <span>{faq.question}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-brand-400" : ""
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs text-slate-400 leading-relaxed border-t border-slate-800/50 animate-fade-in">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ────────────────────────────────────────────── */}
      <section className="py-16 border-t border-slate-900 bg-gradient-to-b from-brand-950/40 to-slate-950">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="text-3xl font-extrabold font-display text-white">
            Ready to Accelerate Your Learning?
          </h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto">
            Create your free student account today and experience AI-guided study that adapts to your weaknesses.
          </p>
          <div className="flex justify-center pt-2">
            <Link href={isAuthenticated ? "/dashboard" : "/register"}>
              <Button size="lg" className="gap-2 bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-500/20">
                <span>{isAuthenticated ? "Go to Dashboard" : "Start Learning for Free"}</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── A7. Footer ────────────────────────────────────────────── */}
      <footer className="border-t border-slate-900 bg-slate-950 py-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-brand-700 flex items-center justify-center text-white">
                  <Sparkles className="w-4 h-4" />
                </div>
                <span className="font-display font-extrabold text-sm text-white">
                  Learnova <span className="text-brand-400">AI</span>
                </span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Personalized, AI-powered learning platform helping students understand documents, practice recall, and revise weak topics.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-slate-200 mb-3">Product</h4>
              <ul className="space-y-2">
                <li><Link href="#features" className="hover:text-slate-300">Features</Link></li>
                <li><Link href="#how-it-works" className="hover:text-slate-300">How It Works</Link></li>
                <li><Link href="#benefits" className="hover:text-slate-300">Student Benefits</Link></li>
                <li><Link href="#faq" className="hover:text-slate-300">FAQ</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-slate-200 mb-3">Account</h4>
              <ul className="space-y-2">
                <li><Link href="/login" className="hover:text-slate-300">Student Login</Link></li>
                <li><Link href="/register" className="hover:text-slate-300">Register Account</Link></li>
                <li><Link href="/dashboard" className="hover:text-slate-300">Student Dashboard</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-slate-200 mb-3">Legal & Privacy</h4>
              <ul className="space-y-2">
                <li>
                  <span className="text-slate-400">Privacy Policy (Encrypted storage, zero external data sharing)</span>
                </li>
                <li>
                  <span className="text-slate-400">Terms of Service (Educational academic assistance only)</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p>© 2026 Learnova AI. All rights reserved.</p>
            <p className="text-[11px] text-slate-600">Built with Next.js App Router, Tailwind CSS, MongoDB Atlas & Google Gemini</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
