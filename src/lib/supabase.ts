import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Returnerar en Supabase-klient som använder service role key.
 *
 * Service role key får ALDRIG skickas till browsern — därför lever den här
 * funktionen bara i `src/lib/` och kallas uteslutande från server routes.
 * Null returneras om env-variablerna inte är satta.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-movexum-source": "startupkompass" } },
  });
}
