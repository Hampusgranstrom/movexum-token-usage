"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import type { AppRole } from "@/lib/auth";
import type { BrandSettings } from "@/lib/brand";

type NavUser = { email: string; role: AppRole } | null;

const BASE_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/analysis", label: "Analys" },
  { href: "/leads", label: "Leads" },
];

const ADMIN_ITEMS = [
  { href: "/admin/modules", label: "Moduler" },
  { href: "/admin/users", label: "Användare" },
  { href: "/admin/brand", label: "Varumärke" },
  { href: "/admin/security", label: "Säkerhet" },
];

export function Nav({
  user,
  brand,
}: {
  user: NavUser;
  brand: BrandSettings;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const publicSiteHref = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "/";

  const handleLogout = async () => {
    const supabase = getSupabaseBrowser();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const items = [
    ...BASE_ITEMS,
    ...(user?.role === "superadmin" ? ADMIN_ITEMS : []),
  ];

  return (
    <nav className="relative">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 sm:px-10">
        <Link href="/dashboard" className="flex items-center gap-3">
          {brand.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={brand.logoUrl}
              alt={brand.productName}
              className="h-7 w-auto max-w-[140px] object-contain"
            />
          ) : (
            <span className="text-xl font-semibold tracking-tight text-fg-deep">
              {brand.productName.toLowerCase()}
            </span>
          )}
        </Link>

        <div className="hidden items-center gap-2 md:flex">
          {items.map((item) => {
            const active =
              pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition",
                  active
                    ? "text-fg-deep"
                    : "text-muted hover:text-fg",
                )}
              >
                {item.label}
              </Link>
            );
          })}

          <a
            href={publicSiteHref}
            target="_blank"
            rel="noreferrer noopener"
            className="btn-primary ml-1"
          >
            <ArrowRight className="h-4 w-4" />
            Publik webb
          </a>
        </div>

        {user ? (
          <div className="flex items-center gap-3">
            <div className="hidden text-right lg:block">
              <div className="text-xs font-medium text-fg">{user.email}</div>
              <div className="eyebrow text-[10px]">
                {user.role === "superadmin" ? "Superadmin" : "Admin"}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="icon-btn"
              aria-label="Logga ut"
              title="Logga ut"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>

      {/* mobile items */}
      <div className="flex flex-wrap items-center gap-2 px-6 pb-4 md:hidden">
        {items.map((item) => {
          const active =
            pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm transition",
                active ? "bg-surface text-fg-deep shadow-soft" : "text-muted",
              )}
            >
              {item.label}
            </Link>
          );
        })}
        <a
          href={publicSiteHref}
          target="_blank"
          rel="noreferrer noopener"
          className="btn-primary py-1.5 text-xs"
        >
          <ArrowRight className="h-3.5 w-3.5" />
          Publik webb
        </a>
      </div>
    </nav>
  );
}
