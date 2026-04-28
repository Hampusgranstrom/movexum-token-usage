import { redirect } from "next/navigation";
import { SecurityEvents } from "@/components/security-events";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Movexum Startupkompass · Säkerhet" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "superadmin") redirect("/dashboard");

  return <SecurityEvents />;
}
