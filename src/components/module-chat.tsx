"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, User2, AlertTriangle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatResponse } from "@/lib/types";

type ChatMessage = { id: string; role: "user" | "assistant"; content: string };

export function ModuleChat({
  slug,
  sessionId,
  productName,
}: {
  slug: string;
  sessionId: string;
  productName: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [leadCreated, setLeadCreated] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [input]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const user: ChatMessage = { id: crypto.randomUUID(), role: "user", content: text };
    const next = [...messages, user];
    setMessages(next);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          sessionId,
          conversationId,
          moduleSlug: slug,
        }),
      });
      const data = (await res.json()) as ChatResponse | { error: string };
      if (!res.ok || "error" in data) {
        throw new Error("error" in data ? data.error : `HTTP ${res.status}`);
      }
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.message.content,
        },
      ]);
      if (data.conversationId) setConversationId(data.conversationId);
      if (data.leadCreated) setLeadCreated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="flex h-[70vh] min-h-[480px] flex-col">
      <div
        ref={scrollRef}
        role="log"
        aria-live="polite"
        className="flex-1 overflow-y-auto rounded-3xl bg-surface p-6 shadow-card"
      >
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <span className="eyebrow">AI-chatt</span>
            <p className="max-w-md text-sm text-muted">
              Börja med att berätta om din idé. Fråga vidare om du vill veta mer om
              Movexum eller vad vi letar efter.
            </p>
          </div>
        )}
        <div className="space-y-6">
          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <Bubble key={m.id} m={m} />
            ))}
          </AnimatePresence>
          {loading && <Typing />}
          {leadCreated && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2 rounded-2xl bg-accent-soft p-4 text-xs text-fg-deep"
            >
              <CheckCircle className="mt-0.5 h-4 w-4 flex-none" />
              <span>
                Tack! Vi har noterat dina uppgifter. Någon från Movexum hör av sig.
              </span>
            </motion.div>
          )}
        </div>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 flex items-start gap-2 rounded-2xl bg-surface p-3 text-xs text-danger shadow-soft"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
          <div className="flex-1 break-words font-mono">{error}</div>
        </motion.div>
      )}

      <div className="mt-4 flex flex-col gap-2">
        <div className="relative flex items-end gap-2 rounded-full bg-surface p-2 pl-5 shadow-card">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Skriv ditt meddelande..."
            rows={1}
            disabled={loading}
            aria-label="Meddelande till AI-assistenten"
            className="flex-1 resize-none bg-transparent py-2 text-sm text-fg placeholder:text-subtle focus:outline-none disabled:opacity-50"
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className={cn(
              "flex h-10 w-10 flex-none items-center justify-center rounded-full transition",
              input.trim() && !loading
                ? "bg-fg text-white hover:bg-fg-deep"
                : "bg-bg text-subtle",
            )}
            aria-label="Skicka meddelande"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center justify-center text-[10px] uppercase tracking-wider text-subtle">
          <span>Powered by {productName} · AI-assisterad</span>
        </div>
      </div>
    </div>
  );
}

function Bubble({ m }: { m: ChatMessage }) {
  const isUser = m.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}
    >
      <div
        className={cn(
          "flex h-9 w-9 flex-none items-center justify-center rounded-full shadow-soft",
          isUser ? "bg-fg text-white" : "bg-accent-soft text-fg-deep",
        )}
      >
        {isUser ? <User2 className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
      </div>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser ? "bg-fg text-white" : "bg-bg text-fg-deep",
        )}
      >
        <div className="whitespace-pre-wrap break-words">{m.content}</div>
      </div>
    </motion.div>
  );
}

function Typing() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
      <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-accent-soft text-fg-deep shadow-soft">
        <Sparkles className="h-4 w-4 animate-pulse" />
      </div>
      <div className="rounded-2xl bg-bg px-4 py-3">
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-accent"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.14 }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
