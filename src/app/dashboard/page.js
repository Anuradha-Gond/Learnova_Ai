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
  Bot,
  ExternalLink,
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
      <div className="space-y-8 animate-fade-in">
        <div className="h-36 bg-slate-900/60 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SkeletonCard className="bg-slate-900/60 border-slate-800 h-32" />
          <SkeletonCard className="bg-slate-900/60 border-slate-800 h-32" />
          <SkeletonCard className="bg-slate-900/60 border-slate-800 h-32" />
          <SkeletonCard className="bg-slate-900/60 border-slate-800 h-32" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-72 bg-slate-900/60 rounded-2xl animate-pulse" />
          <div className="h-72 bg-slate-900/60 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  const firstName = session?.user?.name ? session.user.name.split(" ")[0] : "Student";

  const currentHour = new Date().getHours();
  const timeGreeting = currentHour < 12 ? "Good morning" : currentHour < 18 ? "Good afternoon" : "Good evening";

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

  // Determine top priority action for the student
  const getSuggestedFocus = () => {
    if (metrics.totalMaterials === 0) {
      return {
        badge: "First Step",
        badgeVariant: "primary",
        title: "Build Your Knowledge Base",
        description: "Upload your course syllabus, lecture slides, or textbook chapters to enable AI study aids, summaries, and practice quizzes.",
        ctaText: "Add Learning Material",
        ctaHref: "/materials",
        icon: Upload,
      };
    }
    if (metrics.quizzesCompleted === 0) {
      return {
        badge: "Next Step",
        badgeVariant: "teal",
        title: "Diagnose Comprehension",
        description: "Generate and complete your first practice quiz from your study materials to establish baseline diagnostics and unlock personalized mastery tracking.",
        ctaText: "Browse Materials & Quiz",
        ctaHref: "/materials",
        icon: HelpCircle,
      };
    }
    if (weakTopics.length > 0) {
      const topWeak = weakTopics[0];
      return {
        badge: "Priority Review",
        badgeVariant: topWeak.classification === "critical" ? "danger" : "warning",
        title: `Strengthen Concept: ${topWeak.topicTag}`,
        description: `Your mastery in "${topWeak.topicTag}" is currently at ${topWeak.masteryScore}%. Review targeted recommendations and practice to boost retention.`,
        ctaText: "Open Revision Plan",
        ctaHref: "/revision",
        icon: Flame,
      };
    }
    return {
      badge: "On Track",
      badgeVariant: "success",
      title: "Keep Up the Momentum",
      description: "All evaluated topics are in solid standing (70%+). Explore complex concepts with your AI Study Assistant or generate new quizzes.",
      ctaText: "Open AI Study Assistant",
      ctaHref: "/assistant",
      icon: Bot,
    };
  };

  const focusItem = getSuggestedFocus();
  const FocusIcon = focusItem.icon;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ── C1. Welcome Hero & Personalized Status Banner ───────────── */}
      <section className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-brand-950/40 border border-slate-800 p-6 sm:p-8 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-full bg-brand-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-950/70 border border-brand-800/60 text-brand-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-brand-400" />
              <span>Personalized Learning Space</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight">
              {timeGreeting}, {firstName}!
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Track your diagnostic mastery, test concepts with grounded practice quizzes, and continue targeted revision.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Link href="/materials">
                <Button size="sm" className="gap-2 bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-600/20">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Add Learning Material</span>
                </Button>
              </Link>

              <Link href="/quizzes">
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 gap-2"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-teal-400" />
                  <span>Practice Quizzes</span>
                </Button>
              </Link>

              <Link href="/assistant">
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 gap-2"
                >
                  <Bot className="w-3.5 h-3.5 text-indigo-400" />
                  <span>AI Study Assistant</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Suggested Next Focus Box */}
          <div className="w-full lg:w-80 shrink-0 p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3 shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Recommended Focus
              </span>
              <Badge variant={focusItem.badgeVariant} size="sm">
                {focusItem.badge}
              </Badge>
            </div>

            <div className="space-y-1">
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5 line-clamp-1">
                <FocusIcon className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                <span>{focusItem.title}</span>
              </h3>
              <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                {focusItem.description}
              </p>
            </div>

            <Link href={focusItem.ctaHref} className="block pt-1">
              <Button size="sm" variant="outline" className="w-full text-xs justify-between bg-slate-900 border-slate-700 text-slate-200 hover:text-white">
                <span>{focusItem.ctaText}</span>
                <ArrowRight className="w-3 h-3 text-brand-400" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── C2. Summary Metric Cards (Database-Backed) ──────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Learning Library */}
        <Link href="/materials" className="block group">
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5 space-y-3 hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 group-hover:text-slate-300">
                Learning Library
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
                  ? "Active study materials in repository"
                  : "Upload notes to get started"}
              </p>
            </div>
            <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-brand-400 font-semibold">
              <span>Encrypted Storage</span>
              <Badge variant="primary" size="sm">PDF / TXT</Badge>
            </div>
          </div>
        </Link>

        {/* Metric 2: Quizzes Completed */}
        <Link href="/quizzes" className="block group">
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5 space-y-3 hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 group-hover:text-slate-300">
                Quizzes Completed
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
                  ? "Server-evaluated quiz submissions"
                  : "Practice quizzes from materials"}
              </p>
            </div>
            <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-teal-400 font-semibold">
              <span>Quiz System</span>
              <Badge variant="teal" size="sm">Automated</Badge>
            </div>
          </div>
        </Link>

        {/* Metric 3: Average Score */}
        <Link href="/analytics" className="block group">
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5 space-y-3 hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 group-hover:text-slate-300">
                Average Quiz Score
              </span>
              <div className="w-8 h-8 rounded-lg bg-violet-950 border border-violet-800/60 text-violet-400 flex items-center justify-center">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-extrabold font-mono text-violet-300">
                {metrics.quizzesCompleted > 0 ? `${metrics.averageQuizScore}%` : "—"}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {metrics.quizzesCompleted > 0
                  ? metrics.averageQuizScore >= 80 ? "High comprehension level" : "Developing comprehension"
                  : "Take a quiz to compute diagnostic score"}
              </p>
            </div>
            <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-violet-400 font-semibold">
              <span>Mastery Diagnostic</span>
              <Badge variant="violet" size="sm">Score</Badge>
            </div>
          </div>
        </Link>

        {/* Metric 4: Mastered Topics */}
        <Link href="/analytics" className="block group">
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5 space-y-3 hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 group-hover:text-slate-300">
                Mastered Topics
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-800/60 text-emerald-400 flex items-center justify-center">
                <Brain className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-extrabold font-mono text-emerald-400">
                {metrics.masteredTopics ?? 0}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {metrics.masteredTopics > 0
                  ? "Topics with ≥85% accuracy"
                  : "Complete quizzes to master topics"}
              </p>
            </div>
            <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-emerald-400 font-semibold">
              <span>Retention Status</span>
              <Badge variant="success" size="sm">Mastered</Badge>
            </div>
          </div>
        </Link>
      </section>

      {/* ── C3 & C4. Dual Main Panels: Materials & Topics ───────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Panel 1: Recent Study Materials */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-brand-400" />
              <h2 className="text-base font-bold font-display text-white">
                Recent Study Materials
              </h2>
            </div>
            <Link
              href="/materials"
              className="text-xs text-brand-400 hover:text-brand-300 font-semibold inline-flex items-center gap-1"
            >
              <span>View Library</span>
              <ArrowRight className="w-3 h-3" />
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
                  className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        mat.fileType === "pdf"
                          ? "bg-rose-950/80 border border-rose-800/50 text-rose-400"
                          : "bg-teal-950/80 border border-teal-800/50 text-teal-400"
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <h4 className="text-xs font-bold text-white group-hover:text-brand-300 transition-colors truncate">
                        {mat.title}
                      </h4>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1.5">
                        <span className="uppercase font-semibold">{mat.fileType}</span>
                        <span>•</span>
                        <span>{formatDate(mat.createdAt)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant={
                        mat.processingStatus === "ready"
                          ? "success"
                          : mat.processingStatus === "processing"
                          ? "teal"
                          : "primary"
                      }
                      size="sm"
                      className="capitalize"
                    >
                      {mat.processingStatus === "ready" ? "Ready" : mat.processingStatus}
                    </Badge>

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
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Panel 2: Weak Topics Diagnostic */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-violet-400" />
              <h2 className="text-base font-bold font-display text-white">
                Topic Mastery Diagnostics
              </h2>
            </div>
            <Link
              href="/analytics"
              className="text-xs text-brand-400 hover:text-brand-300 font-semibold inline-flex items-center gap-1"
            >
              <span>Full Diagnostics</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {weakTopics.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-8 text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-950 border border-emerald-800/60 text-emerald-400 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-white font-display">
                All Assessed Topics on Track
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4 leading-relaxed">
                All assessed topics meet or exceed 70% mastery. Take more quizzes to continuously test your knowledge retention.
              </p>
              <Link href="/quizzes">
                <Button size="sm" variant="outline" className="border-slate-700 text-slate-300 hover:text-white">
                  Practice New Quiz
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {weakTopics.slice(0, 4).map((topic) => {
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
                          {isCritical ? "Critical (<40%)" : "Needs Review"}
                        </Badge>
                      </div>
                      <span className="font-mono font-extrabold text-sm text-slate-200">
                        {topic.masteryScore}%
                      </span>
                    </div>

                    <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
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

      {/* ── C5. Recent Learning Activity Section ────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-400" />
            <h2 className="text-base font-bold font-display text-white">
              Recent Learning Activity
            </h2>
          </div>
          <Link
            href="/history"
            className="text-xs text-brand-400 hover:text-brand-300 font-semibold inline-flex items-center gap-1"
          >
            <span>Complete History</span>
            <ArrowRight className="w-3 h-3" />
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
              Your document uploads, quiz attempts, and AI study sessions will appear here as you learn.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentActivity.slice(0, 4).map((act) => {
              const isQuiz = act.type === "quiz_completed";
              const isMaterial = act.type === "material_uploaded";
              const isRevision = act.type === "revision_completed";

              return (
                <div
                  key={`${act.type}-${act.id}`}
                  className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border",
                        isQuiz
                          ? "bg-teal-950/80 border-teal-800/50 text-teal-400"
                          : isMaterial
                          ? "bg-brand-950/80 border-brand-800/50 text-brand-400"
                          : "bg-violet-950/80 border-violet-800/50 text-violet-400"
                      )}
                    >
                      {isQuiz ? (
                        <HelpCircle className="w-4 h-4" />
                      ) : isMaterial ? (
                        <BookOpen className="w-4 h-4" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                    </div>

                    <div className="space-y-0.5 min-w-0">
                      <h4 className="text-xs font-bold text-white truncate">{act.title}</h4>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        <span>{formatDate(act.timestamp)}</span>
                      </p>
                    </div>
                  </div>

                  {act.scorePercentage !== undefined && (
                    <div className="text-right shrink-0">
                      <span className="font-mono font-extrabold text-sm text-teal-400">
                        {act.scorePercentage}%
                      </span>
                      <p className="text-[9px] text-slate-500 uppercase">Score</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
