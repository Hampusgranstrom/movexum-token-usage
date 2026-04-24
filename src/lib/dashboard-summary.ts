import { DEFAULT_SOURCES } from "@/config/lead-sources";
import { getSupabaseAdmin } from "@/lib/supabase";
import { STATUS_CONFIG, type DashboardSummary, type LeadStatus } from "@/lib/types";

export async function getDashboardSummary(days: number): Promise<DashboardSummary> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error("Supabase är inte konfigurerad.");
  }

  const safeDays = Math.min(90, Math.max(7, Math.trunc(days) || 30));
  const now = new Date();
  const sinceDate = new Date(now.getTime() - safeDays * 86400000)
    .toISOString()
    .slice(0, 10);
  const prevDate = new Date(now.getTime() - safeDays * 2 * 86400000)
    .toISOString()
    .slice(0, 10);

  const [
    leadsPerDayResult,
    funnelResult,
    sourceSummaryResult,
    totalLeadsResult,
    currentPeriodResult,
    prevPeriodResult,
    avgScoreResult,
    prevAvgScoreResult,
  ] = await Promise.all([
    supabase.rpc("get_leads_per_day", { since: sinceDate }),
    supabase.rpc("get_funnel_counts"),
    supabase.rpc("get_source_summary", { since: sinceDate }),
    supabase.from("leads").select("id", { count: "exact", head: true }),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .gte("created_at", sinceDate),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .gte("created_at", prevDate)
      .lt("created_at", sinceDate),
    supabase
      .from("leads")
      .select("score")
      .not("score", "is", null)
      .gte("created_at", sinceDate),
    supabase
      .from("leads")
      .select("score")
      .not("score", "is", null)
      .gte("created_at", prevDate)
      .lt("created_at", sinceDate),
  ]);

  const totalLeads = totalLeadsResult.count ?? 0;
  const leadsThisPeriod = currentPeriodResult.count ?? 0;
  const leadsPrevPeriod = prevPeriodResult.count ?? 0;
  const leadsDelta =
    leadsPrevPeriod > 0 ? (leadsThisPeriod - leadsPrevPeriod) / leadsPrevPeriod : 0;

  const funnelData = (funnelResult.data ?? []) as Array<{ status: string; count: number }>;
  const funnelMap = new Map(funnelData.map((f) => [f.status, Number(f.count)]));
  const acceptedCount = funnelMap.get("accepted") ?? 0;
  const activePipeline =
    (funnelMap.get("new") ?? 0) +
    (funnelMap.get("contacted") ?? 0) +
    (funnelMap.get("meeting-booked") ?? 0) +
    (funnelMap.get("evaluating") ?? 0);
  const conversionRate = totalLeads > 0 ? acceptedCount / totalLeads : 0;

  const scores = (avgScoreResult.data ?? []) as Array<{ score: number }>;
  const avgScore =
    scores.length > 0 ? scores.reduce((sum, s) => sum + s.score, 0) / scores.length : 0;
  const prevScores = (prevAvgScoreResult.data ?? []) as Array<{ score: number }>;
  const prevAvgScore =
    prevScores.length > 0
      ? prevScores.reduce((sum, s) => sum + s.score, 0) / prevScores.length
      : 0;
  const scoreDelta = prevAvgScore > 0 ? (avgScore - prevAvgScore) / prevAvgScore : 0;

  const dailyMap = new Map<string, number>();
  for (const row of (leadsPerDayResult.data ?? []) as Array<{ day: string; count: number }>) {
    const existing = dailyMap.get(row.day) ?? 0;
    dailyMap.set(row.day, existing + Number(row.count));
  }
  const leadsPerDay = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  const sourceMap = new Map<string, number>();
  for (const row of (sourceSummaryResult.data ?? []) as Array<{ source_id: string; total: number }>) {
    sourceMap.set(row.source_id, Number(row.total));
  }
  const leadsPerSource = DEFAULT_SOURCES.map((s) => ({
    source_id: s.id,
    label: s.label,
    count: sourceMap.get(s.id) ?? 0,
    color: s.color,
  })).filter((s) => s.count > 0);

  const statusOrder: LeadStatus[] = [
    "new",
    "contacted",
    "meeting-booked",
    "evaluating",
    "accepted",
    "declined",
  ];
  const funnel = statusOrder.map((status) => ({
    status,
    label: STATUS_CONFIG[status].label,
    count: funnelMap.get(status) ?? 0,
  }));

  return {
    kpis: {
      totalLeads,
      leadsThisPeriod,
      leadsDelta,
      conversionRate,
      conversionDelta: 0,
      activePipeline,
      pipelineDelta: 0,
      avgScore: Math.round(avgScore),
      scoreDelta,
    },
    leadsPerDay,
    leadsPerSource,
    funnel,
  };
}
