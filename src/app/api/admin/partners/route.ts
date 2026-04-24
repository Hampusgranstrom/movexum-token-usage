import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getBrandBucketName } from "@/lib/brand";

export const runtime = "nodejs";

const SETTING_KEY = "partner_logos";
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];
const MAX_SIZE = 1_500_000; // 1.5 MB

type PartnerLogoRow = {
  id: string;
  name: string;
  logo_path: string | null;
  logo_url: string | null;
  website_url: string | null;
  is_active: boolean;
  sort_order: number;
};

function normalizeRow(row: Partial<PartnerLogoRow>, idx: number): PartnerLogoRow | null {
  const id = typeof row.id === "string" ? row.id.trim() : "";
  const name = typeof row.name === "string" ? row.name.trim() : "";
  if (!id || !name) return null;

  return {
    id,
    name: name.slice(0, 120),
    logo_path: typeof row.logo_path === "string" && row.logo_path.trim() ? row.logo_path.trim() : null,
    logo_url: typeof row.logo_url === "string" && row.logo_url.trim() ? row.logo_url.trim() : null,
    website_url:
      typeof row.website_url === "string" && row.website_url.trim()
        ? row.website_url.trim()
        : null,
    is_active: row.is_active !== false,
    sort_order: Number.isFinite(row.sort_order) ? Number(row.sort_order) : idx,
  };
}

async function readPartners(admin: ReturnType<typeof getSupabaseAdmin>) {
  const { data } = await admin!
    .from("brand_settings")
    .select("value")
    .eq("key", SETTING_KEY)
    .maybeSingle();

  if (!data?.value) return [] as PartnerLogoRow[];

  try {
    const parsed = JSON.parse(data.value) as Partial<PartnerLogoRow>[];
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((row, idx) => normalizeRow(row, idx))
      .filter((row): row is PartnerLogoRow => !!row)
      .sort((a, b) => a.sort_order - b.sort_order);
  } catch {
    return [];
  }
}

async function writePartners(
  admin: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  partners: PartnerLogoRow[],
) {
  const value = JSON.stringify(
    partners.map((p, idx) => ({ ...p, sort_order: idx })),
  );

  const { error } = await admin!
    .from("brand_settings")
    .upsert({ key: SETTING_KEY, value, updated_by: userId }, { onConflict: "key" });

  return error;
}

function withPublicUrl(admin: ReturnType<typeof getSupabaseAdmin>, item: PartnerLogoRow) {
  if (item.logo_path) {
    const { data } = admin!.storage.from(getBrandBucketName()).getPublicUrl(item.logo_path);
    return { ...item, logo_url: data.publicUrl ?? item.logo_url };
  }
  return item;
}

export async function GET() {
  const guard = await requireRole("superadmin");
  if ("error" in guard) return guard.error;

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "supabase unavailable" }, { status: 500 });

  const partners = await readPartners(admin);
  return NextResponse.json({ partners: partners.map((p) => withPublicUrl(admin, p)) });
}

export async function POST(req: Request) {
  const guard = await requireRole("superadmin");
  if ("error" in guard) return guard.error;

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "supabase unavailable" }, { status: 500 });

  const form = await req.formData().catch(() => null);
  const name = typeof form?.get("name") === "string" ? String(form.get("name")).trim() : "";
  const websiteUrl =
    typeof form?.get("website_url") === "string"
      ? String(form.get("website_url")).trim()
      : "";
  const externalLogoUrl =
    typeof form?.get("logo_url") === "string" ? String(form.get("logo_url")).trim() : "";
  const file = form?.get("file");

  if (!name) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }

  let logoPath: string | null = null;
  if (file instanceof File && file.size > 0) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "invalid file type" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "file too large" }, { status: 400 });
    }

    const bucket = getBrandBucketName();
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
    logoPath = `partners/${crypto.randomUUID()}-${Date.now()}.${ext}`;
    const bytes = await file.arrayBuffer();
    const { error } = await admin.storage
      .from(bucket)
      .upload(logoPath, bytes, { contentType: file.type, upsert: true });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  if (!logoPath && !externalLogoUrl) {
    return NextResponse.json({ error: "logo missing" }, { status: 400 });
  }

  const partners = await readPartners(admin);
  const partner: PartnerLogoRow = {
    id: crypto.randomUUID(),
    name,
    logo_path: logoPath,
    logo_url: externalLogoUrl || null,
    website_url: websiteUrl || null,
    is_active: true,
    sort_order: partners.length,
  };

  const next = [...partners, partner];
  const writeErr = await writePartners(admin, guard.user.id, next);
  if (writeErr) {
    return NextResponse.json({ error: writeErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, partner: withPublicUrl(admin, partner) });
}

export async function PATCH(req: Request) {
  const guard = await requireRole("superadmin");
  if ("error" in guard) return guard.error;

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "supabase unavailable" }, { status: 500 });

  const body = (await req.json().catch(() => null)) as
    | { partners?: Partial<PartnerLogoRow>[] }
    | null;
  if (!body?.partners || !Array.isArray(body.partners)) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const normalized = body.partners
    .map((row, idx) => normalizeRow(row, idx))
    .filter((row): row is PartnerLogoRow => !!row)
    .map((row, idx) => ({ ...row, sort_order: idx }));

  const seen = new Set<string>();
  for (const p of normalized) {
    if (seen.has(p.id)) {
      return NextResponse.json({ error: "duplicate partner id" }, { status: 400 });
    }
    seen.add(p.id);
  }

  const writeErr = await writePartners(admin, guard.user.id, normalized);
  if (writeErr) {
    return NextResponse.json({ error: writeErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, partners: normalized.map((p) => withPublicUrl(admin, p)) });
}

export async function PUT(req: Request) {
  const guard = await requireRole("superadmin");
  if ("error" in guard) return guard.error;

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "supabase unavailable" }, { status: 500 });

  const form = await req.formData().catch(() => null);
  const id = typeof form?.get("id") === "string" ? String(form.get("id")).trim() : "";
  const file = form?.get("file");

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "invalid file type" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "file too large" }, { status: 400 });
  }

  const partners = await readPartners(admin);
  const target = partners.find((p) => p.id === id);
  if (!target) return NextResponse.json({ error: "not found" }, { status: 404 });

  const bucket = getBrandBucketName();
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
  const logoPath = `partners/${crypto.randomUUID()}-${Date.now()}.${ext}`;
  const bytes = await file.arrayBuffer();
  const { error: uploadErr } = await admin.storage
    .from(bucket)
    .upload(logoPath, bytes, { contentType: file.type, upsert: true });
  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 });
  }

  // Remove old stored file if any
  if (target.logo_path) {
    await admin.storage.from(bucket).remove([target.logo_path]);
  }

  const updatedTarget = { ...target, logo_path: logoPath, logo_url: null };
  const next = partners.map((p) => (p.id === id ? updatedTarget : p));
  const writeErr = await writePartners(admin, guard.user.id, next);
  if (writeErr) {
    return NextResponse.json({ error: writeErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, partner: withPublicUrl(admin, updatedTarget) });
}

export async function DELETE(req: Request) {
  const guard = await requireRole("superadmin");
  if ("error" in guard) return guard.error;

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "supabase unavailable" }, { status: 500 });

  const body = (await req.json().catch(() => null)) as { id?: string } | null;
  const id = body?.id?.trim();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const partners = await readPartners(admin);
  const target = partners.find((p) => p.id === id);
  if (!target) return NextResponse.json({ error: "not found" }, { status: 404 });

  const next = partners.filter((p) => p.id !== id).map((p, idx) => ({ ...p, sort_order: idx }));
  const writeErr = await writePartners(admin, guard.user.id, next);
  if (writeErr) {
    return NextResponse.json({ error: writeErr.message }, { status: 500 });
  }

  if (target.logo_path) {
    await admin.storage.from(getBrandBucketName()).remove([target.logo_path]);
  }

  return NextResponse.json({ ok: true });
}
