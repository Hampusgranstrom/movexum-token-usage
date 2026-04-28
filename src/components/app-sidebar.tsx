"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  BarChart3,
  Inbox,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  Palette,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { Halftone } from "@/components/halftone";
import { cn } from "@/lib/utils";
import type { AppRole } from "@/lib/auth";
import type { BrandSettings } from "@/lib/brand";

type SidebarUser = { email: string; role: AppRole };

type Item = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const OVERVIEW: Item[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/analysis", label: "Analys", icon: BarChart3 },
  { href: "/leads", label: "Leads", icon: Inbox },
];

const ADMIN: Item[] = [
  { href: "/admin/modules", label: "Moduler", icon: Layers },
  { href: "/admin/users", label: "Användare", icon: Users },
  { href: "/admin/brand", label: "Varumärke", icon: Palette },
  { href: "/admin/security", label: "Säkerhet", icon: ShieldCheck },
];

export function AppSidebar({
  user,
  brand,
}: {
  user: SidebarUser;
  brand: BrandSettings;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const publicSiteHref =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "/";

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const close = () => setOpen(false);

  const Section = ({ title, items }: { title: string; items: Item[] }) => (
    <div className="space-y-0.5">
      <div className="px-3 pb-1.5 pt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-subtle">
        {title}
      </div>
      {items.map((item) => {
        const Icon = item.icon;
        const active =
          pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
              active
                ? "bg-bg-deep text-fg-deep"
                : "text-muted hover:bg-bg-deep/60 hover:text-fg-deep",
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4 transition",
                active
                  ? "text-fg-deep"
                  : "text-subtle group-hover:text-fg-deep",
              )}
            />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );

  const Brand = ({ size = 30 }: { size?: number }) => (
    <Link href="/dashboard" className="flex items-center gap-2.5">
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
        <span className="flex items-center gap-2.5">
          <Halftone size={size} color="#0A0A0A" bg="transparent" />
          <span className="text-lg font-semibold tracking-tight text-fg-deep">
            {brand.productName.toLowerCase()}
          </span>
        </span>
      )}
    </Link>
  );

  return (
    <>
      {/* Phone-only top bar (sidebar slides in as drawer below md) */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-surface px-5 py-3 md:hidden">
        <Brand size={26} />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="icon-btn-outline"
          aria-label="Öppna meny"
        >
          <Menu className="h-4 w-4" />
        </button>
      </div>

      {/* Phone backdrop */}
      {open ? (
        <button
          type="button"
          aria-label="Stäng meny"
          onClick={close}
          className="fixed inset-0 z-40 bg-fg-deep/30 backdrop-blur-sm md:hidden"
        />
      ) : null}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-surface transition-transform duration-200 ease-out md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
        aria-label="Huvudmeny"
      >
        <div className="flex items-center justify-between px-5 py-5">
          <Brand />
          <button
            type="button"
            onClick={close}
            className="icon-btn-outline md:hidden"
            aria-label="Stäng meny"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-3 overflow-y-auto px-3 pb-4">
          <Section title="Översikt" items={OVERVIEW} />
          {user.role === "superadmin" ? (
            <>
              <div className="mx-3 border-t border-border" />
              <Section title="Administration" items={ADMIN} />
            </>
          ) : null}
        </nav>

        <div className="border-t border-border px-3 py-3">
          <a
            href={publicSiteHref}
            target="_blank"
            rel="noreferrer noopener"
            className="group mb-2 flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-muted transition hover:bg-bg-deep/60 hover:text-fg-deep"
          >
            <ArrowUpRight className="h-4 w-4 text-subtle transition group-hover:text-fg-deep" />
            <span>Publik webb</span>
          </a>
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium text-fg-deep">
                {user.email}
              </div>
              <div className="eyebrow text-[10px]">
                {user.role === "superadmin" ? "Superadmin" : "Admin"}
              </div>
            </div>
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                className="icon-btn-outline"
                aria-label="Logga ut"
                title="Logga ut"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>
    </>
  );
}
