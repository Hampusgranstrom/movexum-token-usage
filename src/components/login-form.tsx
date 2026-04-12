"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Compass } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = getSupabaseBrowser();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message === "Invalid login credentials"
          ? "Felaktiga inloggningsuppgifter"
          : authError.message);
        return;
      }

      router.push(redirect);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm space-y-8">
      <div className="text-center">
        <Compass className="mx-auto h-12 w-12 text-accent-leads" />
        <h1 className="mt-4 text-2xl font-semibold text-text-primary">
          Startupkompass
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Logga in för att hantera leads
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4 p-6">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">
            E-post
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            className="w-full rounded-lg border border-bg-border bg-bg-base px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-leads focus:outline-none"
            placeholder="namn@movexum.se"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">
            Lösenord
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-lg border border-bg-border bg-bg-base px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-leads focus:outline-none"
            placeholder="Lösenord"
          />
        </div>

        {error && (
          <p className="text-sm text-accent-danger">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-accent-leads px-4 py-2.5 text-sm font-semibold text-bg-base hover:bg-accent-leads/90 disabled:opacity-50 transition-colors"
        >
          {loading ? "Loggar in..." : "Logga in"}
        </button>
      </form>
    </div>
  );
}
