"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, Phone, Building, MapPin, Sparkles, Download, Trash2 } from "lucide-react";
import { StatusBadge } from "./status-badge";
import { MetricInfo } from "./metric-info";
import { cn, formatDate } from "@/lib/utils";
import type { Lead, LeadStatus, Conversation, LeadQuestionResponse } from "@/lib/types";
import { STATUS_CONFIG } from "@/lib/types";

const STATUS_OPTIONS: LeadStatus[] = [
  "new", "contacted", "meeting-booked", "evaluating", "accepted", "declined",
];

export function LeadDetail({
  id,
  canManagePii = false,
}: {
  id: string;
  canManagePii?: boolean;
}) {
  const router = useRouter();
  const [lead, setLead] = useState<Lead | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [responses, setResponses] = useState<LeadQuestionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/leads/${id}`);
        if (!res.ok) {
          router.push("/leads");
          return;
        }
        const data = await res.json();
        setLead(data.lead);
        setConversations(data.conversations ?? []);
        setResponses(data.responses ?? []);
        setNotes(data.lead.notes ?? "");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, router]);

  const updateLead = async (updates: Record<string, unknown>) => {
    if (!lead) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...updates, _oldStatus: lead.status }),
      });
      if (res.ok) {
        const data = await res.json();
        setLead(data.lead);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotes = () => {
    updateLead({ notes });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-32 animate-pulse rounded bg-surface" />
        <div className="h-64 animate-pulse rounded-2xl bg-surface shadow-soft" />
      </div>
    );
  }

  if (!lead) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/leads")}
          className="icon-btn-outline"
          aria-label="Tillbaka"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-4xl">{lead.name}</h1>
          <p className="mt-1 text-sm text-muted">
            Skapad {formatDate(lead.created_at)}
          </p>
        </div>
        <StatusBadge status={lead.status} />
        {lead.score != null && (
          <div className="flex items-center gap-2 rounded-full bg-surface px-4 py-1.5 shadow-soft">
            <Sparkles className="h-4 w-4 text-accent" />
            <span className="font-mono text-sm font-medium text-fg-deep">
              {lead.score}/100
            </span>
            <MetricInfo text="AI-poängen i chatten viktas i fyra lika delar (0-25 poäng vardera): 1) idéns tydlighet och problemlösning, 2) marknadspotential, 3) grundarens beredskap och engagemang, 4) passform med Movexums inkubator. Totalen blir 0-100. Formulärflödet utan quiz poängsätts inte." />
          </div>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <div className="card p-6">
            <h3 className="eyebrow mb-4">
              Kontakt
            </h3>
            <div className="space-y-3">
              {lead.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-subtle" />
                  <a href={`mailto:${lead.email}`} className="hover:underline">
                    {lead.email}
                  </a>
                </div>
              )}
              {lead.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-subtle" />
                  <span>{lead.phone}</span>
                </div>
              )}
              {lead.organization && (
                <div className="flex items-center gap-3">
                  <Building className="h-4 w-4 text-subtle" />
                  <span>{lead.organization}</span>
                </div>
              )}
              {lead.municipality && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-subtle" />
                  <span>{lead.municipality}</span>
                </div>
              )}
              {!lead.email && !lead.phone && !lead.organization && !lead.municipality && (
                <p className="text-sm text-muted">
                  Ingen kontaktinfo registrerad
                </p>
              )}
            </div>
          </div>

          {lead.idea_summary && (
            <div className="card p-6">
              <h3 className="eyebrow mb-4">
                Startup-idé
              </h3>
              <p className="text-fg">{lead.idea_summary}</p>
              {lead.idea_category && (
                <span className="mt-3 inline-block rounded-full bg-bg px-2.5 py-0.5 text-xs text-muted">
                  {lead.idea_category}
                </span>
              )}
            </div>
          )}

          {lead.score_reasoning && (
            <div className="card p-6">
              <h3 className="eyebrow mb-4">
                AI-bedömning
              </h3>
              <p className="text-muted">{lead.score_reasoning}</p>
            </div>
          )}

          {responses.length > 0 && (
            <div className="card p-6">
              <h3 className="eyebrow mb-4">Respondentens svar</h3>
              <div className="space-y-2">
                {responses.map((r) => (
                  <div key={r.id} className="rounded-2xl bg-bg px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs text-muted">{r.question_key}</span>
                      {r.variant_label && (
                        <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] text-muted">
                          {r.variant_label}
                        </span>
                      )}
                    </div>
                    {r.question_text && (
                      <p className="mt-1 text-sm text-fg-deep">{r.question_text}</p>
                    )}
                    <p className="mt-1 text-sm text-muted">
                      {r.skipped ? "(hoppad)" : formatAnswer(r.answer)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card p-6">
            <h3 className="eyebrow mb-4">
              Anteckningar
            </h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="textarea resize-y"
              placeholder="Skriv anteckningar..."
            />
            <button
              onClick={handleSaveNotes}
              disabled={saving || notes === (lead.notes ?? "")}
              className="btn-primary mt-4"
            >
              {saving ? "Sparar..." : "Spara anteckningar"}
            </button>
          </div>

          {conversations.length > 0 && (
            <div className="card p-6">
              <h3 className="eyebrow mb-4">
                AI-konversationer
              </h3>
              <div className="space-y-2">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className="flex items-center justify-between rounded-full bg-bg px-4 py-2.5"
                  >
                    <span className="text-sm text-fg-deep">
                      {formatDate(conv.created_at)}
                    </span>
                    <span className="text-xs text-muted">
                      {conv.total_input_tokens + conv.total_output_tokens} tokens
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="card p-6">
            <h3 className="eyebrow mb-4">
              Ändra status
            </h3>
            <div className="space-y-1.5">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => updateLead({ status: s })}
                  disabled={saving || lead.status === s}
                  className={cn(
                    "w-full rounded-full px-4 py-2 text-left text-sm transition",
                    lead.status === s
                      ? "bg-fg font-medium text-white"
                      : "text-muted hover:bg-bg hover:text-fg",
                    saving && "opacity-50",
                  )}
                >
                  {STATUS_CONFIG[s].label}
                </button>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <h3 className="eyebrow mb-4">
              Källa
            </h3>
            <p className="text-sm text-fg">{lead.source_id}</p>
            {lead.source_detail && (
              <p className="mt-1 text-xs text-muted">{lead.source_detail}</p>
            )}
          </div>

          <div className="card p-6">
            <h3 className="eyebrow mb-4">
              Tilldelad
            </h3>
            <input
              type="text"
              value={lead.assigned_to ?? ""}
              onChange={(e) => setLead({ ...lead, assigned_to: e.target.value })}
              onBlur={() => updateLead({ assigned_to: lead.assigned_to })}
              placeholder="Ange namn..."
              className="input"
            />
          </div>

          {canManagePii && (
            <div className="card p-6">
              <h3 className="eyebrow mb-4">GDPR</h3>
              <p className="text-xs text-muted">
                Art. 15 (export) och Art. 17 (radering). Loggas i
                säkerhetsevents.
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <a
                  href={`/api/admin/leads/${id}/export`}
                  className="btn-secondary"
                  download
                >
                  <Download className="h-4 w-4" />
                  Exportera JSON
                </a>
                <button
                  onClick={async () => {
                    if (
                      !confirm(
                        "Radera permanent? Cascadar till samtal, meddelanden, svar och samtyckesevents. Åtgärden kan inte ångras.",
                      )
                    )
                      return;
                    const res = await fetch(`/api/admin/leads/${id}/erase`, {
                      method: "DELETE",
                    });
                    if (res.ok) router.push("/leads");
                    else alert("Kunde inte radera");
                  }}
                  className="btn-ghost text-danger"
                >
                  <Trash2 className="h-4 w-4" />
                  Radera permanent
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatAnswer(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map((v) => formatAnswer(v)).join(", ");
  }
  try {
    return JSON.stringify(value);
  } catch {
    return "[okänt svar]";
  }
}
