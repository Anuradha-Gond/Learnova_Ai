"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Bot,
  Send,
  User,
  Sparkles,
  AlertCircle,
  RotateCcw,
  CornerDownLeft,
  Cpu,
  Info,
  ExternalLink,
  Copy,
  Check,
  MessageSquare,
  Plus,
  Edit2,
  Trash2,
  Menu,
  X,
  BookOpen,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Dialog from "@/components/ui/Dialog";
import Input from "@/components/ui/Input";
import MarkdownRenderer from "@/components/ui/MarkdownRenderer";
import { cn } from "@/lib/utils";

const STARTER_PROMPTS = [
  "Explain active recall and how it improves long-term exam retention.",
  "What are the most effective study methods for dense technical topics?",
  "How do I set up a spaced repetition schedule for final exam review?",
  "Help me understand the core difference between correlation and causation.",
  "What are the 4 fundamental steps of the Feynman Technique?",
  "How can I maintain deep focus during multi-hour study sessions?",
];

function MessageBubble({ message, isLastAssistant, onRegenerate, isLoading }) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!message.content) return;
    navigator.clipboard.writeText(message.content);
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
            : "bg-gradient-to-tr from-brand-700 via-brand-600 to-teal-500 text-white shadow"
        )}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Bubble Container */}
      <div
        className={cn(
          "flex flex-col space-y-1.5",
          isUser ? "items-end max-w-[85%] sm:max-w-[78%]" : "items-start max-w-[95%] sm:max-w-[88%]"
        )}
      >
        <div
          className={cn(
            "rounded-2xl px-4 py-3.5 text-xs sm:text-sm leading-relaxed transition-all shadow-sm",
            isUser
              ? "bg-brand-600/25 border border-brand-500/40 text-slate-100 rounded-tr-sm whitespace-pre-wrap selection:bg-brand-500/40"
              : "bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-sm w-full"
          )}
        >
          {isUser ? (
            <p className="font-sans leading-relaxed">{message.content}</p>
          ) : (
            <MarkdownRenderer content={message.content} />
          )}
        </div>

        {/* Action affordances for Assistant messages */}
        {!isUser && (
          <div className="flex items-center gap-1 px-1 text-[11px] text-slate-400">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-slate-800/80 hover:text-slate-200 transition-colors"
              title="Copy answer"
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

            {isLastAssistant && onRegenerate && (
              <button
                type="button"
                onClick={onRegenerate}
                disabled={isLoading}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-slate-800/80 hover:text-slate-200 transition-colors disabled:opacity-50"
                title="Regenerate this response"
              >
                <RotateCcw className={cn("w-3 h-3", isLoading && "animate-spin")} />
                <span>Regenerate</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-fade-in">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-tr from-brand-700 via-brand-600 to-teal-500 text-white shadow">
        <Bot className="w-4 h-4 animate-pulse" />
      </div>
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2.5 shadow-sm">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 bg-brand-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
          <span className="w-2 h-2 bg-teal-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
          <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" />
        </div>
        <span className="text-xs text-slate-400 font-medium">Thinking & synthesizing answer...</span>
      </div>
    </div>
  );
}

export default function AssistantPage() {
  const { data: session } = useSession();
  const firstName = session?.user?.name ? session.user.name.split(" ")[0] : "Student";

  // Persistent chat state
  const [conversationId, setConversationId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [aiStatus, setAiStatus] = useState("unknown"); // "ok" | "not_configured" | "key_invalid" | "unknown"
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // In-app Modal State for Rename & Delete
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [targetConversation, setTargetConversation] = useState(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = useCallback((behavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  // Load conversation list and restore active conversation
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/assistant/conversations");
      if (!res.ok) throw new Error("Failed to load conversations");
      const data = await res.json();
      setConversations(data.conversations || []);
      const stored = localStorage.getItem("assistantConversationId");
      const found = data.conversations?.find((c) => c.id === stored);
      if (found) {
        setConversationId(found.id);
      } else if (data.conversations?.length) {
        setConversationId(data.conversations[0].id);
        localStorage.setItem("assistantConversationId", data.conversations[0].id);
      } else {
        // No conversations, create an initial one
        const createRes = await fetch("/api/assistant/conversations", { method: "POST" });
        if (createRes.ok) {
          const createData = await createRes.json();
          const newId = createData.conversation.id;
          setConversationId(newId);
          localStorage.setItem("assistantConversationId", newId);
          setConversations([createData.conversation]);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Load messages for the active conversation
  const loadConversationMessages = useCallback(async (id) => {
    if (!id) return;
    try {
      const res = await fetch(`/api/assistant/conversations/${id}`);
      if (!res.ok) throw new Error("Failed to load conversation");
      const data = await res.json();
      setMessages(
        data.conversation.messages.map((m) => ({ role: m.role, content: m.content }))
      );
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // When conversationId changes, load its messages
  useEffect(() => {
    if (conversationId) {
      loadConversationMessages(conversationId);
    }
  }, [conversationId, loadConversationMessages]);

  useEffect(() => {
    scrollToBottom(messages.length <= 2 ? "auto" : "smooth");
  }, [messages, isLoading, scrollToBottom]);

  // Updated handleSend to include conversationId and refresh list after reply
  const handleSend = async (messageText) => {
    const text = (messageText || input).trim();
    if (!text || isLoading) return;

    const userMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setIsLoading(true);
    setError("");

    // Build history for API (exclude the just-added message)
    const historyForApi = messages.map((m) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    }));

    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          conversationId,
          history: historyForApi,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === "AI_NOT_CONFIGURED" || data.code === "AI_KEY_INVALID") {
          setAiStatus(data.code === "AI_NOT_CONFIGURED" ? "not_configured" : "key_invalid");
        }
        setError(data.error || "Failed to get a response. Please try again.");
        setIsLoading(false);
        return;
      }

      setAiStatus("ok");
      setMessages((prev) => [...prev, { role: "assistant", content: data.answer }]);
      if (data.conversationId && data.conversationId !== conversationId) {
        setConversationId(data.conversationId);
        localStorage.setItem("assistantConversationId", data.conversationId);
      }
      // Refresh conversation list to reflect updated title / timestamp
      fetchConversations();
    } catch {
      setError("A network error occurred. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Regenerate last assistant response
  const handleRegenerate = async () => {
    if (messages.length === 0 || isLoading) return;
    // Find the last user question
    let lastUserMessage = null;
    let priorMessages = [];
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        lastUserMessage = messages[i].content;
        priorMessages = messages.slice(0, i);
        break;
      }
    }

    if (!lastUserMessage) return;

    // Reset messages up to that user question
    setMessages([...priorMessages, { role: "user", content: lastUserMessage }]);
    setIsLoading(true);
    setError("");

    const historyForApi = priorMessages.map((m) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    }));

    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: lastUserMessage,
          conversationId,
          history: historyForApi,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to regenerate response.");
        return;
      }

      setMessages((prev) => [...prev, { role: "assistant", content: data.answer }]);
      fetchConversations();
    } catch {
      setError("Network error occurred during regeneration.");
    } finally {
      setIsLoading(false);
    }
  };

  // Start new chat session
  const startNewChat = async () => {
    try {
      const res = await fetch("/api/assistant/conversations", { method: "POST" });
      const data = await res.json();
      const newId = data.conversation.id;
      setConversationId(newId);
      localStorage.setItem("assistantConversationId", newId);
      setMessages([]);
      setError("");
      setIsMobileSidebarOpen(false);
      fetchConversations();
    } catch (e) {
      console.error(e);
    }
  };

  // Rename modal triggers
  const openRenameModal = (conv, e) => {
    e.stopPropagation();
    setTargetConversation(conv);
    setRenameTitle(conv.title || "");
    setRenameModalOpen(true);
  };

  const handleRenameSubmit = async (e) => {
    e?.preventDefault();
    if (!targetConversation || !renameTitle.trim() || isRenaming) return;
    setIsRenaming(true);
    try {
      const res = await fetch(`/api/assistant/conversations/${targetConversation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: renameTitle.trim() }),
      });
      if (res.ok) {
        setRenameModalOpen(false);
        fetchConversations();
      }
    } catch (err) {
      console.error("Rename failed:", err);
    } finally {
      setIsRenaming(false);
    }
  };

  // Delete modal triggers
  const openDeleteModal = (conv, e) => {
    e.stopPropagation();
    setTargetConversation(conv);
    setDeleteModalOpen(true);
  };

  const handleDeleteSubmit = async () => {
    if (!targetConversation || isDeleting) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/assistant/conversations/${targetConversation.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        if (targetConversation.id === conversationId) {
          setConversationId(null);
          localStorage.removeItem("assistantConversationId");
          setMessages([]);
        }
        setDeleteModalOpen(false);
        fetchConversations();
      }
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-[calc(100vh-5.5rem)] max-h-[920px] animate-fade-in relative">
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="mb-4 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          {/* Mobile Conversation Drawer Toggle */}
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className="md:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
            aria-label="Toggle Conversation List"
          >
            {isMobileSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>

          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-700 via-brand-600 to-teal-500 flex items-center justify-center text-white shadow-md">
            <Bot className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-extrabold font-display text-white tracking-tight">
                AI Study Assistant
              </h1>
              <Badge variant="primary" size="sm" className="hidden sm:inline-flex">
                Interactive Tutor
              </Badge>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Ask anything about core concepts, exam preparation, or study strategies.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/materials"
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 hover:text-white transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5 text-teal-400" />
            <span>Document Q&A</span>
          </Link>

          <Button
            size="sm"
            variant="primary"
            onClick={startNewChat}
            className="gap-1.5 bg-brand-600 hover:bg-brand-500 text-xs shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </Button>
        </div>
      </div>

      {/* ── Main Chat Layout: Sidebar + Conversation Box ───────────── */}
      <div className="flex flex-1 rounded-2xl bg-slate-900/70 border border-slate-800 overflow-hidden relative shadow-xl">
        {/* Mobile Sidebar Overlay */}
        {isMobileSidebarOpen && (
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}

        {/* ── Conversation History Sidebar ───────────────────────────── */}
        <aside
          className={cn(
            "w-72 bg-slate-950/95 md:bg-slate-950/60 border-r border-slate-800/90 flex flex-col shrink-0 z-50 md:z-auto transition-transform duration-200",
            "fixed inset-y-0 left-0 md:static",
            isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          )}
        >
          {/* Sidebar Header */}
          <div className="p-3.5 border-b border-slate-800/90 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-brand-400" />
              <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Conversations
              </h2>
            </div>
            <button
              type="button"
              onClick={startNewChat}
              className="p-1 rounded-lg bg-slate-800/80 hover:bg-brand-600 text-slate-300 hover:text-white transition-colors"
              title="Start New Chat"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {conversations.length === 0 ? (
              <div className="text-center py-8 px-4 text-xs text-slate-500">
                No past conversations. Click &ldquo;New Chat&rdquo; to begin.
              </div>
            ) : (
              conversations.map((c) => {
                const isActive = c.id === conversationId;
                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      setConversationId(c.id);
                      localStorage.setItem("assistantConversationId", c.id);
                      setIsMobileSidebarOpen(false);
                    }}
                    className={cn(
                      "group flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs transition-all",
                      isActive
                        ? "bg-brand-600/20 text-white font-medium border border-brand-500/30"
                        : "text-slate-400 hover:bg-slate-900/80 hover:text-slate-200 border border-transparent"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1 pr-1">
                      <MessageSquare
                        className={cn(
                          "w-3.5 h-3.5 shrink-0",
                          isActive ? "text-brand-400" : "text-slate-500"
                        )}
                      />
                      <span className="truncate">{c.title || "Untitled Session"}</span>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => openRenameModal(c, e)}
                        className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                        title="Rename conversation"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => openDeleteModal(c, e)}
                        className="p-1 rounded hover:bg-rose-950/80 text-slate-400 hover:text-rose-400"
                        title="Delete conversation"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* ── Main Chat Area ─────────────────────────────────────────── */}
        <div className="flex flex-col flex-1 min-w-0 bg-slate-900/40">
          {/* AI Not Configured Alert */}
          {(aiStatus === "not_configured" || aiStatus === "key_invalid") && (
            <div className="p-3 sm:p-4 bg-amber-950/70 border-b border-amber-700/50 text-amber-200 text-xs flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-amber-100">
                  {aiStatus === "not_configured"
                    ? "Gemini API key is not configured."
                    : "Gemini API key is invalid or expired."}
                </p>
                <p className="text-amber-300/80">
                  Add a working <code className="font-mono bg-amber-900/50 px-1 py-0.5 rounded">GEMINI_API_KEY</code> to your <code className="font-mono bg-amber-900/50 px-1 py-0.5 rounded">.env.local</code> file to enable AI responses.
                </p>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-amber-300 hover:text-amber-200 font-semibold underline underline-offset-2"
                >
                  <span>Get a free Gemini API key</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {/* Message Thread */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {isEmpty ? (
              /* Starter / Welcome State */
              <div className="flex flex-col items-center justify-center min-h-[440px] text-center max-w-xl mx-auto space-y-6 py-6 animate-fade-in">
                <div className="space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-700 via-brand-600 to-teal-500 flex items-center justify-center text-white shadow-lg mx-auto">
                    <Sparkles className="w-7 h-7" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-extrabold font-display text-white">
                    Hello, {firstName}!
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
                    I&rsquo;m your AI Learning Assistant. Ask me to break down concepts, test your understanding, or suggest high-yield revision strategies.
                  </p>
                </div>

                {/* Suggested prompt chips */}
                <div className="w-full space-y-2.5 text-left">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">
                    Suggested Study Questions
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {STARTER_PROMPTS.map((prompt, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSend(prompt)}
                        className="p-3 text-left text-xs text-slate-300 rounded-xl bg-slate-950/70 border border-slate-800/90 hover:border-brand-500/50 hover:text-white hover:bg-slate-900/80 transition-all flex items-start justify-between group"
                      >
                        <span className="line-clamp-2 leading-relaxed">{prompt}</span>
                        <CornerDownLeft className="w-3.5 h-3.5 text-slate-600 group-hover:text-brand-400 shrink-0 ml-2 mt-0.5" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-950/50 px-3.5 py-2 rounded-xl border border-slate-800/60">
                  <Info className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                  <span>
                    Studying a specific PDF? Head over to the{" "}
                    <Link href="/materials" className="text-brand-400 hover:text-brand-300 underline underline-offset-2">
                      Learning Library
                    </Link>{" "}
                    for verified source-grounded citations.
                  </span>
                </div>
              </div>
            ) : (
              /* Conversation Messages */
              <>
                {messages.map((msg, idx) => {
                  const isLast = idx === messages.length - 1;
                  const isLastAssistant = isLast && msg.role === "assistant";
                  return (
                    <MessageBubble
                      key={idx}
                      message={msg}
                      isLastAssistant={isLastAssistant}
                      onRegenerate={handleRegenerate}
                      isLoading={isLoading}
                    />
                  );
                })}
                {isLoading && <TypingIndicator />}
              </>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Error Banner with Retry */}
          {error && (
            <div className="mx-4 mb-3 p-3 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-200 text-xs flex items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => handleRegenerate()}
                className="px-2.5 py-1 rounded-lg bg-rose-900/70 hover:bg-rose-800/70 text-white font-medium text-[11px] flex items-center gap-1.5 shrink-0"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Retry</span>
              </button>
            </div>
          )}

          {/* ── Chat Input Area ────────────────────────────────────────── */}
          <div className="p-3 sm:p-4 border-t border-slate-800/90 bg-slate-950/70">
            <div className="flex items-end gap-2 bg-slate-900/90 border border-slate-800 rounded-xl p-2 focus-within:border-brand-500/60 transition-colors shadow-inner">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  id="assistant-input"
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a question or request an explanation… (Enter to send, Shift+Enter for new line)"
                  rows={1}
                  disabled={isLoading}
                  className="w-full resize-none bg-transparent px-2.5 py-1.5 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none max-h-40 leading-relaxed disabled:opacity-50"
                  aria-label="Ask your learning question"
                />
              </div>

              <Button
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                className="h-9 w-9 p-0 shrink-0 bg-brand-600 hover:bg-brand-500 text-white disabled:opacity-40 rounded-lg shadow-sm"
                aria-label="Send message"
              >
                {isLoading ? (
                  <Cpu className="w-4 h-4 animate-pulse" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>

            <div className="mt-2 flex items-center justify-between px-1 text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <CornerDownLeft className="w-3 h-3 text-slate-600" />
                <span>Press Enter to send, Shift+Enter for newline</span>
              </span>
              <span>Powered by Google Gemini</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Rename Conversation Modal ───────────────────────────────── */}
      <Dialog
        isOpen={renameModalOpen}
        onClose={() => !isRenaming && setRenameModalOpen(false)}
        title="Rename Conversation"
        description="Update the title for this chat session."
        maxWidth="max-w-md"
      >
        <form onSubmit={handleRenameSubmit} className="space-y-4">
          <Input
            label="Conversation Title"
            value={renameTitle}
            onChange={(e) => setRenameTitle(e.target.value)}
            placeholder="e.g. Operating Systems Paging Notes"
            required
            autoFocus
          />
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isRenaming}
              onClick={() => setRenameModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isRenaming}
              disabled={!renameTitle.trim()}
              className="bg-brand-600 hover:bg-brand-500"
            >
              Save Title
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ── Delete Conversation Modal ───────────────────────────────── */}
      <Dialog
        isOpen={deleteModalOpen}
        onClose={() => !isDeleting && setDeleteModalOpen(false)}
        title="Delete Conversation"
        description="Are you sure you want to remove this chat session?"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-400">
            This will permanently remove <span className="text-white font-semibold">&ldquo;{targetConversation?.title}&rdquo;</span> and all associated messages. This action cannot be undone.
          </p>
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isDeleting}
              onClick={() => setDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              isLoading={isDeleting}
              onClick={handleDeleteSubmit}
              className="gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Chat</span>
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
