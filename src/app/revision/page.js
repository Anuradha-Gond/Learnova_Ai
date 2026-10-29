"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Flame,
  BookOpen,
  HelpCircle,
  Bot,
  CheckCircle2,
  XCircle,
  RotateCcw,
  RefreshCw,
  Search,
  Filter,
  ExternalLink,
  Sparkles,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { SkeletonCard } from "@/components/ui/Skeleton";
import ErrorState from "@/components/ui/ErrorState";
import { cn } from "@/lib/utils";

export default function RevisionPage() {
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchRecommendations = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/analytics/recommendations");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load revision recommendations.");
      }
      const data = await res.json();
      setRecommendations(data.recommendations || []);
    } catch (err) {
      setError(err.message || "An unexpected error occurred while loading recommendations.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

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
      alert(err.message || "Failed to update status.");
    } finally {
      setUpdatingId(null);
    }
  };

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

  const filteredRecommendations = recommendations.filter((r) => {
    // Status filter
    if (statusFilter === "pending" && r.status !== "pending") return false;
    if (statusFilter === "completed" && r.status !== "completed" && r.status !== "reviewed")
      return false;
    if (statusFilter === "dismissed" && r.status !== "dismissed") return false;

    // Priority filter
    if (priorityFilter !== "all" && r.priority !== priorityFilter) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTopic = (r.topicTag || "").toLowerCase().includes(q);
      const matchTitle = (r.title || "").toLowerCase().includes(q);
      const matchContent = (r.content || "").toLowerCase().includes(q);
      if (!matchTopic && !matchTitle && !matchContent) return false;
    }

    return true;
  });

  const pendingCount = recommendations.filter((r) => r.status === "pending").length;
  const completedCount = recommendations.filter(
    (r) => r.status === "completed" || r.status === "reviewed"
  ).length;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-16 bg-slate-900/60 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SkeletonCard className="bg-slate-900/60 border-slate-800" />
          <SkeletonCard className="bg-slate-900/60 border-slate-800" />
          <SkeletonCard className="bg-slate-900/60 border-slate-800" />
          <SkeletonCard className="bg-slate-900/60 border-slate-800" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <ErrorState
          title="Revision Feed Error"
          message={error}
          onRetry={fetchRecommendations}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Personalized Revision Feed
            </h1>
            <Badge variant="teal" size="sm">
              Milestone 8
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Targeted study interventions, weak-topic review cards, and recommended practice sessions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            size="sm"
            variant="outline"
            onClick={fetchRecommendations}
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
            <span>{isGenerating ? "Analyzing..." : "Sync Recommendations"}</span>
          </Button>
        </div>
      </div>

      {/* ── Summary Counters ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Active Revision Tasks
          </span>
          <p className="text-2xl font-extrabold text-amber-400 font-mono">{pendingCount}</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Completed Tasks
          </span>
          <p className="text-2xl font-extrabold text-emerald-400 font-mono">{completedCount}</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Total Cards Generated
          </span>
          <p className="text-2xl font-extrabold text-white font-mono">{recommendations.length}</p>
        </div>
      </div>

      {/* ── Filter & Search Toolbar ──────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl text-xs overflow-x-auto">
          {["all", "pending", "completed", "dismissed"].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={cn(
                "px-3 py-1.5 rounded-lg font-semibold capitalize whitespace-nowrap transition-all",
                statusFilter === tab
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-slate-900"
              )}
            >
              {tab === "completed" ? "Completed" : tab}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-xs bg-slate-950 border border-slate-800 text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-brand-500"
          >
            <option value="all">All Priorities</option>
            <option value="HIGH">High Priority</option>
            <option value="MEDIUM">Medium Priority</option>
            <option value="LOW">Low Priority</option>
          </select>

          {/* Search Input */}
          <div className="relative flex-1 sm:w-60">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search topic or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs bg-slate-950 border border-slate-800 text-white rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-brand-500 placeholder:text-slate-600"
            />
          </div>
        </div>
      </div>

      {/* ── Recommendations List ─────────────────────────────────────── */}
      {filteredRecommendations.length === 0 ? (
        <div className="p-8 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-950 border border-brand-800/60 text-brand-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">No Revision Tasks Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            {statusFilter === "pending"
              ? "All your revision recommendations have been reviewed or completed! Take another quiz to find new areas to strengthen."
              : "No recommendations match your current filters. Try resetting search or switching status tabs."}
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Link href="/quizzes">
              <Button size="sm" className="bg-brand-600 hover:bg-brand-500 text-white gap-1.5">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Practice Quizzes</span>
              </Button>
            </Link>
            <Link href="/analytics">
              <Button size="sm" variant="outline" className="border-slate-700 text-slate-300 gap-1.5">
                <Flame className="w-3.5 h-3.5" />
                <span>Diagnostics Dashboard</span>
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRecommendations.map((rec) => {
            const isHigh = rec.priority === "HIGH";
            const isMedium = rec.priority === "MEDIUM";
            const isDone = rec.status === "completed" || rec.status === "reviewed";
            const isDismissed = rec.status === "dismissed";

            return (
              <div
                key={rec.id}
                className={cn(
                  "p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4",
                  isDone
                    ? "bg-slate-900/30 border-slate-800/60 opacity-80"
                    : isDismissed
                    ? "bg-slate-900/20 border-slate-800/40 opacity-50"
                    : isHigh
                    ? "bg-rose-950/20 border-rose-900/50 hover:border-rose-700/60 shadow-subtle"
                    : "bg-slate-900/70 border-slate-800 hover:border-slate-700"
                )}
              >
                <div className="space-y-3">
                  {/* Card Header: Topic & Priority */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-white">
                          {rec.topicTag}
                        </span>
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
                      <h4
                        className={cn(
                          "text-xs font-semibold",
                          isDone ? "text-slate-400 line-through" : "text-brand-300"
                        )}
                      >
                        {rec.title}
                      </h4>
                    </div>

                    {rec.masteryScoreAtGeneration !== null && (
                      <div className="text-right shrink-0">
                        <span
                          className={cn(
                            "font-mono font-extrabold text-base",
                            rec.masteryScoreAtGeneration < 40
                              ? "text-rose-400"
                              : rec.masteryScoreAtGeneration < 70
                              ? "text-amber-400"
                              : "text-brand-300"
                          )}
                        >
                          {rec.masteryScoreAtGeneration}%
                        </span>
                        <span className="block text-[9px] text-slate-500 font-semibold uppercase">
                          Score at Flag
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Recommendation Content */}
                  <p className="text-xs text-slate-300 leading-relaxed font-normal">
                    {rec.content}
                  </p>
                </div>

                {/* Footer: Multi-Action Toolbar */}
                <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                  {/* Action Link Targets */}
                  <div className="flex items-center gap-1.5">
                    {rec.materialId && (
                      <Link href={`/materials/${rec.materialId}`}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-[11px] h-7 px-2 bg-slate-900 border-slate-700 text-slate-300 hover:text-white"
                          title="Open related study notes"
                        >
                          <BookOpen className="w-3 h-3 mr-1" />
                          <span>Notes</span>
                        </Button>
                      </Link>
                    )}

                    {rec.materialId && (
                      <Link href={`/materials/${rec.materialId}`}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-[11px] h-7 px-2 bg-slate-900 border-slate-700 text-slate-300 hover:text-white"
                          title="Ask AI Assistant about this topic"
                        >
                          <Bot className="w-3 h-3 mr-1" />
                          <span>Assistant</span>
                        </Button>
                      </Link>
                    )}

                    <Link href="/quizzes">
                      <Button
                        size="sm"
                        className="text-[11px] h-7 px-2 bg-brand-600 hover:bg-brand-500 text-white"
                        title="Practice with active-recall quiz"
                      >
                        <HelpCircle className="w-3 h-3 mr-1" />
                        <span>Quiz</span>
                      </Button>
                    </Link>
                  </div>

                  {/* Status Toggle Buttons */}
                  <div className="flex items-center gap-1">
                    {!isDone && !isDismissed && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={updatingId === rec.id}
                          onClick={() => handleUpdateStatus(rec.id, "completed")}
                          className="text-[11px] h-7 px-2.5 bg-slate-900 border-slate-700 text-emerald-400 hover:bg-emerald-950/40 hover:text-emerald-300"
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          <span>Complete</span>
                        </Button>

                        <button
                          disabled={updatingId === rec.id}
                          onClick={() => handleUpdateStatus(rec.id, "dismissed")}
                          className="p-1 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
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
                        className="text-[11px] h-7 px-2 text-slate-400 hover:text-white"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        <span>Reopen</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
