"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  Search,
  Filter,
  TrendingUp,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { SkeletonCard } from "@/components/ui/Skeleton";
import ErrorState from "@/components/ui/ErrorState";
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

  // Topic Breakdown filters
  const [topicSearch, setTopicSearch] = useState("");
  const [topicTierFilter, setTopicTierFilter] = useState("all"); // "all" | "mastered" | "developing" | "weak"

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const [overviewRes, weakRes, recsRes, historyRes] = await Promise.all([
        fetch("/api/analytics/overview"),
        fetch("/api/analytics/weak-topics?all=true"),
        fetch("/api/analytics/recommendations"),
        fetch("/api/history?limit=20"),
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

      setRecommendations((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
      );
    } catch (err) {
      alert(err.message || "Status update failed.");
    } finally {
      setUpdatingId(null);
    }
  };

  // 4-Tier Mastery Distribution Calculations
  const masteryDistribution = useMemo(() => {
    const total = allMastery.length;
    if (total === 0) {
      return { critical: 0, weak: 0, developing: 0, mastered: 0, total: 0 };
    }
    let critical = 0;
    let weak = 0;
    let developing = 0;
    let mastered = 0;

    for (const t of allMastery) {
      const score = t.masteryScore ?? 0;
      if (score < 40) critical++;
      else if (score < 70) weak++;
      else if (score < 85) developing++;
      else mastered++;
    }

    return {
      critical,
      weak,
      developing,
      mastered,
      total,
      criticalPct: Math.round((critical / total) * 100),
      weakPct: Math.round((weak / total) * 100),
      developingPct: Math.round((developing / total) * 100),
      masteredPct: Math.round((mastered / total) * 100),
    };
  }, [allMastery]);

  // SVG Score Trendline Points (Chronological: oldest first)
  const scoreTrendPoints = useMemo(() => {
    if (!quizHistory || quizHistory.length === 0) return [];
    const sorted = [...quizHistory].sort(
      (a, b) => new Date(a.submittedAt || 0) - new Date(b.submittedAt || 0)
    );
    return sorted.map((q, idx) => ({
      index: idx,
      score: q.scorePercentage ?? 0,
      title: q.quizTitle || `Quiz ${idx + 1}`,
      date: q.submittedAt
        ? new Date(q.submittedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })
        : `Attempt ${idx + 1}`,
    }));
  }, [quizHistory]);

  // Filtered topics for Full Topic Mastery Breakdown
  const filteredTopics = useMemo(() => {
    return allMastery.filter((t) => {
      const score = t.masteryScore ?? 0;
      const matchesSearch = (t.topicTag || "")
        .toLowerCase()
        .includes(topicSearch.toLowerCase());

      let matchesTier = true;
      if (topicTierFilter === "mastered") matchesTier = score >= 85;
      else if (topicTierFilter === "developing") matchesTier = score >= 70 && score < 85;
      else if (topicTierFilter === "weak") matchesTier = score < 70;

      return matchesSearch && matchesTier;
    });
  }, [allMastery, topicSearch, topicTierFilter]);

  const filteredRecommendations = recommendations.filter((r) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "pending") return r.status === "pending";
    if (statusFilter === "completed") {
      return r.status === "completed" || r.status === "reviewed";
    }
    if (statusFilter === "dismissed") return r.status === "dismissed";
    return true;
  });

  const hasNoActivity =
    (!overview || overview.totalMaterials === 0) &&
    (!overview || overview.quizzesCompleted === 0);

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

  return (
    <div className="space-y-10 animate-fade-in">
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Learning Insights & Diagnostics
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time mastery diagnostics, score progression trends, and personalized revision interventions.
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
            className="gap-1.5 bg-brand-600 hover:bg-brand-500 text-white shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isGenerating ? "Analyzing..." : "Sync Recommendations"}</span>
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

      {/* ── B. Visual Analytics: Distribution Bar + Score Trendline ───── */}
      {allMastery.length > 0 && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 1. 4-Band Mastery Tier Distribution */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-brand-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Mastery Tier Distribution
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                {masteryDistribution.total} Topics
              </span>
            </div>

            {/* Segmented Stacked Progress Bar */}
            <div className="w-full h-3 rounded-full bg-slate-950 overflow-hidden flex border border-slate-800">
              {masteryDistribution.mastered > 0 && (
                <div
                  className="bg-emerald-500 h-full transition-all"
                  style={{ width: `${masteryDistribution.masteredPct}%` }}
                  title={`Mastered: ${masteryDistribution.mastered} topics (${masteryDistribution.masteredPct}%)`}
                />
              )}
              {masteryDistribution.developing > 0 && (
                <div
                  className="bg-sky-500 h-full transition-all"
                  style={{ width: `${masteryDistribution.developingPct}%` }}
                  title={`Developing: ${masteryDistribution.developing} topics (${masteryDistribution.developingPct}%)`}
                />
              )}
              {masteryDistribution.weak > 0 && (
                <div
                  className="bg-amber-500 h-full transition-all"
                  style={{ width: `${masteryDistribution.weakPct}%` }}
                  title={`Weak: ${masteryDistribution.weak} topics (${masteryDistribution.weakPct}%)`}
                />
              )}
              {masteryDistribution.critical > 0 && (
                <div
                  className="bg-rose-500 h-full transition-all"
                  style={{ width: `${masteryDistribution.criticalPct}%` }}
                  title={`Critical: ${masteryDistribution.critical} topics (${masteryDistribution.criticalPct}%)`}
                />
              )}
            </div>

            {/* Legend Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-0.5">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Mastered</span>
                </div>
                <p className="text-base font-bold text-emerald-400 font-mono">
                  {masteryDistribution.mastered}{" "}
                  <span className="text-[10px] text-slate-500">({masteryDistribution.masteredPct || 0}%)</span>
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-0.5">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-sky-400" />
                  <span>Developing</span>
                </div>
                <p className="text-base font-bold text-sky-300 font-mono">
                  {masteryDistribution.developing}{" "}
                  <span className="text-[10px] text-slate-500">({masteryDistribution.developingPct || 0}%)</span>
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-0.5">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>Weak</span>
                </div>
                <p className="text-base font-bold text-amber-400 font-mono">
                  {masteryDistribution.weak}{" "}
                  <span className="text-[10px] text-slate-500">({masteryDistribution.weakPct || 0}%)</span>
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-0.5">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  <span>Critical</span>
                </div>
                <p className="text-base font-bold text-rose-400 font-mono">
                  {masteryDistribution.critical}{" "}
                  <span className="text-[10px] text-slate-500">({masteryDistribution.criticalPct || 0}%)</span>
                </p>
              </div>
            </div>
          </div>

          {/* 2. Historical Score Progression Trendline (SVG) */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-teal-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Score Progression Trend
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                {scoreTrendPoints.length} Attempts
              </span>
            </div>

            {scoreTrendPoints.length < 2 ? (
              <div className="h-36 flex flex-col items-center justify-center text-center p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-400">
                <p>Complete at least 2 practice quizzes to generate a score progression trendline.</p>
              </div>
            ) : (
              <div className="h-36 w-full pt-2">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 400 100" preserveAspectRatio="none">
                  {/* Grid Lines */}
                  <line x1="0" y1="20" x2="400" y2="20" stroke="#334155" strokeDasharray="3 3" opacity="0.4" />
                  <line x1="0" y1="50" x2="400" y2="50" stroke="#334155" strokeDasharray="3 3" opacity="0.4" />
                  <line x1="0" y1="80" x2="400" y2="80" stroke="#334155" strokeDasharray="3 3" opacity="0.4" />

                  {/* Trendline Path */}
                  {(() => {
                    const stepX = 400 / (scoreTrendPoints.length - 1);
                    const points = scoreTrendPoints
                      .map((p, idx) => {
                        const x = idx * stepX;
                        // Score 0 -> y=90, Score 100 -> y=10
                        const y = 90 - (p.score / 100) * 80;
                        return `${x},${y}`;
                      })
                      .join(" ");

                    return (
                      <>
                        <polyline
                          fill="none"
                          stroke="#14B8A6"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points={points}
                        />
                        {/* Circles for data points */}
                        {scoreTrendPoints.map((p, idx) => {
                          const x = idx * stepX;
                          const y = 90 - (p.score / 100) * 80;
                          return (
                            <circle
                              key={idx}
                              cx={x}
                              cy={y}
                              r="4"
                              className="fill-teal-400 stroke-slate-950 stroke-2"
                            >
                              <title>{`${p.title}: ${p.score}% (${p.date})`}</title>
                            </circle>
                          );
                        })}
                      </>
                    );
                  })()}
                </svg>

                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 font-mono">
                  <span>Earliest Attempt</span>
                  <span>Latest Attempt ({scoreTrendPoints[scoreTrendPoints.length - 1]?.score}%)</span>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Empty State Guard ────────────────────────────────────────── */}
      {hasNoActivity && (
        <div className="p-8 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-brand-950 border border-brand-800/60 text-brand-400 flex items-center justify-center mx-auto shadow-sm">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base font-bold text-white">Start Your Learning Journey</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Upload study materials in PDF or TXT format and generate practice quizzes.
              Learnova AI will automatically track your topic mastery and generate targeted revision plans.
            </p>
          </div>
          <div className="flex justify-center gap-3 pt-2">
            <Link href="/materials">
              <Button size="sm" className="bg-brand-600 hover:bg-brand-500 text-white gap-2 shadow-sm">
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

      {/* ── C. Weak Topics Spotlight ─────────────────────────────────── */}
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
                    "p-5 rounded-2xl border transition-all space-y-3 shadow-md",
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

      {/* ── D. Revision Recommendations Feed ─────────────────────────── */}
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
                  "px-3 py-1 rounded-lg font-semibold capitalize transition-all cursor-pointer",
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
                    "p-4 sm:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm",
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

      {/* ── E. Full Topic Mastery Breakdown (with search & tier filters) ─ */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Full Topic Mastery Breakdown
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Comprehensive list of all syllabus topics assessed across practice quizzes.
            </p>
          </div>

          {/* Search & Tier Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search topics..."
                value={topicSearch}
                onChange={(e) => setTopicSearch(e.target.value)}
                className="bg-slate-950/80 border border-slate-800 text-xs text-white rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-brand-500 w-36 sm:w-44"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-lg border border-slate-800 text-xs">
              {[
                { id: "all", label: "All" },
                { id: "mastered", label: "≥85%" },
                { id: "developing", label: "70-84%" },
                { id: "weak", label: "<70%" },
              ].map((tier) => (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => setTopicTierFilter(tier.id)}
                  className={cn(
                    "px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer",
                    topicTierFilter === tier.id
                      ? "bg-brand-600 text-white font-semibold shadow-sm"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  {tier.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {allMastery.length === 0 ? (
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-2">
            <BarChart3 className="w-8 h-8 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-white">No Topics Assessed Yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Take your first practice quiz to generate topic mastery data and diagnostic graphs.
            </p>
          </div>
        ) : filteredTopics.length === 0 ? (
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 text-center text-xs text-slate-400">
            No topics match the search &ldquo;{topicSearch}&rdquo; in this tier.
          </div>
        ) : (
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTopics.map((topic) => {
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

                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                      <span>{topic.attemptCount || 0} attempts logged</span>
                      {topic.lastAttemptScore !== null && (
                        <span>Last quiz: {topic.lastAttemptScore}%</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* ── F. Recent Assessment Results & Quiz Performance Timeline ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-teal-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Recent Assessment History
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Historical results across submitted active-recall quizzes.
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
