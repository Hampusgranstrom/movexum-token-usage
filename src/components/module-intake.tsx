"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { ModuleWizard } from "./module-wizard";
import { ModuleChat } from "./module-chat";
import { ModuleQuiz } from "./module-quiz";
import type { QuestionWithVariant } from "@/lib/questions";
import type { BrandSettings } from "@/lib/brand";

type PublicModule = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  flow_type: "wizard" | "chat" | "hybrid" | "quiz";
  welcome_title: string | null;
  welcome_body: string | null;
  consent_text: string;
  consent_version: number;
  accent_color: string | null;
  hero_eyebrow: string | null;
  require_email: boolean;
  require_phone: boolean;
};

type FetchedConfig = {
  module: PublicModule;
  brand: BrandSettings;
  questions: QuestionWithVariant[];
};

function ensureSessionId(slug: string): string {
  if (typeof window === "undefined") return "ssr";
  const key = `mvx-session:${slug}`;
  let v = window.localStorage.getItem(key);
  if (!v) {
    v = crypto.randomUUID();
    window.localStorage.setItem(key, v);
  }
  return v;
}

export function ModuleIntake({
  slug,
  brand,
}: {
  slug: string;
  brand: BrandSettings;
}) {
  const [sessionId, setSessionId] = useState<string>("");
  const [config, setConfig] = useState<FetchedConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [consentGiven, setConsentGiven] = useState(false);
  const [consentSubmitting, setConsentSubmitting] = useState(false);

  useEffect(() => {
    setSessionId(ensureSessionId(slug));
  }, [slug]);

  useEffect(() => {
    if (!sessionId) return;
    let alive = true;
    (async () => {
      try {
        const url = new URL(
          `/api/modules/${slug}`,
          window.location.origin,
        );
        url.searchParams.set("sessionId", sessionId);
        // forward UTM params if present
        const incoming = new URLSearchParams(window.location.search);
        for (const k of [
          "utm_source",
          "utm_medium",
          "utm_campaign",
          "utm_term",
          "utm_content",
        ]) {
          const v = incoming.get(k);
          if (v) url.searchParams.set(k, v);
        }
        const res = await fetch(url.toString());
        if (!res.ok) {
          setError("Modulen kunde inte laddas");
          return;
        }
        const data = (await res.json()) as FetchedConfig;
        if (alive) setConfig(data);
      } catch {
        if (alive) setError("Kunde inte kontakta servern");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [sessionId, slug]);

  const giveConsent = async () => {
    if (!config) return;
    setConsentSubmitting(true);
    try {
      const res = await fetch(`/api/modules/${slug}/consent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      if (res.ok) setConsentGiven(true);
    } finally {
      setConsentSubmitting(false);
    }
  };

  const heroEyebrow = useMemo(
    () => config?.module.hero_eyebrow ?? "Hemmaplan för innovativa idéer",
    [config],
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl animate-pulse space-y-4">
        <div className="h-5 w-40 rounded-full bg-bg-deep" />
        <div className="h-14 w-3/4 rounded-full bg-bg-deep" />
        <div className="h-4 w-full rounded-full bg-bg-deep" />
        <div className="mt-8 h-64 rounded-2xl bg-surface shadow-soft" />
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl bg-surface p-8 text-center shadow-card">
        <h1 className="text-2xl">Kunde inte ladda modulen</h1>
        <p className="mt-2 text-sm text-muted">{error ?? "Okänt fel"}</p>
      </div>
    );
  }

  const { module: mod } = config;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-10">
      <header className="space-y-4">
        <div className="flex items-center gap-3">
          {brand.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={brand.logoUrl}
              alt={brand.productName}
              className="h-7 w-auto max-w-[140px] object-contain"
            />
          ) : (
            <span className="text-lg font-semibold tracking-tight text-fg-deep">
              {brand.productName.toLowerCase()}
            </span>
          )}
          <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-fg-deep">
            {mod.name}
          </span>
        </div>

        <div>
          <span className="eyebrow">{heroEyebrow}</span>
          <h1 className="mt-3 text-4xl sm:text-5xl">
            {mod.welcome_title ?? "Berätta om din idé"}
          </h1>
          {mod.welcome_body && (
            <p className="mt-4 max-w-2xl text-base text-muted">
              {mod.welcome_body}
            </p>
          )}
        </div>
      </header>

      {!consentGiven ? (
        <section className="rounded-2xl bg-surface p-8 shadow-card">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">
            Innan vi börjar
          </p>
          <h2 className="mt-3 text-2xl">Så hanterar vi dina uppgifter</h2>
          <p className="mt-4 whitespace-pre-wrap text-sm text-muted">
            {mod.consent_text}
          </p>
          <div
            role="status"
            aria-live="polite"
            className="mt-6 inline-flex items-center rounded-full bg-bg-deep px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-fg-deep"
          >
            AI-assisterad chatt
          </div>
          <button
            onClick={giveConsent}
            disabled={consentSubmitting}
            className="btn-primary mt-6"
          >
            <ArrowRight className="h-4 w-4" />
            {consentSubmitting ? "Ett ögonblick..." : "Jag förstår, starta"}
          </button>
        </section>
      ) : mod.flow_type === "chat" ? (
        <ModuleChat
          slug={slug}
          sessionId={sessionId}
          productName={brand.productName}
        />
      ) : mod.flow_type === "quiz" ? (
        <ModuleQuiz
          slug={slug}
          sessionId={sessionId}
          questions={config.questions}
        />
      ) : (
        <ModuleWizard
          slug={slug}
          sessionId={sessionId}
          questions={config.questions}
          requireEmail={mod.require_email}
          requirePhone={mod.require_phone}
        />
      )}
    </div>
  );
}
