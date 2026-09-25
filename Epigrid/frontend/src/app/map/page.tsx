"use client";

import { MapWidget } from "@/app/components/mapwidget";
import { useLocale } from "@/app/context/LocaleContext";
import { useIncident } from "@/app/context/IncidentContext";

export default function ExtendedMapPage() {
  const { t } = useLocale();
  const { latestIncident, incidents } = useIncident();

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
        <div>
          <h1 className="font-display text-lg font-semibold text-[var(--color-brand-deep)]">
            {t("tabMap")}
          </h1>
          <p className="text-[12px] text-[var(--color-muted-foreground)]">
            {latestIncident
              ? `${latestIncident.district} · ${latestIncident.pathogen}`
              : "Pan and zoom to explore neighbouring risk patterns"}
          </p>
        </div>
        <p className="text-[11px] text-[var(--color-muted-foreground)]">
          {incidents.length} incident{incidents.length === 1 ? "" : "s"}
        </p>
      </header>
      <div className="relative min-h-0 flex-1">
        <MapWidget
          className="h-full rounded-none border-0"
          zoom={10}
          showLegend
          emptyWhenNoData={false}
        />
      </div>
    </div>
  );
}
