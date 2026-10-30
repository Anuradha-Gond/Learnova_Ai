"use client";

import React, { useState } from "react";
import {
  Brain,
  Sparkles,
  Search,
  BookOpen,
  Copy,
  Check,
  AlertCircle,
  Lightbulb,
  Layers,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

export default function ConceptSimplifier({
  materialId,
  materialTitle,
  processingStatus,
  onTriggerProcess,
}) {
  const [concept, setConcept] = useState("");
  const [depth, setDepth] = useState("beginner"); // "beginner" | "intermediate"
  const [isSimplifying, setIsSimplifying] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showSources, setShowSources] = useState(false);

  const handleSimplify = async (e) => {
    e?.preventDefault();
    const query = concept.trim();
    if (!query || isSimplifying || processingStatus !== "ready") return;

    setIsSimplifying(true);
    setError("");

    try {
      const res = await fetch(`/api/materials/${materialId}/simplify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concept: query, depth }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to simplify concept.");
      }

      setResult(data);
    } catch (err) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSimplifying(false);
    }
  };

  const handleCopy = () => {
    if (!result?.explanation) return;
    navigator.clipboard.writeText(result.explanation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (processingStatus !== "ready") {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-8 min-h-[500px] flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-950/60 border border-amber-800/40 text-amber-400 flex items-center justify-center">
          <AlertCircle className="w-7 h-7" />
        </div>
        <div className="space-y-1.5 max-w-md">
          <h3 className="text-sm font-bold text-white">Document Processing Required</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Please process this document first so Learnova AI can retrieve relevant excerpts and ground its concept explanations.
          </p>
        </div>
        {onTriggerProcess && (
          <Button
            size="sm"
            variant="primary"
            onClick={onTriggerProcess}
            className="gap-2 bg-brand-600 hover:bg-brand-500"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Process Document Now</span>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 min-h-[600px] space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4 space-y-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Brain className="w-4 h-4 text-teal-400" />
            <span>Concept Simplifier</span>
          </h3>
          <Badge variant="teal" size="sm">Document-Grounded</Badge>
        </div>
        <p className="text-xs text-slate-400">
          Break down dense or confusing concepts from this document into student-friendly explanations with intuitive analogies.
        </p>
      </div>

      {/* Query Form */}
      <form onSubmit={handleSimplify} className="space-y-3.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="Enter a concept (e.g. Entity-Relationship, Paging, Normalization, Semaphore)..."
              disabled={isSimplifying}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={depth}
              onChange={(e) => setDepth(e.target.value)}
              disabled={isSimplifying}
              className="px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-teal-500 transition-colors"
            >
              <option value="beginner">Beginner (ELI5)</option>
              <option value="intermediate">Undergraduate Depth</option>
            </select>

            <Button
              type="submit"
              size="sm"
              variant="primary"
              disabled={!concept.trim() || isSimplifying}
              className="gap-2 bg-teal-600 hover:bg-teal-500 text-white shrink-0"
            >
              <Sparkles className={cn("w-3.5 h-3.5", isSimplifying && "animate-spin")} />
              <span>{isSimplifying ? "Simplifying..." : "Simplify"}</span>
            </Button>
          </div>
        </div>
      </form>

      {/* Error state */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/60 text-xs text-rose-200 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-rose-300">Simplification Error</p>
            <p className="leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isSimplifying && (
        <div className="space-y-4 py-6">
          <div className="p-4 rounded-xl bg-slate-950 border border-teal-800/40 flex items-center gap-3">
            <RefreshCw className="w-4 h-4 text-teal-400 animate-spin" />
            <p className="text-xs text-teal-200 font-medium">
              Retrieving document excerpts and generating an intuitive analogy...
            </p>
          </div>
          <SkeletonCard className="h-32" />
          <SkeletonCard className="h-32" />
        </div>
      )}

      {/* Result display */}
      {!isSimplifying && result && (
        <div className="space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Concept:</span>
              <span className="text-sm font-bold text-white capitalize">{result.concept}</span>
              <Badge variant="teal" size="sm" className="capitalize">{result.depth}</Badge>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={handleCopy}
              className="gap-1.5 text-xs bg-slate-950 border-slate-700 text-slate-300 hover:text-white"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied" : "Copy Explanation"}</span>
            </Button>
          </div>

          <div className="prose prose-invert max-w-none text-xs sm:text-sm text-slate-200 leading-relaxed bg-slate-950/60 p-6 rounded-xl border border-slate-800 select-text">
            <div className="whitespace-pre-wrap font-sans space-y-3">
              {result.explanation}
            </div>
          </div>

          {/* Sources / Citations */}
          {result.sources?.length > 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowSources(!showSources)}
                className="w-full flex items-center justify-between p-3.5 text-left text-xs font-semibold text-slate-300 hover:bg-slate-900/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-teal-400" />
                  <span>Referenced Document Excerpts ({result.sources.length})</span>
                </div>
                {showSources ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showSources && (
                <div className="p-4 pt-0 space-y-2.5 border-t border-slate-800/60">
                  {result.sources.map((src, i) => (
                    <div key={i} className="p-3 rounded-lg bg-slate-900/80 border border-slate-800/80 text-[11px] space-y-1">
                      <div className="flex items-center justify-between text-slate-400 font-mono text-[10px]">
                        <span>Page {src.page || 1}</span>
                        {src.score && <span>Relevance: {Math.round(src.score * 100)}%</span>}
                      </div>
                      <p className="text-slate-300 italic">&ldquo;{src.excerpt}&rdquo;</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Empty prompt state */}
      {!isSimplifying && !result && (
        <div className="text-center py-16 space-y-4 max-w-sm mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-teal-950/60 border border-teal-800/40 text-teal-400 flex items-center justify-center mx-auto">
            <Lightbulb className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white">Ask for Any Concept</h4>
            <p className="text-xs text-slate-400">
              Type any topic or technical term from this document above to receive a student-friendly explanation with intuitive real-world analogies.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

