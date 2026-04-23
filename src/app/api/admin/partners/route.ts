import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getPartnersBucketName } from "@/lib/partners";

export const runtime = "nodejs";

const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/svg+xml",
  "image/webp",
];
const MAX_SIZE = 1_500_000; // 1.5 MB
const MAX_NAME_LENGTH = 120;
const MAX_URL_LENGTH = 500;

export async function GET() {
  const guard = await requireRole("superadmin");
  if ("error" in guard) return guard.error;

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "supabase unavailable" }, { status: 500 });
  }

  const { data, error } = await admin
    .from("partner_logos")
    .select("id, name, url, logo_path, sort_order, active, created_at")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const bucket = getPartnersBucketName();
  const partners = (data ?? []).map((row) => {
    let logoUrl: string | null = null;
    if (row.logo_path) {
      const { data: pub } = admin.storage.from(bucket).getPublicUrl(row.logo_path);
      logoUrl = pub.publicUrl ?? null;
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
  });

  return NextResponse.json({ partners });
}

export async function POST(req: Request) {
  const guard = await requireRole("superadmin");
  if ("error" in guard) return guard.error;

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "supabase unavailable" }, { status: 500 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "invalid form" }, { status: 400 });
  }

  const name = (form.get("name") as string | null)?.trim();
  const urlRaw = (form.get("url") as string | null)?.trim();
  const file = form.get("file");

  if (!name) {
    return NextResponse.json({ error: "Namn saknas." }, { status: 400 });
  }
  if (name.length > MAX_NAME_LENGTH) {
    return NextResponse.json(
      { error: `Namnet får vara max ${MAX_NAME_LENGTH} tecken.` },
      { status: 400 },
    );
  }

  let url: string | null = null;
  if (urlRaw) {
    if (urlRaw.length > MAX_URL_LENGTH) {
      return NextResponse.json(
        { error: "Länken är för lång." },
        { status: 400 },
      );
    }
    try {
      const parsed = new URL(urlRaw);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error("bad protocol");
      }
      url = parsed.toString();
    } catch {
      return NextResponse.json(
        { error: "Länken måste vara en giltig http(s)-URL." },
        { status: 400 },
      );
    }
  }

  let logoPath: string | null = null;
  if (file instanceof File && file.size > 0) {
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

    const bucket = getPartnersBucketName();
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
    logoPath = `partner-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const bytes = await file.arrayBuffer();
    const { error: uploadError } = await admin.storage
      .from(bucket)
      .upload(logoPath, bytes, { contentType: file.type, upsert: false });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }
  }

  // Default sort_order = current max + 10 so new items appear last.
  const { data: lastRow } = await admin
    .from("partner_logos")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = ((lastRow?.sort_order as number | undefined) ?? 0) + 10;

  const { data: inserted, error: insertError } = await admin
    .from("partner_logos")
    .insert({
      name,
      url,
      logo_path: logoPath,
      sort_order: nextOrder,
      active: true,
      updated_by: guard.user.id,
    })
    .select("id")
    .single();

  if (insertError) {
    // Rollback the storage upload if the DB insert failed.
    if (logoPath) {
      await admin.storage.from(getPartnersBucketName()).remove([logoPath]);
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: inserted.id }, { status: 201 });
}
