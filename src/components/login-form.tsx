"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

export function LoginForm({
  productName,
  logoUrl,
}: {
  productName: string;
  logoUrl: string | null;
}) {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/dashboard";
  const initialError = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    initialError === "not_invited"
      ? "Ditt konto är inte registrerat i systemet. Be superadmin bjuda in dig."
      : null,
  );
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
        setError(
          authError.message === "Invalid login credentials"
            ? "Felaktiga inloggningsuppgifter"
            : authError.message,
        );
        return;
      }

      window.location.href = redirect;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md space-y-8">
      <div className="text-center">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={productName}
            className="mx-auto h-10 w-auto max-w-[180px] object-contain"
          />
        ) : (
          <span className="text-2xl font-semibold tracking-tight text-fg-deep">
            {productName.toLowerCase()}
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-surface/80 p-6 shadow-soft sm:p-7">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted">
            E-post
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            autoComplete="email"
            className="input"
            placeholder="namn@movexum.se"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted">
            Lösenord
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="input"
            placeholder="Lösenord"
          />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          <ArrowRight className="h-4 w-4" />
          {loading ? "Loggar in..." : "Logga in"}
        </button>
      </form>
    </div>
  );
}
