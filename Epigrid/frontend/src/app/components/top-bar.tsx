"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Moon, Sun } from "lucide-react";
import { useLocale } from "@/app/context/LocaleContext";
import { useTheme } from "@/app/context/ThemeContext";
import { PRIMARY_NAV_ITEMS } from "@/app/lib/navigation";
import type { Locale } from "@/app/lib/i18n";

export function TopBar() {
  const { t, locale, setLocale, labels } = useLocale();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
        <Link href="/" className="min-w-0">
          <p className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-[var(--color-brand-deep)]">
            {t("appName")}
          </p>
          <p className="hidden truncate text-[11px] text-[var(--color-muted-foreground)] sm:block">
            {t("tagline")}
          </p>
        </Link>

        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="language-select">
            Language
          </label>
          <select
            id="language-select"
            value={locale}
            onChange={(e) => setLocale(e.target.value as Locale)}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-background-sunken)] px-2 py-1.5 text-[12px] text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/30"
          >
            {(Object.keys(labels) as Locale[]).map((code) => (
              <option key={code} value={code}>
                {labels[code]}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "light" ? t("darkMode") : t("lightMode")}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-background-sunken)] text-[var(--color-brand)] transition-colors hover:bg-[var(--color-sage-tint)]"
          >
            {theme === "light" ? (
              <Moon className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Sun className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useLocale();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-border)] bg-[var(--color-surface)] pb-[env(safe-area-inset-bottom)] sm:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-1">
        {PRIMARY_NAV_ITEMS.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <li key={item.id} className="flex-1">
              <Link
                href={item.href}
                className={[
                  "flex flex-col items-center gap-0.5 px-1 py-2 text-[10px] font-medium",
                  active
                    ? "text-[var(--color-brand)]"
                    : "text-[var(--color-muted-foreground)]",
                ].join(" ")}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
                {t(item.labelKey)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function SideNav() {
  const pathname = usePathname();
  const { t } = useLocale();

  return (
    <nav aria-label="Primary" className="flex flex-col gap-1 p-3">
      {PRIMARY_NAV_ITEMS.map((item) => {
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.id}
            href={item.href}
            className={[
              "flex items-center gap-2.5 rounded-md px-3 py-2.5 text-[13px] font-medium transition-colors",
              active
                ? "bg-[var(--color-brand)] text-white"
                : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-background-sunken)] hover:text-[var(--color-foreground)]",
            ].join(" ")}
          >
            <Icon className="h-4 w-4" strokeWidth={1.75} />
            {t(item.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
