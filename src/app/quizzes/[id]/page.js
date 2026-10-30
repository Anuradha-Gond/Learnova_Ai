"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Award,
  Sparkles,
  BarChart3,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Send,
  BookOpen,
  Check,
  Bookmark,
  BookmarkCheck,
  Eye,
  ListFilter,
  Brain,
  Layers,
  GraduationCap,
  AlertTriangle,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Dialog from "@/components/ui/Dialog";
import { SkeletonCard } from "@/components/ui/Skeleton";
import MarkdownRenderer from "@/components/ui/MarkdownRenderer";
import { cn } from "@/lib/utils";

export default function QuizRunnerPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.id;

  const [quiz, setQuiz] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Quiz Taking State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { [questionId]: { selectedOptionId, answerText } }
  const [flaggedQuestions, setFlaggedQuestions] = useState({}); // { [questionId]: boolean }
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Modals for confirmation
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

  // Elapsed Timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef(null);

  // Results State
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [resultsFilter, setResultsFilter] = useState("all"); // "all" | "incorrect" | "correct"

  // Fetch Public Quiz Data
  const fetchQuiz = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/quizzes/${quizId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Quiz not found or access denied.");
      }

      setQuiz(data.quiz);
    } catch (err) {
      setError(err.message || "Failed to load quiz.");
    } finally {
      setIsLoading(false);
    }
  }, [quizId]);

  useEffect(() => {
    if (quizId) {
      fetchQuiz();
    }
  }, [quizId, fetchQuiz]);

  // Timer Effect
  useEffect(() => {
    if (!evaluationResult && quiz) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [quiz, evaluationResult]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSelectOption = (questionId, optionId) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        selectedOptionId: optionId,
        answerText: "",
      },
    }));
  };

  const handleTextAnswer = (questionId, text) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        selectedOptionId: null,
        answerText: text,
      },
    }));
  };

  const toggleFlag = (questionId) => {
    setFlaggedQuestions((prev) => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  };

  const handleSubmitQuiz = async () => {
    if (!quiz || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError("");
    setIsSubmitModalOpen(false);

    const submittedAnswers = quiz.questions.map((q) => {
      const ans = answers[q.questionId] || {};
      return {
        questionId: q.questionId,
        selectedOptionId: ans.selectedOptionId || null,
        answerText: ans.answerText || "",
      };
    });

    const idempotencyKey = `sub_${quizId}_${Date.now()}`;

    try {
      const res = await fetch(`/api/quizzes/${quizId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submittedAnswers,
          idempotencyKey,
          durationSeconds: elapsedSeconds,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit quiz.");
      }

      setEvaluationResult(data.result);
      setIsReviewMode(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setSubmitError(err.message || "An error occurred while evaluating your answers.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetake = () => {
    setEvaluationResult(null);
    setAnswers({});
    setFlaggedQuestions({});
    setCurrentIndex(0);
    setIsReviewMode(false);
    setElapsedSeconds(0);
    setResultsFilter("all");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Filtered graded answers for Results view
  const filteredGradedAnswers = useMemo(() => {
    if (!evaluationResult?.gradedAnswers) return [];
    if (resultsFilter === "incorrect") {
      return evaluationResult.gradedAnswers.filter((a) => !a.isCorrect);
    }
    if (resultsFilter === "correct") {
      return evaluationResult.gradedAnswers.filter((a) => a.isCorrect);
    }
    return evaluationResult.gradedAnswers;
  }, [evaluationResult, resultsFilter]);

  // Loading State
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-6 animate-fade-in">
        <SkeletonCard className="h-28" />
        <SkeletonCard className="h-80" />
      </div>
    );
  }

  // Error State
  if (error || !quiz) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4 animate-fade-in">
        <div className="w-12 h-12 rounded-2xl bg-rose-950/60 border border-rose-800/40 text-rose-400 flex items-center justify-center mx-auto shadow-sm">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-white">Quiz Unavailable</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          {error || "Could not retrieve the requested quiz."}
        </p>
        <Link href="/materials">
          <Button variant="outline" size="sm" className="mt-2">
            Back to Study Materials
          </Button>
        </Link>
      </div>
    );
  }

  const currentQuestion = quiz.questions[currentIndex];
  const currentAnswer = answers[currentQuestion?.questionId] || {};
  const isCurrentFlagged = Boolean(flaggedQuestions[currentQuestion?.questionId]);

  const answeredCount = Object.keys(answers).filter((k) => {
    const a = answers[k];
    return a.selectedOptionId || (a.answerText && a.answerText.trim().length > 0);
  }).length;
  const unansweredCount = quiz.questions.length - answeredCount;
  const progressPercent = Math.round(((currentIndex + 1) / quiz.questions.length) * 100);

  // ───────────────────────────────────────────────────────────────────────────
  // RESULTS VIEW
  // ───────────────────────────────────────────────────────────────────────────
  if (evaluationResult) {
    const scorePct = evaluationResult.scorePercentage;
    const isMastered = scorePct >= 85;
    const isPassing = scorePct >= 65;

    // SVG Circular Progress math
    const radius = 48;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (scorePct / 100) * circumference;

    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8 animate-fade-in">
        {/* Top Navigation Bar */}
        <div className="flex items-center justify-between">
          <Link
            href={`/materials/${quiz.materialId}`}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Study Material</span>
          </Link>

          <div className="flex items-center gap-2">
            <Link href="/revision">
              <Button size="sm" variant="outline" className="gap-1.5 text-xs border-slate-700 text-slate-300 hover:text-white">
                <Brain className="w-3.5 h-3.5 text-teal-400" />
                <span>Revision Plan</span>
              </Button>
            </Link>

            <Button
              size="sm"
              variant="primary"
              onClick={handleRetake}
              className="gap-2 bg-brand-600 hover:bg-brand-500 text-xs shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retake Quiz</span>
            </Button>
          </div>
        </div>

        {/* ── Score & Evaluation Hero Banner with SVG Ring ─────────── */}
        <div
          className={cn(
            "rounded-3xl p-6 sm:p-8 border relative overflow-hidden shadow-2xl transition-all",
            isMastered
              ? "bg-gradient-to-br from-emerald-950/70 via-slate-900 to-slate-950 border-emerald-500/40"
              : isPassing
              ? "bg-gradient-to-br from-brand-950/70 via-slate-900 to-slate-950 border-brand-500/40"
              : "bg-gradient-to-br from-amber-950/60 via-slate-900 to-slate-950 border-amber-500/40"
          )}
        >
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 text-center sm:text-left">
            <div className="space-y-3 flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <Badge
                  variant={isMastered ? "success" : isPassing ? "primary" : "warning"}
                  size="md"
                >
                  {isMastered
                    ? "Mastery Achieved (85%+)"
                    : isPassing
                    ? "Passing Score (65-84%)"
                    : "Revision Recommended (<65%)"}
                </Badge>
                <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>{formatTimer(evaluationResult.durationSeconds || elapsedSeconds)}</span>
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {quiz.title}
              </h1>

              <p className="text-xs sm:text-sm text-slate-300 max-w-lg leading-relaxed">
                {isMastered
                  ? "Outstanding comprehension! Your topic mastery scores have been updated to Mastered."
                  : isPassing
                  ? "Good job! You have solid foundational comprehension with a few areas to strengthen."
                  : "Keep practicing! Review your missed concepts below and revisit the recommended materials."}
              </p>
            </div>

            {/* Circular SVG Gauge */}
            <div className="relative flex items-center justify-center shrink-0 w-32 h-32">
              <svg className="w-32 h-32 -rotate-90 transform" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-slate-800"
                  fill="transparent"
                />
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className={cn(
                    "transition-all duration-1000 ease-out",
                    isMastered
                      ? "text-emerald-400"
                      : isPassing
                      ? "text-brand-400"
                      : "text-amber-400"
                  )}
                  fill="transparent"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-extrabold text-white font-mono leading-none">
                  {scorePct}%
                </span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1">
                  {evaluationResult.correctCount}/{evaluationResult.totalQuestions} Correct
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Topic-Wise Diagnostics (TopicMastery) ────────────────── */}
        {evaluationResult.topicBreakdown && evaluationResult.topicBreakdown.length > 0 && (
          <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-5 sm:p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-brand-400" />
                <span>Topic Diagnostics</span>
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">Updated via EMA</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {evaluationResult.topicBreakdown.map((t, idx) => {
                const topicAccuracy = t.accuracy;
                const isTopicMastered = topicAccuracy >= 85;
                const isTopicWeak = topicAccuracy < 70;

                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5 transition-all hover:border-slate-700"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-200 truncate" title={t.topicTag}>
                        {t.topicTag}
                      </span>
                      <Badge
                        variant={isTopicMastered ? "success" : isTopicWeak ? "danger" : "warning"}
                        size="sm"
                        className="text-[10px]"
                      >
                        {isTopicMastered ? "Mastered" : isTopicWeak ? "Needs Review" : "Developing"}
                      </Badge>
                    </div>

                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-slate-400 text-[11px]">Accuracy ({t.correct}/{t.total})</span>
                      <span className="font-mono font-bold text-white">{topicAccuracy}%</span>
                    </div>

                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          isTopicMastered
                            ? "bg-emerald-400"
                            : isTopicWeak
                            ? "bg-rose-400"
                            : "bg-amber-400"
                        )}
                        style={{ width: `${topicAccuracy}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Question-By-Question Detailed Review ─────────────────── */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Question Review & Solutions
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Explanations and reference answers verified against source material.
              </p>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setResultsFilter("all")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer",
                  resultsFilter === "all"
                    ? "bg-brand-600 text-white font-semibold shadow-sm"
                    : "text-slate-400 hover:text-white"
                )}
              >
                All ({evaluationResult.totalQuestions})
              </button>
              <button
                type="button"
                onClick={() => setResultsFilter("incorrect")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer",
                  resultsFilter === "incorrect"
                    ? "bg-rose-600 text-white font-semibold shadow-sm"
                    : "text-slate-400 hover:text-white"
                )}
              >
                Missed ({evaluationResult.totalQuestions - evaluationResult.correctCount})
              </button>
              <button
                type="button"
                onClick={() => setResultsFilter("correct")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer",
                  resultsFilter === "correct"
                    ? "bg-emerald-600 text-white font-semibold shadow-sm"
                    : "text-slate-400 hover:text-white"
                )}
              >
                Correct ({evaluationResult.correctCount})
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {filteredGradedAnswers.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-slate-900/50 border border-slate-800 text-xs text-slate-400">
                No questions match the selected filter.
              </div>
            ) : (
              filteredGradedAnswers.map((item, idx) => {
                const qOriginal = quiz.questions.find((q) => q.questionId === item.questionId);
                const isCorrect = item.isCorrect;
                const originalIndex = quiz.questions.findIndex((q) => q.questionId === item.questionId);

                return (
                  <div
                    key={item.questionId || idx}
                    className={cn(
                      "p-5 sm:p-6 rounded-2xl border space-y-4 transition-all shadow-md",
                      isCorrect
                        ? "bg-slate-900/80 border-emerald-500/30"
                        : "bg-slate-900/80 border-rose-500/40"
                    )}
                  >
                    {/* Question header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={cn(
                            "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-sm",
                            isCorrect
                              ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/60"
                              : "bg-rose-950/80 text-rose-400 border border-rose-800/60"
                          )}
                        >
                          {isCorrect ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                        </div>
                        <span className="text-xs font-bold text-slate-200">
                          Question {originalIndex >= 0 ? originalIndex + 1 : idx + 1}
                        </span>
                        {qOriginal?.topicTag && (
                          <Badge variant="neutral" size="sm" className="text-[10px]">
                            {qOriginal.topicTag}
                          </Badge>
                        )}
                      </div>

                      <Badge variant={isCorrect ? "success" : "danger"} size="sm">
                        {isCorrect ? "Correct (+1)" : "Incorrect (0)"}
                      </Badge>
                    </div>

                    {/* Question text */}
                    <p className="text-xs sm:text-sm text-white font-medium leading-relaxed">
                      {qOriginal?.text}
                    </p>

                    {/* MCQ Options Display */}
                    {qOriginal?.type === "MCQ" && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {qOriginal.options?.map((opt) => {
                          const isStudentPick = item.selectedOptionId === opt.optionId;
                          const isCorrectOption = item.correctOptionId === opt.optionId;

                          return (
                            <div
                              key={opt.optionId}
                              className={cn(
                                "p-3 rounded-xl border flex items-center justify-between text-xs transition-all",
                                isCorrectOption
                                  ? "bg-emerald-950/60 border-emerald-500/60 text-emerald-100 font-medium"
                                  : isStudentPick
                                  ? "bg-rose-950/60 border-rose-500/60 text-rose-100"
                                  : "bg-slate-950/60 border-slate-800 text-slate-400"
                              )}
                            >
                              <span className="leading-normal pr-2">
                                <strong className="mr-1.5">{opt.optionId}.</strong>
                                {opt.text}
                              </span>
                              {isCorrectOption && (
                                <Badge variant="success" size="sm" className="text-[9px] shrink-0">
                                  Correct
                                </Badge>
                              )}
                              {isStudentPick && !isCorrectOption && (
                                <Badge variant="danger" size="sm" className="text-[9px] shrink-0">
                                  Your Pick
                                </Badge>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* True / False Display */}
                    {qOriginal?.type === "TRUE_FALSE" && (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {["true", "false"].map((val) => {
                          const isStudentPick = String(item.selectedOptionId).toLowerCase() === val;
                          const isCorrectOption = String(item.correctOptionId).toLowerCase() === val;

                          return (
                            <div
                              key={val}
                              className={cn(
                                "p-3 rounded-xl border flex items-center justify-between text-xs capitalize transition-all",
                                isCorrectOption
                                  ? "bg-emerald-950/60 border-emerald-500/60 text-emerald-100 font-medium"
                                  : isStudentPick
                                  ? "bg-rose-950/60 border-rose-500/60 text-rose-100"
                                  : "bg-slate-950/60 border-slate-800 text-slate-400"
                              )}
                            >
                              <span>{val}</span>
                              {isCorrectOption && (
                                <Badge variant="success" size="sm" className="text-[9px]">
                                  Correct
                                </Badge>
                              )}
                              {isStudentPick && !isCorrectOption && (
                                <Badge variant="danger" size="sm" className="text-[9px]">
                                  Your Pick
                                </Badge>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Short Answer Display */}
                    {qOriginal?.type === "SHORT_ANSWER" && (
                      <div className="space-y-2 text-xs">
                        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Your Answer:
                          </span>
                          <p className="text-slate-200 italic">
                            {item.answerText || "(No answer provided)"}
                          </p>
                        </div>

                        {item.referenceAnswer && (
                          <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/40 space-y-1">
                            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                              Reference Answer:
                            </span>
                            <p className="text-emerald-200">
                              {item.referenceAnswer}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Official Explanation rendered via MarkdownRenderer */}
                    {(item.explanation || item.feedback) && (
                      <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 text-xs text-slate-300 space-y-1.5 shadow-inner">
                        <span className="text-[10px] font-bold text-brand-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3 text-brand-400" />
                          <span>Official Solution & Explanation</span>
                        </span>
                        <div className="leading-relaxed select-text">
                          <MarkdownRenderer content={item.explanation || item.feedback} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800">
          <Link href="/quizzes">
            <Button variant="outline" size="sm" className="gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>All Practice Quizzes</span>
            </Button>
          </Link>

          <div className="flex items-center gap-2">
            <Link href={`/materials/${quiz.materialId}`}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-teal-400" />
                <span>Study Material</span>
              </Button>
            </Link>

            <Button variant="primary" size="sm" onClick={handleRetake} className="gap-2 bg-brand-600 hover:bg-brand-500">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retake This Quiz</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // QUIZ RUNNER VIEW (QUESTION-BY-QUESTION + NAVIGATION PALETTE)
  // ───────────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 animate-fade-in">
      {/* ── Runner Header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <button
          type="button"
          onClick={() => setIsExitModalOpen(true)}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit Quiz</span>
        </button>

        <div className="flex items-center gap-3">
          <Badge variant="teal" size="sm" className="capitalize">
            {quiz.difficulty}
          </Badge>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300">
            <Clock className="w-3.5 h-3.5 text-brand-400" />
            <span>{formatTimer(elapsedSeconds)}</span>
          </div>
        </div>
      </div>

      {/* ── Question Quick-Jump Palette & Progress ──────────────────── */}
      <div className="space-y-3 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-white truncate max-w-sm" title={quiz.title}>
            {quiz.title}
          </span>
          <span className="text-slate-400 font-mono text-[11px]">
            {answeredCount} of {quiz.questions.length} Answered
          </span>
        </div>

        {/* Interactive question numbered chips */}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          {quiz.questions.map((q, idx) => {
            const isCurrent = idx === currentIndex;
            const ans = answers[q.questionId];
            const isAnswered = ans && (ans.selectedOptionId || (ans.answerText && ans.answerText.trim().length > 0));
            const isFlagged = flaggedQuestions[q.questionId];

            return (
              <button
                key={q.questionId}
                type="button"
                onClick={() => {
                  setCurrentIndex(idx);
                  setIsReviewMode(false);
                }}
                className={cn(
                  "relative w-8 h-8 rounded-lg text-xs font-mono font-bold flex items-center justify-center transition-all cursor-pointer",
                  isCurrent
                    ? "bg-brand-600 text-white ring-2 ring-brand-400 ring-offset-2 ring-offset-slate-900 shadow-sm"
                    : isAnswered
                    ? "bg-teal-950/80 border border-teal-600/60 text-teal-300 hover:bg-teal-900"
                    : "bg-slate-950/80 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800"
                )}
                title={`Question ${idx + 1}${isFlagged ? " (Marked for review)" : ""}${isAnswered ? " (Answered)" : " (Unanswered)"}`}
              >
                <span>{idx + 1}</span>
                {isFlagged && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-slate-900" />
                )}
              </button>
            );
          })}
        </div>

        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
          <div
            className="bg-gradient-to-r from-brand-500 to-teal-400 h-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Error banner */}
      {submitError && (
        <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-500/50 text-xs text-rose-200 flex items-start gap-2.5 animate-fade-in">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span>{submitError}</span>
        </div>
      )}

      {/* ── QUESTION CARD OR REVIEW SUMMARY ────────────────────────── */}
      {!isReviewMode ? (
        <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 sm:p-8 space-y-6 shadow-xl relative">
          {/* Card Top: Question indicator + Flag bookmark */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="primary" size="sm">
                Question {currentIndex + 1} of {quiz.questions.length}
              </Badge>

              {currentQuestion?.topicTag && (
                <Badge variant="neutral" size="sm" className="text-[10px]">
                  {currentQuestion.topicTag}
                </Badge>
              )}
            </div>

            <button
              type="button"
              onClick={() => toggleFlag(currentQuestion?.questionId)}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors cursor-pointer",
                isCurrentFlagged
                  ? "bg-amber-950/70 border-amber-600/60 text-amber-300"
                  : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
              )}
              title={isCurrentFlagged ? "Remove bookmark" : "Mark for review later"}
            >
              {isCurrentFlagged ? (
                <>
                  <BookmarkCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Marked for Review</span>
                </>
              ) : (
                <>
                  <Bookmark className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Mark for Review</span>
                </>
              )}
            </button>
          </div>

          <h2 className="text-base sm:text-lg font-bold text-white leading-relaxed">
            {currentQuestion?.text}
          </h2>

          {/* MCQ Options */}
          {currentQuestion?.type === "MCQ" && (
            <div className="space-y-3 pt-2">
              {currentQuestion.options?.map((opt) => {
                const isSelected = currentAnswer.selectedOptionId === opt.optionId;

                return (
                  <button
                    key={opt.optionId}
                    type="button"
                    onClick={() => handleSelectOption(currentQuestion.questionId, opt.optionId)}
                    className={cn(
                      "w-full p-4 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer group shadow-sm",
                      isSelected
                        ? "bg-brand-950/90 border-brand-500 text-white shadow-md ring-1 ring-brand-500/50"
                        : "bg-slate-950/70 border-slate-800/90 text-slate-300 hover:border-slate-700 hover:bg-slate-800/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-7 h-7 rounded-lg border text-xs font-mono font-bold flex items-center justify-center shrink-0 transition-colors",
                          isSelected
                            ? "bg-brand-500 border-brand-400 text-white"
                            : "border-slate-700 text-slate-400 group-hover:border-slate-500"
                        )}
                      >
                        {opt.optionId}
                      </div>
                      <span className="text-xs sm:text-sm font-medium leading-normal">{opt.text}</span>
                    </div>

                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-brand-400 shrink-0 ml-2" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* True / False Options */}
          {currentQuestion?.type === "TRUE_FALSE" && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              {[
                { val: "true", label: "True" },
                { val: "false", label: "False" },
              ].map((item) => {
                const isSelected =
                  String(currentAnswer.selectedOptionId).toLowerCase() === item.val;

                return (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => handleSelectOption(currentQuestion.questionId, item.val)}
                    className={cn(
                      "p-5 rounded-2xl border text-center font-bold text-sm transition-all cursor-pointer flex flex-col items-center justify-center gap-2 shadow-sm",
                      isSelected
                        ? "bg-brand-950/90 border-brand-500 text-white shadow-md ring-1 ring-brand-500/50"
                        : "bg-slate-950/70 border-slate-800/90 text-slate-300 hover:border-slate-700 hover:bg-slate-800/50"
                    )}
                  >
                    <span>{item.label}</span>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-brand-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Short Answer Text Area */}
          {currentQuestion?.type === "SHORT_ANSWER" && (
            <div className="space-y-2 pt-2">
              <textarea
                rows={4}
                value={currentAnswer.answerText || ""}
                onChange={(e) => handleTextAnswer(currentQuestion.questionId, e.target.value)}
                placeholder="Type your explanation or summary here..."
                className="w-full rounded-2xl bg-slate-950/90 border border-slate-800 p-4 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors resize-none leading-relaxed shadow-inner"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                <span>Evaluated conceptually against reference material</span>
                <span>{(currentAnswer.answerText || "").length} / 2000</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ── REVIEW MODE BEFORE FINAL SUBMIT ────────────────────────── */
        <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 sm:p-8 space-y-6 shadow-xl animate-fade-in">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white">Review Your Answers</h2>
            <p className="text-xs text-slate-400">
              Confirm your responses or return to any question before final submission.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {quiz.questions.map((q, idx) => {
              const ans = answers[q.questionId] || {};
              const isAnswered =
                ans.selectedOptionId || (ans.answerText && ans.answerText.trim().length > 0);
              const isFlagged = flaggedQuestions[q.questionId];

              return (
                <button
                  key={q.questionId}
                  type="button"
                  onClick={() => {
                    setCurrentIndex(idx);
                    setIsReviewMode(false);
                  }}
                  className={cn(
                    "p-3.5 rounded-xl border text-left flex items-center justify-between text-xs transition-all cursor-pointer hover:border-brand-500/50",
                    isAnswered
                      ? "bg-slate-950/80 border-slate-800 text-slate-200"
                      : "bg-amber-950/30 border-amber-800/40 text-amber-300"
                  )}
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <span className="font-bold text-slate-400 shrink-0">Q{idx + 1}.</span>
                    <span className="truncate">{q.text}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isFlagged && (
                      <Bookmark className="w-3.5 h-3.5 text-amber-400 fill-amber-400/30" />
                    )}
                    <Badge variant={isAnswered ? "success" : "warning"} size="sm" className="text-[10px]">
                      {isAnswered ? "Answered" : "Unanswered"}
                    </Badge>
                  </div>
                </button>
              );
            })}
          </div>

          {unansweredCount > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/50 text-xs text-amber-200 flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                You have {unansweredCount} unanswered question{unansweredCount === 1 ? "" : "s"}. You can still submit, but unanswered questions will be marked incorrect.
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Runner Footer Controls ──────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2">
        {!isReviewMode ? (
          <>
            <Button
              variant="outline"
              size="sm"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              className="gap-1.5"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsReviewMode(true)}
                className="text-xs"
              >
                Review Summary
              </Button>

              {currentIndex < quiz.questions.length - 1 ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setCurrentIndex((prev) => prev + 1)}
                  className="gap-1.5 bg-brand-600 hover:bg-brand-500 shadow-sm"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsSubmitModalOpen(true)}
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-500 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Quiz</span>
                </Button>
              )}
            </div>
          </>
        ) : (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsReviewMode(false)}
            >
              Back to Questions
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsSubmitModalOpen(true)}
              className="gap-2 bg-emerald-600 hover:bg-emerald-500 shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Confirm & Submit</span>
            </Button>
          </>
        )}
      </div>

      {/* ── Exit Confirmation Dialog ────────────────────────────────── */}
      <Dialog
        isOpen={isExitModalOpen}
        onClose={() => setIsExitModalOpen(false)}
        title="Exit Quiz Session?"
        description="Your selected answers will be discarded if you leave without submitting."
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-400">
            You currently have <strong className="text-white">{answeredCount}</strong> answered question(s). If you leave now, this attempt will not be recorded.
          </p>
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsExitModalOpen(false)}
            >
              Continue Quiz
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => router.push(`/materials/${quiz.materialId}`)}
            >
              Exit to Material
            </Button>
          </div>
        </div>
      </Dialog>

      {/* ── Submit Confirmation Dialog ──────────────────────────────── */}
      <Dialog
        isOpen={isSubmitModalOpen}
        onClose={() => !isSubmitting && setIsSubmitModalOpen(false)}
        title="Submit Quiz for Evaluation?"
        description="Once submitted, your answers will be evaluated server-side and recorded."
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 font-mono">
            <div className="flex justify-between text-slate-300">
              <span>Total Questions:</span>
              <strong className="text-white">{quiz.questions.length}</strong>
            </div>
            <div className="flex justify-between text-teal-400">
              <span>Answered:</span>
              <strong>{answeredCount}</strong>
            </div>
            {unansweredCount > 0 && (
              <div className="flex justify-between text-amber-400">
                <span>Unanswered:</span>
                <strong>{unansweredCount}</strong>
              </div>
            )}
            <div className="flex justify-between text-slate-400">
              <span>Time Elapsed:</span>
              <span>{formatTimer(elapsedSeconds)}</span>
            </div>
          </div>

          {unansweredCount > 0 && (
            <p className="text-amber-300/90 text-[11px] leading-relaxed">
              Note: Unanswered questions will receive zero points. You can go back to answer them or proceed with submission.
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={() => setIsSubmitModalOpen(false)}
            >
              Review More
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
              onClick={handleSubmitQuiz}
              className="gap-2 bg-emerald-600 hover:bg-emerald-500 shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Now</span>
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
