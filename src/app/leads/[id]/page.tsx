import { LeadDetail } from "@/components/lead-detail";
import { Nav } from "@/components/nav";

export const metadata = {
  title: "Movexum Startupkompass · Lead",
};

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <>
      <Nav />
      <main className="mx-auto min-h-screen max-w-7xl px-6 py-12 sm:px-10 sm:py-16">
        <LeadDetail id={id} />
      </main>
    </>
  );
}
