"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  HelpCircle,
  AlertCircle,
  CheckCircle2,
  Cpu,
  Flame,
  Check,
} from "lucide-react";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

const QUESTION_COUNTS = [5, 10, 15];
const DIFFICULTIES = [
  { value: "easy", label: "Beginner", desc: "Foundational definitions & direct recall" },
  { value: "medium", label: "Intermediate", desc: "Conceptual understanding & application" },
  { value: "hard", label: "Advanced", desc: "Complex synthesis & critical evaluation" },
];

const QUESTION_TYPES = [
  { id: "MCQ", label: "Multiple Choice", desc: "4 options with 1 correct answer" },
  { id: "TRUE_FALSE", label: "True / False", desc: "Binary factual statements" },
  { id: "SHORT_ANSWER", label: "Short Answer", desc: "AI-evaluated conceptual responses" },
];

export default function QuizGeneratorDialog({
  isOpen,
  onClose,
  materialId,
  materialTitle,
  processingStatus,
  onQuizCreated,
}) {
  const router = useRouter();
  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState("medium");
  const [selectedTypes, setSelectedTypes] = useState(["MCQ", "TRUE_FALSE"]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  const toggleType = (typeId) => {
    setError("");
    if (selectedTypes.includes(typeId)) {
      if (selectedTypes.length === 1) {
        setError("You must select at least one question type.");
        return;
      }
      setSelectedTypes(selectedTypes.filter((t) => t !== typeId));
    } else {
      setSelectedTypes([...selectedTypes, typeId]);
    }
  };

  const handleGenerate = async () => {
    if (processingStatus !== "ready") {
      setError("Document must be processed before generating a quiz.");
      return;
    }

    if (selectedTypes.length === 0) {
      setError("Please select at least one question type.");
      return;
    }

    setIsGenerating(true);
    setError("");

    try {
      const res = await fetch(`/api/materials/${materialId}/quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionCount,
          difficulty,
          questionTypes: selectedTypes,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate quiz.");
      }

      if (onQuizCreated) {
        onQuizCreated(data.quiz);
      }

      onClose();
      // Navigate to the quiz runner
      router.push(`/quizzes/${data.quiz.id}`);
    } catch (err) {
      setError(err.message || "An unexpected error occurred during quiz generation.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={() => !isGenerating && onClose()}
      title="Create Practice Quiz"
      description={`Generate a personalized practice quiz based on "${materialTitle}".`}
      maxWidth="max-w-lg"
    >
      <div className="space-y-5 text-xs text-slate-300">
        {/* Error Banner */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Question Count Selector */}
        <div className="space-y-2">
          <label className="font-semibold text-slate-200 uppercase tracking-wider text-[11px]">
            Question Count
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            {QUESTION_COUNTS.map((cnt) => (
              <button
                key={cnt}
                type="button"
                disabled={isGenerating}
                onClick={() => setQuestionCount(cnt)}
                className={cn(
                  "py-2.5 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer",
                  questionCount === cnt
                    ? "bg-brand-600 border-brand-500 text-white shadow-sm"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/60"
                )}
              >
                {cnt} Questions
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty Selector */}
        <div className="space-y-2">
          <label className="font-semibold text-slate-200 uppercase tracking-wider text-[11px]">
            Difficulty Level
          </label>
          <div className="grid grid-cols-1 gap-2">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.value}
                type="button"
                disabled={isGenerating}
                onClick={() => setDifficulty(d.value)}
                className={cn(
                  "p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer",
                  difficulty === d.value
                    ? "bg-slate-800/90 border-brand-500 text-white shadow-sm"
                    : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/40"
                )}
              >
                <div>
                  <span className="font-bold text-xs text-slate-100 block">{d.label}</span>
                  <span className="text-[11px] text-slate-400">{d.desc}</span>
                </div>
                {difficulty === d.value && (
                  <div className="w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Question Types Multi-Select */}
        <div className="space-y-2">
          <label className="font-semibold text-slate-200 uppercase tracking-wider text-[11px]">
            Question Formats (Select at least one)
          </label>
          <div className="space-y-2">
            {QUESTION_TYPES.map((t) => {
              const isSelected = selectedTypes.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  disabled={isGenerating}
                  onClick={() => toggleType(t.id)}
                  className={cn(
                    "w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer",
                    isSelected
                      ? "bg-slate-800/90 border-teal-500/70 text-white"
                      : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/40"
                  )}
                >
                  <div>
                    <span className="font-bold text-xs text-slate-100 block">{t.label}</span>
                    <span className="text-[11px] text-slate-400">{t.desc}</span>
                  </div>
                  <div
                    className={cn(
                      "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                      isSelected
                        ? "bg-teal-500 border-teal-400 text-white"
                        : "border-slate-700 bg-slate-950"
                    )}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Grounding Info */}
        <div className="p-3 rounded-xl bg-brand-950/50 border border-brand-800/40 text-[11px] text-brand-300 flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
          <span>
            Quiz questions, options, and explanations are generated strictly from the semantic text chunks of this document. Answer keys remain encrypted on the server until submission.
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <Button
            variant="outline"
            size="sm"
            disabled={isGenerating}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            isLoading={isGenerating}
            disabled={isGenerating}
            onClick={handleGenerate}
            className="gap-2 bg-brand-600 hover:bg-brand-500"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isGenerating ? "Creating Practice Quiz..." : "Create Practice Quiz"}</span>
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
