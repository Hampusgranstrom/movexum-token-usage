"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

export function AcceptInviteForm() {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "ready" | "missing">(
    "checking",
  );
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowser();

    // Supabase-ssr auto-exchanges the link hash for a session on mount.
    const check = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user?.email) {
        setEmail(data.user.email);
        setStatus("ready");
      } else {
        setStatus("missing");
      }
    };

    // Give the SDK a tick to process the URL hash
    const t = setTimeout(check, 150);
    return () => clearTimeout(t);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Lösenordet måste vara minst 8 tecken.");
      return;
    }
    if (password !== confirm) {
      setError("Lösenorden matchar inte.");
      return;
    }

    setLoading(true);
    try {
      const supabase = getSupabaseBrowser();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  if (status === "checking") {
    return (
      <div className="mx-auto max-w-sm text-center text-sm text-muted">
        Verifierar inbjudan...
      </div>
    );
  }

  if (status === "missing") {
    return (
      <div className="mx-auto max-w-sm space-y-4 rounded-2xl bg-surface p-8 shadow-soft">
        <h1 className="text-2xl font-semibold">Inbjudan saknas</h1>
        <p className="text-sm text-muted">
          Länken ser ut att ha gått ut eller öppnats i fel webbläsare. Be din
          superadmin skicka en ny inbjudan.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-sm space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Välkommen</h1>
        <p className="mt-2 text-sm text-muted">
          Sätt ett lösenord för <span className="font-medium text-fg">{email}</span>.
        </p>
      </div>

      <form
        onSubmit={submit}
        className="space-y-4 rounded-2xl bg-surface p-6 shadow-soft"
      >
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted">
            Nytt lösenord
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoFocus
            minLength={8}
            className="input"
            placeholder="Minst 8 tecken"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted">
            Bekräfta lösenord
          </label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={8}
            className="input"
            placeholder="Upprepa lösenordet"
          />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full"
        >
          {loading ? "Sparar..." : "Skapa konto"}
        </button>
      </form>
    </div>
  );
}
