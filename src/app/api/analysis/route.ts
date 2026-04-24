import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { AnalysisSummary, LeadStatus } from "@/lib/types";
import { STATUS_CONFIG } from "@/lib/types";
import { DEFAULT_SOURCES } from "@/config/lead-sources";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type LeadRow = {
  id: string;
  created_at: string;
  status: LeadStatus;
  score: number | null;
  module_id: string | null;
  source_id: string;
  municipality: string | null;
};
type ModuleSessionRow = {
  module_id: string;
  session_id: string;
  started_at: string;
  completed_at: string | null;
  lead_id: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referer: string | null;
  locale: string | null;
  ip_hash: string | null;
};
type ConversationRow = {
  id: string;
  session_id: string;
  module_id: string | null;
  created_at: string;
};
type MessageRow = {
  conversation_id: string;
  created_at: string;
  role: "system" | "user" | "assistant";
  input_tokens: number | null;
  output_tokens: number | null;
};
type ResponseRow = {
  session_id: string;
  created_at: string;
  response_time_ms: number | null;
  skipped: boolean;
};
type ConsentRow = {
  module_id: string | null;
  session_id: string;
};
type ModuleRow = { id: string; slug: string; name: string };
type EventRow = { event_type: string; created_at: string };
type SourceRow = { id: string; label: string };

function sessionKey(moduleId: string, sessionId: string): string {
  return `${moduleId}:${sessionId}`;
}

function toDateKey(iso: string): string {
  return iso.slice(0, 10);
}

function buildEmptyDayMap(days: number): Map<string, number> {
  const now = new Date();
  const out = new Map<string, number>();

  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(now.getTime() - i * 86400000).toISOString().slice(0, 10);
    out.set(date, 0);
  }

  return out;
}

function countPerDay(rows: Array<{ created_at: string }>, days: number): Array<{ date: string; count: number }> {
  const out = buildEmptyDayMap(days);

  for (const row of rows) {
    const key = toDateKey(row.created_at);
    if (!out.has(key)) continue;
    out.set(key, (out.get(key) ?? 0) + 1);
  }

  return Array.from(out.entries()).map(([date, count]) => ({ date, count }));
}

function parseReferrerHost(value: string | null): string {
  if (!value) return "(direct)";
  try {
    return new URL(value).host || "(direct)";
  } catch {
    return "(direct)";
  }
}

function toRate(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return numerator / denominator;
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
      sessionsResult,
      conversationsResult,
      messagesResult,
      responsesResult,
      consentResult,
      sourcesResult,
      modulesResult,
      eventsResult,
    ] = await Promise.all([
      supabase
        .from("leads")
        .select("id,created_at,status,score,module_id,source_id,municipality")
        .gte("created_at", sinceDate),
      supabase
        .from("module_sessions")
        .select(
          "module_id,session_id,started_at,completed_at,lead_id,utm_source,utm_medium,utm_campaign,referer,locale,ip_hash",
        )
        .gte("started_at", sinceDate),
      supabase
        .from("conversations")
        .select("id,session_id,module_id,created_at")
        .gte("created_at", sinceDate),
      supabase
        .from("messages")
        .select("conversation_id,created_at,role,input_tokens,output_tokens")
        .gte("created_at", sinceDate),
      supabase
        .from("question_responses")
        .select("session_id,created_at,response_time_ms,skipped")
        .gte("created_at", sinceDate),
      supabase
        .from("consent_events")
        .select("module_id,session_id")
        .gte("accepted_at", sinceDate),
      supabase.from("lead_sources").select("id,label"),
      supabase
        .from("modules")
        .select("id,slug,name"),
      supabase
        .from("analytics_events")
        .select("event_type,created_at")
        .gte("created_at", sinceDate),
    ]);

    if (leadsResult.error) throw leadsResult.error;
    if (sessionsResult.error) throw sessionsResult.error;
    if (conversationsResult.error) throw conversationsResult.error;
    if (messagesResult.error) throw messagesResult.error;
    if (responsesResult.error) throw responsesResult.error;
    if (consentResult.error) throw consentResult.error;
    if (sourcesResult.error) throw sourcesResult.error;
    if (modulesResult.error) throw modulesResult.error;
    if (eventsResult.error) throw eventsResult.error;

    const leads = (leadsResult.data ?? []) as LeadRow[];
    const sessions = (sessionsResult.data ?? []) as ModuleSessionRow[];
    const conversations = (conversationsResult.data ?? []) as ConversationRow[];
    const messages = (messagesResult.data ?? []) as MessageRow[];
    const responses = (responsesResult.data ?? []) as ResponseRow[];
    const consentEvents = (consentResult.data ?? []) as ConsentRow[];
    const sourceRows = (sourcesResult.data ?? []) as SourceRow[];
    const modules = (modulesResult.data ?? []) as ModuleRow[];
    const events = (eventsResult.data ?? []) as EventRow[];

    const modulesById = new Map(modules.map((m) => [m.id, m]));
    const leadsById = new Map(leads.map((l) => [l.id, l]));

    const sessionCount = sessions.length;
    const users = new Set(
      sessions
        .map((s) => s.ip_hash)
        .filter((v): v is string => typeof v === "string" && v.length > 0),
    ).size;

    const conversationById = new Map(conversations.map((c) => [c.id, c]));
    const messagesPerSession = new Map<string, number>();
    let totalOutputTokens = 0;
    let assistantMessageCount = 0;
    for (const m of messages) {
      const conv = conversationById.get(m.conversation_id);
      if (!conv?.module_id) continue;
      const key = sessionKey(conv.module_id, conv.session_id);
      messagesPerSession.set(key, (messagesPerSession.get(key) ?? 0) + 1);
      if (m.role === "assistant") {
        totalOutputTokens += Number(m.output_tokens ?? 0);
        assistantMessageCount += 1;
      }
    }

    const answeredBySessionId = new Map<string, number>();
    let answeredTotal = 0;
    let responseTimeTotal = 0;
    let responseTimeCount = 0;
    for (const r of responses) {
      if (!r.skipped) {
        answeredBySessionId.set(r.session_id, (answeredBySessionId.get(r.session_id) ?? 0) + 1);
        answeredTotal += 1;
      }
      if (!r.skipped && typeof r.response_time_ms === "number") {
        responseTimeTotal += r.response_time_ms;
        responseTimeCount += 1;
      }
    }

    const engagedSessionKeys = new Set<string>();
    for (const s of sessions) {
      const key = sessionKey(s.module_id, s.session_id);
      const msgCount = messagesPerSession.get(key) ?? 0;
      const answers = answeredBySessionId.get(s.session_id) ?? 0;
      if (msgCount >= 2 || answers > 0 || s.completed_at || s.lead_id) {
        engagedSessionKeys.add(key);
      }
    }

    const engagedSessions = engagedSessionKeys.size;
    const leadsPeriod = leads.length;
    const acceptedLeads = leads.filter((l) => l.status === "accepted").length;
    const leadConversionRate = toRate(leadsPeriod, sessionCount);
    const bounceRate = toRate(sessionCount - engagedSessions, sessionCount);

    const scoredLeads = leads.filter((l) => typeof l.score === "number");
    const avgScore =
      scoredLeads.length > 0
        ? scoredLeads.reduce((sum, l) => sum + Number(l.score), 0) / scoredLeads.length
        : 0;

    const avgAssistantOutputTokens =
      assistantMessageCount > 0 ? totalOutputTokens / assistantMessageCount : 0;

    const sessionsPerDay = countPerDay(
      sessions.map((s) => ({ created_at: s.started_at })),
      days,
    );
    const leadsPerDay = countPerDay(leads, days);
    const messagesPerDay = countPerDay(messages, days);

    const sourceLabelMap = new Map<string, string>();
    for (const src of DEFAULT_SOURCES) {
      sourceLabelMap.set(src.id, src.label);
    }
    for (const src of sourceRows) {
      sourceLabelMap.set(src.id, src.label);
    }

    const sourceMap = new Map<string, {
      source_id: string;
      label: string;
      total: number;
      accepted: number;
      acceptedRate: number;
    }>();

    for (const lead of leads) {
      const label = sourceLabelMap.get(lead.source_id) ?? lead.source_id;
      if (!sourceMap.has(lead.source_id)) {
        sourceMap.set(lead.source_id, {
          source_id: lead.source_id,
          label,
          total: 0,
          accepted: 0,
          acceptedRate: 0,
        });
      }
      const source = sourceMap.get(lead.source_id);
      if (!source) continue;
      source.total += 1;
      if (lead.status === "accepted") source.accepted += 1;
    }

    const sourcePerformance = Array.from(sourceMap.values())
      .map((s) => ({
        ...s,
        acceptedRate: toRate(s.accepted, s.total),
      }))
      .sort((a, b) => b.total - a.total);

    const moduleEngagementMap = new Map(
      modules.map((m) => [
        m.id,
        {
          module_id: m.id,
          slug: m.slug,
          name: m.name,
          sessions: 0,
          engagedSessions: 0,
          completed: 0,
          leadsCreated: 0,
          responses: 0,
          completionRate: 0,
          leadRate: 0,
          avgResponsesPerSession: 0,
        },
      ]),
    );

    for (const session of sessions) {
      const row = moduleEngagementMap.get(session.module_id);
      if (!row) continue;
      const key = sessionKey(session.module_id, session.session_id);
      row.sessions += 1;
      if (engagedSessionKeys.has(key)) row.engagedSessions += 1;
      if (session.completed_at) row.completed += 1;
      if (session.lead_id) row.leadsCreated += 1;
      row.responses += answeredBySessionId.get(session.session_id) ?? 0;
    }

    const moduleEngagement = Array.from(moduleEngagementMap.values())
      .map((m) => ({
        ...m,
        completionRate: toRate(m.completed, m.sessions),
        leadRate: toRate(m.leadsCreated, m.sessions),
        avgResponsesPerSession: toRate(m.responses, m.sessions),
      }))
      .sort((a, b) => b.sessions - a.sessions);

    const channelMap = new Map<string, {
      channel: string;
      medium: string;
      sessions: number;
      engagedSessions: number;
      leads: number;
      conversionRate: number;
    }>();
    const campaignMap = new Map<string, { campaign: string; sessions: number; leads: number }>();
    const referrerMap = new Map<string, number>();
    const localeMap = new Map<string, number>();

    for (const s of sessions) {
      const key = sessionKey(s.module_id, s.session_id);
      const channel = (s.utm_source?.trim() || "direct").toLowerCase();
      const medium = (s.utm_medium?.trim() || "none").toLowerCase();
      const channelKey = `${channel}|${medium}`;

      if (!channelMap.has(channelKey)) {
        channelMap.set(channelKey, {
          channel,
          medium,
          sessions: 0,
          engagedSessions: 0,
          leads: 0,
          conversionRate: 0,
        });
      }
      const channelRow = channelMap.get(channelKey);
      if (!channelRow) continue;
      channelRow.sessions += 1;
      if (engagedSessionKeys.has(key)) channelRow.engagedSessions += 1;
      if (s.lead_id) channelRow.leads += 1;

      const campaign = s.utm_campaign?.trim() || "(not set)";
      if (!campaignMap.has(campaign)) {
        campaignMap.set(campaign, { campaign, sessions: 0, leads: 0 });
      }
      const campaignRow = campaignMap.get(campaign);
      if (campaignRow) {
        campaignRow.sessions += 1;
        if (s.lead_id) campaignRow.leads += 1;
      }

      const referrer = parseReferrerHost(s.referer);
      referrerMap.set(referrer, (referrerMap.get(referrer) ?? 0) + 1);

      const locale = s.locale?.trim() || "okand";
      localeMap.set(locale, (localeMap.get(locale) ?? 0) + 1);
    }

    const channels = Array.from(channelMap.values())
      .map((c) => ({
        ...c,
        conversionRate: toRate(c.leads, c.sessions),
      }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 12);

    const campaigns = Array.from(campaignMap.values())
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 12);

    const referrers = Array.from(referrerMap.entries())
      .map(([referrer, count]) => ({ referrer, sessions: count }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 12);

    const locales = Array.from(localeMap.entries())
      .map(([locale, count]) => ({ locale, sessions: count }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 12);

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

    const eventMap = new Map<string, number>();
    for (const e of events) {
      eventMap.set(e.event_type, (eventMap.get(e.event_type) ?? 0) + 1);
    }
    const eventCounts = Array.from(eventMap.entries())
      .map(([eventType, count]) => ({ eventType, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 30);

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

    const consentKeys = new Set(
      consentEvents
        .filter((c): c is { module_id: string; session_id: string } =>
          typeof c.module_id === "string" && c.module_id.length > 0,
        )
        .map((c) => sessionKey(c.module_id, c.session_id)),
    );

    const completedSessions = sessions.filter((s) => s.completed_at !== null).length;
    const sessionsWithLead = sessions.filter((s) => s.lead_id !== null).length;

    const conversionSteps = [
      { step: "Session start", count: sessionCount },
      { step: "Consent given", count: consentKeys.size },
      { step: "Engaged session", count: engagedSessions },
      { step: "Flow completed", count: completedSessions },
      { step: "Lead created", count: sessionsWithLead },
      { step: "Accepted lead", count: acceptedLeads },
    ].map((row, index, arr) => {
      if (index === 0) return { ...row, rateFromPrevious: 1 };
      return {
        ...row,
        rateFromPrevious: toRate(row.count, arr[index - 1].count),
      };
    });

    const acceptedByModule = new Map<string, number>();
    for (const lead of leads) {
      if (!lead.module_id || lead.status !== "accepted") continue;
      acceptedByModule.set(lead.module_id, (acceptedByModule.get(lead.module_id) ?? 0) + 1);
    }

    const moduleFunnelMap = new Map(
      modules.map((m) => [
        m.id,
        {
          module_id: m.id,
          slug: m.slug,
          name: m.name,
          started: 0,
          completed: 0,
          leads: 0,
          accepted: acceptedByModule.get(m.id) ?? 0,
        },
      ]),
    );

    for (const s of sessions) {
      const row = moduleFunnelMap.get(s.module_id);
      if (!row) continue;
      row.started += 1;
      if (s.completed_at) row.completed += 1;
      if (s.lead_id) row.leads += 1;
    }

    const moduleFunnel = Array.from(moduleFunnelMap.values())
      .filter((m) => m.started > 0 || m.leads > 0)
      .sort((a, b) => b.started - a.started);

    const avgMessagesPerConversation = toRate(messages.length, conversations.length);
    const avgQuestionsAnsweredPerSession = toRate(answeredTotal, sessionCount);
    const avgResponseTimeMs = toRate(responseTimeTotal, responseTimeCount);

    // Keep map usage explicit so future maintainers can trace joins.
    void leadsById;
    void modulesById;

    const response: AnalysisSummary = {
      periodDays: days,
      generatedAt: new Date().toISOString(),
      overview: {
        users,
        sessions: sessionCount,
        engagedSessions,
        bounceRate: Number(bounceRate.toFixed(4)),
        leads: leadsPeriod,
        acceptedLeads,
        leadConversionRate: Number(leadConversionRate.toFixed(4)),
        avgScore: Number(avgScore.toFixed(1)),
        avgAssistantOutputTokens: Number(avgAssistantOutputTokens.toFixed(1)),
      },
      trend: {
        sessionsPerDay,
        leadsPerDay,
        messagesPerDay,
      },
      acquisition: {
        channels,
        campaigns,
        referrers,
        locales,
      },
      engagement: {
        avgMessagesPerConversation: Number(avgMessagesPerConversation.toFixed(2)),
        avgQuestionsAnsweredPerSession: Number(avgQuestionsAnsweredPerSession.toFixed(2)),
        avgResponseTimeMs: Number(avgResponseTimeMs.toFixed(0)),
        events: eventCounts,
        moduleEngagement,
      },
      conversion: {
        steps: conversionSteps,
        moduleFunnel,
      },
      geography: {
        municipalities: topMunicipalities,
      },
      quality: {
        statusBreakdown,
        sourcePerformance,
      },
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
