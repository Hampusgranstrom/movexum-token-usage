"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function isAdminSurface(pathname: string) {
  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/analysis") ||
    pathname.startsWith("/leads") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/accept-invite")
  );
}

export function ThemeSurface({
  adminThemeId,
  publicThemeId,
}: {
  adminThemeId: string;
  publicThemeId: string;
}) {
  const pathname = usePathname();

  useEffect(() => {
    const surface = isAdminSurface(pathname) ? "admin" : "public";
    const activeTheme = surface === "admin" ? adminThemeId : publicThemeId;
    document.documentElement.dataset.appSurface = surface;
    document.documentElement.dataset.activeTheme = activeTheme;
  }, [pathname, adminThemeId, publicThemeId]);

  return null;
}
