"use client";

import { PolicyAlertCard } from "@/app/components/dashboard/policy-alert-card";
import { useIncident } from "@/app/context/IncidentContext";
import type { Incident } from "@/app/context/IncidentContext";
import type { AlertSeverity, PolicyAlert } from "@/app/lib/dashboard-data";

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const deltaSec = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (deltaSec < 60) return `${deltaSec}s ago`;
  const mins = Math.round(deltaSec / 60);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours} hr ago`;
  return new Date(iso).toLocaleString();
}

function severityFromIncident(inc: Incident): AlertSeverity {
  if (inc.severity === "critical") return "critical";
  if (inc.severity === "warning") return "warning";
  return "info";
}

function incidentToAlert(inc: Incident): PolicyAlert {
  const steps = inc.preventionSteps?.slice(0, 2).join(" · ") ?? "Awaiting prevention steps.";
  return {
    id: `policy-${inc.id}`,
    severity: severityFromIncident(inc),
    timestamp: relativeTime(inc.timestamp),
    sector: `${inc.district} · ${inc.sector}`,
    message: `${inc.cropType} / ${inc.pathogen}: ${steps}`,
  };
}

export function PolicyFeed() {
  const { incidents } = useIncident();
  const alerts = incidents.map(incidentToAlert);

  return (
    <section className="fs-panel flex h-full flex-col">
      <header className="border-b border-[var(--color-border)] px-4 py-3">
        <h2 className="text-[13px] font-medium text-[var(--color-brand-deep)]">
          Prevention feed
        </h2>
        <p className="text-[11px] text-[var(--color-muted-foreground)]">
          RL recommendations from recent diagnoses
        </p>
      </header>

      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto p-3">
        {alerts.length === 0 ? (
          <p className="px-1 py-4 text-[12px] text-[var(--color-muted-foreground)]">
            No incidents yet.
          </p>
        ) : (
          alerts.map((alert) => (
            <PolicyAlertCard key={alert.id} alert={alert} />
          ))
        )}
      </div>
    </section>
  );
}
