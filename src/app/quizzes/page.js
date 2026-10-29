"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  HelpCircle,
  Sparkles,
  BookOpen,
  Award,
  ArrowRight,
  Clock,
  RotateCcw,
  Search,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

export default function QuizzesPage() {
  const [quizzes, setQuizzes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("all");

  const fetchQuizzes = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/quizzes");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load quizzes.");
      }
      setQuizzes(data.quizzes || []);
    } catch (err) {
      setError(err.message || "An error occurred while loading quizzes.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  const filteredQuizzes = quizzes.filter((q) => {
    const matchesSearch =
      q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.materialTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.topicTags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesDifficulty =
      difficultyFilter === "all" || q.difficulty === difficultyFilter;

    return matchesSearch && matchesDifficulty;
  });

  const totalAttempts = quizzes.reduce((sum, q) => sum + (q.attemptCount || 0), 0);
  const attemptedQuizzes = quizzes.filter((q) => q.latestScore !== null);
  const avgScore =
    attemptedQuizzes.length > 0
      ? Math.round(
          attemptedQuizzes.reduce((sum, q) => sum + q.latestScore, 0) / attemptedQuizzes.length
        )
      : null;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ── Page Header & Stats ────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Practice Quizzes
            </h1>
            <Badge variant="teal" size="sm">
              Milestone 7
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Grounded active-recall assessments with automated scoring and topic mastery diagnostics.
          </p>
        </div>

        <Link href="/materials">
          <Button variant="primary" size="sm" className="gap-2 bg-brand-600 hover:bg-brand-500">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Generate from Material</span>
          </Button>
        </Link>
      </div>

      {/* ── Overview Metrics ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Total Quizzes Created
          </span>
          <p className="text-2xl font-extrabold text-white font-mono">{quizzes.length}</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Attempts Recorded
          </span>
          <p className="text-2xl font-extrabold text-teal-400 font-mono">{totalAttempts}</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Average Score
          </span>
          <p className="text-2xl font-extrabold text-brand-300 font-mono">
            {avgScore !== null ? `${avgScore}%` : "—"}
          </p>
        </div>
      </div>

      {/* ── Search & Filter Controls ────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/40 p-3 rounded-2xl border border-slate-800/80">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search quizzes by title, material, or topic..."
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "all", label: "All Difficulties" },
            { id: "easy", label: "Beginner" },
            { id: "medium", label: "Intermediate" },
            { id: "hard", label: "Advanced" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setDifficultyFilter(f.id)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer",
                difficultyFilter === f.id
                  ? "bg-brand-600 text-white shadow-sm"
                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Quizzes List ────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <SkeletonCard className="h-48" />
          <SkeletonCard className="h-48" />
          <SkeletonCard className="h-48" />
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-rose-950/40 border border-rose-800/50 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
          <p className="text-xs text-rose-200">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchQuizzes}>
            Try Again
          </Button>
        </div>
      ) : filteredQuizzes.length === 0 ? (
        <div className="p-12 rounded-3xl bg-slate-900/40 border border-slate-800 text-center max-w-md mx-auto space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-950 text-brand-400 flex items-center justify-center mx-auto">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white">No Quizzes Found</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {quizzes.length === 0
                ? "You haven't generated any quizzes yet. Open any of your study materials to create an AI-powered quiz."
                : "No quizzes match your current search and difficulty filters."}
            </p>
          </div>
          {quizzes.length === 0 && (
            <Link href="/materials">
              <Button size="sm" variant="primary" className="bg-brand-600 hover:bg-brand-500">
                Browse Study Materials
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredQuizzes.map((quizItem) => (
            <div
              key={quizItem.id}
              className="rounded-2xl bg-slate-900/80 border border-slate-800/90 hover:border-slate-700 p-5 space-y-4 flex flex-col justify-between transition-all group hover:shadow-lg"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider truncate max-w-[170px]" title={quizItem.materialTitle}>
                    {quizItem.materialTitle}
                  </span>
                  <Badge
                    variant={
                      quizItem.difficulty === "easy"
                        ? "teal"
                        : quizItem.difficulty === "hard"
                        ? "danger"
                        : "primary"
                    }
                    size="sm"
                    className="capitalize"
                  >
                    {quizItem.difficulty}
                  </Badge>
                </div>

                <h3 className="text-sm font-bold text-white group-hover:text-brand-300 transition-colors line-clamp-2">
                  {quizItem.title}
                </h3>

                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span className="font-mono">{quizItem.questionCount} Questions</span>
                  <span>•</span>
                  <span>
                    {quizItem.attemptCount > 0
                      ? `${quizItem.attemptCount} attempt(s)`
                      : "Not attempted"}
                  </span>
                </div>

                {quizItem.latestScore !== null && (
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-slate-400 text-[11px]">Latest Score:</span>
                    <span
                      className={cn(
                        "font-mono font-bold",
                        quizItem.latestScore >= 65 ? "text-emerald-400" : "text-amber-400"
                      )}
                    >
                      {quizItem.latestScore}%
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[10px] text-slate-500">
                  {new Date(quizItem.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </span>

                <Link href={`/quizzes/${quizItem.id}`}>
                  <Button size="sm" variant="primary" className="gap-1.5 text-xs bg-brand-600 hover:bg-brand-500">
                    <span>{quizItem.attemptCount > 0 ? "Retake" : "Take Quiz"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
