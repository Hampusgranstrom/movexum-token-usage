"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

export function LoginForm({
  productName,
  logoUrl,
}: {
  productName: string;
  logoUrl: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/";
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

      router.push(redirect);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-sm space-y-8">
      <div className="text-center">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={productName}
            className="mx-auto h-12 w-auto max-w-[160px] object-contain"
          />
        ) : (
          <h1 className="text-2xl font-semibold tracking-tight">{productName}</h1>
        )}
        <p className="mt-3 text-sm text-muted">Logga in för att hantera leads</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl bg-surface p-6 shadow-card"
      >
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
            className="input"
            placeholder="Lösenord"
          />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Loggar in..." : "Logga in"}
        </button>
      </form>
    </div>
  );
}
