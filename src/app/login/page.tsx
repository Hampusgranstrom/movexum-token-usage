import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import { getBrandSettings } from "@/lib/brand";

export const metadata = {
  title: "Movexum Startupkompass · Logga in",
};

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const brand = await getBrandSettings();
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full">
        <Suspense>
          <LoginForm productName={brand.productName} logoUrl={brand.logoUrl} />
        </Suspense>
      </div>
    </main>
  );
}
