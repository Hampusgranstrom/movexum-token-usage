"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, User2, Sparkles, AlertTriangle, CheckCircle, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { downloadTextReport } from "@/lib/report-download";
import type { ExtractedLeadData, ChatResponse } from "@/lib/types";

type Role = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: Role;
  content: string;
};

type ChatUIProps = {
  productName?: string;
  logoUrl?: string | null;
};

export function ChatUI({ productName = "Startupkompass", logoUrl = null }: ChatUIProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [leadCreated, setLeadCreated] = useState(false);
  const [, setExtractedData] = useState<ExtractedLeadData | null>(null);
  const [report, setReport] = useState<{ fileName: string; content: string } | null>(
    null,
  );

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
        throw new Error("error" in data ? data.error : `HTTP ${res.status}`);
      }

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.message.content,
      };
      setMessages((prev) => [...prev, assistantMessage]);

      if (data.conversationId) setConversationId(data.conversationId);
      if (data.extractedData) setExtractedData(data.extractedData);
      if (data.leadCreated) setLeadCreated(true);
      if (data.report) setReport(data.report);
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
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-3xl flex-col">
      <header className="flex items-center justify-between pb-6">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={productName}
              width="140"
              height="24"
              decoding="async"
              fetchPriority="high"
              className="h-6 w-auto max-w-[140px] object-contain"
            />
          ) : (
            <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted">
              {productName}
            </span>
          )}
        </div>
      </header>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto rounded-3xl bg-surface p-6 shadow-card"
      >
        {messages.length === 0 && !loading && (
          <EmptyState onPick={(text) => setInput(text)} productName={productName} />
        )}

        <div className="space-y-6">
          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
          </AnimatePresence>

          {loading && <TypingIndicator />}

          {leadCreated && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-accent-soft p-4 text-xs text-fg-deep"
            >
              <div className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 flex-none" />
                <span>
                  Tack! Vi har noterat dina uppgifter. Någon från Movexum hör av sig.
                </span>
              </div>
              {report && (
                <button
                  onClick={() => downloadTextReport(report.fileName, report.content)}
                  className="btn-secondary mt-3"
                >
                  <Download className="h-4 w-4" />
                  Ladda ned min minirapport
                </button>
              )}
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
            placeholder="Berätta om din startup-idé..."
            rows={1}
            disabled={loading}
            className="flex-1 resize-none bg-transparent py-2 text-sm text-fg placeholder:text-subtle focus:outline-none disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
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

        <p className="px-2 text-center text-[10px] leading-relaxed text-subtle">
          Genom att chatta godkänner du att Movexum behandlar dina uppgifter för
          att kunna kontakta dig. Läs mer i vår integritetspolicy. Dela inte
          känsliga personuppgifter i chatten.
        </p>

        <div className="flex items-center justify-center text-[10px] uppercase tracking-wider text-subtle">
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
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
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
              transition={{
                duration: 1.1,
                repeat: Infinity,
                delay: i * 0.14,
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function EmptyState({
  onPick,
  productName,
}: {
  onPick: (text: string) => void;
  productName: string;
}) {
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
      transition={{ duration: 0.4 }}
      className="flex h-full flex-col items-center justify-center gap-8 py-12 text-center"
    >
      <div className="space-y-3">
        <h2 className="text-4xl sm:text-5xl">
          Hemmaplan för <br />
          <span className="text-accent">innovativa idéer</span>
        </h2>
        <p className="mx-auto max-w-md text-sm text-muted">
          Berätta om din startup-idé så utforskar vi den tillsammans. Movexum
          erbjuder kostnadsfri rådgivning och stöd för idébärare i Gävleborg.
        </p>
      </div>
      <div className="grid w-full max-w-xl gap-2 sm:grid-cols-2">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            className="rounded-full bg-bg px-4 py-3 text-left text-xs text-muted transition hover:bg-surface hover:text-fg-deep hover:shadow-soft"
          >
            {s}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
