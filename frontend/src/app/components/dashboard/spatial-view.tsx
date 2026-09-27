"use client";

import { MapWidget } from "@/app/components/mapwidget";
import { useLocale } from "@/app/context/LocaleContext";

export function SpatialView() {
  const { t } = useLocale();

  return (
    <section className="fs-panel flex h-full min-h-[420px] flex-col lg:min-h-[560px]">
      <header className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
        <h2 className="text-[13px] font-medium text-[var(--color-brand-deep)]">
          {t("riskMap")}
        </h2>
      </header>
      <div className="min-h-0 flex-1">
        <MapWidget className="rounded-none border-0" showLegend />
      </div>
    </section>
  );
}
