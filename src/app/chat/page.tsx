import { ChatUI } from "@/components/chat-ui";

export const metadata = {
  title: "Movexum Startupkompass · AI-intag",
};

export default function ChatPage() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-8 sm:px-10">
      <ChatUI />
    </main>
  );
}
