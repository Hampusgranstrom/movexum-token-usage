import { LeadList } from "@/components/lead-list";
import { Nav } from "@/components/nav";

export const metadata = {
  title: "Movexum Startupkompass · Leads",
};

export default function LeadsPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto min-h-screen max-w-7xl px-6 py-12 sm:px-10 sm:py-16">
        <LeadList />
      </main>
    </>
  );
}
