import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getBrandSettings } from "@/lib/brand";
import { THEMES, type ThemeKey, isThemeKey } from "@/lib/themes";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET() {
  const guard = await requireRole("superadmin");
  if ("error" in guard) return guard.error;

  const brand = await getBrandSettings();
  const themes = Object.values(THEMES).map((t) => ({
    id: t.key,
    name: t.name,
    description: t.description,
  }));
  return NextResponse.json({ themes, activeThemeKey: brand.themeKey });
}

export async function PATCH(req: Request) {
  const guard = await requireRole("superadmin");
  if ("error" in guard) return guard.error;

  const body = (await req.json().catch(() => null)) as {
    theme?: string;
  } | null;

  const theme = typeof body?.theme === "string" ? body.theme.trim() : "";

  if (!isThemeKey(theme)) {
    return NextResponse.json(
      { error: "Ogiltigt tema-val" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "supabase unavailable" }, { status: 500 });
  }

  const { error } = await supabase.from("brand_settings").upsert(
    [{ key: "theme", value: theme as ThemeKey, updated_by: guard.user.id }],
    { onConflict: "key" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, themeKey: theme });
}


export async function GET() {
  const guard = await requireRole("superadmin");
  if ("error" in guard) return guard.error;

  const brand = await getBrandSettings();
  return NextResponse.json({ themeSettings: brand.themeSettings });
}

export async function PATCH(req: Request) {
  const guard = await requireRole("superadmin");
  if ("error" in guard) return guard.error;

  const body = (await req.json().catch(() => null)) as {
    adminThemeId?: string;
    publicThemeId?: string;
  } | null;

  const adminThemeId =
    typeof body?.adminThemeId === "string" ? body.adminThemeId.trim() : "";
  const publicThemeId =
    typeof body?.publicThemeId === "string" ? body.publicThemeId.trim() : "";

  if (!adminThemeId || !publicThemeId) {
    return NextResponse.json(
      { error: "adminThemeId och publicThemeId krävs" },
      { status: 400 },
    );
  }

  const brand = await getBrandSettings();
  const allowed = new Set(brand.themeSettings.themes.map((t) => t.id));

  if (!allowed.has(adminThemeId) || !allowed.has(publicThemeId)) {
    return NextResponse.json(
      { error: "Ogiltigt tema-val" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "supabase unavailable" }, { status: 500 });
  }

  const { error } = await supabase.from("brand_settings").upsert(
    [
      {
        key: "admin_theme_id",
        value: adminThemeId,
        updated_by: guard.user.id,
      },
      {
        key: "public_theme_id",
        value: publicThemeId,
        updated_by: guard.user.id,
      },
    ],
    { onConflict: "key" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    themeSettings: {
      ...brand.themeSettings,
      adminThemeId,
      publicThemeId,
    },
  });
}
