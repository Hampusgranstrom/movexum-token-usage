import { ChatUI } from "@/components/chat-ui";
import { getBrandSettings } from "@/lib/brand";

export const metadata = {
  title: "Movexum Startupkompass · AI-intag",
};

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const brand = await getBrandSettings();
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-8 sm:px-10">
      <ChatUI productName={brand.productName} logoUrl={brand.logoUrl} />
    </main>
  );
}
