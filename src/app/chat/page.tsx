import { ChatUI } from "@/components/chat-ui";
import { PartnersCarousel } from "@/components/partners-carousel";
import { getBrandSettings } from "@/lib/brand";
import { getActivePartnerLogos } from "@/lib/partners";

export const metadata = {
  title: "Movexum Startupkompass · AI-intag",
};

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const [brand, partners] = await Promise.all([
    getBrandSettings(),
    getActivePartnerLogos(),
  ]);
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-8 sm:px-10">
      <ChatUI productName={brand.productName} logoUrl={brand.logoUrl} />
      <div className="pb-12 pt-4">
        <PartnersCarousel
          partners={partners}
          tone="light"
          eyebrow="Movexum medfinansieras av"
          heading="Kommuner som investerar i nästa generations entreprenörer"
          description="Ditt stöd på den här resan möjliggörs av kommunerna i Gävleborg. Tillsammans bygger vi ett starkare näringsliv."
        />
      </div>
    </main>
  );
}
