"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Compass, User2, AlertTriangle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExtractedLeadData, ChatResponse } from "@/lib/types";

type Role = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: Role;
  content: string;
};

export function ChatUI() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [leadCreated, setLeadCreated] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedLeadData | null>(null);

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

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };

    const next = [...messages, userMessage];
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
        }),
      });

      const data = (await res.json()) as ChatResponse | { error: string };

      if (!res.ok || "error" in data) {
        throw new Error(
          "error" in data ? data.error : `HTTP ${res.status}`,
        );
      }

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.message.content,
      };
      setMessages((prev) => [...prev, assistantMessage]);

      if (data.conversationId) {
        setConversationId(data.conversationId);
      }
      if (data.extractedData) {
        setExtractedData(data.extractedData);
      }
      if (data.leadCreated) {
        setLeadCreated(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="relative z-10 mx-auto flex h-[calc(100vh-4rem)] max-w-3xl flex-col">
      {/* Header */}
      <header className="flex items-center justify-between pb-6">
        <div className="flex items-center gap-3">
          <Compass className="h-5 w-5 text-accent-leads" />
          <span className="text-xs font-medium uppercase tracking-[0.16em] text-text-secondary">
            Startupkompass
          </span>
        </div>
      </header>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto rounded-2xl border border-bg-border bg-bg-card/40 p-6 backdrop-blur-sm"
      >
        {messages.length === 0 && !loading && (
          <EmptyState onPick={(text) => setInput(text)} />
        )}

        <div className="space-y-6">
          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
          </AnimatePresence>

          {loading && <TypingIndicator />}

          {/* Lead created notification */}
          {leadCreated && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2 rounded-lg border border-accent-funnel/40 bg-accent-funnel/10 p-3 text-xs text-accent-funnel"
            >
              <CheckCircle className="mt-0.5 h-4 w-4 flex-none" />
              <span>
                Tack! Vi har noterat dina uppgifter. Någon från Movexum kommer
                att höra av sig.
              </span>
            </motion.div>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 flex items-start gap-2 rounded-lg border border-accent-danger/40 bg-accent-danger/10 p-3 text-xs text-accent-danger"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
          <div className="flex-1 break-words font-mono">{error}</div>
        </motion.div>
      )}

      {/* Input */}
      <div className="mt-4 flex flex-col gap-2">
        <div className="card relative flex items-end gap-2 p-3">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Berätta om din startup-idé..."
            rows={1}
            disabled={loading}
            className="flex-1 resize-none bg-transparent px-2 py-1 font-sans text-sm text-text-primary placeholder:text-text-muted focus:outline-none disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg transition-all",
              input.trim() && !loading
                ? "bg-accent-leads text-bg-base shadow-[0_0_20px_-4px_#22D3EE] hover:brightness-110"
                : "bg-bg-border text-text-muted",
            )}
            aria-label="Skicka meddelande"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center justify-center text-[10px] uppercase tracking-wider text-text-muted">
          <span>Powered by Movexum</span>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}
    >
      <div
        className={cn(
          "flex h-8 w-8 flex-none items-center justify-center rounded-full border",
          isUser
            ? "border-accent-leads/40 bg-accent-leads/10 text-accent-leads"
            : "border-accent-funnel/40 bg-accent-funnel/10 text-accent-funnel",
        )}
      >
        {isUser ? (
          <User2 className="h-4 w-4" />
        ) : (
          <Compass className="h-4 w-4" />
        )}
      </div>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "bg-accent-leads/10 text-text-primary"
            : "border border-bg-border bg-bg-base/60 text-text-primary",
        )}
      >
        <div className="whitespace-pre-wrap break-words">{message.content}</div>
      </div>
    </motion.div>
  );
}

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex gap-3"
    >
      <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full border border-accent-funnel/40 bg-accent-funnel/10 text-accent-funnel">
        <Compass className="h-4 w-4 animate-pulse" />
      </div>
      <div className="rounded-2xl border border-bg-border bg-bg-base/60 px-4 py-3">
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-accent-funnel"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.15,
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  const suggestions = [
    "Jag har en idé om en app för...",
    "Jag vill starta företag men vet inte var jag ska börja",
    "Berätta mer om Movexums inkubator",
    "Vad behöver jag för att komma igång med min startup?",
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="flex h-full flex-col items-center justify-center gap-8 py-12 text-center"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-accent-leads/30 bg-accent-leads/10">
        <Compass className="h-8 w-8 text-accent-leads" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">
          Välkommen till Startupkompass
        </h2>
        <p className="max-w-md text-sm text-text-secondary">
          Berätta om din startup-idé så hjälper jag dig utforska den.
          Movexum erbjuder kostnadsfri rådgivning och stöd för idébärare
          i Gävleborg.
        </p>
      </div>
      <div className="grid w-full max-w-xl gap-2 sm:grid-cols-2">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            className="rounded-xl border border-bg-border bg-bg-card/40 p-3 text-left text-xs text-text-secondary transition-colors hover:border-accent-leads/30 hover:bg-accent-leads/5 hover:text-text-primary"
          >
            {s}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
