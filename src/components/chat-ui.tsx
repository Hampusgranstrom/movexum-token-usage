"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, User2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { cn, formatNumber } from "@/lib/utils";

type Role = "user" | "assistant";

type Message = {
  id: string;
  role: Role;
  content: string;
};

type UsageInfo = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

export function ChatUI() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUsage, setLastUsage] = useState<UsageInfo | null>(null);
  const [totalUsage, setTotalUsage] = useState<UsageInfo>({
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scrolla till botten när nya meddelanden kommer
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [input]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const userMessage: Message = {
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
        }),
      });

      const data = (await res.json()) as
        | {
            message: { role: "assistant"; content: string };
            usage: UsageInfo;
            model: string;
          }
        | { error: string };

      if (!res.ok || "error" in data) {
        throw new Error(
          "error" in data ? data.error : `HTTP ${res.status}`,
        );
      }

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.message.content,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setLastUsage(data.usage);
      setTotalUsage((prev) => ({
        inputTokens: prev.inputTokens + data.usage.inputTokens,
        outputTokens: prev.outputTokens + data.usage.outputTokens,
        totalTokens: prev.totalTokens + data.usage.totalTokens,
      }));
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
          <div className="h-2 w-2 animate-pulse rounded-full bg-accent-tokens" />
          <span className="text-xs font-medium uppercase tracking-[0.16em] text-text-secondary">
            Movexum · AI Chat
          </span>
          <span className="rounded-full border border-accent-tokens/30 bg-accent-tokens/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-tokens">
            gpt-4o-mini
          </span>
        </div>
        <Link
          href="/"
          className="text-xs font-medium uppercase tracking-[0.14em] text-text-secondary transition-colors hover:text-text-primary"
        >
          ← Dashboard
        </Link>
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
        </div>
      </div>

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 flex items-start gap-2 rounded-lg border border-accent-co2Danger/40 bg-accent-co2Danger/10 p-3 text-xs text-accent-co2Danger"
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
            placeholder="Skriv ett meddelande… (Enter för att skicka, Shift+Enter för ny rad)"
            rows={1}
            disabled={loading}
            className="num flex-1 resize-none bg-transparent px-2 py-1 font-sans text-sm text-text-primary placeholder:text-text-muted focus:outline-none disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg transition-all",
              input.trim() && !loading
                ? "bg-accent-tokens text-bg-base shadow-[0_0_20px_-4px_#22D3EE] hover:brightness-110"
                : "bg-bg-border text-text-muted",
            )}
            aria-label="Skicka meddelande"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-text-muted">
          <span>
            Varje meddelande loggas till Supabase och syns på dashboarden
          </span>
          <span className="num flex gap-3">
            {lastUsage && (
              <span>
                Senaste: {formatNumber(lastUsage.totalTokens)} tokens
              </span>
            )}
            <span>
              Session: {formatNumber(totalUsage.totalTokens)} tokens
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "flex gap-3",
        isUser ? "flex-row-reverse" : "flex-row",
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 flex-none items-center justify-center rounded-full border",
          isUser
            ? "border-accent-tokens/40 bg-accent-tokens/10 text-accent-tokens"
            : "border-accent-co2/40 bg-accent-co2/10 text-accent-co2",
        )}
      >
        {isUser ? (
          <User2 className="h-4 w-4" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
      </div>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "bg-accent-tokens/10 text-text-primary"
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
      <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full border border-accent-co2/40 bg-accent-co2/10 text-accent-co2">
        <Sparkles className="h-4 w-4 animate-pulse" />
      </div>
      <div className="rounded-2xl border border-bg-border bg-bg-base/60 px-4 py-3">
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-accent-co2"
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
    "Sammanfatta dagens viktigaste AI-nyheter",
    "Skriv ett utkast till veckoretur för teamet",
    "Förklara LLM-kostnader för en icke-teknisk kollega",
    "Ge mig 5 idéer till Movexums nästa hackday",
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="flex h-full flex-col items-center justify-center gap-8 py-12 text-center"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-accent-tokens/30 bg-accent-tokens/10">
        <Sparkles className="h-8 w-8 text-accent-tokens" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">
          Movexums AI-assistent
        </h2>
        <p className="max-w-md text-sm text-text-secondary">
          All din användning spåras automatiskt. Tokens, energi och CO₂e
          uppdateras på dashboarden direkt efter varje meddelande.
        </p>
      </div>
      <div className="grid w-full max-w-xl gap-2 sm:grid-cols-2">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            className="rounded-xl border border-bg-border bg-bg-card/40 p-3 text-left text-xs text-text-secondary transition-colors hover:border-accent-tokens/30 hover:bg-accent-tokens/5 hover:text-text-primary"
          >
            {s}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
