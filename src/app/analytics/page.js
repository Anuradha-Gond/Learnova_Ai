"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  HelpCircle,
  Award,
  AlertTriangle,
  Flame,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
  ChevronRight,
  XCircle,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { SkeletonCard } from "@/components/ui/Skeleton";
import ErrorState from "@/components/ui/ErrorState";
import EmptyState from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";

export default function AnalyticsDashboardPage() {
  const [overview, setOverview] = useState(null);
  const [weakTopics, setWeakTopics] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [allMastery, setAllMastery] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState(null);
  const [quizHistory, setQuizHistory] = useState([]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const [overviewRes, weakRes, recsRes, historyRes] = await Promise.all([
        fetch("/api/analytics/overview"),
        fetch("/api/analytics/weak-topics?all=true"),
        fetch("/api/analytics/recommendations"),
        fetch("/api/history?limit=10"),
      ]);

      if (!overviewRes.ok || !weakRes.ok || !recsRes.ok) {
        throw new Error("Failed to load analytics data from server.");
      }

      const [overviewData, weakData, recsData] = await Promise.all([
        overviewRes.json(),
        weakRes.json(),
        recsRes.json(),
      ]);

      setOverview(overviewData.overview || overviewData);

      const allTopics = weakData.weakTopics || [];
      setAllMastery(allTopics);
      // Weak topics are strictly those with masteryScore < 70%
      setWeakTopics(allTopics.filter((t) => (t.masteryScore ?? 0) < 70));

      setRecommendations(recsData.recommendations || []);

      if (historyRes.ok) {
        const histData = await historyRes.json();
        setQuizHistory(histData.quizAttempts || []);
      }
    } catch (err) {
      setError(err.message || "An unexpected error occurred while loading analytics.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleGenerateRecommendations = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/analytics/recommendations", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate recommendations.");
      }
      setRecommendations(data.recommendations || []);
    } catch (err) {
      setError(err.message || "Failed to generate recommendations.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/analytics/recommendations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update recommendation.");
      }

      // Update local state smoothly
      setRecommendations((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
      );
    } catch (err) {
      alert(err.message || "Status update failed.");
    } finally {
      setUpdatingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="h-16 bg-slate-900/60 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <SkeletonCard className="bg-slate-900/60 border-slate-800" />
          <SkeletonCard className="bg-slate-900/60 border-slate-800" />
          <SkeletonCard className="bg-slate-900/60 border-slate-800" />
          <SkeletonCard className="bg-slate-900/60 border-slate-800" />
          <SkeletonCard className="bg-slate-900/60 border-slate-800" />
          <SkeletonCard className="bg-slate-900/60 border-slate-800" />
        </div>
        <div className="h-64 bg-slate-900/60 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <ErrorState
          title="Analytics Error"
          message={error}
          onRetry={fetchData}
        />
      </div>
    );
  }

  const hasNoActivity =
    (!overview || overview.totalMaterials === 0) &&
    (!overview || overview.quizzesCompleted === 0);

  const filteredRecommendations = recommendations.filter((r) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "pending") return r.status === "pending";
    if (statusFilter === "completed") {
      return r.status === "completed" || r.status === "reviewed";
    }
    if (statusFilter === "dismissed") return r.status === "dismissed";
    return true;
  });

  return (
    <div className="space-y-10 animate-fade-in">
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Learning Analytics & Weak-Topic Diagnostics
            </h1>
            <Badge variant="violet" size="sm">
              Milestone 8
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time diagnostic mastery metrics, weak-topic detection, and personalized revision recommendations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            size="sm"
            variant="outline"
            onClick={fetchData}
            className="gap-1.5 bg-slate-900 border-slate-700 text-slate-300 hover:text-white"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </Button>

          <Button
            size="sm"
            onClick={handleGenerateRecommendations}
            disabled={isGenerating}
            className="gap-1.5 bg-brand-600 hover:bg-brand-500 text-white"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isGenerating ? "Analyzing..." : "Update Recommendations"}</span>
          </Button>
        </div>
      </div>

      {/* ── A. Overview Metric Cards ─────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Performance Overview
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Card 1: Total Study Materials */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Total Study Materials</span>
              <div className="w-8 h-8 rounded-lg bg-brand-950 border border-brand-800/60 text-brand-400 flex items-center justify-center">
                <BookOpen className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-extrabold font-mono text-white">
                {overview?.totalMaterials ?? 0}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {overview?.totalMaterials > 0
                  ? "Active study materials in your workspace"
                  : "No materials uploaded yet"}
              </p>
            </div>
          </div>

          {/* Card 2: Quizzes Completed */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Quizzes Completed</span>
              <div className="w-8 h-8 rounded-lg bg-teal-950 border border-teal-800/60 text-teal-400 flex items-center justify-center">
                <HelpCircle className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-extrabold font-mono text-teal-400">
                {overview?.quizzesCompleted ?? 0}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Evaluated active-recall submissions recorded
              </p>
            </div>
          </div>

          {/* Card 3: Average Quiz Score */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Average Quiz Score</span>
              <div className="w-8 h-8 rounded-lg bg-violet-950 border border-violet-800/60 text-violet-400 flex items-center justify-center">
                <BarChart3 className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-extrabold font-mono text-violet-300">
                {overview?.quizzesCompleted > 0 ? `${overview.averageQuizScore}%` : "—"}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Mean percentage across all submitted quizzes
              </p>
            </div>
          </div>

          {/* Card 4: Total Questions Answered */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Questions Answered</span>
              <div className="w-8 h-8 rounded-lg bg-sky-950 border border-sky-800/60 text-sky-400 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-extrabold font-mono text-sky-300">
                {overview?.totalQuestionsAnswered ?? 0}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Active-recall questions evaluated server-side
              </p>
            </div>
          </div>

          {/* Card 5: Overall Accuracy */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Overall Accuracy</span>
              <div className="w-8 h-8 rounded-lg bg-amber-950 border border-amber-800/60 text-amber-400 flex items-center justify-center">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-extrabold font-mono text-amber-300">
                {overview?.totalQuestionsAnswered > 0 ? `${overview.overallAccuracy}%` : "—"}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Proportion of eligible correct answers
              </p>
            </div>
          </div>

          {/* Card 6: Mastered Topics */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Mastered Topics</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-800/60 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-extrabold font-mono text-emerald-400">
                {overview?.masteredTopics ?? 0}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Topics with mastery score ≥ 85%
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Empty State Guard: If no activity at all ─────────────────── */}
      {hasNoActivity && (
        <div className="p-8 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-brand-950 border border-brand-800/60 text-brand-400 flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base font-bold text-white">Start Your Learning Journey</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Upload study materials in PDF or TXT format and generate active-recall quizzes.
              Learnova AI will automatically track your topic mastery and generate targeted revision plans.
            </p>
          </div>
          <div className="flex justify-center gap-3 pt-2">
            <Link href="/materials">
              <Button size="sm" className="bg-brand-600 hover:bg-brand-500 text-white gap-2">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Upload Study Material</span>
              </Button>
            </Link>
            <Link href="/quizzes">
              <Button size="sm" variant="outline" className="border-slate-700 text-slate-300 gap-2">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Practice Quizzes</span>
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* ── B. Weak Topics Spotlight ─────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Weak-Topics Spotlight
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Assessed topics below the 70% proficiency threshold requiring focused reinforcement.
            </p>
          </div>

          <Badge variant={weakTopics.length > 0 ? "danger" : "success"} size="sm">
            {weakTopics.length} {weakTopics.length === 1 ? "Topic Flagged" : "Topics Flagged"}
          </Badge>
        </div>

        {weakTopics.length === 0 ? (
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <h3 className="text-sm font-bold text-white">No Weak Topics Detected</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              All assessed topics meet or exceed the 70% proficiency threshold. Keep testing yourself with new quizzes!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {weakTopics.map((topic) => {
              const isCritical = topic.classification === "critical";
              return (
                <div
                  key={topic.id || topic.topicTag}
                  className={cn(
                    "p-5 rounded-2xl border transition-all space-y-3",
                    isCritical
                      ? "bg-rose-950/20 border-rose-900/50 hover:border-rose-700/60"
                      : "bg-amber-950/20 border-amber-900/50 hover:border-amber-700/60"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">
                          {topic.topicTag}
                        </span>
                        <Badge
                          variant={isCritical ? "danger" : "warning"}
                          size="sm"
                        >
                          {isCritical ? "Critical (<40%)" : "Weak (40-69%)"}
                        </Badge>
                      </div>
                      {topic.materialTitle && (
                        <p className="text-[11px] text-slate-400 flex items-center gap-1">
                          <BookOpen className="w-3 h-3 text-slate-500" />
                          <span>Source: {topic.materialTitle}</span>
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={cn(
                          "font-mono font-extrabold text-lg",
                          isCritical ? "text-rose-400" : "text-amber-400"
                        )}
                      >
                        {topic.masteryScore}%
                      </span>
                      <span className="block text-[10px] text-slate-500 font-semibold uppercase">
                        Mastery
                      </span>
                    </div>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="w-full bg-slate-950/80 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        isCritical ? "bg-rose-500" : "bg-amber-500"
                      )}
                      style={{ width: `${Math.max(5, topic.masteryScore)}%` }}
                    />
                  </div>

                  {/* Diagnostic Reason & Suggested Action */}
                  <div className="space-y-1 text-xs">
                    <p className="text-slate-300 leading-relaxed font-medium">
                      {topic.reason}
                    </p>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      👉 {topic.suggestedAction}
                    </p>
                  </div>

                  {/* Action Links */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-[10px] text-slate-500">
                      {topic.attemptCount} {topic.attemptCount === 1 ? "attempt" : "attempts"} logged
                    </span>

                    <div className="flex items-center gap-2">
                      {topic.materialId && (
                        <Link href={`/materials/${topic.materialId}`}>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[11px] h-7 px-2.5 bg-slate-900 border-slate-700 text-slate-300 hover:text-white"
                          >
                            <BookOpen className="w-3 h-3 mr-1" />
                            <span>Notes</span>
                          </Button>
                        </Link>
                      )}

                      <Link href="/quizzes">
                        <Button
                          size="sm"
                          className={cn(
                            "text-[11px] h-7 px-2.5 text-white gap-1",
                            isCritical ? "bg-rose-600 hover:bg-rose-500" : "bg-amber-600 hover:bg-amber-500"
                          )}
                        >
                          <HelpCircle className="w-3 h-3" />
                          <span>Practice</span>
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── C. Revision Recommendations Feed ─────────────────────────── */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-brand-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Personalized Revision Feed
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Targeted study actions based on your recent quiz performance and topic mastery diagnostics.
            </p>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl text-xs">
            {["all", "pending", "completed", "dismissed"].map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={cn(
                  "px-3 py-1 rounded-lg font-semibold capitalize transition-all",
                  statusFilter === tab
                    ? "bg-brand-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                )}
              >
                {tab === "completed" ? "Completed" : tab}
              </button>
            ))}
          </div>
        </div>

        {filteredRecommendations.length === 0 ? (
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-white">No Recommendations in this View</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {statusFilter === "pending"
                ? "You have completed or reviewed all active revision tasks."
                : "No recommendations match the selected filter."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRecommendations.map((rec) => {
              const isHigh = rec.priority === "HIGH";
              const isMedium = rec.priority === "MEDIUM";
              const isDone = rec.status === "completed" || rec.status === "reviewed";
              const isDismissed = rec.status === "dismissed";

              return (
                <div
                  key={rec.id}
                  className={cn(
                    "p-4 sm:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4",
                    isDone
                      ? "bg-slate-900/30 border-slate-800/60 opacity-75"
                      : isDismissed
                      ? "bg-slate-900/20 border-slate-800/40 opacity-50"
                      : "bg-slate-900/70 border-slate-800 hover:border-slate-700"
                  )}
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4
                        className={cn(
                          "font-bold text-sm",
                          isDone
                            ? "text-slate-400 line-through"
                            : "text-white"
                        )}
                      >
                        {rec.title}
                      </h4>

                      <Badge
                        variant={isHigh ? "danger" : isMedium ? "warning" : "primary"}
                        size="sm"
                      >
                        {rec.priority} Priority
                      </Badge>

                      {isDone && (
                        <Badge variant="success" size="sm">
                          Completed
                        </Badge>
                      )}

                      {isDismissed && (
                        <Badge variant="neutral" size="sm">
                          Dismissed
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      {rec.content}
                    </p>

                    <div className="flex items-center gap-4 text-[11px] text-slate-500">
                      <span>Topic: <strong className="text-slate-400">{rec.topicTag}</strong></span>
                      {rec.masteryScoreAtGeneration !== null && (
                        <span>Initial Score: {rec.masteryScoreAtGeneration}%</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {!isDone && !isDismissed && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={updatingId === rec.id}
                          onClick={() => handleUpdateStatus(rec.id, "completed")}
                          className="text-xs bg-slate-900 border-slate-700 text-emerald-400 hover:bg-emerald-950/40 hover:text-emerald-300"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          <span>Mark Done</span>
                        </Button>

                        <button
                          disabled={updatingId === rec.id}
                          onClick={() => handleUpdateStatus(rec.id, "dismissed")}
                          className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
                          title="Dismiss recommendation"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    {(isDone || isDismissed) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={updatingId === rec.id}
                        onClick={() => handleUpdateStatus(rec.id, "pending")}
                        className="text-xs text-slate-400 hover:text-white"
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1" />
                        <span>Reopen</span>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── D. Topic Mastery Visualization ───────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Full Topic Mastery Breakdown
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Comprehensive view of all syllabus topics assessed across practice quizzes.
            </p>
          </div>

          <span className="text-xs text-slate-400 font-mono">
            {allMastery.length} {allMastery.length === 1 ? "Topic" : "Topics"} Tracked
          </span>
        </div>

        {allMastery.length === 0 ? (
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-2">
            <BarChart3 className="w-8 h-8 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-white">No Topics Assessed Yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Take your first practice quiz to generate topic mastery data and diagnostic graphs.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allMastery.map((topic) => {
                const score = topic.masteryScore ?? 0;
                const classification = topic.classification;

                const colorConfig = {
                  critical: {
                    bar: "bg-rose-500",
                    text: "text-rose-400",
                    badge: "danger",
                    label: "Critical (<40%)",
                  },
                  weak: {
                    bar: "bg-amber-500",
                    text: "text-amber-400",
                    badge: "warning",
                    label: "Weak (40-69%)",
                  },
                  developing: {
                    bar: "bg-sky-500",
                    text: "text-sky-300",
                    badge: "primary",
                    label: "Developing (70-84%)",
                  },
                  mastered: {
                    bar: "bg-emerald-500",
                    text: "text-emerald-400",
                    badge: "success",
                    label: "Mastered (≥85%)",
                  },
                }[classification] || {
                  bar: "bg-slate-500",
                  text: "text-slate-400",
                  badge: "neutral",
                  label: "Unknown",
                };

                return (
                  <div
                    key={topic.id || topic.topicTag}
                    className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-semibold text-white truncate">
                          {topic.topicTag}
                        </span>
                        <Badge variant={colorConfig.badge} size="sm">
                          {colorConfig.label}
                        </Badge>
                      </div>

                      <span className={cn("font-mono font-extrabold", colorConfig.text)}>
                        {score}%
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                      <div
                        className={cn("h-full rounded-full transition-all duration-500", colorConfig.bar)}
                        style={{ width: `${Math.max(4, score)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>{topic.attemptCount || 0} attempts logged</span>
                      {topic.lastAttemptScore !== null && (
                        <span>Last quiz score: {topic.lastAttemptScore}%</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* ── E. Recent Assessment Results & Quiz Performance Timeline ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-teal-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Recent Assessment Results & Quiz Performance Timeline
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Historical performance across submitted active-recall quizzes.
            </p>
          </div>

          <Link href="/quizzes">
            <Button size="sm" variant="outline" className="text-xs border-slate-700 text-slate-300 gap-1.5">
              <span>New Assessment</span>
              <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>

        {quizHistory.length === 0 ? (
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-2">
            <HelpCircle className="w-8 h-8 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-white">No Quiz Attempts Recorded Yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Complete your first practice quiz from your course notes to see your score progression and performance history.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5 space-y-3">
            {quizHistory.map((q) => (
              <div
                key={q.id}
                className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">{q.quizTitle}</span>
                    <Badge variant="neutral" size="sm" className="capitalize">
                      {q.difficulty}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400">
                    Source: {q.materialTitle} • {q.correctCount} / {q.totalQuestions} questions correct
                  </p>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-center">
                  <div className="text-right">
                    <span
                      className={cn(
                        "font-mono font-extrabold text-lg",
                        q.scorePercentage >= 85
                          ? "text-emerald-400"
                          : q.scorePercentage >= 70
                          ? "text-sky-300"
                          : q.scorePercentage >= 40
                          ? "text-amber-400"
                          : "text-rose-400"
                      )}
                    >
                      {q.scorePercentage}%
                    </span>
                    <span className="block text-[10px] text-slate-500 uppercase font-semibold">
                      Score
                    </span>
                  </div>

                  {q.quizId && (
                    <Link href={`/quizzes/${q.quizId}`}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs bg-slate-900 border-slate-700 text-slate-300 hover:text-white"
                      >
                        <span>Retake</span>
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
