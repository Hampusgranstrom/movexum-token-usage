import { Suspense } from "react";
import { AcceptInviteForm } from "@/components/accept-invite-form";

export const metadata = {
  title: "Movexum Startupkompass · Acceptera inbjudan",
};

export default function AcceptInvitePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <Suspense>
        <AcceptInviteForm />
      </Suspense>
    </main>
  );
}
