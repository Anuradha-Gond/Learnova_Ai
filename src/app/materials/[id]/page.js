"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  FileCode,
  Download,
  Trash2,
  Brain,
  HelpCircle,
  Sparkles,
  Layers,
  Clock,
  HardDrive,
  AlertCircle,
  ExternalLink,
  CheckCircle2,
  Info,
  Calendar,
  Lock,
  RefreshCw,
  Play,
  Check,
  Cpu,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Dialog from "@/components/ui/Dialog";
import ErrorState from "@/components/ui/ErrorState";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { formatFileSize } from "@/services/documentService";
import ChatAssistant from "@/components/materials/ChatAssistant";
import QuizGeneratorDialog from "@/components/materials/QuizGeneratorDialog";
import DocumentSummary from "@/components/materials/DocumentSummary";
import ConceptSimplifier from "@/components/materials/ConceptSimplifier";
import { cn } from "@/lib/utils";

export default function DocumentWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const materialId = params.id;

  const [documentData, setDocumentData] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [textContent, setTextContent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active workspace tab: "preview" | "summary" | "simplify" | "chat" | "quizzes"
  const [activeTab, setActiveTab] = useState("preview");

  // Quiz generator modal & quizzes for this document
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [materialQuizzes, setMaterialQuizzes] = useState([]);
  const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(false);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processError, setProcessError] = useState("");
  const [processSuccess, setProcessSuccess] = useState("");

  // Delete modal
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const fetchDocument = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/materials/${materialId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Study material not found or access denied.");
      }

      setDocumentData(data.material);
      setPreviewUrl(data.previewUrl);
      setTextContent(data.textContent);
    } catch (err) {
      setError(err.message || "Failed to load study document.");
    } finally {
      setIsLoading(false);
    }
  }, [materialId]);

  const fetchMaterialQuizzes = useCallback(async () => {
    if (!materialId) return;
    setIsLoadingQuizzes(true);
    try {
      const res = await fetch(`/api/materials/${materialId}/quiz`);
      if (res.ok) {
        const data = await res.json();
        setMaterialQuizzes(data.quizzes || []);
      }
    } catch (err) {
      console.warn("Failed to load material quizzes:", err.message);
    } finally {
      setIsLoadingQuizzes(false);
    }
  }, [materialId]);

  useEffect(() => {
    if (materialId) {
      fetchDocument();
      fetchMaterialQuizzes();
    }
  }, [materialId, fetchDocument, fetchMaterialQuizzes]);

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    setDeleteError("");

    try {
      const res = await fetch(`/api/materials/${materialId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        setDeleteError(data.error || "Failed to delete document.");
        setIsDeleting(false);
        return;
      }

      // Route back to materials list
      router.push("/materials");
    } catch (err) {
      setDeleteError("Network error occurred during deletion.");
      setIsDeleting(false);
    }
  };

  const handleProcessDocument = async () => {
    setIsProcessing(true);
    setProcessError("");
    setProcessSuccess("");

    try {
      const res = await fetch(`/api/materials/${materialId}/process`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        setProcessError(data.error || "Failed to process document.");
        setIsProcessing(false);
        fetchDocument();
        return;
      }

      setProcessSuccess(
        `Successfully processed into ${data.chunkCount} chunks with 768-dim embeddings!`
      );
      setIsProcessing(false);
      fetchDocument();
    } catch (err) {
      setProcessError("Network error occurred during document processing.");
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-slate-900/60 rounded-xl w-1/4 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 h-[600px] bg-slate-900/60 rounded-2xl animate-pulse" />
          <div className="space-y-6">
            <SkeletonCard className="bg-slate-900/60 border-slate-800" />
            <SkeletonCard className="bg-slate-900/60 border-slate-800" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !documentData) {
    return (
      <div className="max-w-2xl mx-auto py-12 space-y-6">
        <Link
          href="/materials"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Study Materials</span>
        </Link>

        <ErrorState
          title="Document Unavailable"
          message={error || "The requested study document could not be located or you do not have permission to view it."}
          onRetry={fetchDocument}
          className="bg-rose-950/40 border-rose-800/60 text-rose-200"
        />
      </div>
    );
  }

  const isPdf = documentData.fileType === "pdf";

  return (
    <div className="space-y-6">
      {/* ── Top Navigation & Title Bar ────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="space-y-1">
          <Link
            href="/materials"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to All Study Materials</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold font-display text-white tracking-tight truncate max-w-xl">
              {documentData.title}
            </h1>
            <Badge variant="primary" size="sm">
              {isPdf ? "PDF Document" : "Plain Text Document"}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Secure Copy</span>
            </a>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsDeleteOpen(true)}
            className="gap-1.5 bg-slate-900 border-rose-900/60 text-rose-400 hover:bg-rose-950/40 hover:text-rose-300"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </Button>
        </div>
      </div>

      {/* ── Two-Column Workspace Layout ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left / Main Workspace Panel (B2 Preview & Milestone 6 Grounded Chat) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("preview")}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                  activeTab === "preview"
                    ? "bg-slate-800 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                )}
              >
                <FileText className="w-3.5 h-3.5 text-brand-400" />
                <span>Document Preview</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("summary")}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                  activeTab === "summary"
                    ? "bg-brand-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                )}
              >
                <Sparkles className="w-3.5 h-3.5 text-brand-300" />
                <span>AI Summary</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("simplify")}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                  activeTab === "simplify"
                    ? "bg-teal-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                )}
              >
                <Brain className="w-3.5 h-3.5 text-teal-300" />
                <span>Simplify Concept</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("chat")}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                  activeTab === "chat"
                    ? "bg-brand-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                )}
              >
                <Sparkles className="w-3.5 h-3.5 text-teal-300" />
                <span>AI Assistant</span>
                {documentData.processingStatus === "ready" && (
                  <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("quizzes");
                  fetchMaterialQuizzes();
                }}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                  activeTab === "quizzes"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                )}
              >
                <HelpCircle className="w-3.5 h-3.5 text-indigo-300" />
                <span>Quizzes</span>
                {materialQuizzes.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-slate-900 text-[10px] text-indigo-200 font-mono font-bold">
                    {materialQuizzes.length}
                  </span>
                )}
              </button>
            </div>

            {activeTab === "preview" && (
              <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400">
                <Lock className="w-3 h-3 text-emerald-400" />
                <span>Private Presigned Stream (15-min TTL)</span>
              </div>
            )}
          </div>

          {activeTab === "summary" ? (
            <DocumentSummary
              materialId={materialId}
              materialTitle={documentData.title}
              processingStatus={documentData.processingStatus}
              onTriggerProcess={handleProcessDocument}
            />
          ) : activeTab === "simplify" ? (
            <ConceptSimplifier
              materialId={materialId}
              materialTitle={documentData.title}
              processingStatus={documentData.processingStatus}
              onTriggerProcess={handleProcessDocument}
            />
          ) : activeTab === "chat" ? (
            <ChatAssistant
              materialId={materialId}
              materialTitle={documentData.title}
              processingStatus={documentData.processingStatus}
              chunkCount={documentData.chunkCount}
              onTriggerProcess={handleProcessDocument}
            />
          ) : activeTab === "quizzes" ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 min-h-[600px] space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-indigo-400" />
                    <span>Active Recall Quizzes ({materialQuizzes.length})</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Practice assessments generated from this document&apos;s semantic chunks.
                  </p>
                </div>

                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setIsQuizModalOpen(true)}
                  disabled={documentData.processingStatus !== "ready"}
                  className="gap-1.5 bg-brand-600 hover:bg-brand-500"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate New Quiz</span>
                </Button>
              </div>

              {isLoadingQuizzes ? (
                <div className="space-y-3">
                  <SkeletonCard className="h-28" />
                  <SkeletonCard className="h-28" />
                </div>
              ) : materialQuizzes.length === 0 ? (
                <div className="text-center py-16 space-y-4 max-w-sm mx-auto">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-950/60 border border-indigo-800/40 text-indigo-400 flex items-center justify-center mx-auto">
                    <HelpCircle className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white">No Quizzes Created Yet</h4>
                    <p className="text-xs text-slate-400">
                      Generate your first active-recall quiz to test your comprehension and update topic mastery scores.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => setIsQuizModalOpen(true)}
                    disabled={documentData.processingStatus !== "ready"}
                    className="gap-2 bg-brand-600 hover:bg-brand-500"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate Quiz with AI</span>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {materialQuizzes.map((q) => (
                    <div
                      key={q.id}
                      className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-4 group hover:border-slate-700 transition-all"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-white group-hover:text-brand-300 transition-colors">
                            {q.title}
                          </h4>
                          <Badge
                            variant={
                              q.difficulty === "easy"
                                ? "teal"
                                : q.difficulty === "hard"
                                ? "danger"
                                : "primary"
                            }
                            size="sm"
                            className="capitalize"
                          >
                            {q.difficulty}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400">
                          <span>{q.questionCount} Questions</span>
                          <span>•</span>
                          <span>{q.attemptCount} attempt(s)</span>
                          {q.latestScore !== null && (
                            <>
                              <span>•</span>
                              <span
                                className={cn(
                                  "font-bold font-mono",
                                  q.latestScore >= 65 ? "text-emerald-400" : "text-amber-400"
                                )}
                              >
                                Latest Score: {q.latestScore}%
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <Link href={`/quizzes/${q.id}`}>
                        <Button size="sm" variant="primary" className="gap-1.5 text-xs bg-brand-600 hover:bg-brand-500 shrink-0">
                          <span>{q.attemptCount > 0 ? "Retake" : "Start"}</span>
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 overflow-hidden min-h-[600px] flex flex-col justify-center">
            {isPdf ? (
              previewUrl ? (
                <iframe
                  src={previewUrl}
                  title={`Preview of ${documentData.title}`}
                  className="w-full h-[650px] rounded-xl border border-slate-800 bg-slate-950"
                />
              ) : (
                <div className="text-center py-20 space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-white">PDF Preview Unavailable</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Storage bucket credentials are required to issue the presigned viewing stream. The document is safely recorded in MongoDB.
                  </p>
                </div>
              )
            ) : (
              // TXT preview: safely escaped text
              textContent !== null ? (
                <pre className="font-mono text-xs whitespace-pre-wrap overflow-y-auto max-h-[650px] p-5 bg-slate-950 rounded-xl border border-slate-800 text-slate-200 leading-relaxed select-text">
                  {textContent || "Document text is empty."}
                </pre>
              ) : previewUrl ? (
                <div className="text-center py-20 space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-teal-950 text-teal-400 flex items-center justify-center mx-auto">
                    <FileCode className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Plain Text Document Ready</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    View or download the plain text content directly via the presigned URL.
                  </p>
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-teal-400 hover:underline"
                  >
                    <span>Open Raw Text</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ) : (
                <div className="text-center py-20 space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                    <FileCode className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Text Preview Pending Storage Config</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    R2 storage credentials are required to load raw content.
                  </p>
                </div>
              )
            )}
          </div>
          )}
        </div>

        {/* Right / Metadata & Future AI Actions Panel (B1 & B3) */}
        <div className="space-y-6">
          {/* AI Ingestion Pipeline Card (Milestone 5) */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Brain className="w-4 h-4 text-brand-400" />
                <span>AI Ingestion Pipeline</span>
              </h2>
              <Badge
                variant={
                  documentData.processingStatus === "ready"
                    ? "success"
                    : documentData.processingStatus === "failed"
                    ? "danger"
                    : documentData.processingStatus === "processing" || isProcessing
                    ? "warning"
                    : "neutral"
                }
                size="sm"
              >
                {isProcessing
                  ? "Processing..."
                  : documentData.processingStatus === "ready"
                  ? "AI Ready"
                  : documentData.processingStatus === "processing"
                  ? "Processing..."
                  : documentData.processingStatus === "failed"
                  ? "Failed"
                  : "Pending"}
              </Badge>
            </div>

            {/* Error banner */}
            {(processError || (documentData.processingStatus === "failed" && documentData.processingError)) && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/60 text-xs text-rose-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-rose-300">Processing Error</p>
                  <p className="text-rose-200 leading-relaxed">
                    {processError || documentData.processingError}
                  </p>
                </div>
              </div>
            )}

            {/* Success banner */}
            {processSuccess && (
              <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-xs text-emerald-200 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{processSuccess}</p>
              </div>
            )}

            {/* Active processing state */}
            {(isProcessing || documentData.processingStatus === "processing") ? (
              <div className="p-4 rounded-xl bg-slate-950 border border-brand-800/50 space-y-3">
                <div className="flex items-center gap-2.5 text-xs text-brand-300 font-medium">
                  <RefreshCw className="w-4 h-4 animate-spin text-brand-400" />
                  <span>Generating semantic chunks & vector embeddings...</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-brand-500 to-teal-400 h-full w-2/3 animate-pulse rounded-full" />
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Extracting text, computing semantic boundaries, and indexing 768-dimensional Gemini embeddings in MongoDB.
                </p>
              </div>
            ) : documentData.processingStatus === "ready" ? (
              <div className="space-y-3.5">
                <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-xs space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Indexed & Ready for Study Aids</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                    <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                      <span className="text-slate-400 block">Chunks</span>
                      <span className="text-white font-mono font-bold text-sm">
                        {documentData.chunkCount || 0}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                      <span className="text-slate-400 block">Pages</span>
                      <span className="text-white font-mono font-bold text-sm">
                        {documentData.pageCount || 1}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                      <span className="text-slate-400 block">Word Count</span>
                      <span className="text-white font-mono font-bold text-sm">
                        {documentData.wordCount ? documentData.wordCount.toLocaleString() : "N/A"}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                      <span className="text-slate-400 block">Vector Model</span>
                      <span className="text-brand-300 font-mono font-semibold text-[10px]">
                        768-dim (text-emb-004)
                      </span>
                    </div>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleProcessDocument}
                  disabled={isProcessing}
                  className="w-full gap-2 text-xs border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reprocess Document</span>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-400 leading-relaxed">
                  Extract text, segment semantic passages (800–1,200 chars), and create 768-dim Gemini vector embeddings for AI study aids.
                </p>

                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleProcessDocument}
                  isLoading={isProcessing}
                  disabled={isProcessing}
                  className="w-full gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {documentData.processingStatus === "failed"
                      ? "Retry Processing"
                      : "Process Document with AI"}
                  </span>
                </Button>
              </div>
            )}
          </div>

          {/* Metadata Card (B1) */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5 space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Document Metadata
            </h2>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Original Filename</span>
                <span className="text-slate-200 font-mono text-[11px] truncate max-w-[180px]" title={documentData.originalFilename}>
                  {documentData.originalFilename}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">File Type</span>
                <span className="text-slate-200 font-semibold uppercase">{documentData.fileType}</span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">File Size</span>
                <span className="text-slate-200 font-mono">{formatFileSize(documentData.fileSizeBytes)}</span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Uploaded On</span>
                <span className="text-slate-200">
                  {new Date(documentData.createdAt).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Processing Status</span>
                <Badge
                  variant={
                    documentData.processingStatus === "ready"
                      ? "success"
                      : documentData.processingStatus === "failed"
                      ? "danger"
                      : documentData.processingStatus === "processing"
                      ? "warning"
                      : "primary"
                  }
                  size="sm"
                >
                  {documentData.processingStatus === "pending"
                    ? "Awaiting Processing"
                    : documentData.processingStatus === "ready"
                    ? "Ready"
                    : documentData.processingStatus === "failed"
                    ? "Failed"
                    : "Processing"}
                </Badge>
              </div>

              {documentData.chunkCount > 0 && (
                <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">Semantic Chunks</span>
                  <span className="text-emerald-400 font-mono font-semibold">{documentData.chunkCount}</span>
                </div>
              )}

              {documentData.pageCount > 0 && (
                <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">Pages</span>
                  <span className="text-slate-200 font-mono">{documentData.pageCount}</span>
                </div>
              )}

              {documentData.wordCount > 0 && (
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-slate-400">Word Count</span>
                  <span className="text-slate-200 font-mono">{documentData.wordCount.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* AI Study Aids Panel */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                AI Study Aids
              </h2>
              <span className="text-[10px] text-teal-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                Active
              </span>
            </div>

            <p className="text-xs text-slate-400">
              Transform this document into active study tools grounded in its extracted content:
            </p>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("summary");
                  window.scrollTo({ top: 120, behavior: "smooth" });
                }}
                className={cn(
                  "w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left group cursor-pointer",
                  activeTab === "summary"
                    ? "bg-brand-950/60 border-brand-500/60"
                    : "bg-slate-950/80 border-slate-800 hover:border-brand-500/50 hover:bg-slate-900"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-brand-950 text-brand-400 flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white group-hover:text-brand-300">Summarize Document</p>
                    <p className="text-[10px] text-slate-500">Key concept takeaways & overview</p>
                  </div>
                </div>
                <Badge variant="teal" size="sm">Live</Badge>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("simplify");
                  window.scrollTo({ top: 120, behavior: "smooth" });
                }}
                className={cn(
                  "w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left group cursor-pointer",
                  activeTab === "simplify"
                    ? "bg-teal-950/60 border-teal-500/60"
                    : "bg-slate-950/80 border-slate-800 hover:border-teal-500/50 hover:bg-slate-900"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-teal-950 text-teal-400 flex items-center justify-center">
                    <Brain className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white group-hover:text-teal-300">Simplify Concept</p>
                    <p className="text-[10px] text-slate-500">Student-friendly analogies & terms</p>
                  </div>
                </div>
                <Badge variant="teal" size="sm">Live</Badge>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("chat");
                  window.scrollTo({ top: 120, behavior: "smooth" });
                }}
                className={cn(
                  "w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left group cursor-pointer",
                  activeTab === "chat"
                    ? "bg-brand-950/60 border-brand-500/60"
                    : "bg-slate-950/80 border-slate-800 hover:border-brand-500/50 hover:bg-slate-900"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-brand-950 text-brand-400 flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white group-hover:text-brand-300">Ask AI Assistant</p>
                    <p className="text-[10px] text-slate-500">Document-grounded Q&A with citations</p>
                  </div>
                </div>
                <Badge variant="teal" size="sm">Live</Badge>
              </button>

              <button
                type="button"
                onClick={() => setIsQuizModalOpen(true)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900 transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-indigo-950 text-indigo-400 flex items-center justify-center">
                    <HelpCircle className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white group-hover:text-indigo-300">Generate Quiz</p>
                    <p className="text-[10px] text-slate-500">Active recall practice</p>
                  </div>
                </div>
                <Badge variant="teal" size="sm">Live</Badge>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Delete Confirmation Dialog Modal ─────────────────────── */}
      <Dialog
        isOpen={isDeleteOpen}
        onClose={() => {
          if (!isDeleting) {
            setIsDeleteOpen(false);
          }
        }}
        title="Delete Study Material"
        description="Permanently remove this document from your account and private cloud storage."
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          {deleteError && (
            <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{deleteError}</span>
            </div>
          )}

          <div className="p-3.5 rounded-xl bg-surface-50 border border-surface-200 space-y-1 text-xs">
            <p className="font-bold text-surface-900">{documentData.title}</p>
            <p className="text-surface-500">{documentData.originalFilename}</p>
          </div>

          <p className="text-xs text-danger-600 font-medium">
            Warning: This action is permanent and cannot be undone.
          </p>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-200">
            <Button
              variant="outline"
              size="sm"
              disabled={isDeleting}
              onClick={() => setIsDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              isLoading={isDeleting}
              disabled={isDeleting}
              onClick={handleDeleteConfirm}
              className="gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isDeleting ? "Deleting..." : "Permanently Delete"}</span>
            </Button>
          </div>
        </div>
      </Dialog>

      {/* ── Quiz Generator Modal Dialog ─────────────────────────── */}
      <QuizGeneratorDialog
        isOpen={isQuizModalOpen}
        onClose={() => setIsQuizModalOpen(false)}
        materialId={materialId}
        materialTitle={documentData?.title}
        processingStatus={documentData?.processingStatus}
        onQuizCreated={() => {
          fetchMaterialQuizzes();
          setActiveTab("quizzes");
        }}
      />
    </div>
  );
}
