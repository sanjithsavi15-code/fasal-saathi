"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "@/app/context/LocaleContext";

/** After login, force a one-time language choice before the main app. */
export function LanguageGate({ children }: { children: ReactNode }) {
  const { hasChosenLanguage, isLocaleReady } = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLocaleReady) return;
    if (!hasChosenLanguage && pathname !== "/language") {
      router.replace("/language");
    }
  }, [hasChosenLanguage, isLocaleReady, pathname, router]);

  if (!isLocaleReady) {
    return (
      <div
        role="status"
        className="flex min-h-screen items-center justify-center bg-[var(--color-background)]"
      >
        <span className="text-[13px] text-[var(--color-muted-foreground)]">
          Loading…
        </span>
      </div>
    );
  }

  if (!hasChosenLanguage && pathname !== "/language") {
    return (
      <div
        role="status"
        className="flex min-h-screen items-center justify-center bg-[var(--color-background)]"
      >
        <span className="text-[13px] text-[var(--color-muted-foreground)]">
          Loading…
        </span>
      </div>
    );
  }

  return <>{children}</>;
}
