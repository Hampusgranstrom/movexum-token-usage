"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, Phone, Building, Sparkles } from "lucide-react";
import { StatusBadge } from "./status-badge";
import { cn, formatDate } from "@/lib/utils";
import type { Lead, LeadStatus, Conversation } from "@/lib/types";
import { STATUS_CONFIG } from "@/lib/types";

const STATUS_OPTIONS: LeadStatus[] = [
  "new", "contacted", "meeting-booked", "evaluating", "accepted", "declined",
];

export function LeadDetail({ id }: { id: string }) {
  const router = useRouter();
  const [lead, setLead] = useState<Lead | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
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
        <div className="h-8 w-32 animate-pulse rounded bg-bg-border" />
        <div className="card h-64 animate-pulse" />
      </div>
    );
  }

  if (!lead) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/leads")}
          className="rounded-lg p-2 text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-text-primary">
            {lead.name}
          </h1>
          <p className="text-sm text-text-muted">
            Skapad {formatDate(lead.created_at)}
          </p>
        </div>
        <StatusBadge status={lead.status} />
        {lead.score != null && (
          <div className="flex items-center gap-2 rounded-full border border-bg-border px-3 py-1">
            <Sparkles className="h-4 w-4 text-accent-sources" />
            <span className="font-mono text-sm text-text-primary">
              {lead.score}/100
            </span>
          </div>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-5 lg:col-span-2">
          {/* Contact info */}
          <div className="card p-6">
            <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-text-secondary">
              Kontakt
            </h3>
            <div className="space-y-3">
              {lead.email && (
                <div className="flex items-center gap-3 text-text-primary">
                  <Mail className="h-4 w-4 text-text-muted" />
                  <a href={`mailto:${lead.email}`} className="hover:text-accent-leads">
                    {lead.email}
                  </a>
                </div>
              )}
              {lead.phone && (
                <div className="flex items-center gap-3 text-text-primary">
                  <Phone className="h-4 w-4 text-text-muted" />
                  <span>{lead.phone}</span>
                </div>
              )}
              {lead.organization && (
                <div className="flex items-center gap-3 text-text-primary">
                  <Building className="h-4 w-4 text-text-muted" />
                  <span>{lead.organization}</span>
                </div>
              )}
              {!lead.email && !lead.phone && !lead.organization && (
                <p className="text-sm text-text-muted">
                  Ingen kontaktinfo registrerad
                </p>
              )}
            </div>
          </div>

          {/* Idea */}
          {lead.idea_summary && (
            <div className="card p-6">
              <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-text-secondary">
                Startup-idé
              </h3>
              <p className="text-text-primary">{lead.idea_summary}</p>
              {lead.idea_category && (
                <span className="mt-3 inline-block rounded-full border border-bg-border px-2.5 py-0.5 text-xs text-text-secondary">
                  {lead.idea_category}
                </span>
              )}
            </div>
          )}

          {/* Score reasoning */}
          {lead.score_reasoning && (
            <div className="card p-6">
              <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-text-secondary">
                AI-bedömning
              </h3>
              <p className="text-text-secondary">{lead.score_reasoning}</p>
            </div>
          )}

          {/* Notes */}
          <div className="card p-6">
            <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-text-secondary">
              Anteckningar
            </h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-bg-border bg-bg-base p-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-leads focus:outline-none"
              placeholder="Skriv anteckningar..."
            />
            <button
              onClick={handleSaveNotes}
              disabled={saving || notes === (lead.notes ?? "")}
              className="mt-3 rounded-lg bg-accent-leads/10 px-4 py-2 text-sm font-medium text-accent-leads hover:bg-accent-leads/20 disabled:opacity-40 transition-colors"
            >
              {saving ? "Sparar..." : "Spara anteckningar"}
            </button>
          </div>

          {/* Conversations */}
          {conversations.length > 0 && (
            <div className="card p-6">
              <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-text-secondary">
                AI-konversationer
              </h3>
              <div className="space-y-2">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className="flex items-center justify-between rounded-lg border border-bg-border p-3"
                  >
                    <span className="text-sm text-text-primary">
                      {formatDate(conv.created_at)}
                    </span>
                    <span className="text-xs text-text-muted">
                      {conv.total_input_tokens + conv.total_output_tokens} tokens
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Status changer */}
          <div className="card p-6">
            <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-text-secondary">
              Ändra status
            </h3>
            <div className="space-y-1">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => updateLead({ status: s })}
                  disabled={saving || lead.status === s}
                  className={cn(
                    "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
                    lead.status === s
                      ? "bg-bg-base text-text-primary font-medium"
                      : "text-text-secondary hover:bg-bg-base/60 hover:text-text-primary",
                    saving && "opacity-50",
                  )}
                >
                  {STATUS_CONFIG[s].label}
                </button>
              ))}
            </div>
          </div>

          {/* Source info */}
          <div className="card p-6">
            <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-text-secondary">
              Källa
            </h3>
            <p className="text-sm text-text-primary">{lead.source_id}</p>
            {lead.source_detail && (
              <p className="mt-1 text-xs text-text-muted">
                {lead.source_detail}
              </p>
            )}
          </div>

          {/* Assigned */}
          <div className="card p-6">
            <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-text-secondary">
              Tilldelad
            </h3>
            <input
              type="text"
              value={lead.assigned_to ?? ""}
              onChange={(e) => setLead({ ...lead, assigned_to: e.target.value })}
              onBlur={() => updateLead({ assigned_to: lead.assigned_to })}
              placeholder="Ange namn..."
              className="w-full rounded-lg border border-bg-border bg-bg-base px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-leads focus:outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
