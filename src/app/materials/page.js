"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  BookOpen,
  Upload,
  FileText,
  Search,
  Filter,
  ArrowUpDown,
  Trash2,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  X,
  FileCode,
  FolderOpen,
  Clock,
  Sparkles,
  RefreshCw,
  HardDrive,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import Dialog from "@/components/ui/Dialog";
import ErrorState from "@/components/ui/ErrorState";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { formatFileSize, validateUploadFile } from "@/services/documentService";

export default function MaterialsPage() {
  const [materials, setMaterials] = useState([]);
  const [storage, setStorage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search, filter, and sort state
  const [searchQuery, setSearchQuery] = useState("");
  const [fileTypeFilter, setFileTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");

  // Upload modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [customTitle, setCustomTitle] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Feedback notifications
  const [successMessage, setSuccessMessage] = useState("");

  // Fetch materials on mount
  const fetchMaterials = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/materials");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load study materials.");
      }
      setMaterials(data.materials || []);
      if (data.storage) {
        setStorage(data.storage);
      }
    } catch (err) {
      setError(err.message || "An error occurred while loading documents.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  // Handle file selection & client validation
  const handleFileChange = (file) => {
    setUploadError("");
    if (!file) return;

    const validation = validateUploadFile({
      name: file.name,
      size: file.size,
    });

    if (!validation.valid) {
      setUploadError(validation.error);
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    // Autofill clean title
    const clean = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
    setCustomTitle(clean);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  // Submit file upload
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile || isUploading) return;

    setIsUploading(true);
    setUploadError("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      if (customTitle.trim()) {
        formData.append("title", customTitle.trim());
      }

      const res = await fetch("/api/materials", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setUploadError(data.error || "Upload failed. Please try again.");
        setIsUploading(false);
        return;
      }

      // Success
      setSuccessMessage(`"${data.material.title}" uploaded successfully!`);
      setIsUploadOpen(false);
      setSelectedFile(null);
      setCustomTitle("");
      setIsUploading(false);

      // Refresh document list
      fetchMaterials();

      // Clear banner after 5 seconds
      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (err) {
      setUploadError("Network error occurred during upload. Please try again.");
      setIsUploading(false);
    }
  };

  // Submit file deletion
  const handleDeleteConfirm = async () => {
    if (!deleteTarget || isDeleting) return;

    setIsDeleting(true);
    setDeleteError("");

    try {
      const res = await fetch(`/api/materials/${deleteTarget.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        setDeleteError(data.error || "Failed to delete document.");
        setIsDeleting(false);
        return;
      }

      // Remove from local state
      setMaterials((prev) => prev.filter((m) => m.id !== deleteTarget.id));
      setSuccessMessage(`Document "${deleteTarget.title}" deleted.`);
      setDeleteTarget(null);
      setIsDeleting(false);

      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (err) {
      setDeleteError("Network error occurred while deleting document.");
      setIsDeleting(false);
    }
  };

  // Filter and sort materials client-side
  const filteredMaterials = materials
    .filter((m) => {
      if (fileTypeFilter !== "all" && m.fileType !== fileTypeFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = m.title?.toLowerCase().includes(query);
        const matchesFilename = m.originalFilename?.toLowerCase().includes(query);
        return matchesTitle || matchesFilename;
      }
      return true;
    })
    .sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (sortBy === "createdAt") {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      } else if (sortBy === "title") {
        valA = (valA || "").toLowerCase();
        valB = (valB || "").toLowerCase();
      }

      if (sortOrder === "asc") {
        return valA > valB ? 1 : -1;
      }
      return valA < valB ? 1 : -1;
    });

  const getStatusBadge = (material) => {
    const status = material.processingStatus;
    switch (status) {
      case "ready":
        return (
          <Badge variant="success" size="sm">
            {material.chunkCount ? `${material.chunkCount} Chunks` : "Ready"}
          </Badge>
        );
      case "processing":
        return <Badge variant="teal" size="sm">Processing</Badge>;
      case "failed":
        return <Badge variant="danger" size="sm">Failed</Badge>;
      case "pending":
      default:
        return <Badge variant="primary" size="sm">Stored</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      {/* ── Page Header ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-display text-white tracking-tight">
              Study Materials
            </h1>
            <Badge variant="neutral" size="sm">{materials.length} Documents</Badge>
          </div>
          <p className="text-xs text-slate-400">
            Upload, organize, and view your study documents in private, encrypted cloud storage.
          </p>
        </div>

        <Button
          onClick={() => {
            setSelectedFile(null);
            setCustomTitle("");
            setUploadError("");
            setIsUploadOpen(true);
          }}
          className="gap-2 bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-500/20"
        >
          <Upload className="w-4 h-4" />
          <span>Upload Material</span>
        </Button>
      </div>

      {/* ── Storage Quota Card ────────────────────────────────────── */}
      {storage && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-brand-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Cloudflare R2 Storage Quota
              </span>
              {storage.isFull && (
                <Badge variant="danger" size="sm">
                  Quota Full
                </Badge>
              )}
            </div>
            <div className="text-xs text-slate-400">
              <span className="font-semibold text-slate-200">
                {formatFileSize(storage.usedBytes)}
              </span>{" "}
              used of{" "}
              <span className="font-semibold text-slate-200">8.5 GB</span> (
              {storage.usagePercentage}%) •{" "}
              <span className="text-slate-300">
                {formatFileSize(storage.remainingBytes)} remaining
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
            <div
              className={`h-full transition-all duration-300 ${
                storage.isFull
                  ? "bg-rose-500"
                  : storage.usagePercentage > 85
                  ? "bg-amber-500"
                  : "bg-gradient-to-r from-brand-500 to-teal-400"
              }`}
              style={{
                width: `${Math.min(
                  100,
                  Math.max(
                    storage.usagePercentage,
                    storage.usedBytes > 0 ? 0.5 : 0
                  )
                )}%`,
              }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Maximum file size: 20 MB (PDF or TXT)</span>
            {storage.isFull ? (
              <span className="text-rose-400 font-semibold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Quota full. Please delete older documents.
              </span>
            ) : (
              <span className="text-emerald-400 font-medium">Quota Available</span>
            )}
          </div>
        </div>
      )}

      {/* Success Notification Banner */}
      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-200 text-xs flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage("")}
            className="text-emerald-400 hover:text-emerald-200"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Search, Filter & Sort Controls ────────────────────────── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
        {/* Search Input */}
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search by title or filename..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter & Sort Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* File Type Filter Tabs */}
          <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-xl text-xs">
            <button
              onClick={() => setFileTypeFilter("all")}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                fileTypeFilter === "all"
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFileTypeFilter("pdf")}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                fileTypeFilter === "pdf"
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              PDF
            </button>
            <button
              onClick={() => setFileTypeFilter("txt")}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                fileTypeFilter === "txt"
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              TXT
            </button>
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-xs text-slate-300">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split("-");
                setSortBy(sb);
                setSortOrder(so);
              }}
              className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="createdAt-desc" className="bg-slate-900 text-white">Newest First</option>
              <option value="createdAt-asc" className="bg-slate-900 text-white">Oldest First</option>
              <option value="title-asc" className="bg-slate-900 text-white">Title (A-Z)</option>
              <option value="fileSizeBytes-desc" className="bg-slate-900 text-white">Largest Size</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Materials Grid / List ─────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <SkeletonCard className="bg-slate-900/60 border-slate-800" />
          <SkeletonCard className="bg-slate-900/60 border-slate-800" />
          <SkeletonCard className="bg-slate-900/60 border-slate-800" />
        </div>
      ) : error ? (
        <ErrorState
          title="Could not load study materials"
          message={error}
          onRetry={fetchMaterials}
          className="bg-rose-950/40 border-rose-800/60 text-rose-200"
        />
      ) : materials.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No study materials uploaded yet"
          description="Upload your lecture notes, textbook chapters, or syllabi (PDF or TXT up to 20 MB) to start organizing your learning repository."
          action={
            <Button
              onClick={() => {
                setSelectedFile(null);
                setCustomTitle("");
                setUploadError("");
                setIsUploadOpen(true);
              }}
              className="gap-2 bg-brand-600 hover:bg-brand-500 text-white mt-2"
            >
              <Upload className="w-4 h-4" />
              <span>Upload First Document</span>
            </Button>
          }
          className="bg-slate-900/30 border-slate-800 py-16"
        />
      ) : filteredMaterials.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matching materials found"
          description={`No documents match your search "${searchQuery}" or the selected filters.`}
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setFileTypeFilter("all");
              }}
              className="bg-slate-900 border-slate-700 text-slate-300 mt-2"
            >
              Reset Filters
            </Button>
          }
          className="bg-slate-900/30 border-slate-800 py-12"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMaterials.map((material) => (
            <div
              key={material.id}
              className="rounded-2xl bg-slate-900/70 border border-slate-800 p-5 space-y-4 hover:border-slate-700 transition-all duration-150 flex flex-col justify-between group"
            >
              <div className="space-y-3">
                {/* Header row: file icon + status */}
                <div className="flex items-center justify-between">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      material.fileType === "pdf"
                        ? "bg-rose-950/80 border border-rose-800/50 text-rose-400"
                        : "bg-teal-950/80 border border-teal-800/50 text-teal-400"
                    }`}
                  >
                    {material.fileType === "pdf" ? (
                      <FileText className="w-4 h-4" />
                    ) : (
                      <FileCode className="w-4 h-4" />
                    )}
                  </div>
                  {getStatusBadge(material)}
                </div>

                {/* Title & original filename */}
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white group-hover:text-brand-300 transition-colors line-clamp-1">
                    {material.title}
                  </h3>
                  <p className="text-[11px] text-slate-400 truncate" title={material.originalFilename}>
                    {material.originalFilename}
                  </p>
                </div>

                {/* Meta details */}
                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1 font-mono">
                    <HardDrive className="w-3 h-3 text-slate-500" />
                    {formatFileSize(material.fileSizeBytes)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    {new Date(material.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Actions row */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <Link href={`/materials/${material.id}`} className="flex-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs gap-1.5 bg-slate-950 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
                  >
                    <span>Open Workspace</span>
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </Link>

                <button
                  onClick={() => {
                    setDeleteError("");
                    setDeleteTarget(material);
                  }}
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg border border-slate-800 transition-colors"
                  title="Delete Document"
                  aria-label={`Delete ${material.title}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Upload Material Dialog Modal ─────────────────────────── */}
      <Dialog
        isOpen={isUploadOpen}
        onClose={() => {
          if (!isUploading) {
            setIsUploadOpen(false);
          }
        }}
        title="Upload Study Material"
        description="Select a PDF or TXT document (up to 20 MB) to store in your private workspace."
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          {storage?.isFull && (
            <div className="p-3 rounded-xl bg-amber-950/70 border border-amber-500/50 text-amber-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Storage quota is full (8.5 GB limit reached). Please delete older
                documents to free up space.
              </span>
            </div>
          )}

          {uploadError && (
            <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Drag & Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
              isDragOver
                ? "border-brand-500 bg-brand-500/10"
                : "border-slate-300 bg-surface-50 hover:border-brand-600 hover:bg-surface-100"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,application/pdf,text/plain"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileChange(e.target.files[0]);
                }
              }}
            />

            <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center mx-auto mb-3">
              <Upload className="w-6 h-6" />
            </div>

            <p className="text-sm font-semibold text-surface-900">
              {selectedFile ? selectedFile.name : "Click to browse or drag & drop"}
            </p>
            <p className="text-xs text-surface-500 mt-1">
              Supported formats: PDF or TXT • Maximum 20 MB
            </p>

            {selectedFile && (
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-200 text-xs text-brand-800 font-semibold">
                <span>{formatFileSize(selectedFile.size)}</span>
                <span>•</span>
                <span className="uppercase">{selectedFile.name.split(".").pop()}</span>
              </div>
            )}
          </div>

          {/* Custom Title Input */}
          <Input
            label="Document Title (optional)"
            id="customTitle"
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            placeholder="e.g. Molecular Biology - Chapter 4"
            disabled={isUploading}
          />

          {/* Indeterminate Progress Bar during upload */}
          {isUploading && (
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-xs text-surface-600 font-semibold">
                <span>Encrypting & uploading to private storage...</span>
                <span>In progress</span>
              </div>
              <div className="w-full h-2 bg-surface-200 rounded-full overflow-hidden">
                <div className="h-full bg-brand-600 animate-pulse w-full" />
              </div>
            </div>
          )}

          {/* Dialog Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-200">
            <Button
              variant="outline"
              size="md"
              disabled={isUploading}
              onClick={() => setIsUploadOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={!selectedFile || isUploading || Boolean(storage?.isFull)}
              isLoading={isUploading}
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              <span>{isUploading ? "Uploading..." : "Confirm Upload"}</span>
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ── Delete Confirmation Dialog Modal ─────────────────────── */}
      <Dialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => {
          if (!isDeleting) {
            setDeleteTarget(null);
          }
        }}
        title="Delete Study Material"
        description="This will permanently delete the document from your account and cloud storage."
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
            <p className="font-bold text-surface-900">{deleteTarget?.title}</p>
            <p className="text-surface-500">{deleteTarget?.originalFilename}</p>
            <p className="text-[11px] text-surface-400 pt-1 font-mono">
              Size: {formatFileSize(deleteTarget?.fileSizeBytes)}
            </p>
          </div>

          <p className="text-xs text-danger-600 font-medium">
            Warning: This action cannot be undone. Any future AI notes or summaries generated from this document will also be removed.
          </p>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-200">
            <Button
              variant="outline"
              size="sm"
              disabled={isDeleting}
              onClick={() => setDeleteTarget(null)}
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
    </div>
  );
}
