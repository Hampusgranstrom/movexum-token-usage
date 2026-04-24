import Link from "next/link";
import { LogOut, ArrowRight } from "lucide-react";
import { NavLinks } from "@/components/nav-links";
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
  const publicSiteHref = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "/";

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
              width="140"
              height="28"
              decoding="async"
              fetchPriority="high"
              className="h-7 w-auto max-w-[140px] object-contain"
            />
          ) : (
            <span className="text-xl font-semibold tracking-tight text-fg-deep">
              {brand.productName.toLowerCase()}
            </span>
          )}
        </Link>

        <div className="hidden items-center gap-2 md:flex">
          <NavLinks items={items} />

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
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                className="icon-btn"
                aria-label="Logga ut"
                title="Logga ut"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        ) : null}
      </div>

      {/* mobile items */}
      <div className="flex flex-wrap items-center gap-2 px-6 pb-4 md:hidden">
        <NavLinks items={items} mobile />
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
