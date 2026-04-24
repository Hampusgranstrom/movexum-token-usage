import { getSupabaseAdmin } from "./supabase";

export type ResultBucket = {
  key: string;
  title: string;
  description: string;
  tips: string[];
  cta_label: string;
  cta_url: string;
};

export type Module = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  target_audience: string | null;
  flow_type: "wizard" | "chat" | "hybrid" | "quiz";
  welcome_title: string | null;
  welcome_body: string | null;
  system_prompt: string | null;
  consent_text: string;
  consent_version: number;
  lead_source_id: string | null;
  accent_color: string | null;
  hero_eyebrow: string | null;
  is_active: boolean;
  require_email: boolean;
  require_phone: boolean;
  require_organization: boolean;
  chat_persona: string | null;
  max_exchanges: number;
  result_buckets: ResultBucket[];
  created_at: string;
  updated_at: string;
};

/** Fetch a module by slug (must be active for public use). */
export async function getModuleBySlug(slug: string): Promise<Module | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const { data } = await admin
    .from("modules")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  return (data as Module | null) ?? null;
}

export async function getModuleById(id: string): Promise<Module | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const { data } = await admin
    .from("modules")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as Module | null) ?? null;
}

export async function listModules(): Promise<Module[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];
  const { data } = await admin
    .from("modules")
    .select("*")
    .order("created_at", { ascending: true });
  return (data as Module[] | null) ?? [];
}
