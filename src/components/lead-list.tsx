"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { StatusBadge } from "./status-badge";
import { cn, formatDate } from "@/lib/utils";
import type { Lead, LeadStatus, LeadListResponse } from "@/lib/types";
import { STATUS_CONFIG } from "@/lib/types";

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
        <h1 className="text-2xl font-semibold text-text-primary">Leads</h1>

        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Sök namn, e-post, idé..."
            className="rounded-lg border border-bg-border bg-bg-card pl-10 pr-4 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-leads focus:outline-none"
          />
        </form>
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-1 rounded-lg border border-bg-border bg-bg-card/40 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleStatusChange(tab.key)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              status === tab.key
                ? "bg-bg-base text-text-primary"
                : "text-text-secondary hover:text-text-primary",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bg-border text-left">
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-text-muted">
                  Namn
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-text-muted">
                  Idé
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-text-muted">
                  Källa
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-text-muted">
                  Status
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-text-muted">
                  Poäng
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-text-muted">
                  Skapad
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bg-border">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 w-20 animate-pulse rounded bg-bg-border" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data?.leads.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-text-muted"
                  >
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-bg-border px-4 py-3">
            <span className="text-xs text-text-muted">
              {data?.total ?? 0} leads totalt
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded p-1 text-text-secondary hover:text-text-primary disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs text-text-secondary">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded p-1 text-text-secondary hover:text-text-primary disabled:opacity-30"
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
      className="cursor-pointer transition-colors hover:bg-bg-cardHover"
    >
      <td className="px-4 py-3">
        <div className="font-medium text-text-primary">{lead.name}</div>
        {lead.email && (
          <div className="text-xs text-text-muted">{lead.email}</div>
        )}
      </td>
      <td className="max-w-[200px] truncate px-4 py-3 text-text-secondary">
        {lead.idea_summary ?? "-"}
      </td>
      <td className="px-4 py-3 text-text-secondary">{lead.source_id}</td>
      <td className="px-4 py-3">
        <StatusBadge status={lead.status} />
      </td>
      <td className="px-4 py-3">
        {lead.score != null ? (
          <span className="font-mono text-text-primary">{lead.score}</span>
        ) : (
          <span className="text-text-muted">-</span>
        )}
      </td>
      <td className="px-4 py-3 text-text-secondary">
        {formatDate(lead.created_at)}
      </td>
    </tr>
  );
}
