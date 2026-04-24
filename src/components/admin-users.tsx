"use client";

import { useCallback, useEffect, useState } from "react";
import { Trash2, ShieldCheck, Shield, ArrowRight } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

type AdminUser = {
  id: string;
  email: string;
  role: "admin" | "superadmin";
  created_at: string;
  last_sign_in_at: string | null;
};

type InviteResult = {
  email: string;
  url: string;
};

export function AdminUsers({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "superadmin">("admin");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteResult, setInviteResult] = useState<InviteResult | null>(null);
  const [status, setStatus] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteBusy(true);
    setStatus(null);
    setInviteResult(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus({ kind: "err", text: data.error ?? "Kunde inte skicka inbjudan" });
        return;
      }
      setStatus({ kind: "ok", text: `Inbjudan skapad för ${inviteEmail}` });
      if (typeof data.invite_url === "string" && data.invite_url.length > 0) {
        setInviteResult({ email: inviteEmail, url: data.invite_url });
      }
      setInviteEmail("");
      setInviteRole("admin");
      await load();
    } finally {
      setInviteBusy(false);
    }
  };

  const changeRole = async (id: string, role: "admin" | "superadmin") => {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus({ kind: "err", text: data.error ?? "Kunde inte uppdatera roll" });
      return;
    }
    await load();
  };

  const remove = async (id: string, email: string) => {
    if (!confirm(`Ta bort ${email}?`)) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus({ kind: "err", text: data.error ?? "Kunde inte ta bort" });
      return;
    }
    setStatus({ kind: "ok", text: `${email} borttagen` });
    await load();
  };

  return (
    <div className="space-y-10">
      <header className="max-w-2xl space-y-3">
        <span className="eyebrow">Superadmin</span>
        <h1 className="text-4xl sm:text-5xl">
          Teamet som bygger verktyget
        </h1>
        <p className="text-base text-muted">
          Bjud in och hantera personer som har tillgång till Startupkompass.
        </p>
      </header>

      <section className="card p-6">
        <h2 className="eyebrow">
          Bjud in admin
        </h2>
        <p className="mt-2 text-sm text-muted">
          Skapa en säker inbjudningslänk som du kan skicka direkt till personen. Det undviker problem med skräppost och felaktiga e-postlänkar.
        </p>
        <form
          onSubmit={handleInvite}
          className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-medium text-muted">
              E-post
            </label>
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="input"
              placeholder="namn@movexum.se"
            />
          </div>
          <div className="sm:w-44">
            <label className="mb-1.5 block text-xs font-medium text-muted">
              Roll
            </label>
            <select
              value={inviteRole}
              onChange={(e) =>
                setInviteRole(e.target.value as "admin" | "superadmin")
              }
              className="input"
            >
              <option value="admin">Admin</option>
              <option value="superadmin">Superadmin</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={inviteBusy}
            className="btn-primary sm:w-52"
          >
            <ArrowRight className="h-4 w-4" />
            {inviteBusy ? "Skapar..." : "Skapa inbjudan"}
          </button>
        </form>

        {status && (
          <p
            className={cn(
              "mt-3 text-sm",
              status.kind === "ok" ? "text-fg" : "text-danger",
            )}
          >
            {status.text}
          </p>
        )}

        {inviteResult && (
          <div className="mt-4 rounded-2xl bg-bg p-4 shadow-soft">
            <p className="text-sm font-medium text-fg-deep">
              Dela länken med {inviteResult.email}
            </p>
            <p className="mt-1 text-xs text-muted">
              Använd den här länken direkt om e-post hamnar i skräppost eller inte levereras.
            </p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                readOnly
                value={inviteResult.url}
                className="input text-xs"
              />
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(inviteResult.url);
                  setStatus({ kind: "ok", text: "Inbjudningslänken kopierad" });
                }}
                className="btn-secondary sm:w-44"
              >
                Kopiera länk
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-6 py-4 eyebrow">E-post</th>
                <th className="px-6 py-4 eyebrow">Roll</th>
                <th className="px-6 py-4 eyebrow">Skapad</th>
                <th className="px-6 py-4 eyebrow">Senast inloggad</th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-muted">
                    Laddar...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-muted">
                    Inga användare än
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isSelf = u.id === currentUserId;
                  return (
                    <tr key={u.id}>
                      <td className="px-6 py-4 font-medium">
                        {u.email}
                        {isSelf && (
                          <span className="ml-2 text-xs text-muted">(du)</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <RoleBadge role={u.role} />
                      </td>
                      <td className="px-6 py-4 text-muted">
                        {formatDate(u.created_at)}
                      </td>
                      <td className="px-6 py-4 text-muted">
                        {u.last_sign_in_at
                          ? formatDate(u.last_sign_in_at)
                          : "-"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() =>
                              changeRole(
                                u.id,
                                u.role === "superadmin" ? "admin" : "superadmin",
                              )
                            }
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-bg text-muted transition hover:bg-surface hover:text-fg-deep hover:shadow-soft"
                            title={
                              u.role === "superadmin"
                                ? "Degradera till admin"
                                : "Upphöj till superadmin"
                            }
                          >
                            {u.role === "superadmin" ? (
                              <Shield className="h-4 w-4" />
                            ) : (
                              <ShieldCheck className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => remove(u.id, u.email)}
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-bg text-danger transition hover:bg-[#FCE4E9]"
                            title="Ta bort användare"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function RoleBadge({ role }: { role: "admin" | "superadmin" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
        role === "superadmin"
          ? "bg-fg-deep text-white"
          : "bg-accent-soft text-fg-deep",
      )}
    >
      {role === "superadmin" ? "Superadmin" : "Admin"}
    </span>
  );
}
