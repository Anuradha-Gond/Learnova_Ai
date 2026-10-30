"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  GraduationCap,
  Eye,
  ListChecks,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { SkeletonCard } from "@/components/ui/Skeleton";
import MarkdownRenderer from "@/components/ui/MarkdownRenderer";
import { cn } from "@/lib/utils";

/**
 * Parses markdown summary into distinct sections:
 * - Overview
 * - Key Concepts & Definitions
 * - Core Takeaways & Exam Points
 */
function extractSummarySections(markdown) {
  if (!markdown) return { overview: "", concepts: "", takeaways: "", raw: "" };

  const sections = { overview: "", concepts: "", takeaways: "", raw: markdown };
  const lines = markdown.split("\n");
  let currentSection = "overview";
  const sectionLines = { overview: [], concepts: [], takeaways: [] };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.match(/^###?\s+(overview|introduction|summary)/i)) {
      currentSection = "overview";
      continue;
    } else if (trimmed.match(/^###?\s+(key concepts|definitions|terms)/i)) {
      currentSection = "concepts";
      continue;
    } else if (trimmed.match(/^###?\s+(core takeaways|exam points|takeaways|key points)/i)) {
      currentSection = "takeaways";
      continue;
    }

    if (sectionLines[currentSection]) {
      sectionLines[currentSection].push(line);
    }
  }

  sections.overview = sectionLines.overview.join("\n").trim();
  sections.concepts = sectionLines.concepts.join("\n").trim();
  sections.takeaways = sectionLines.takeaways.join("\n").trim();

  return sections;
}

export default function DocumentSummary({
  materialId,
  materialTitle,
  processingStatus,
  onTriggerProcess,
  initialSummary = null,
  initialGeneratedAt = null,
  initialStatus = "idle",
  onSummaryUpdated = null,
}) {
  const [summaryData, setSummaryData] = useState(() =>
    initialSummary
      ? {
          summary: initialSummary,
          summaryGeneratedAt: initialGeneratedAt,
          summaryStatus: initialStatus || "ready",
        }
      : null
  );
  const [isLoading, setIsLoading] = useState(!initialSummary);
  const [isGenerating, setIsGenerating] = useState(initialStatus === "generating");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // Depth View Preset: "standard" | "overview" | "exam"
  const [depthPreset, setDepthPreset] = useState("standard");

  // Synchronize when initialSummary changes from parent
  useEffect(() => {
    if (initialSummary) {
      setSummaryData((prev) => {
        if (!prev || prev.summary !== initialSummary) {
          return {
            summary: initialSummary,
            summaryGeneratedAt: initialGeneratedAt,
            summaryStatus: initialStatus || "ready",
          };
        }
        return prev;
      });
      setIsLoading(false);
    }
  }, [initialSummary, initialGeneratedAt, initialStatus]);

  // Load existing summary if available
  const loadSummary = useCallback(async (isBackground = false) => {
    if (!materialId || processingStatus !== "ready") {
      setIsLoading(false);
      return;
    }

    if (!isBackground) {
      setIsLoading(true);
    }
    setError("");

    try {
      const res = await fetch(`/api/materials/${materialId}/summary`);
      if (res.ok) {
        const data = await res.json();
        if (data.summary) {
          setSummaryData(data);
          if (onSummaryUpdated && data.summary !== initialSummary) {
            onSummaryUpdated(data.summary);
          }
        }
        if (data.summaryStatus === "generating") {
          setIsGenerating(true);
        }
      }
    } catch (err) {
      console.warn("Failed to load existing summary:", err.message);
    } finally {
      setIsLoading(false);
    }
  }, [materialId, processingStatus, initialSummary, onSummaryUpdated]);

  useEffect(() => {
    // If we already have initialSummary from parent props, only sync in background without loading flicker
    if (initialSummary) {
      loadSummary(true);
    } else {
      loadSummary(false);
    }
  }, [loadSummary, initialSummary]);

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
      if (onSummaryUpdated && data.summary) {
        onSummaryUpdated(data.summary);
      }
    } catch (err) {
      // If regeneration failed but we had a summary, preserve it and notify user
      if (force && summaryData?.summary) {
        setError(`Regeneration failed: ${err.message}. Your previously generated summary has been preserved.`);
      } else {
        setError(err.message || "An unexpected error occurred while generating the summary.");
      }
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

  // Parsed sections
  const sections = useMemo(() => {
    return extractSummarySections(summaryData?.summary);
  }, [summaryData?.summary]);

  // Compute displayed content based on selected depth preset
  const displayedContent = useMemo(() => {
    if (!summaryData?.summary) return "";
    if (depthPreset === "overview") {
      if (sections.overview) {
        return `### Quick Overview\n${sections.overview}`;
      }
      return summaryData.summary;
    }
    if (depthPreset === "exam") {
      const parts = [];
      if (sections.concepts) {
        parts.push(`### Key Concepts & Definitions\n${sections.concepts}`);
      }
      if (sections.takeaways) {
        parts.push(`### Core Takeaways & Exam Points\n${sections.takeaways}`);
      }
      return parts.length > 0 ? parts.join("\n\n---\n\n") : summaryData.summary;
    }
    // "standard": full summary
    return summaryData.summary;
  }, [summaryData?.summary, depthPreset, sections]);

  if (processingStatus !== "ready") {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-8 min-h-[500px] flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-950/60 border border-amber-800/40 text-amber-400 flex items-center justify-center shadow-sm">
          <AlertCircle className="w-7 h-7" />
        </div>
        <div className="space-y-1.5 max-w-md">
          <h3 className="text-base font-bold text-white">Document Processing Required</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            This document must be indexed into semantic vector chunks before Gemini can generate a grounded academic summary.
          </p>
        </div>
        {onTriggerProcess && (
          <Button
            size="sm"
            variant="primary"
            onClick={onTriggerProcess}
            className="gap-2 bg-brand-600 hover:bg-brand-500 shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Process Document Now</span>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6 min-h-[600px] space-y-5 shadow-xl">
      {/* ── Header Bar ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-400" />
              <span>AI Study Summary</span>
            </h3>
            <Badge variant="teal" size="sm">Grounded Academic Synthesis</Badge>
          </div>
          <p className="text-xs text-slate-400">
            Structured study takeaways synthesized directly from {materialTitle || "this document"}.
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
                title="Copy full summary"
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
                title="Regenerate summary with AI"
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
              className="gap-2 bg-brand-600 hover:bg-brand-500 shadow-sm"
            >
              <Sparkles className={cn("w-3.5 h-3.5", isGenerating && "animate-spin")} />
              <span>{isGenerating ? "Analyzing Document..." : "Create Study Summary"}</span>
            </Button>
          )}
        </div>
      </div>

      {/* ── Depth Presets Selection Bar ────────────────────────────── */}
      {summaryData?.summary && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Layers className="w-4 h-4 text-brand-400" />
            <span className="font-semibold text-slate-300">Study Depth Preset:</span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setDepthPreset("overview")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                depthPreset === "overview"
                  ? "bg-brand-600 text-white shadow-sm font-semibold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              )}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Quick Overview</span>
            </button>

            <button
              type="button"
              onClick={() => setDepthPreset("standard")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                depthPreset === "standard"
                  ? "bg-brand-600 text-white shadow-sm font-semibold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              )}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Standard Guide</span>
            </button>

            <button
              type="button"
              onClick={() => setDepthPreset("exam")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                depthPreset === "exam"
                  ? "bg-brand-600 text-white shadow-sm font-semibold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              )}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Exam Review</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Error Banner ───────────────────────────────────────────── */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-800/60 text-xs text-rose-200 flex items-start gap-2.5 animate-fade-in">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-rose-300">Summary Generation Error</p>
            <p className="leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* ── Content States ─────────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-4 py-8 animate-fade-in text-center">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center gap-3 max-w-md mx-auto">
            <RefreshCw className="w-4 h-4 text-brand-400 animate-spin" />
            <p className="text-xs text-slate-300 font-medium">
              Loading existing study summary from library...
            </p>
          </div>
          <SkeletonCard className="h-32" />
        </div>
      ) : isGenerating && !summaryData?.summary ? (
        <div className="space-y-4 py-4 animate-fade-in">
          <div className="p-4 rounded-xl bg-slate-950 border border-brand-800/40 flex items-center gap-3">
            <Sparkles className="w-4 h-4 text-brand-400 animate-spin" />
            <p className="text-xs text-brand-200 font-medium">
              Synthesizing document excerpts and generating structured study sections with Gemini...
            </p>
          </div>
          <SkeletonCard className="h-36" />
          <SkeletonCard className="h-36" />
        </div>
      ) : summaryData?.summary ? (
        <div className="space-y-4 animate-fade-in">
          {isGenerating && (
            <div className="p-3 rounded-xl bg-brand-950/70 border border-brand-800/50 flex items-center gap-2.5 text-xs text-brand-200 animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 text-brand-400 animate-spin" />
              <span>Generating updated academic summary... Your current summary remains available below.</span>
            </div>
          )}

          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-5 sm:p-6 shadow-inner select-text">
            <MarkdownRenderer content={displayedContent} />
          </div>

          <div className="flex items-center justify-between px-2 text-[11px] text-slate-500">
            <span>Grounded strictly in extracted document excerpts</span>
            <span>
              {summaryData.summaryGeneratedAt ? (
                `Generated ${new Date(summaryData.summaryGeneratedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
              ) : (
                "Synthesized with Gemini"
              )}
            </span>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-16 space-y-4 max-w-sm mx-auto animate-fade-in">
          <div className="w-12 h-12 rounded-2xl bg-brand-950/60 border border-brand-800/40 text-brand-400 flex items-center justify-center mx-auto shadow-sm">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white">No Summary Generated Yet</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Generate an academic overview, core definitions, and exam takeaways synthesized directly from this document.
            </p>
          </div>
          <Button
            size="sm"
            variant="primary"
            onClick={() => handleGenerate(false)}
            className="gap-2 bg-brand-600 hover:bg-brand-500 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate Summary Now</span>
          </Button>
        </div>
      )}
    </div>
  );
}
