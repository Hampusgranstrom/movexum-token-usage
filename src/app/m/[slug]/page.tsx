import { notFound } from "next/navigation";
import { ModuleIntake } from "@/components/module-intake";
import { getModuleBySlug } from "@/lib/modules";
import { getBrandSettings } from "@/lib/brand";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const mod = await getModuleBySlug(slug);
  if (!mod) return { title: "Movexum Startupkompass" };
  return {
    title: `${mod.welcome_title ?? mod.name} · Movexum Startupkompass`,
    description: mod.description ?? undefined,
  };
}

export default async function ModulePage({ params }: Props) {
  const { slug } = await params;
  const [mod, brand] = await Promise.all([
    getModuleBySlug(slug),
    getBrandSettings(),
  ]);
  if (!mod) notFound();

  const accent = mod.accent_color ?? null;
  const styleVars = accent ? { ["--color-accent" as string]: accent } : undefined;

  return (
    <main
      style={styleVars as React.CSSProperties | undefined}
      className="min-h-screen px-6 py-10 sm:px-10 sm:py-14"
    >
      <ModuleIntake slug={slug} brand={brand} />
    </main>
  );
}
