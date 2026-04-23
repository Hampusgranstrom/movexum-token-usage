import { getSupabaseAdmin } from "./supabase";

export type PartnerLogo = {
  id: string;
  name: string;
  url: string | null;
  logoUrl: string | null;
  sortOrder: number;
  active: boolean;
  createdAt: string;
};

const PARTNERS_BUCKET = "partners";

export function getPartnersBucketName() {
  return PARTNERS_BUCKET;
}

/**
 * Fetches active partner logos ordered by sort_order, newest last.
 * Resolves the Supabase Storage path to a public URL. Safe to render
 * from a server component on public pages.
 */
export async function getActivePartnerLogos(): Promise<PartnerLogo[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];

  const { data, error } = await admin
    .from("partner_logos")
    .select("id, name, url, logo_path, sort_order, active, created_at")
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  return data.map((row) => toPartnerLogo(row, admin));
}

/**
 * Fetches every partner logo (active + inactive) for the admin view.
 */
export async function getAllPartnerLogos(): Promise<PartnerLogo[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];

  const { data, error } = await admin
    .from("partner_logos")
    .select("id, name, url, logo_path, sort_order, active, created_at")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  return data.map((row) => toPartnerLogo(row, admin));
}

type PartnerRow = {
  id: string;
  name: string;
  url: string | null;
  logo_path: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
};

function toPartnerLogo(
  row: PartnerRow,
  admin: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
): PartnerLogo {
  let logoUrl: string | null = null;
  if (row.logo_path) {
    const { data } = admin.storage
      .from(PARTNERS_BUCKET)
      .getPublicUrl(row.logo_path);
    logoUrl = data.publicUrl ?? null;
  }
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    logoUrl,
    sortOrder: row.sort_order,
    active: row.active,
    createdAt: row.created_at,
  };
}
