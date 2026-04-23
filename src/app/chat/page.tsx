import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * Legacy alias — the founders module is the direct replacement for the
 * old /chat experience. Permanent redirect so bookmarks keep working.
 */
export default function LegacyChat() {
  redirect("/m/founders");
}
