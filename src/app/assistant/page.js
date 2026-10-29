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
} from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

const STARTER_PROMPTS = [
  "Explain the concept of active recall and how it improves memory retention.",
  "What are effective study techniques for complex technical subjects?",
  "How do I create a spaced repetition schedule for exam preparation?",
  "Help me understand the difference between correlation and causation.",
  "What are the key principles of the Feynman Technique?",
  "How can I improve my concentration during long study sessions?",
];

function MessageBubble({ message }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}>
      {/* Avatar */}
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
          isUser
            ? "bg-brand-900 border border-brand-700/60 text-brand-300"
            : "bg-gradient-to-tr from-brand-700 via-brand-600 to-teal-500 text-white shadow"
        )}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "bg-brand-600/20 border border-brand-500/30 text-slate-100 rounded-tr-sm"
            : "bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-sm"
        )}
      >
        {message.content.split("\n").map((line, i) => (
          <p key={i} className={i > 0 ? "mt-1.5" : ""}>
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-tr from-brand-700 via-brand-600 to-teal-500 text-white shadow">
        <Bot className="w-4 h-4" />
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]" />
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
        // No conversations, create a new one
        const createRes = await fetch("/api/assistant/conversations", { method: "POST" });
        const createData = await createRes.json();
        const newId = createData.conversation.id;
        setConversationId(newId);
        localStorage.setItem("assistantConversationId", newId);
        setConversations((prev) => [createData.conversation, ...prev]);
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

  // Updated handleSend to include conversationId and refresh list after reply
  const handleSend = async (messageText) => {
    const text = (messageText || input).trim();
    if (!text || isLoading) return;

    const userMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setError("");

    // Build history for API (exclude the just‑added message)
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

  // New Chat button handler
  const startNewChat = async () => {
    try {
      const res = await fetch("/api/assistant/conversations", { method: "POST" });
      const data = await res.json();
      const newId = data.conversation.id;
      setConversationId(newId);
      localStorage.setItem("assistantConversationId", newId);
      setMessages([]);
      fetchConversations();
    } catch (e) {
      console.error(e);
    }
  };

  // Rename conversation
  const renameConversation = async (id) => {
    const newTitle = prompt("Enter new conversation title:");
    if (!newTitle) return;
    try {
      await fetch(`/api/assistant/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
      fetchConversations();
    } catch (e) {
      console.error(e);
    }
  };

  // Delete conversation
  const deleteConversation = async (id) => {
    if (!confirm("Delete this conversation? This cannot be undone.")) return;
    try {
      await fetch(`/api/assistant/conversations/${id}`, { method: "DELETE" });
      if (id === conversationId) {
        setConversationId(null);
        localStorage.removeItem("assistantConversationId");
        setMessages([]);
      }
      fetchConversations();
    } catch (e) {
      console.error(e);
    }
  };

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [aiStatus, setAiStatus] = useState("unknown"); // "ok" | "not_configured" | "key_invalid" | "unknown"

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    setMessages([]);
    setError("");
    setAiStatus("unknown");
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-[calc(100vh-8rem)] max-h-[900px] animate-fade-in">
      {/* Conversation List Sidebar */}
      <aside className="w-64 border-r border-slate-800 bg-slate-900/60 overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-300">Conversations</h2>
          <button
            onClick={startNewChat}
            className="h-6 w-6 flex items-center justify-center rounded bg-brand-600 hover:bg-brand-500 text-white"
            aria-label="New Chat"
          >
            +
          </button>
        </div>
        {conversations.map((c) => (
          <div
            key={c.id}
            className={`flex items-center justify-between p-2 rounded cursor-pointer mb-1 ${c.id === conversationId ? "bg-brand-600/30" : "hover:bg-slate-800"}`}
            onClick={() => {
              setConversationId(c.id);
              localStorage.setItem("assistantConversationId", c.id);
            }}
          >
            <span className="text-sm truncate text-slate-200" title={c.title}>
              {c.title}
            </span>
            <div className="flex space-x-1">
              <button
                onClick={(e) => { e.stopPropagation(); renameConversation(c.id); }}
                className="text-xs text-slate-400 hover:text-slate-200"
                title="Rename"
              >
                ✎
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); deleteConversation(c.id); }}
                className="text-xs text-rose-500 hover:text-rose-300"
                title="Delete"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </aside>

      {/* Chat Container */}
      <div className="flex flex-col flex-1">
        <div className="flex flex-col h-[calc(100vh-8rem)] max-h-[900px] animate-fade-in">
          {/* Page Header */}
          <div className="mb-6 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-700 via-brand-600 to-teal-500 flex items-center justify-center text-white shadow">
                  <Bot className="w-4 h-4" />
                </div>
                <h1 className="text-xl font-extrabold font-display text-white tracking-tight">AI Learning Assistant</h1>
                <Badge variant="primary" size="sm">Gemini</Badge>
              </div>
              <p className="text-xs text-slate-400 max-w-lg">
                Ask any study or concept question. For document-specific Q&A with source citations, use the <Link href="/materials" className="text-brand-400 hover:text-brand-300 underline underline-offset-2">Study Materials workspace</Link>.
              </p>
            </div>

            {messages.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-slate-400 border-slate-700 hover:border-slate-600 shrink-0"
                onClick={handleClear}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>New Chat</span>
              </Button>
            )}
          </div>

          {/* AI Not Configured Banner */}
          {(aiStatus === "not_configured" || aiStatus === "key_invalid") && (
            <div className="mb-4 p-4 rounded-xl bg-amber-950/60 border border-amber-700/50 text-amber-200 text-xs flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-amber-100">
                  {aiStatus === "not_configured"
                    ? "Gemini API key is not configured."
                    : "Gemini API key is invalid."}
                </p>
                <p className="text-amber-300/80">
                  {aiStatus === "not_configured"
                    ? "Add GEMINI_API_KEY to your .env.local file to enable AI responses."
                    : "The current GEMINI_API_KEY is not valid. Please obtain a working key from Google AI Studio."}
                </p>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-amber-300 hover:text-amber-200 font-semibold underline underline-offset-2"
                >
                  Get your free Gemini API key
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {/* Chat Container */}
          <div className="flex flex-col flex-1 rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
              {isEmpty ? (
                // Welcome / Starter State
                <div className="flex flex-col items-center justify-center h-full space-y-8 text-center py-8">
                  <div className="space-y-3">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-700 via-brand-600 to-teal-500 flex items-center justify-center text-white shadow-xl mx-auto">
                      <Sparkles className="w-8 h-8" />
                    </div>
                    <h2 className="text-lg font-extrabold font-display text-white">Hello, {firstName}!</h2>
                    <p className="text-sm text-slate-400 max-w-md">
                      I&rsquo;m your AI Learning Assistant. Ask me anything about study topics, concepts,
                      exam strategies, or academic subjects.
                    </p>
                  </div>

                  <div className="w-full max-w-lg space-y-2">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Suggested questions</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {STARTER_PROMPTS.map((prompt, i) => (
                        <button
                          key={i}
                          onClick={() => handleSend(prompt)}
                          className="p-3 text-left text-xs text-slate-300 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-brand-500/50 hover:text-white hover:bg-slate-900 transition-all leading-relaxed"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <Info className="w-3.5 h-3.5" />
                    <span>
                      For grounded Q&amp;A on your uploaded documents, use the <Link href="/materials" className="text-brand-400 hover:text-brand-300 underline underline-offset-2">Study Materials workspace</Link>.
                    </span>
                  </div>
                </div>
              ) : (
                // Message thread
                <>
                  {messages.map((msg, i) => (
                    <MessageBubble key={i} message={msg} />
                  ))}
                  {isLoading && <TypingIndicator />}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Error Banner */}
            {error && (
              <div className="mx-4 mb-3 p-3 rounded-xl bg-rose-950/60 border border-rose-700/50 text-rose-200 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Input Area */}
            <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950/40">
              <div className="flex gap-2 items-end">
                <div className="flex-1 relative">
                  <textarea
                    ref={textareaRef}
                    id="assistant-input"
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      // Auto-resize textarea
                      e.target.style.height = "auto";
                      e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px";
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask any learning question… (Enter to send, Shift+Enter for new line)"
                    rows={1}
                    disabled={isLoading}
                    className="w-full resize-none bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-500/60 focus:ring-1 focus:ring-brand-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors leading-relaxed"
                    style={{ minHeight: "46px", maxHeight: "140px" }}
                    aria-label="Type your learning question"
                  />
                </div>

                <Button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isLoading}
                  className="h-[46px] w-[46px] p-0 shrink-0 bg-brand-600 hover:bg-brand-500 text-white disabled:opacity-40 rounded-xl"
                  aria-label="Send message"
                >
                  {isLoading ? (
                    <Cpu className="w-4 h-4 animate-pulse" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>

              <div className="mt-2 flex items-center justify-between">
                <p className="text-[10px] text-slate-600 flex items-center gap-1">
                  <CornerDownLeft className="w-3 h-3" />
                  <span>Enter to send · Shift+Enter for new line</span>
                </p>
                <p className="text-[10px] text-slate-600">Powered by Google Gemini</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
