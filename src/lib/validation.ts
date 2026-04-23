import type { LeadStatus } from "./types";

export const VALID_STATUSES: ReadonlySet<LeadStatus> = new Set([
  "new",
  "contacted",
  "meeting-booked",
  "evaluating",
  "accepted",
  "declined",
]);

export const VALID_SORT_FIELDS: ReadonlySet<string> = new Set([
  "created_at",
  "score",
  "name",
  "status",
]);

// Strip characters that can escape out of a PostgREST filter-string value
// (`.or(...)`). Commas and parens delimit filters; dots delimit op/value; so
// an unsanitised user-controlled search term can inject extra filters.
// We whitelist a safe set of characters instead of blacklisting.
export function sanitizeSearchTerm(raw: string, maxLen = 80): string {
  return raw
    .replace(/[^\p{L}\p{N}\s@_-]/gu, "")
    .trim()
    .slice(0, maxLen);
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function isValidEmail(v: unknown): v is string {
  return typeof v === "string" && v.length <= 254 && EMAIL_RE.test(v);
}

export function isValidUuid(v: unknown): v is string {
  return (
    typeof v === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
  );
}

// Validated PATCH payload for /api/leads/[id]. Returns a clean object with only
// valid fields, or an error string on bad input.
export function sanitizeLeadPatch(
  body: Record<string, unknown>,
  validSourceIds: ReadonlySet<string>,
): { updates: Record<string, unknown> } | { error: string } {
  const out: Record<string, unknown> = {};

  if ("name" in body) {
    if (typeof body.name !== "string" || body.name.trim().length === 0) {
      return { error: "name måste vara en icke-tom sträng." };
    }
    out.name = body.name.trim().slice(0, 200);
  }
  if ("email" in body) {
    if (body.email === null || body.email === "") {
      out.email = null;
    } else if (!isValidEmail(body.email)) {
      return { error: "Ogiltig e-postadress." };
    } else {
      out.email = (body.email as string).toLowerCase();
    }
  }
  if ("phone" in body) {
    if (body.phone === null || body.phone === "") {
      out.phone = null;
    } else if (typeof body.phone !== "string" || body.phone.length > 40) {
      return { error: "Ogiltigt telefonnummer." };
    } else {
      out.phone = body.phone.trim();
    }
  }
  for (const field of ["organization", "idea_summary", "idea_category", "source_detail", "score_reasoning", "assigned_to", "notes"] as const) {
    if (field in body) {
      const v = body[field];
      if (v === null || v === "") {
        out[field] = null;
      } else if (typeof v !== "string") {
        return { error: `Ogiltigt värde för ${field}.` };
      } else {
        out[field] = v.slice(0, 4000);
      }
    }
  }
  if ("source_id" in body) {
    if (typeof body.source_id !== "string" || !validSourceIds.has(body.source_id)) {
      return { error: "Ogiltig source_id." };
    }
    out.source_id = body.source_id;
  }
  if ("status" in body) {
    if (typeof body.status !== "string" || !VALID_STATUSES.has(body.status as LeadStatus)) {
      return { error: "Ogiltig status." };
    }
    out.status = body.status;
  }
  if ("score" in body) {
    if (body.score === null) {
      out.score = null;
    } else {
      const n = Number(body.score);
      if (!Number.isFinite(n) || n < 0 || n > 100) {
        return { error: "score måste vara ett tal mellan 0 och 100." };
      }
      out.score = Math.round(n);
    }
  }
  if ("tags" in body) {
    if (!Array.isArray(body.tags)) {
      return { error: "tags måste vara en lista." };
    }
    if (body.tags.length > 20) {
      return { error: "För många taggar (max 20)." };
    }
    const tags: string[] = [];
    for (const t of body.tags) {
      if (typeof t !== "string" || t.length > 60) {
        return { error: "Ogiltig tagg." };
      }
      tags.push(t.trim());
    }
    out.tags = tags;
  }

  return { updates: out };
}
