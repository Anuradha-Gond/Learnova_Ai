"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Sparkles,
  Send,
  Bot,
  User,
  BookOpen,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  AlertCircle,
  FileText,
  Trash2,
  Check,
  Copy,
  Cpu,
  CornerDownLeft,
  ExternalLink,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Dialog from "@/components/ui/Dialog";
import MarkdownRenderer from "@/components/ui/MarkdownRenderer";
import { cn } from "@/lib/utils";

const STARTER_PROMPTS = [
  "What are the main topics and concepts covered in this document?",
  "Can you summarize the key takeaways in clear bullet points?",
  "Explain the most important definitions and terms introduced here.",
  "What are the core conclusions or practical takeaways?",
];

function MessageBubble({ msg, isSourcesOpen, onToggleSources, onRegenerate, isLast, isLoading }) {
  const isUser = msg.role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!msg.content) return;
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        "flex gap-3 group animate-fade-in",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-sm transition-transform group-hover:scale-105",
          isUser
            ? "bg-slate-800 border border-slate-700/80 text-brand-300"
            : "bg-gradient-to-tr from-violet-600 via-brand-600 to-teal-500 text-white shadow"
        )}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      <div
        className={cn(
          "flex flex-col space-y-1.5",
          isUser ? "items-end max-w-[85%] sm:max-w-[78%]" : "items-start max-w-[95%] sm:max-w-[88%]"
        )}
      >
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed transition-all shadow-sm",
            isUser
              ? "bg-brand-600/25 border border-brand-500/40 text-slate-100 rounded-tr-sm whitespace-pre-wrap selection:bg-brand-500/40"
              : "bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-sm w-full"
          )}
        >
          {isUser ? (
            <p className="font-sans leading-relaxed">{msg.content}</p>
          ) : (
            <MarkdownRenderer content={msg.content} />
          )}
        </div>

        {/* Assistant Footer Actions: Copy + Citations Accordion */}
        {!isUser && (
          <div className="w-full space-y-2 pt-0.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-slate-800/80 hover:text-slate-200 transition-colors"
                  title="Copy response"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400 font-medium">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>

                {isLast && onRegenerate && (
                  <button
                    type="button"
                    onClick={onRegenerate}
                    disabled={isLoading}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-slate-800/80 hover:text-slate-200 transition-colors disabled:opacity-50"
                    title="Regenerate answer"
                  >
                    <RotateCcw className={cn("w-3 h-3", isLoading && "animate-spin")} />
                    <span>Regenerate</span>
                  </button>
                )}
              </div>

              {/* Source count pill */}
              {Array.isArray(msg.sources) && msg.sources.length > 0 && (
                <button
                  type="button"
                  onClick={onToggleSources}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border text-[11px] font-medium transition-colors",
                    isSourcesOpen
                      ? "bg-teal-950/80 border-teal-600/50 text-teal-300"
                      : "bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                  )}
                >
                  <FileText className="w-3 h-3 text-teal-400" />
                  <span>{msg.sources.length} Verified {msg.sources.length === 1 ? "Source" : "Sources"}</span>
                  {isSourcesOpen ? (
                    <ChevronUp className="w-3 h-3 text-teal-400" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>
              )}
            </div>

            {/* Citations Box */}
            {!isUser && isSourcesOpen && Array.isArray(msg.sources) && msg.sources.length > 0 && (
              <div className="mt-2 space-y-2 p-3.5 rounded-xl bg-slate-950/90 border border-slate-800/80 text-xs animate-fade-in shadow-inner">
                <div className="flex items-center justify-between pb-1 border-b border-slate-800/60">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3 h-3 text-teal-400" />
                    <span>Retrieved Document Passages</span>
                  </span>
                  <Badge variant="teal" size="sm" className="text-[9px]">Grounded Context</Badge>
                </div>

                {msg.sources.map((src, sIdx) => (
                  <div
                    key={sIdx}
                    className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800/80 space-y-1.5 text-slate-300 text-[11px]"
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span className="font-semibold text-teal-400">
                        [Excerpt {sIdx + 1}] • Chunk #{src.chunkIndex}
                      </span>
                      {src.page && (
                        <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                          Page {src.page}
                        </span>
                      )}
                    </div>
                    <p className="italic text-slate-300 leading-relaxed border-l-2 border-teal-500/50 pl-2.5">
                      &ldquo;{src.excerpt}&rdquo;
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatAssistant({
  materialId,
  materialTitle,
  processingStatus,
  chunkCount = 0,
  onTriggerProcess,
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingHistory, setIsFetchingHistory] = useState(true);
  const [error, setError] = useState("");
  const [conversationId, setConversationId] = useState(null);
  const [expandedSources, setExpandedSources] = useState({});
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = useCallback((behavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  // Load prior conversation history
  const loadHistory = useCallback(async () => {
    if (!materialId || processingStatus !== "ready") {
      setIsFetchingHistory(false);
      return;
    }

    try {
      setIsFetchingHistory(true);
      setError("");
      const res = await fetch(`/api/materials/${materialId}/chat`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        if (data.conversationId) {
          setConversationId(data.conversationId);
        }
      }
    } catch (err) {
      console.warn("Failed to load chat history:", err.message);
    } finally {
      setIsFetchingHistory(false);
    }
  }, [materialId, processingStatus]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    scrollToBottom(messages.length <= 2 ? "auto" : "smooth");
  }, [messages, isLoading, scrollToBottom]);

  const toggleSource = (msgId) => {
    setExpandedSources((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  const handleSend = async (messageText = input) => {
    const trimmed = (messageText || "").trim();
    if (!trimmed || isLoading || processingStatus !== "ready") return;

    setError("");
    const userMessageId = `user_${Date.now()}`;
    const userMessage = {
      id: userMessageId,
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const res = await fetch(`/api/materials/${materialId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          conversationId: conversationId || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate answer.");
      }

      const assistantMessage = {
        id: `asst_${Date.now()}`,
        role: "assistant",
        content: data.answer,
        sources: data.sources || [],
        conversationId: data.conversationId,
        createdAt: new Date().toISOString(),
      };

      if (data.conversationId) {
        setConversationId(data.conversationId);
      }

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError(err.message || "An error occurred while answering your question.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (messages.length === 0 || isLoading) return;
    // Find last user question
    let lastUserQuestion = null;
    let priorMessages = [];
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        lastUserQuestion = messages[i].content;
        priorMessages = messages.slice(0, i);
        break;
      }
    }

    if (!lastUserQuestion) return;

    setMessages([...priorMessages, { id: `user_${Date.now()}`, role: "user", content: lastUserQuestion, createdAt: new Date().toISOString() }]);
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/materials/${materialId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: lastUserQuestion,
          conversationId: conversationId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to regenerate answer.");
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `asst_${Date.now()}`,
          role: "assistant",
          content: data.answer,
          sources: data.sources || [],
          conversationId: data.conversationId,
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      setError(err.message || "An error occurred while regenerating.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputResize = (e) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  };

  const handleClearHistory = async () => {
    setIsClearing(true);
    try {
      const res = await fetch(`/api/materials/${materialId}/chat`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMessages([]);
        setIsClearModalOpen(false);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to clear chat history.");
      }
    } catch (err) {
      setError(err.message || "Network error while clearing history.");
    } finally {
      setIsClearing(false);
    }
  };

  // State: Document not processed yet
  if (processingStatus !== "ready") {
    return (
      <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-8 flex flex-col items-center text-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-violet-950/70 border border-violet-800/40 text-violet-400 flex items-center justify-center">
          <Bot className="w-6 h-6" />
        </div>
        <div className="space-y-1 max-w-md">
          <h3 className="text-base font-bold text-white">AI Learning Assistant</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            {processingStatus === "processing"
              ? "Your document is currently being ingested into semantic chunks and vector embeddings. The assistant will be available once processing completes."
              : "To ask questions and receive grounded answers with citations, process this document first using the ingestion pipeline above."}
          </p>
        </div>

        {processingStatus !== "processing" && onTriggerProcess && (
          <Button
            size="sm"
            variant="primary"
            onClick={onTriggerProcess}
            className="gap-2 bg-brand-600 hover:bg-brand-500"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Process Document Now</span>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[680px] rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl">
      {/* ── Chat Header ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950/80 border-b border-slate-800/90 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-brand-500 text-white flex items-center justify-center shadow-sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Document Study Assistant</h3>
              <Badge variant="teal" size="sm" className="text-[10px]">
                Grounded Citations
              </Badge>
            </div>
            <p className="text-[11px] text-slate-400 truncate max-w-xs sm:max-w-md">
              Context: {materialTitle || "Active Document"} ({chunkCount} knowledge chunks indexed)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => setIsClearModalOpen(true)}
              className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-slate-800/60 transition-colors"
              title="Clear chat history"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Chat Message Thread ─────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        {isFetchingHistory ? (
          <div className="flex flex-col items-center justify-center h-full space-y-3 text-slate-400">
            <RotateCcw className="w-5 h-5 animate-spin text-brand-400" />
            <span className="text-xs">Loading conversation history...</span>
          </div>
        ) : messages.length === 0 ? (
          /* Empty state with suggested starter prompts */
          <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto space-y-5 py-8 animate-fade-in">
            <div className="w-12 h-12 rounded-2xl bg-brand-950/60 border border-brand-800/40 text-brand-400 flex items-center justify-center shadow-sm">
              <BookOpen className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white">Ask anything about this document</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Answers are grounded strictly in your document&apos;s semantic chunks with verified source citations.
              </p>
            </div>

            <div className="w-full space-y-2 text-left">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-1">
                Suggested Prompts
              </p>
              {STARTER_PROMPTS.map((promptText, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(promptText)}
                  className="w-full p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-brand-500/40 hover:bg-slate-800/50 text-xs text-slate-300 hover:text-white transition-all text-left flex items-center justify-between group"
                >
                  <span className="line-clamp-1">{promptText}</span>
                  <CornerDownLeft className="w-3.5 h-3.5 text-slate-500 group-hover:text-brand-400 shrink-0 ml-2" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, index) => {
            const msgId = msg.id || `msg_${index}`;
            const isSourcesOpen = expandedSources[msgId];
            const isLast = index === messages.length - 1;

            return (
              <MessageBubble
                key={msgId}
                msg={msg}
                isSourcesOpen={isSourcesOpen}
                onToggleSources={() => toggleSource(msgId)}
                onRegenerate={handleRegenerate}
                isLast={isLast}
                isLoading={isLoading}
              />
            );
          })
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex gap-3 justify-start items-center animate-fade-in">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-brand-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Bot className="w-4 h-4 animate-pulse" />
            </div>
            <div className="px-4 py-2.5 rounded-2xl bg-slate-950/90 border border-slate-800/80 flex items-center gap-2.5 shadow-sm">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-brand-400 animate-bounce [animation-delay:-0.3s]" />
                <div className="w-2 h-2 rounded-full bg-teal-400 animate-bounce [animation-delay:-0.15s]" />
                <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" />
              </div>
              <span className="text-xs text-slate-400 font-medium">Searching semantic chunks & synthesizing answer...</span>
            </div>
          </div>
        )}

        {/* Error Banner with Retry */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-200 text-xs flex items-center justify-between gap-2 animate-fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => handleRegenerate()}
              className="px-2 py-1 rounded bg-rose-900/70 hover:bg-rose-800/70 text-white text-[11px] font-semibold flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Retry
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input Bar ──────────────────────────────────────────────── */}
      <div className="p-3 sm:p-4 bg-slate-950/90 border-t border-slate-800/90 shrink-0 space-y-1.5">
        <div className="flex items-end gap-2 rounded-xl bg-slate-900/90 border border-slate-800 p-2 focus-within:border-brand-500/60 transition-colors shadow-inner">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={handleInputResize}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about this study material..."
            disabled={isLoading}
            className="flex-1 bg-transparent text-white placeholder-slate-500 text-xs sm:text-sm resize-none focus:outline-none max-h-36 px-2 py-1 leading-relaxed disabled:opacity-50"
          />

          <Button
            size="sm"
            variant="primary"
            disabled={!input.trim() || isLoading}
            isLoading={isLoading}
            onClick={() => handleSend()}
            className="bg-brand-600 hover:bg-brand-500 h-8 w-8 p-0 rounded-lg shrink-0 shadow-sm"
            title="Send question (Enter)"
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="flex items-center justify-between px-1 text-[10px] text-slate-500">
          <span>Press Enter to send, Shift+Enter for new line</span>
          <span>Answers grounded strictly in document</span>
        </div>
      </div>

      {/* ── Clear Chat History Modal ───────────────────────────────── */}
      <Dialog
        isOpen={isClearModalOpen}
        onClose={() => !isClearing && setIsClearModalOpen(false)}
        title="Clear Conversation History"
        description="Permanently delete the chat history for this study material."
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-400">
            This will clear your conversation with the assistant for this document. Your document and indexed knowledge sections will remain completely unaffected.
          </p>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isClearing}
              onClick={() => setIsClearModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              isLoading={isClearing}
              onClick={handleClearHistory}
              className="gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
