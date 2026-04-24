"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
};

export function NavLinks({
  items,
  mobile = false,
}: {
  items: NavItem[];
  mobile?: boolean;
}) {
  const pathname = usePathname();

  return (
    <>
      {items.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              mobile
                ? "rounded-full px-3 py-1.5 text-sm transition"
                : "rounded-full px-4 py-2 text-sm font-medium transition",
              mobile
                ? active
                  ? "bg-surface text-fg-deep shadow-soft"
                  : "text-muted"
                : active
                  ? "text-fg-deep"
                  : "text-muted hover:text-fg",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );
}
