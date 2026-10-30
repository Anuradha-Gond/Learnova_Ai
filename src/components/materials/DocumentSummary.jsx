"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
  BookOpen,
  FileText,
  Clock,
  Layers,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

export default function DocumentSummary({
  materialId,
  materialTitle,
  processingStatus,
  onTriggerProcess,
}) {
  const [summaryData, setSummaryData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // Load existing summary if available
  const loadSummary = useCallback(async () => {
    if (!materialId || processingStatus !== "ready") {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/materials/${materialId}/summary`);
      if (res.ok) {
        const data = await res.json();
        if (data.summary) {
          setSummaryData(data);
        }
      }
    } catch (err) {
      console.warn("Failed to load existing summary:", err.message);
    } finally {
      setIsLoading(false);
    }
  }, [materialId, processingStatus]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const handleGenerate = async (force = false) => {
    if (!materialId || processingStatus !== "ready") return;

    setIsGenerating(true);
    setError("");

    try {
      const res = await fetch(`/api/materials/${materialId}/summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceRegenerate: force }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate document summary.");
      }

      setSummaryData(data);
    } catch (err) {
      setError(err.message || "An unexpected error occurred while generating the summary.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!summaryData?.summary) return;
    navigator.clipboard.writeText(summaryData.summary);
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
            This document must be indexed into semantic vector chunks before Gemini can generate a grounded academic summary.
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
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-400" />
              <span>Document Summary</span>
            </h3>
            <Badge variant="teal" size="sm">Gemini Grounded</Badge>
          </div>
          <p className="text-xs text-slate-400">
            Structured academic takeaways synthesized strictly from this document&apos;s extracted content.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {summaryData?.summary && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopy}
                className="gap-1.5 text-xs bg-slate-950 border-slate-700 text-slate-300 hover:text-white"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </Button>

              <Button
                size="sm"
                variant="outline"
                disabled={isGenerating}
                onClick={() => handleGenerate(true)}
                className="gap-1.5 text-xs bg-slate-950 border-slate-700 text-slate-300 hover:text-white"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", isGenerating && "animate-spin")} />
                <span>Regenerate</span>
              </Button>
            </>
          )}

          {!summaryData?.summary && !isLoading && (
            <Button
              size="sm"
              variant="primary"
              disabled={isGenerating}
              onClick={() => handleGenerate(false)}
              className="gap-2 bg-brand-600 hover:bg-brand-500"
            >
              <Sparkles className={cn("w-3.5 h-3.5", isGenerating && "animate-spin")} />
              <span>{isGenerating ? "Analyzing Document..." : "Generate AI Summary"}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/60 text-xs text-rose-200 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-rose-300">Summary Generation Error</p>
            <p className="leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* Content states */}
      {isLoading || isGenerating ? (
        <div className="space-y-4 py-6">
          <div className="p-4 rounded-xl bg-slate-950 border border-brand-800/40 flex items-center gap-3">
            <RefreshCw className="w-4 h-4 text-brand-400 animate-spin" />
            <p className="text-xs text-brand-200 font-medium">
              Analyzing document sections with Gemini and generating structured takeaways...
            </p>
          </div>
          <SkeletonCard className="h-40" />
          <SkeletonCard className="h-40" />
        </div>
      ) : summaryData?.summary ? (
        <div className="prose prose-invert max-w-none text-xs sm:text-sm text-slate-200 leading-relaxed bg-slate-950/60 p-6 rounded-xl border border-slate-800 select-text">
          <div className="whitespace-pre-wrap font-sans space-y-3">
            {summaryData.summary}
          </div>
        </div>
      ) : (
        <div className="text-center py-16 space-y-4 max-w-sm mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-brand-950/60 border border-brand-800/40 text-brand-400 flex items-center justify-center mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white">No Summary Generated Yet</h4>
            <p className="text-xs text-slate-400">
              Generate an academic overview, core definitions, and revision takeaways synthesized directly from this document.
            </p>
          </div>
          <Button
            size="sm"
            variant="primary"
            onClick={() => handleGenerate(false)}
            className="gap-2 bg-brand-600 hover:bg-brand-500"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate Summary Now</span>
          </Button>
        </div>
      )}
    </div>
  );
}

