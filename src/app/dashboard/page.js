"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  BookOpen,
  HelpCircle,
  BarChart3,
  Flame,
  Upload,
  Brain,
  Sparkles,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Calendar,
  Layers,
  History,
  AlertTriangle,
  Award,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const { data: session, status } = useSession();

  const [metrics, setMetrics] = useState({
    totalMaterials: 0,
    quizzesCompleted: 0,
    averageQuizScore: 0,
    overallAccuracy: 0,
    masteredTopics: 0,
  });
  const [recentMaterials, setRecentMaterials] = useState([]);
  const [weakTopics, setWeakTopics] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const [overviewRes, materialsRes, weakRes, historyRes] = await Promise.all([
        fetch("/api/analytics/overview"),
        fetch("/api/materials?limit=4"),
        fetch("/api/analytics/weak-topics"),
        fetch("/api/history?limit=4"),
      ]);

      if (overviewRes.ok) {
        const data = await overviewRes.json();
        setMetrics(data.overview || data);
      }
      if (materialsRes.ok) {
        const data = await materialsRes.json();
        setRecentMaterials(data.materials || []);
      }
      if (weakRes.ok) {
        const data = await weakRes.json();
        setWeakTopics(data.weakTopics || []);
      }
      if (historyRes.ok) {
        const data = await historyRes.json();
        setRecentActivity(data.timeline || []);
      }
    } catch (err) {
      console.error("[Dashboard] Error loading dashboard data:", err);
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      fetchDashboardData();
    }
  }, [status, fetchDashboardData]);

  if (status === "loading" || isLoadingData) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-24 bg-slate-900/60 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SkeletonCard className="bg-slate-900/60 border-slate-800" />
          <SkeletonCard className="bg-slate-900/60 border-slate-800" />
          <SkeletonCard className="bg-slate-900/60 border-slate-800" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-64 bg-slate-900/60 rounded-2xl animate-pulse" />
          <div className="h-64 bg-slate-900/60 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  const firstName = session?.user?.name ? session.user.name.split(" ")[0] : "Student";

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return String(dateStr);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ── C1. Welcome Section ───────────────────────────────────── */}
      <section className="rounded-2xl bg-gradient-to-r from-brand-950 via-slate-900 to-slate-900 border border-slate-800 p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-full bg-brand-600/10 blur-2xl pointer-events-none" />

        <div className="max-w-3xl space-y-3 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-900/60 border border-brand-700/50 text-brand-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
            <span>Personalized Learning Dashboard</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight">
            Welcome back, {firstName}!
          </h1>

          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-2xl">
            Continue learning, strengthen your understanding, and make progress toward your goals.
            Review key concepts, generate active recall quizzes, and address identified weak topics.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link href="/materials">
              <Button size="sm" className="gap-1.5 bg-brand-600 hover:bg-brand-500 text-white">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Material</span>
              </Button>
            </Link>

            <Link href="/quizzes">
              <Button
                size="sm"
                variant="outline"
                className="bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 gap-1.5"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Practice Quiz</span>
              </Button>
            </Link>

            <Link href="/analytics">
              <Button
                size="sm"
                variant="outline"
                className="bg-slate-900 border-slate-700 text-violet-300 hover:text-white hover:bg-slate-800 gap-1.5"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Learning Analytics</span>
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── C2. Summary Metric Cards (Real Database-Backed) ────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Metric 1 */}
        <Link href="/materials" className="block group">
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 space-y-4 group-hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 group-hover:text-slate-300">
                Total Study Materials
              </span>
              <div className="w-8 h-8 rounded-lg bg-brand-950 border border-brand-800/60 text-brand-400 flex items-center justify-center">
                <BookOpen className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-extrabold font-mono text-white">
                {metrics.totalMaterials ?? 0}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {metrics.totalMaterials > 0
                  ? "Active course materials stored privately"
                  : "Upload notes or syllabi to get started"}
              </p>
            </div>
            <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-brand-400 font-semibold">
              <span>Cloudflare R2 Storage</span>
              <Badge variant="primary" size="sm">PDF / TXT</Badge>
            </div>
          </div>
        </Link>

        {/* Metric 2 */}
        <Link href="/quizzes" className="block group">
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 space-y-4 group-hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 group-hover:text-slate-300">
                Total Quizzes Completed
              </span>
              <div className="w-8 h-8 rounded-lg bg-teal-950 border border-teal-800/60 text-teal-400 flex items-center justify-center">
                <HelpCircle className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-extrabold font-mono text-teal-400">
                {metrics.quizzesCompleted ?? 0}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {metrics.quizzesCompleted > 0
                  ? "Evaluated active recall attempts"
                  : "Generate active recall quizzes from notes"}
              </p>
            </div>
            <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-teal-400 font-semibold">
              <span>Active Recall System</span>
              <Badge variant="teal" size="sm">Server-Graded</Badge>
            </div>
          </div>
        </Link>

        {/* Metric 3 */}
        <Link href="/analytics" className="block group">
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 space-y-4 group-hover:border-violet-500/50 group-hover:bg-slate-900/80 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 group-hover:text-slate-300">
                Average Quiz Score
              </span>
              <div className="w-8 h-8 rounded-lg bg-violet-950 border border-violet-800/60 text-violet-400 flex items-center justify-center">
                <BarChart3 className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-extrabold font-mono text-violet-300">
                {metrics.quizzesCompleted > 0 ? `${metrics.averageQuizScore}%` : "—"}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {metrics.quizzesCompleted > 0
                  ? "Diagnostic mastery score across assessments"
                  : "Take a quiz to unlock your diagnostic score"}
              </p>
            </div>
            <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-violet-400 font-semibold">
              <span>View Diagnostics</span>
              <Badge variant="violet" size="sm">Live</Badge>
            </div>
          </div>
        </Link>
      </section>

      {/* ── Quick Actions Row ───────────────────────────────────────── */}
      <section className="rounded-2xl bg-slate-900/40 border border-slate-800 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Quick Actions
          </h2>
          <span className="text-[11px] text-slate-400">Core Features</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/materials"
            className="flex items-center justify-between p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-brand-500/50 hover:bg-slate-900 transition-all text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-brand-950 border border-brand-800/60 text-brand-400 flex items-center justify-center">
                <Upload className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white group-hover:text-brand-300">Upload Material</p>
                <p className="text-[10px] text-slate-500">PDF or TXT up to 15 MB</p>
              </div>
            </div>
            <Badge variant="primary" size="sm">Live</Badge>
          </Link>

          <Link
            href="/quizzes"
            className="flex items-center justify-between p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-teal-500/50 hover:bg-slate-900 transition-all text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-teal-950 border border-teal-800/60 text-teal-400 flex items-center justify-center">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white group-hover:text-teal-300">Practice Quiz</p>
                <p className="text-[10px] text-slate-500">Test concepts with active recall</p>
              </div>
            </div>
            <Badge variant="teal" size="sm">Live</Badge>
          </Link>

          <Link
            href="/revision"
            className="flex items-center justify-between p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-violet-500/50 hover:bg-slate-900 transition-all text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-violet-950 border border-violet-800/60 text-violet-400 flex items-center justify-center">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white group-hover:text-violet-300">Revision Feed</p>
                <p className="text-[10px] text-slate-500">Targeted study recommendations</p>
              </div>
            </div>
            <Badge variant="violet" size="sm">Live</Badge>
          </Link>
        </div>
      </section>

      {/* ── C3 & C4 & C5. Dashboard Panels (Real Database Data) ─────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Panel 1: Recent Documents */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold font-display text-white">
              Recent Study Materials
            </h2>
            <Link
              href="/materials"
              className="text-xs text-brand-400 hover:text-brand-300 font-semibold"
            >
              View All
            </Link>
          </div>

          {recentMaterials.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-8 text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-brand-950 border border-brand-800/60 text-brand-400 flex items-center justify-center mb-3">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-white font-display">
                No study materials uploaded
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4 leading-relaxed">
                Upload course syllabi, lecture notes, or textbooks to begin generating summaries and AI quizzes.
              </p>
              <Link href="/materials">
                <Button size="sm" className="bg-brand-600 hover:bg-brand-500 text-white">
                  Upload First Document
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentMaterials.map((mat) => (
                <div
                  key={mat.id}
                  className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition-all"
                >
                  <div className="space-y-1 min-w-0">
                    <h4 className="text-sm font-bold text-white truncate">{mat.title}</h4>
                    <p className="text-xs text-slate-400">
                      {mat.fileType?.toUpperCase()} • {formatDate(mat.createdAt)}
                    </p>
                  </div>
                  <Link href={`/materials/${mat.id}`}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs bg-slate-950 border-slate-800 text-slate-300 hover:text-white"
                    >
                      <span>Workspace</span>
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Panel 2: Weak Topics Diagnostic */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold font-display text-white">
              Topic Mastery & Weak Areas
            </h2>
            <Link
              href="/analytics"
              className="text-xs text-brand-400 hover:text-brand-300 font-semibold"
            >
              Full Analytics
            </Link>
          </div>

          {weakTopics.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-8 text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-950 border border-emerald-800/60 text-emerald-400 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-white font-display">
                No weak topics flagged!
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4 leading-relaxed">
                All assessed topics meet or exceed 70% mastery. Practice new quizzes to continuously diagnose your understanding.
              </p>
              <Link href="/quizzes">
                <Button size="sm" variant="outline" className="border-slate-700 text-slate-300">
                  Practice New Quiz
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {weakTopics.slice(0, 3).map((topic) => {
                const isCritical = topic.classification === "critical";
                return (
                  <div
                    key={topic.id || topic.topicTag}
                    className={cn(
                      "p-4 rounded-2xl border transition-all space-y-2",
                      isCritical
                        ? "bg-rose-950/20 border-rose-900/50"
                        : "bg-amber-950/20 border-amber-900/50"
                    )}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{topic.topicTag}</span>
                        <Badge variant={isCritical ? "danger" : "warning"} size="sm">
                          {isCritical ? "Critical" : "Weak"}
                        </Badge>
                      </div>
                      <span className="font-mono font-extrabold text-sm text-slate-300">
                        {topic.masteryScore}%
                      </span>
                    </div>

                    <div className="w-full bg-slate-950/80 rounded-full h-1.5 overflow-hidden border border-slate-800">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          isCritical ? "bg-rose-500" : "bg-amber-500"
                        )}
                        style={{ width: `${Math.max(5, topic.masteryScore)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* ── C3. Recent Learning Activity Section ────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold font-display text-white">
            Recent Learning Activity
          </h2>
          <Link
            href="/history"
            className="text-xs text-brand-400 hover:text-brand-300 font-semibold"
          >
            Complete History
          </Link>
        </div>

        {recentActivity.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-8 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 flex items-center justify-center mb-3">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-white font-display">
              No recent activity recorded
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">
              Your document uploads, quiz attempts, and AI doubt-clearing sessions will appear here as you study.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentActivity.slice(0, 4).map((act) => (
              <div
                key={`${act.type}-${act.id}`}
                className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3"
              >
                <div className="space-y-0.5 min-w-0">
                  <h4 className="text-sm font-bold text-white truncate">{act.title}</h4>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    <span>{formatDate(act.timestamp)}</span>
                  </p>
                </div>
                {act.scorePercentage !== undefined && (
                  <span className="font-mono font-extrabold text-sm text-teal-400 shrink-0">
                    {act.scorePercentage}%
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
