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
const MAX_SIZE = 1_500_000;
const MAX_NAME_LENGTH = 120;
const MAX_URL_LENGTH = 500;

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const guard = await requireRole("superadmin");
  if ("error" in guard) return guard.error;

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "supabase unavailable" }, { status: 500 });
  }

  const { id } = await ctx.params;
  const contentType = req.headers.get("content-type") ?? "";

  const update: Record<string, unknown> = { updated_by: guard.user.id };
  let newLogoPath: string | null = null;

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    if (!form) {
      return NextResponse.json({ error: "invalid form" }, { status: 400 });
    }

    if (form.has("name")) {
      const name = (form.get("name") as string).trim();
      if (!name || name.length > MAX_NAME_LENGTH) {
        return NextResponse.json({ error: "Ogiltigt namn." }, { status: 400 });
      }
      update.name = name;
    }

    if (form.has("url")) {
      const urlRaw = (form.get("url") as string).trim();
      if (!urlRaw) {
        update.url = null;
      } else {
        if (urlRaw.length > MAX_URL_LENGTH) {
          return NextResponse.json({ error: "Länken är för lång." }, { status: 400 });
        }
        try {
          const parsed = new URL(urlRaw);
          if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
            throw new Error("bad protocol");
          }
          update.url = parsed.toString();
        } catch {
          return NextResponse.json(
            { error: "Länken måste vara en giltig http(s)-URL." },
            { status: 400 },
          );
        }
      }
    }

    const file = form.get("file");
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
      newLogoPath = `partner-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const bytes = await file.arrayBuffer();
      const { error: uploadError } = await admin.storage
        .from(bucket)
        .upload(newLogoPath, bytes, { contentType: file.type, upsert: false });

      if (uploadError) {
        return NextResponse.json({ error: uploadError.message }, { status: 500 });
      }
      update.logo_path = newLogoPath;
    }
  } else {
    const body = (await req.json().catch(() => null)) as
      | {
          name?: string;
          url?: string | null;
          active?: boolean;
          sort_order?: number;
        }
      | null;
    if (!body) {
      return NextResponse.json({ error: "invalid body" }, { status: 400 });
    }

    if (typeof body.active === "boolean") update.active = body.active;
    if (typeof body.sort_order === "number") update.sort_order = body.sort_order;
    if (typeof body.name === "string") {
      const name = body.name.trim();
      if (!name || name.length > MAX_NAME_LENGTH) {
        return NextResponse.json({ error: "Ogiltigt namn." }, { status: 400 });
      }
      update.name = name;
    }
    if (body.url !== undefined) {
      if (!body.url) {
        update.url = null;
      } else {
        try {
          const parsed = new URL(body.url);
          if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
            throw new Error("bad protocol");
          }
          update.url = parsed.toString();
        } catch {
          return NextResponse.json(
            { error: "Länken måste vara en giltig http(s)-URL." },
            { status: 400 },
          );
        }
      }
    }
  }

  // If we replaced the logo, remember the old path so we can delete it on success.
  let prevPath: string | null = null;
  if (newLogoPath) {
    const { data: prev } = await admin
      .from("partner_logos")
      .select("logo_path")
      .eq("id", id)
      .maybeSingle();
    prevPath = (prev?.logo_path as string | null) ?? null;
  }

  const { error } = await admin
    .from("partner_logos")
    .update(update)
    .eq("id", id);

  if (error) {
    if (newLogoPath) {
      await admin.storage.from(getPartnersBucketName()).remove([newLogoPath]);
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (prevPath && prevPath !== newLogoPath) {
    await admin.storage.from(getPartnersBucketName()).remove([prevPath]);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const guard = await requireRole("superadmin");
  if ("error" in guard) return guard.error;

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "supabase unavailable" }, { status: 500 });
  }

  const { id } = await ctx.params;

  const { data: row } = await admin
    .from("partner_logos")
    .select("logo_path")
    .eq("id", id)
    .maybeSingle();

  const { error } = await admin.from("partner_logos").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (row?.logo_path) {
    await admin.storage.from(getPartnersBucketName()).remove([row.logo_path]);
  }

  return NextResponse.json({ ok: true });
}
