"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { StatusBadge } from "./status-badge";
import { cn, formatDate } from "@/lib/utils";
import type { Lead, LeadStatus, LeadListResponse } from "@/lib/types";

const TABS: Array<{ key: LeadStatus | "alla"; label: string }> = [
  { key: "alla", label: "Alla" },
  { key: "new", label: "Ny" },
  { key: "contacted", label: "Kontaktad" },
  { key: "meeting-booked", label: "Möte bokat" },
  { key: "evaluating", label: "Utvärderas" },
  { key: "accepted", label: "Antagen" },
  { key: "declined", label: "Avböjd" },
];

export function LeadList() {
  const router = useRouter();
  const [data, setData] = useState<LeadListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<LeadStatus | "alla">("alla");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: "20",
      sortBy: "created_at",
      sortDir: "desc",
    });
    if (status !== "alla") params.set("status", status);
    if (search) params.set("search", search);

    try {
      const res = await fetch(`/api/leads?${params}`);
      if (res.ok) {
        setData(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, [page, status, search]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleStatusChange = (s: LeadStatus | "alla") => {
    setStatus(s);
    setPage(1);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLeads();
  };

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl sm:text-5xl">
            <span className="text-accent">Inflöde</span> av idéer
          </h1>
          <p className="mt-2 text-sm text-muted">
            Alla leads som kommit in via chatt, event och formulär
          </p>
        </div>

        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Sök namn, e-post, idé..."
            className="input pl-11 sm:w-80"
          />
        </form>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleStatusChange(tab.key)}
            className={cn(
              "rounded-full px-4 py-1.5 text-xs font-medium transition",
              status === tab.key
                ? "bg-fg text-white shadow-soft"
                : "bg-surface text-muted shadow-soft hover:text-fg",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="px-6 py-4 eyebrow">Namn</th>
                <th className="px-6 py-4 eyebrow">Idé</th>
                <th className="px-6 py-4 eyebrow">Källa</th>
                <th className="px-6 py-4 eyebrow">Status</th>
                <th className="px-6 py-4 eyebrow">Poäng</th>
                <th className="px-6 py-4 eyebrow">Skapad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-4 w-20 animate-pulse rounded-full bg-bg-deep" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data?.leads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-muted">
                    Inga leads hittades
                  </td>
                </tr>
              ) : (
                data?.leads.map((lead) => (
                  <LeadRow
                    key={lead.id}
                    lead={lead}
                    onClick={() => router.push(`/leads/${lead.id}`)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-6 py-4">
            <span className="text-xs text-muted">
              {data?.total ?? 0} leads totalt
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-bg text-muted transition hover:text-fg disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs text-muted">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-bg text-muted transition hover:text-fg disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LeadRow({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  return (
    <tr
      onClick={onClick}
      className="cursor-pointer transition-colors hover:bg-bg"
    >
      <td className="px-6 py-4">
        <div className="font-medium text-fg-deep">{lead.name}</div>
        {lead.email && <div className="text-xs text-muted">{lead.email}</div>}
      </td>
      <td className="max-w-[260px] truncate px-6 py-4 text-muted">
        {lead.idea_summary ?? "-"}
      </td>
      <td className="px-6 py-4 text-muted">{lead.source_id}</td>
      <td className="px-6 py-4">
        <StatusBadge status={lead.status} />
      </td>
      <td className="px-6 py-4">
        {lead.score != null ? (
          <span className="font-mono font-medium text-fg-deep">{lead.score}</span>
        ) : (
          <span className="text-subtle">-</span>
        )}
      </td>
      <td className="px-6 py-4 text-muted">{formatDate(lead.created_at)}</td>
    </tr>
  );
}
