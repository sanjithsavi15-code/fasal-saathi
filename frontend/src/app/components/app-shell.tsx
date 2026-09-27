"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { UserRound } from "lucide-react";
import { TopBar, BottomNav, SideNav } from "@/app/components/top-bar";
import { AuthGuard } from "@/app/components/auth-guard";
import { LanguageGate } from "@/app/components/language-gate";
import { useLocale } from "@/app/context/LocaleContext";

function SidebarProfileLink() {
  const pathname = usePathname();
  const { t } = useLocale();
  const active = pathname.startsWith("/profile");

  return (
    <div className="border-t border-[var(--color-border)] p-3">
      <Link
        href="/profile"
        className={[
          "flex items-center gap-2.5 rounded-md px-3 py-2.5 text-[13px] font-medium transition-colors",
          active
            ? "bg-[var(--color-brand)] text-white"
            : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-background-sunken)] hover:text-[var(--color-foreground)]",
        ].join(" ")}
      >
        <UserRound className="h-4 w-4" strokeWidth={1.75} />
        {t("tabProfile")}
      </Link>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/login") {
    return <>{children}</>;
  }

  if (pathname === "/language") {
    return <AuthGuard>{children}</AuthGuard>;
  }

  return (
    <AuthGuard>
      <LanguageGate>
        <div className="flex h-dvh flex-col overflow-hidden bg-[var(--color-background)] text-[var(--color-foreground)]">
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-[var(--color-brand)] focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
          >
            Skip to main content
          </a>

          <TopBar />

          <div className="flex min-h-0 flex-1">
            {/* ── Desktop sidebar: fixed, never scrolls ── */}
            <aside
              aria-label="Sidebar"
              className="hidden w-56 shrink-0 flex-col justify-between border-r border-[var(--color-border)] bg-[var(--color-surface)] sm:flex"
            >
              <SideNav />
              <SidebarProfileLink />
            </aside>

            {/* ── Main content: only this area scrolls ── */}
            <main
              id="main-content"
              tabIndex={-1}
              className="flex flex-1 flex-col overflow-y-auto pb-20 focus:outline-none sm:pb-0"
              style={{ overscrollBehavior: "contain" }}
            >
              {children}
            </main>
          </div>

          <BottomNav />
        </div>
      </LanguageGate>
    </AuthGuard>
  );
}
