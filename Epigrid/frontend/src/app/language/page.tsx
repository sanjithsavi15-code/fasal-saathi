"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "@/app/context/LocaleContext";
import type { Locale } from "@/app/lib/i18n";

export default function LanguagePage() {
  const { t, locale, setLocale, labels, hasChosenLanguage } = useLocale();
  const router = useRouter();

  function handleContinue() {
    setLocale(locale);
    router.replace("/");
  }

  function pick(code: Locale) {
    setLocale(code);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="fs-panel w-full max-w-md p-8">
        <p className="font-display text-center text-2xl font-semibold text-[var(--color-brand-deep)]">
          {t("appName")}
        </p>
        <h1 className="mt-6 text-center text-lg font-semibold text-[var(--color-foreground)]">
          {t("languageTitle")}
        </h1>

        <div className="mt-6 flex flex-col gap-2">
          {(Object.keys(labels) as Locale[]).map((code) => {
            const active = locale === code;
            return (
              <button
                key={code}
                type="button"
                onClick={() => pick(code)}
                className={[
                  "rounded-lg border px-4 py-3 text-left text-[14px] font-medium transition-colors",
                  active
                    ? "border-[var(--color-brand)] bg-[var(--color-brand)] text-white"
                    : "border-[var(--color-border)] bg-[var(--color-background-sunken)] text-[var(--color-foreground)] hover:border-[var(--color-brand)]",
                ].join(" ")}
              >
                {labels[code]}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleContinue}
          className="fs-btn-primary mt-6"
        >
          {hasChosenLanguage ? t("languageContinue") : t("languageContinue")}
        </button>
      </div>
    </div>
  );
}
