"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { TopBar, BottomNav, SideNav } from "@/app/components/top-bar";
import { AuthGuard } from "@/app/components/auth-guard";
import { LanguageGate } from "@/app/components/language-gate";

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
        <div className="flex min-h-screen flex-col bg-[var(--color-background)] text-[var(--color-foreground)]">
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-[var(--color-brand)] focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
          >
            Skip to main content
          </a>

          <TopBar />

          <div className="flex flex-1">
            <aside
              aria-label="Sidebar"
              className="hidden w-56 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] sm:flex"
            >
              <SideNav />
            </aside>

            <main
              id="main-content"
              tabIndex={-1}
              className="flex min-h-[calc(100vh-3.5rem)] flex-1 flex-col pb-20 focus:outline-none sm:pb-0"
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
