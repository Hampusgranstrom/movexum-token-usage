import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getBrandBucketName } from "@/lib/brand";
import { isThemeKey } from "@/lib/themes";

export const runtime = "nodejs";

const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/svg+xml",
  "image/webp",
];
const MAX_SIZE = 1_500_000; // 1.5 MB

export async function POST(req: Request) {
  const guard = await requireRole("superadmin");
  if ("error" in guard) return guard.error;

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "supabase unavailable" }, { status: 500 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file missing" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Endast PNG, JPEG, SVG eller WebP tillåts." },
      { status: 400 },
    );
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "Filen är för stor (max 1.5 MB)." },
      { status: 400 },
    );
  }

  const bucket = getBrandBucketName();

  // Ensure the bucket exists (idempotent; ignore already-exists errors).
  const { data: existing } = await admin.storage.getBucket(bucket);
  if (!existing) {
    await admin.storage.createBucket(bucket, { public: true });
  }

  const ext =
    file.type === "image/svg+xml"
      ? "svg"
      : file.type === "image/png"
        ? "png"
        : file.type === "image/webp"
          ? "webp"
          : "jpg";
  const path = `logo-${Date.now()}.${ext}`;

  const bytes = await file.arrayBuffer();
  const { error: uploadError } = await admin.storage
    .from(bucket)
    .upload(path, bytes, { contentType: file.type, upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // Delete previous logo if any
  const { data: prev } = await admin
    .from("brand_settings")
    .select("value")
    .eq("key", "logo_path")
    .maybeSingle();
  const prevPath = prev?.value;
  if (prevPath && prevPath !== path) {
    await admin.storage.from(bucket).remove([prevPath]);
  }

  const { error: upsertError } = await admin
    .from("brand_settings")
    .upsert(
      { key: "logo_path", value: path, updated_by: guard.user.id },
      { onConflict: "key" },
    );

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  const { data: pub } = admin.storage.from(bucket).getPublicUrl(path);
  return NextResponse.json({ ok: true, url: pub.publicUrl });
}

export async function PUT(req: Request) {
  const guard = await requireRole("superadmin");
  if ("error" in guard) return guard.error;

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "supabase unavailable" }, { status: 500 });
  }

  const body = await req.json().catch(() => null) as {
    theme?: unknown;
    landingShowAiChat?: unknown;
    landingVisibleModuleIds?: unknown;
  } | null;

  const rows: Array<{ key: string; value: string; updated_by: string }> = [];

  if (body && typeof body.theme !== "undefined") {
    if (!isThemeKey(body.theme)) {
      return NextResponse.json({ error: "invalid theme" }, { status: 400 });
    }
    rows.push({ key: "theme", value: body.theme, updated_by: guard.user.id });
  }

  if (body && typeof body.landingShowAiChat !== "undefined") {
    if (typeof body.landingShowAiChat !== "boolean") {
      return NextResponse.json({ error: "invalid landingShowAiChat" }, { status: 400 });
    }
    rows.push({
      key: "landing_show_ai_chat",
      value: body.landingShowAiChat ? "true" : "false",
      updated_by: guard.user.id,
    });
  }

  if (body && typeof body.landingVisibleModuleIds !== "undefined") {
    if (!Array.isArray(body.landingVisibleModuleIds)) {
      return NextResponse.json(
        { error: "invalid landingVisibleModuleIds" },
        { status: 400 },
      );
    }
    const cleanedIds = body.landingVisibleModuleIds
      .filter((id): id is string => typeof id === "string")
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    rows.push({
      key: "landing_visible_modules",
      value: JSON.stringify(cleanedIds),
      updated_by: guard.user.id,
    });
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });
  }

  const { error } = await admin
    .from("brand_settings")
    .upsert(rows, { onConflict: "key" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const guard = await requireRole("superadmin");
  if ("error" in guard) return guard.error;

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "supabase unavailable" }, { status: 500 });
  }

  const { data: prev } = await admin
    .from("brand_settings")
    .select("value")
    .eq("key", "logo_path")
    .maybeSingle();

  if (prev?.value) {
    await admin.storage.from(getBrandBucketName()).remove([prev.value]);
  }

  await admin
    .from("brand_settings")
    .upsert(
      { key: "logo_path", value: null, updated_by: guard.user.id },
      { onConflict: "key" },
    );

  return NextResponse.json({ ok: true });
}
