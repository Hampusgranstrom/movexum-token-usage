"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import type { AppRole } from "@/lib/auth";
import type { BrandSettings } from "@/lib/brand";

type NavUser = { email: string; role: AppRole } | null;

const BASE_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/leads", label: "Leads" },
  { href: "/chat", label: "AI-intag" },
];

const ADMIN_ITEMS = [
  { href: "/admin/users", label: "Användare" },
  { href: "/admin/brand", label: "Varumärke" },
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
    <nav className="bg-surface shadow-soft">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          {brand.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={brand.logoUrl}
              alt={brand.productName}
              className="h-7 w-auto max-w-[120px] object-contain"
            />
          ) : (
            <span className="text-base font-semibold tracking-tight">
              {brand.productName}
            </span>
          )}
        </Link>

        <div className="flex items-center gap-1">
          {items.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-bg text-fg"
                    : "text-muted hover:text-fg",
                )}
              >
                {item.label}
              </Link>
            );
          })}

          {user && (
            <div className="ml-3 flex items-center gap-3 border-l border-border pl-3">
              <div className="hidden text-right sm:block">
                <div className="text-xs font-medium text-fg">{user.email}</div>
                <div className="text-[10px] uppercase tracking-[0.12em] text-muted">
                  {user.role === "superadmin" ? "Superadmin" : "Admin"}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="btn-ghost"
                aria-label="Logga ut"
                title="Logga ut"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
