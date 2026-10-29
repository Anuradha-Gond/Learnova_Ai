"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
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
  Flame,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { SkeletonCard } from "@/components/ui/Skeleton";
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
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Elapsed Timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef(null);

  // Results State
  const [evaluationResult, setEvaluationResult] = useState(null);

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

      // Check if previous submissions exist to offer quick review
      try {
        const subRes = await fetch(`/api/quizzes/${quizId}/submissions`);
        if (subRes.ok) {
          const subData = await subRes.json();
          if (subData.submissions && subData.submissions.length > 0) {
            // Pre-load latest attempt as an option
            // (student can retake whenever they want)
          }
        }
      } catch {
        // Silently ignore submission check failure
      }
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

  const handleSubmitQuiz = async () => {
    if (!quiz || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError("");

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
    setCurrentIndex(0);
    setIsReviewMode(false);
    setElapsedSeconds(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-6">
        <SkeletonCard className="h-28" />
        <SkeletonCard className="h-80" />
      </div>
    );
  }

  // Error State
  if (error || !quiz) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-950/60 border border-rose-800/40 text-rose-400 flex items-center justify-center mx-auto">
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
  const answeredCount = Object.keys(answers).filter((k) => {
    const a = answers[k];
    return a.selectedOptionId || (a.answerText && a.answerText.trim().length > 0);
  }).length;
  const progressPercent = Math.round(((currentIndex + 1) / quiz.questions.length) * 100);

  // ───────────────────────────────────────────────────────────────────────────
  // RESULTS VIEW
  // ───────────────────────────────────────────────────────────────────────────
  if (evaluationResult) {
    const isPassing = evaluationResult.scorePercentage >= 65;

    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8 animate-fade-in">
        {/* Top Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href={`/materials/${quiz.materialId}`}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Study Material</span>
          </Link>

          <Button
            size="sm"
            variant="outline"
            onClick={handleRetake}
            className="gap-2 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retake Quiz</span>
          </Button>
        </div>

        {/* Score & Evaluation Hero Banner */}
        <div
          className={cn(
            "rounded-3xl p-6 sm:p-8 border relative overflow-hidden shadow-2xl",
            isPassing
              ? "bg-gradient-to-br from-emerald-950/70 via-slate-900 to-slate-950 border-emerald-500/40"
              : "bg-gradient-to-br from-brand-950/70 via-slate-900 to-slate-950 border-brand-500/40"
          )}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <Badge variant={isPassing ? "success" : "warning"} size="md">
                  {isPassing ? "Mastery Achieved" : "Practice Recommended"}
                </Badge>
                <span className="text-xs text-slate-400">
                  Completed in {formatTimer(evaluationResult.durationSeconds || elapsedSeconds)}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {quiz.title}
              </h1>
              <p className="text-xs text-slate-300">
                Server-evaluated results with official explanations and topic mastery diagnostics.
              </p>
            </div>

            {/* Score Ring / Pill */}
            <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-slate-950/80 border border-slate-800/80 shrink-0 min-w-[130px]">
              <span className="text-4xl font-extrabold text-white font-mono">
                {evaluationResult.scorePercentage}%
              </span>
              <span className="text-[11px] font-semibold text-slate-400 mt-1 uppercase tracking-wider">
                {evaluationResult.correctCount} of {evaluationResult.totalQuestions} Correct
              </span>
            </div>
          </div>
        </div>

        {/* Topic-Wise Diagnostics (Milestone 7 TopicMastery) */}
        {evaluationResult.topicBreakdown && evaluationResult.topicBreakdown.length > 0 && (
          <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-brand-400" />
                <span>Topic Mastery Diagnostics (EMA Updated)</span>
              </h3>
              <span className="text-[11px] text-slate-400">Saved to learning analytics</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {evaluationResult.topicBreakdown.map((t, idx) => {
                const isMastered = t.accuracy >= 85;
                const isWeak = t.accuracy <= 64;

                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200 truncate max-w-[140px]" title={t.topicTag}>
                        {t.topicTag}
                      </span>
                      <Badge
                        variant={isMastered ? "success" : isWeak ? "danger" : "warning"}
                        size="sm"
                      >
                        {isMastered ? "Mastered" : isWeak ? "Needs Review" : "In Progress"}
                      </Badge>
                    </div>

                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-slate-400 text-[11px]">Accuracy</span>
                      <span className="font-mono font-bold text-white">{t.accuracy}%</span>
                    </div>

                    <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          isMastered ? "bg-emerald-400" : isWeak ? "bg-rose-400" : "bg-amber-400"
                        )}
                        style={{ width: `${t.accuracy}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Question-By-Question Detailed Review */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Detailed Question Review
          </h3>

          <div className="space-y-4">
            {evaluationResult.gradedAnswers?.map((item, idx) => {
              const qOriginal = quiz.questions.find((q) => q.questionId === item.questionId);
              const isCorrect = item.isCorrect;

              return (
                <div
                  key={item.questionId || idx}
                  className={cn(
                    "p-5 rounded-2xl border space-y-4 transition-all",
                    isCorrect
                      ? "bg-slate-900/60 border-emerald-500/30"
                      : "bg-slate-900/60 border-rose-500/30"
                  )}
                >
                  {/* Question header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={cn(
                          "w-6 h-6 rounded-lg flex items-center justify-center shrink-0",
                          isCorrect
                            ? "bg-emerald-950 text-emerald-400"
                            : "bg-rose-950 text-rose-400"
                        )}
                      >
                        {isCorrect ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <XCircle className="w-4 h-4" />
                        )}
                      </div>
                      <span className="text-xs font-bold text-slate-300">
                        Question {idx + 1}
                      </span>
                      {qOriginal?.topicTag && (
                        <Badge variant="neutral" size="sm" className="text-[10px]">
                          {qOriginal.topicTag}
                        </Badge>
                      )}
                    </div>

                    <Badge variant={isCorrect ? "success" : "danger"} size="sm">
                      {isCorrect ? "Correct" : "Incorrect"}
                    </Badge>
                  </div>

                  {/* Question text */}
                  <p className="text-xs text-white font-medium leading-relaxed">
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
                              "p-3 rounded-xl border flex items-center justify-between text-xs",
                              isCorrectOption
                                ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-200"
                                : isStudentPick
                                ? "bg-rose-950/60 border-rose-500/50 text-rose-200"
                                : "bg-slate-950/60 border-slate-800 text-slate-400"
                            )}
                          >
                            <span className="leading-normal">
                              <strong className="mr-1.5">{opt.optionId}.</strong>
                              {opt.text}
                            </span>
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
                              "p-3 rounded-xl border flex items-center justify-between text-xs capitalize",
                              isCorrectOption
                                ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-200"
                                : isStudentPick
                                ? "bg-rose-950/60 border-rose-500/50 text-rose-200"
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

                  {/* Explanation / Feedback */}
                  {(item.explanation || item.feedback) && (
                    <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-300 space-y-1">
                      <span className="text-[10px] font-bold text-brand-400 uppercase tracking-wider block">
                        Official Explanation:
                      </span>
                      <p className="leading-relaxed">
                        {item.explanation || item.feedback}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="pt-4 flex items-center justify-between border-t border-slate-800">
          <Link href="/materials">
            <Button variant="outline" size="sm">
              Study Materials
            </Button>
          </Link>

          <Button variant="primary" size="sm" onClick={handleRetake} className="gap-2">
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retake This Quiz</span>
          </Button>
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // QUIZ RUNNER / REVIEW VIEW
  // ───────────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-6 animate-fade-in">
      {/* Runner Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <Link
          href={`/materials/${quiz.materialId}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit Quiz</span>
        </Link>

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

      {/* Progress Bar & Header Stats */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-white truncate max-w-sm" title={quiz.title}>
            {quiz.title}
          </span>
          <span className="text-slate-400 font-mono text-[11px]">
            Question {currentIndex + 1} of {quiz.questions.length} ({answeredCount} answered)
          </span>
        </div>

        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-brand-500 to-teal-400 h-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Error banner */}
      {submitError && (
        <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-500/50 text-xs text-rose-200 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span>{submitError}</span>
        </div>
      )}

      {/* ── QUESTION CARD ────────────────────────────────────────────── */}
      {!isReviewMode ? (
        <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="flex items-center justify-between">
            <Badge variant="primary" size="sm">
              Question {currentIndex + 1}
            </Badge>

            {currentQuestion?.topicTag && (
              <Badge variant="neutral" size="sm" className="text-[10px]">
                {currentQuestion.topicTag}
              </Badge>
            )}
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
                      "w-full p-4 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer group",
                      isSelected
                        ? "bg-brand-950/80 border-brand-500 text-white shadow-sm"
                        : "bg-slate-950/60 border-slate-800/90 text-slate-300 hover:border-slate-700 hover:bg-slate-800/40"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-6 h-6 rounded-full border text-xs font-bold flex items-center justify-center shrink-0 transition-colors",
                          isSelected
                            ? "bg-brand-500 border-brand-400 text-white"
                            : "border-slate-700 text-slate-400 group-hover:border-slate-500"
                        )}
                      >
                        {opt.optionId}
                      </div>
                      <span className="text-xs font-medium leading-normal">{opt.text}</span>
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
                      "p-5 rounded-2xl border text-center font-bold text-sm transition-all cursor-pointer flex flex-col items-center justify-center gap-2",
                      isSelected
                        ? "bg-brand-950/80 border-brand-500 text-white shadow-sm"
                        : "bg-slate-950/60 border-slate-800/90 text-slate-300 hover:border-slate-700 hover:bg-slate-800/40"
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
                className="w-full rounded-2xl bg-slate-950/90 border border-slate-800 p-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors resize-none leading-relaxed"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                <span>AI evaluates conceptual understanding against source material</span>
                <span>{(currentAnswer.answerText || "").length} / 2000</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ── REVIEW MODE BEFORE FINAL SUBMIT ────────────────────────── */
        <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white">Review Your Answers</h2>
            <p className="text-xs text-slate-400">
              Confirm your responses before submitting for server-side evaluation.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {quiz.questions.map((q, idx) => {
              const ans = answers[q.questionId] || {};
              const isAnswered =
                ans.selectedOptionId || (ans.answerText && ans.answerText.trim().length > 0);

              return (
                <button
                  key={q.questionId}
                  type="button"
                  onClick={() => {
                    setCurrentIndex(idx);
                    setIsReviewMode(false);
                  }}
                  className={cn(
                    "p-3 rounded-xl border text-left flex items-center justify-between text-xs transition-all cursor-pointer",
                    isAnswered
                      ? "bg-slate-950/80 border-slate-800 text-slate-200"
                      : "bg-amber-950/30 border-amber-800/40 text-amber-300"
                  )}
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <span className="font-bold text-slate-400 shrink-0">Q{idx + 1}.</span>
                    <span className="truncate">{q.text}</span>
                  </div>
                  <Badge variant={isAnswered ? "success" : "warning"} size="sm" className="shrink-0 text-[10px]">
                    {isAnswered ? "Answered" : "Empty"}
                  </Badge>
                </button>
              );
            })}
          </div>

          {answeredCount < quiz.questions.length && (
            <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/50 text-xs text-amber-200 flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                You have {quiz.questions.length - answeredCount} unanswered question(s). You can still submit, but unanswered questions will be marked incorrect.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Runner Footer Controls */}
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
              >
                Review Summary
              </Button>

              {currentIndex < quiz.questions.length - 1 ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setCurrentIndex((prev) => prev + 1)}
                  className="gap-1.5 bg-brand-600 hover:bg-brand-500"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              ) : (
                <Button
                  variant="accent"
                  size="sm"
                  onClick={() => setIsReviewMode(true)}
                  className="gap-1.5"
                >
                  <span>Proceed to Submit</span>
                  <ChevronRight className="w-3.5 h-3.5" />
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
              isLoading={isSubmitting}
              disabled={isSubmitting}
              onClick={handleSubmitQuiz}
              className="gap-2 bg-emerald-600 hover:bg-emerald-500"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Quiz for Evaluation</span>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
