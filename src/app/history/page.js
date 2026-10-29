"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  History,
  BookOpen,
  HelpCircle,
  Flame,
  CheckCircle2,
  Clock,
  ArrowRight,
  RefreshCw,
  Award,
  Layers,
  Calendar,
  ExternalLink,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { SkeletonCard } from "@/components/ui/Skeleton";
import ErrorState from "@/components/ui/ErrorState";
import { cn } from "@/lib/utils";

export default function HistoryPage() {
  const [historyData, setHistoryData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("timeline");

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/history?limit=50");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load learning history.");
      }
      const data = await res.json();
      setHistoryData(data);
    } catch (err) {
      setError(err.message || "An unexpected error occurred while loading history.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-16 bg-slate-900/60 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
          title="History Log Error"
          message={error}
          onRetry={fetchHistory}
        />
      </div>
    );
  }

  const { timeline = [], quizAttempts = [], materials = [], completedRevisions = [], summary = {} } =
    historyData || {};

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return String(dateString);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Learning History & Activity Log
            </h1>
            <Badge variant="teal" size="sm">
              Milestone 8
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Complete audit trail of your quizzes, document uploads, and completed revision actions.
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={fetchHistory}
          className="gap-1.5 bg-slate-900 border-slate-700 text-slate-300 hover:text-white self-start md:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh History</span>
        </Button>
      </div>

      {/* ── Summary Cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Quizzes Attempted
          </span>
          <p className="text-2xl font-extrabold text-teal-400 font-mono">
            {summary.totalQuizAttempts ?? 0}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Materials Uploaded
          </span>
          <p className="text-2xl font-extrabold text-brand-300 font-mono">
            {summary.totalMaterialsUploaded ?? 0}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Revisions Completed
          </span>
          <p className="text-2xl font-extrabold text-emerald-400 font-mono">
            {summary.totalRevisionsCompleted ?? 0}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Average Quiz Score
          </span>
          <p className="text-2xl font-extrabold text-violet-300 font-mono">
            {summary.averageQuizScore !== null && summary.averageQuizScore !== undefined
              ? `${summary.averageQuizScore}%`
              : "—"}
          </p>
        </div>
      </div>

      {/* ── Tabs Navigation ─────────────────────────────────────────── */}
      <div className="flex items-center gap-1 p-1 bg-slate-900/80 border border-slate-800 rounded-2xl text-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab("timeline")}
          className={cn(
            "px-4 py-2 rounded-xl font-semibold whitespace-nowrap transition-all",
            activeTab === "timeline"
              ? "bg-brand-600 text-white shadow-sm"
              : "text-slate-400 hover:text-white hover:bg-slate-800"
          )}
        >
          Activity Timeline ({timeline.length})
        </button>

        <button
          onClick={() => setActiveTab("quizzes")}
          className={cn(
            "px-4 py-2 rounded-xl font-semibold whitespace-nowrap transition-all",
            activeTab === "quizzes"
              ? "bg-brand-600 text-white shadow-sm"
              : "text-slate-400 hover:text-white hover:bg-slate-800"
          )}
        >
          Quiz Attempts ({quizAttempts.length})
        </button>

        <button
          onClick={() => setActiveTab("materials")}
          className={cn(
            "px-4 py-2 rounded-xl font-semibold whitespace-nowrap transition-all",
            activeTab === "materials"
              ? "bg-brand-600 text-white shadow-sm"
              : "text-slate-400 hover:text-white hover:bg-slate-800"
          )}
        >
          Study Materials ({materials.length})
        </button>

        <button
          onClick={() => setActiveTab("revisions")}
          className={cn(
            "px-4 py-2 rounded-xl font-semibold whitespace-nowrap transition-all",
            activeTab === "revisions"
              ? "bg-brand-600 text-white shadow-sm"
              : "text-slate-400 hover:text-white hover:bg-slate-800"
          )}
        >
          Completed Revisions ({completedRevisions.length})
        </button>
      </div>

      {/* ── Tab Content: 1. Unified Timeline ────────────────────────── */}
      {activeTab === "timeline" && (
        <div className="space-y-4">
          {timeline.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-center space-y-3">
              <Clock className="w-8 h-8 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-white">No Activity Recorded</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Upload your first study material or take an active recall quiz to start logging your learning history.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {timeline.map((act) => {
                const isQuiz = act.type === "quiz_completed";
                const isMaterial = act.type === "material_uploaded";
                const isRevision = act.type === "revision_completed";

                return (
                  <div
                    key={`${act.type}-${act.id}`}
                    className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                          isQuiz && "bg-teal-950 border-teal-800/60 text-teal-400",
                          isMaterial && "bg-brand-950 border-brand-800/60 text-brand-400",
                          isRevision && "bg-emerald-950 border-emerald-800/60 text-emerald-400"
                        )}
                      >
                        {isQuiz && <HelpCircle className="w-5 h-5" />}
                        {isMaterial && <BookOpen className="w-5 h-5" />}
                        {isRevision && <CheckCircle2 className="w-5 h-5" />}
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">
                            {act.title}
                          </span>
                          <Badge
                            variant={isQuiz ? "teal" : isMaterial ? "primary" : "success"}
                            size="sm"
                          >
                            {isQuiz
                              ? "Quiz Completed"
                              : isMaterial
                              ? "Material Uploaded"
                              : "Revision Completed"}
                          </Badge>
                        </div>

                        <p className="text-xs text-slate-400 flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          <span>{formatDate(act.timestamp)}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      {isQuiz && (
                        <div className="text-right">
                          <span className="font-mono font-extrabold text-base text-teal-400">
                            {act.scorePercentage}%
                          </span>
                          <span className="block text-[10px] text-slate-500">
                            {act.correctCount} / {act.totalQuestions} correct
                          </span>
                        </div>
                      )}

                      {act.materialId && (
                        <Link href={`/materials/${act.materialId}`}>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs bg-slate-950 border-slate-800 text-slate-300 hover:text-white"
                          >
                            <span>View</span>
                            <ArrowRight className="w-3 h-3 ml-1" />
                          </Button>
                        </Link>
                      )}

                      {isQuiz && act.quizId && (
                        <Link href={`/quizzes/${act.quizId}`}>
                          <Button
                            size="sm"
                            className="text-xs bg-brand-600 hover:bg-brand-500 text-white"
                          >
                            <span>Retake</span>
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Tab Content: 2. Quiz Attempts ───────────────────────────── */}
      {activeTab === "quizzes" && (
        <div className="space-y-4">
          {quizAttempts.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-center space-y-2">
              <HelpCircle className="w-8 h-8 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-white">No Quiz Attempts Found</h3>
              <p className="text-xs text-slate-400">
                You haven&apos;t completed any quizzes yet. Go to Quizzes to take your first assessment.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quizAttempts.map((sub) => (
                <div
                  key={sub.id}
                  className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-sm text-white">{sub.quizTitle}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Source: {sub.materialTitle}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="font-mono font-extrabold text-lg text-teal-400">
                        {sub.scorePercentage}%
                      </span>
                      <span className="block text-[10px] text-slate-500 uppercase font-semibold">
                        Score
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/60">
                    <span>
                      {sub.correctCount} of {sub.totalQuestions} questions correct
                    </span>
                    <span>{formatDate(sub.submittedAt)}</span>
                  </div>

                  {sub.quizId && (
                    <div className="pt-1 flex justify-end">
                      <Link href={`/quizzes/${sub.quizId}`}>
                        <Button
                          size="sm"
                          className="text-xs bg-slate-800 hover:bg-slate-700 text-white gap-1"
                        >
                          <span>Review Quiz</span>
                          <ArrowRight className="w-3 h-3" />
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab Content: 3. Study Materials ─────────────────────────── */}
      {activeTab === "materials" && (
        <div className="space-y-4">
          {materials.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-center space-y-2">
              <BookOpen className="w-8 h-8 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-white">No Materials Uploaded</h3>
              <p className="text-xs text-slate-400">
                Upload study materials in PDF or TXT format to start learning with AI.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {materials.map((mat) => (
                <div
                  key={mat.id}
                  className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0">
                    <h4 className="font-bold text-sm text-white truncate">{mat.title}</h4>
                    <p className="text-xs text-slate-400">
                      {(mat.fileSize / 1024 / 1024).toFixed(2)} MB • {mat.fileType?.toUpperCase()} • {formatDate(mat.createdAt)}
                    </p>
                    <Badge variant="primary" size="sm">
                      {mat.processingStatus}
                    </Badge>
                  </div>

                  <Link href={`/materials/${mat.id}`}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs bg-slate-900 border-slate-700 text-slate-300 hover:text-white"
                    >
                      <span>Open</span>
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab Content: 4. Completed Revisions ──────────────────────── */}
      {activeTab === "revisions" && (
        <div className="space-y-4">
          {completedRevisions.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-white">No Completed Revisions</h3>
              <p className="text-xs text-slate-400">
                When you complete revision recommendations from your feed, they will be archived here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {completedRevisions.map((rev) => (
                <div
                  key={rev.id}
                  className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{rev.title}</span>
                      <Badge variant="success" size="sm">Completed</Badge>
                      <Badge variant="neutral" size="sm">{rev.priority}</Badge>
                    </div>
                    <p className="text-xs text-slate-400">
                      Topic: {rev.topicTag} • Completed on {formatDate(rev.completedAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
