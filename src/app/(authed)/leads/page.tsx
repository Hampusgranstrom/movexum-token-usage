import { LeadList } from "@/components/lead-list";

export const metadata = {
  title: "Movexum Startupkompass · Leads",
};

export const dynamic = "force-dynamic";

export default function LeadsPage() {
  return <LeadList />;
}
