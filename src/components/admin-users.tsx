"use client";

import { useCallback, useEffect, useState } from "react";
import { Trash2, ShieldCheck, Shield } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

type AdminUser = {
  id: string;
  email: string;
  role: "admin" | "superadmin";
  created_at: string;
  last_sign_in_at: string | null;
};

export function AdminUsers({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "superadmin">("admin");
  const [inviteBusy, setInviteBusy] = useState(false);
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
      setStatus({ kind: "ok", text: `Inbjudan skickad till ${inviteEmail}` });
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
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Användare</h1>
        <p className="text-sm text-muted">
          Bjud in och hantera personer som har tillgång till Startupkompass.
        </p>
      </header>

      <section className="card p-6">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted">
          Bjud in admin
        </h2>
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
            className="btn-primary sm:w-44"
          >
            {inviteBusy ? "Skickar..." : "Skicka inbjudan"}
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
      </section>

      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted">
                  E-post
                </th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted">
                  Roll
                </th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted">
                  Skapad
                </th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted">
                  Senast inloggad
                </th>
                <th className="px-5 py-3" />
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
                      <td className="px-5 py-4 font-medium">
                        {u.email}
                        {isSelf && (
                          <span className="ml-2 text-xs text-muted">(du)</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <RoleBadge role={u.role} />
                      </td>
                      <td className="px-5 py-4 text-muted">
                        {formatDate(u.created_at)}
                      </td>
                      <td className="px-5 py-4 text-muted">
                        {u.last_sign_in_at
                          ? formatDate(u.last_sign_in_at)
                          : "-"}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() =>
                              changeRole(
                                u.id,
                                u.role === "superadmin" ? "admin" : "superadmin",
                              )
                            }
                            className="btn-ghost"
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
                            className="btn-ghost text-danger"
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
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        role === "superadmin"
          ? "bg-fg text-surface"
          : "bg-border/60 text-fg",
      )}
    >
      {role === "superadmin" ? "Superadmin" : "Admin"}
    </span>
  );
}
