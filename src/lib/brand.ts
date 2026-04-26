import { cache } from "react";
import { getSupabaseAdmin } from "./supabase";
import {
  DEFAULT_THEME,
  getTheme,
  type ThemeDefinition,
  type ThemeKey,
} from "./themes";

export type BrandSettings = {
  logoUrl: string | null;
  productName: string;
  themeKey: ThemeKey;
  theme: ThemeDefinition;
  landingEntry: {
    showAiChat: boolean;
    visibleModuleIds: string[];
  };
  partnerLogos: Array<{
    id: string;
    name: string;
    logoUrl: string;
    websiteUrl: string | null;
    isActive: boolean;
    sortOrder: number;
  }>;
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
export const getBrandSettings = cache(async (): Promise<BrandSettings> => {
  const defaultTheme = getTheme(DEFAULT_THEME);
  const defaults: BrandSettings = {
    logoUrl: null,
    productName: "Startupkompass",
    themeKey: DEFAULT_THEME,
    theme: defaultTheme,
    landingEntry: {
      showAiChat: true,
      visibleModuleIds: [],
    },
    partnerLogos: [],
  };

  const admin = getSupabaseAdmin();
  if (!admin) return defaults;

  const { data } = await admin
    .from("brand_settings")
    .select("key, value")
    .in("key", [
      "logo_path",
      "product_name",
      "partner_logos",
      "theme",
      "landing_show_ai_chat",
      "landing_visible_modules",
    ]);

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

  const partnerLogos = parsePartnerLogos(admin, map.partner_logos);
  const theme = getTheme(map.theme);
  const landingEntry = parseLandingEntrySettings(map);

  return {
    logoUrl,
    productName: map.product_name || defaults.productName,
    themeKey: theme.key,
    theme,
    landingEntry,
    partnerLogos,
  };
});

function parseLandingEntrySettings(
  map: Record<string, string | null | undefined>,
): BrandSettings["landingEntry"] {
  const showAiChatRaw = typeof map.landing_show_ai_chat === "string"
    ? map.landing_show_ai_chat.trim().toLowerCase()
    : "";
  const showAiChat = showAiChatRaw ? showAiChatRaw !== "false" : true;

  let visibleModuleIds: string[] = [];
  if (typeof map.landing_visible_modules === "string") {
    try {
      const parsed = JSON.parse(map.landing_visible_modules) as unknown;
      if (Array.isArray(parsed)) {
        visibleModuleIds = parsed
          .filter((id): id is string => typeof id === "string")
          .map((id) => id.trim())
          .filter((id) => id.length > 0);
      }
    } catch {
      visibleModuleIds = [];
    }
  }

  return {
    showAiChat,
    visibleModuleIds,
  };
}

function parsePartnerLogos(
  admin: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  raw: string | null | undefined,
) {
  if (!raw) return [] as BrandSettings["partnerLogos"];

  try {
    const parsed = JSON.parse(raw) as Array<{
      id?: string;
      name?: string;
      logo_path?: string | null;
      logo_url?: string | null;
      website_url?: string | null;
      is_active?: boolean;
      sort_order?: number;
    }>;

    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item, idx) => {
        const id = typeof item.id === "string" ? item.id.trim() : "";
        const name = typeof item.name === "string" ? item.name.trim() : "";
        if (!id || !name) return null;

        let logoUrl =
          typeof item.logo_url === "string" && item.logo_url.trim().length > 0
            ? item.logo_url.trim()
            : "";
        if (typeof item.logo_path === "string" && item.logo_path.trim().length > 0) {
          const { data } = admin.storage.from(BRAND_BUCKET).getPublicUrl(item.logo_path.trim());
          logoUrl = data.publicUrl ?? logoUrl;
        }
        if (!logoUrl) return null;

        return {
          id,
          name,
          logoUrl,
          websiteUrl:
            typeof item.website_url === "string" && item.website_url.trim().length > 0
              ? item.website_url.trim()
              : null,
          isActive: item.is_active !== false,
          sortOrder: Number.isFinite(item.sort_order) ? Number(item.sort_order) : idx,
        };
      })
      .filter((item): item is BrandSettings["partnerLogos"][number] => !!item)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  } catch {
    return [];
  }
}
