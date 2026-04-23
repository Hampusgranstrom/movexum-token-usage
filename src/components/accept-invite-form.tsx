"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
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
    const check = async () => {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");

      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (!sessionError) {
          window.history.replaceState(null, "", window.location.pathname);
        }
      }

      const { data } = await supabase.auth.getUser();
      if (data.user?.email) {
        setEmail(data.user.email);
        setStatus("ready");
      } else {
        setStatus("missing");
      }
    };
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
      router.push("/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  if (status === "checking") {
    return (
      <div className="mx-auto max-w-md text-center text-sm text-muted">
        Verifierar inbjudan...
      </div>
    );
  }

  if (status === "missing") {
    return (
      <div className="mx-auto max-w-md space-y-4 rounded-2xl bg-surface p-8 shadow-card text-center">
        <h1 className="text-3xl">Inbjudan saknas</h1>
        <p className="text-sm text-muted">
          Länken ser ut att ha gått ut eller öppnats i fel webbläsare. Be din
          superadmin skicka en ny inbjudan.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-8">
      <div className="text-center">
        <h1 className="text-4xl leading-tight sm:text-5xl">
          Välkommen <span className="text-accent">ombord</span>
        </h1>
        <p className="mt-4 text-sm text-muted">
          Sätt ett lösenord för <span className="font-medium text-fg">{email}</span>.
        </p>
      </div>

      <form
        onSubmit={submit}
        className="space-y-4 rounded-2xl bg-surface p-8 shadow-card"
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

        <button type="submit" disabled={loading} className="btn-primary w-full">
          <ArrowRight className="h-4 w-4" />
          {loading ? "Sparar..." : "Skapa konto"}
        </button>
      </form>
    </div>
  );
}
