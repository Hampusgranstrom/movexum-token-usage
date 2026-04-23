import { getSupabaseAdmin } from "./supabase";

export type BrandSettings = {
  logoUrl: string | null;
  productName: string;
};

const BRAND_BUCKET = "brand";

export function getBrandBucketName() {
  return BRAND_BUCKET;
}

/**
 * Reads the current brand settings (logo path + product name) and
 * resolves a public URL for the logo if one is set.
 *
 * Falls back to a null logo + default product name if the migration has
 * not run yet or env is unavailable.
 */
export async function getBrandSettings(): Promise<BrandSettings> {
  const defaults: BrandSettings = {
    logoUrl: null,
    productName: "Startupkompass",
  };

  const admin = getSupabaseAdmin();
  if (!admin) return defaults;

  const { data } = await admin
    .from("brand_settings")
    .select("key, value")
    .in("key", ["logo_path", "product_name"]);

  if (!data) return defaults;

  const map = Object.fromEntries(
    data.map((row: { key: string; value: string | null }) => [row.key, row.value]),
  );

  let logoUrl: string | null = null;
  const logoPath = map.logo_path;
  if (logoPath) {
    const { data: pub } = admin.storage.from(BRAND_BUCKET).getPublicUrl(logoPath);
    logoUrl = pub.publicUrl ?? null;
  }

  return {
    logoUrl,
    productName: map.product_name || defaults.productName,
  };
}
