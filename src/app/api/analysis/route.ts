import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { AnalysisSummary, LeadStatus } from "@/lib/types";
import { STATUS_CONFIG } from "@/lib/types";
import { DEFAULT_SOURCES } from "@/config/lead-sources";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PeriodRow = { created_at: string };
type LeadRow = {
  created_at: string;
  status: LeadStatus;
  score: number | null;
  source_id: string;
  municipality: string | null;
};
type MessageRow = {
  created_at: string;
  role: "system" | "user" | "assistant";
  input_tokens: number | null;
  output_tokens: number | null;
};
type ModuleRow = { id: string; slug: string; name: string };
type ModuleSessionRow = {
  module_id: string;
  completed_at: string | null;
  lead_id: string | null;
};
type EventRow = { event_type: string };

function toDateKey(iso: string): string {
  return iso.slice(0, 10);
}

function countPerDay(rows: PeriodRow[], days: number): Array<{ date: string; count: number }> {
  const now = new Date();
  const out = new Map<string, number>();

  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(now.getTime() - i * 86400000).toISOString().slice(0, 10);
    out.set(date, 0);
  }

  for (const row of rows) {
    const key = toDateKey(row.created_at);
    if (!out.has(key)) continue;
    out.set(key, (out.get(key) ?? 0) + 1);
  }

  return Array.from(out.entries()).map(([date, count]) => ({ date, count }));
}

export async function GET(request: Request) {
  const guard = await requireRole("admin");
  if ("error" in guard) return guard.error;

  const { searchParams } = new URL(request.url);
  const days = Math.min(180, Math.max(7, Number(searchParams.get("days")) || 30));

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase ej konfigurerad." }, { status: 500 });
  }

  const sinceDate = new Date(Date.now() - days * 86400000).toISOString();

  try {
    const [
      leadsResult,
      conversationsResult,
      messagesResult,
      modulesResult,
      moduleSessionsResult,
      eventsResult,
    ] = await Promise.all([
      supabase
        .from("leads")
        .select("created_at,status,score,source_id,municipality")
        .gte("created_at", sinceDate),
      supabase
        .from("conversations")
        .select("created_at")
        .gte("created_at", sinceDate),
      supabase
        .from("messages")
        .select("created_at,role,input_tokens,output_tokens")
        .gte("created_at", sinceDate),
      supabase
        .from("modules")
        .select("id,slug,name")
        .eq("is_active", true),
      supabase
        .from("module_sessions")
        .select("module_id,completed_at,lead_id")
        .gte("started_at", sinceDate),
      supabase
        .from("analytics_events")
        .select("event_type")
        .gte("created_at", sinceDate),
    ]);

    if (leadsResult.error) throw leadsResult.error;
    if (conversationsResult.error) throw conversationsResult.error;
    if (messagesResult.error) throw messagesResult.error;
    if (modulesResult.error) throw modulesResult.error;
    if (moduleSessionsResult.error) throw moduleSessionsResult.error;
    if (eventsResult.error) throw eventsResult.error;

    const leads = (leadsResult.data ?? []) as LeadRow[];
    const conversations = (conversationsResult.data ?? []) as PeriodRow[];
    const messages = (messagesResult.data ?? []) as MessageRow[];
    const modules = (modulesResult.data ?? []) as ModuleRow[];
    const moduleSessions = (moduleSessionsResult.data ?? []) as ModuleSessionRow[];
    const events = (eventsResult.data ?? []) as EventRow[];

    const leadsPeriod = leads.length;
    const accepted = leads.filter((l) => l.status === "accepted").length;
    const leadToAcceptedRate = leadsPeriod > 0 ? accepted / leadsPeriod : 0;

    const scoredLeads = leads.filter((l) => typeof l.score === "number");
    const avgScore =
      scoredLeads.length > 0
        ? scoredLeads.reduce((sum, l) => sum + Number(l.score), 0) / scoredLeads.length
        : 0;

    const completedSessions = moduleSessions.filter((s) => s.completed_at !== null).length;
    const sessionsWithLead = moduleSessions.filter((s) => s.lead_id !== null).length;
    const leadCaptureRate = completedSessions > 0 ? sessionsWithLead / completedSessions : 0;

    const assistantMessages = messages.filter((m) => m.role === "assistant");
    const totalOutputTokens = messages.reduce((sum, m) => sum + Number(m.output_tokens ?? 0), 0);
    const avgOutputTokensPerAssistantMessage =
      assistantMessages.length > 0 ? totalOutputTokens / assistantMessages.length : 0;

    const leadsPerDay = countPerDay(leads, days);
    const conversationsPerDay = countPerDay(conversations, days);

    const tokenMap = new Map<string, { input: number; output: number }>();
    for (const day of leadsPerDay) {
      tokenMap.set(day.date, { input: 0, output: 0 });
    }
    for (const m of messages) {
      const key = toDateKey(m.created_at);
      if (!tokenMap.has(key)) continue;
      const existing = tokenMap.get(key) ?? { input: 0, output: 0 };
      tokenMap.set(key, {
        input: existing.input + Number(m.input_tokens ?? 0),
        output: existing.output + Number(m.output_tokens ?? 0),
      });
    }
    const tokensPerDay = Array.from(tokenMap.entries())
      .map(([date, v]) => ({ date, input: v.input, output: v.output }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const sourceBase = DEFAULT_SOURCES.map((s) => ({
      source_id: s.id,
      label: s.label,
      total: 0,
      accepted: 0,
      acceptedRate: 0,
    }));
    const sourceMap = new Map<string, (typeof sourceBase)[number]>(
      sourceBase.map((s) => [s.source_id, s]),
    );
    for (const lead of leads) {
      const source = sourceMap.get(lead.source_id);
      if (!source) continue;
      source.total += 1;
      if (lead.status === "accepted") source.accepted += 1;
    }
    const sourcePerformance = Array.from(sourceMap.values())
      .map((s) => ({
        ...s,
        acceptedRate: s.total > 0 ? s.accepted / s.total : 0,
      }))
      .filter((s) => s.total > 0)
      .sort((a, b) => b.total - a.total);

    const modulePerfMap = new Map(
      modules.map((m) => [
        m.id,
        {
          module_id: m.id,
          slug: m.slug,
          name: m.name,
          started: 0,
          completed: 0,
          leadsCreated: 0,
          completionRate: 0,
          leadRate: 0,
        },
      ]),
    );

    for (const session of moduleSessions) {
      const row = modulePerfMap.get(session.module_id);
      if (!row) continue;
      row.started += 1;
      if (session.completed_at) row.completed += 1;
      if (session.lead_id) row.leadsCreated += 1;
    }

    const modulePerformance = Array.from(modulePerfMap.values())
      .map((m) => ({
        ...m,
        completionRate: m.started > 0 ? m.completed / m.started : 0,
        leadRate: m.started > 0 ? m.leadsCreated / m.started : 0,
      }))
      .sort((a, b) => b.started - a.started);

    const statusOrder: LeadStatus[] = [
      "new",
      "contacted",
      "meeting-booked",
      "evaluating",
      "accepted",
      "declined",
    ];
    const statusCounts = new Map<LeadStatus, number>(statusOrder.map((s) => [s, 0]));
    for (const lead of leads) {
      statusCounts.set(lead.status, (statusCounts.get(lead.status) ?? 0) + 1);
    }
    const statusBreakdown = statusOrder.map((status) => ({
      status,
      label: STATUS_CONFIG[status].label,
      count: statusCounts.get(status) ?? 0,
    }));

    const municipalityMap = new Map<string, number>();
    for (const lead of leads) {
      const m = lead.municipality?.trim();
      if (!m) continue;
      municipalityMap.set(m, (municipalityMap.get(m) ?? 0) + 1);
    }
    const topMunicipalities = Array.from(municipalityMap.entries())
      .map(([municipality, count]) => ({ municipality, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const eventMap = new Map<string, number>();
    for (const e of events) {
      eventMap.set(e.event_type, (eventMap.get(e.event_type) ?? 0) + 1);
    }
    const eventCounts = Array.from(eventMap.entries())
      .map(([eventType, count]) => ({ eventType, count }))
      .sort((a, b) => b.count - a.count);

    const response: AnalysisSummary = {
      periodDays: days,
      generatedAt: new Date().toISOString(),
      kpis: {
        leadsPeriod,
        conversationsPeriod: conversations.length,
        messagesPeriod: messages.length,
        leadToAcceptedRate,
        leadCaptureRate,
        avgScore: Number(avgScore.toFixed(1)),
        avgOutputTokensPerAssistantMessage: Number(
          avgOutputTokensPerAssistantMessage.toFixed(1),
        ),
      },
      series: {
        leadsPerDay,
        conversationsPerDay,
        tokensPerDay,
      },
      sourcePerformance,
      modulePerformance,
      statusBreakdown,
      topMunicipalities,
      eventCounts,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("[api/analysis] failed:", err);
    return NextResponse.json(
      { error: "Kunde inte hämta analysdata." },
      { status: 500 },
    );
  }
}
