import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import { ChevronMark } from "@/components/chevron-mark";
import { getBrandSettings } from "@/lib/brand";

export const metadata = {
  title: "Movexum Startupkompass · Logga in",
};

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const brand = await getBrandSettings();
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12">
      <ChevronMark className="absolute -right-24 top-1/2 -translate-y-1/2 opacity-70" />
      <ChevronMark
        size={320}
        className="absolute -left-24 -top-12 rotate-180 opacity-50"
      />
      <div className="relative z-10 w-full">
        <Suspense>
          <LoginForm productName={brand.productName} logoUrl={brand.logoUrl} />
        </Suspense>
      </div>
    </main>
  );
}
