"use client";

import { useState } from "react";
import {
  Phone,
  Trash2,
  Camera,
  CloudSun,
  ShieldAlert,
  UserRound,
  Upload,
  Languages,
  Palette,
  Eye,
  FileWarning,
  AlertTriangle,
  CheckCircle2,
  Map,
  Volume2,
  Radar,
} from "lucide-react";
import { useLocale } from "@/app/context/LocaleContext";
import { useActivity } from "@/app/context/ActivityContext";
import type { ActivityLog } from "@/app/context/ActivityContext";

/* ── Map action types to icons ── */
const ACTION_ICONS: Record<ActivityLog["action"], typeof Camera> = {
  diagnosis_started: Camera,
  diagnosis_completed: CheckCircle2,
  diagnosis_failed: AlertTriangle,
  weather_fetched: CloudSun,
  simulation_ran: ShieldAlert,
  profile_saved: UserRound,
  photo_uploaded: Upload,
  language_changed: Languages,
  theme_changed: Palette,
  page_visited: Eye,
  incident_logged: FileWarning,
  map_viewport_changed: Map,
  tts_activated: Volume2,
  spread_projected: Radar,
};

/* ── Map action types to i18n keys ── */
const ACTION_LABEL_KEYS: Record<ActivityLog["action"], string> = {
  diagnosis_started: "logActionDiagnosisStarted",
  diagnosis_completed: "logActionDiagnosisCompleted",
  diagnosis_failed: "logActionDiagnosisFailed",
  weather_fetched: "logActionWeatherFetched",
  simulation_ran: "logActionSimulationRan",
  profile_saved: "logActionProfileSaved",
  photo_uploaded: "logActionPhotoUploaded",
  language_changed: "logActionLanguageChanged",
  theme_changed: "logActionThemeChanged",
  page_visited: "logActionPageVisited",
  incident_logged: "logActionIncidentLogged",
  map_viewport_changed: "logActionMapViewportChanged",
  tts_activated: "logActionTtsActivated",
  spread_projected: "logActionSpreadProjected",
};

/* ── Severity color for action badges ── */
function actionColor(action: ActivityLog["action"]): string {
  switch (action) {
    case "diagnosis_failed":
      return "text-[var(--color-clay)] bg-[color-mix(in_srgb,var(--color-clay)_12%,transparent)]";
    case "diagnosis_completed":
    case "simulation_ran":
      return "text-[var(--color-brand)] bg-[color-mix(in_srgb,var(--color-brand)_12%,transparent)]";
    case "weather_fetched":
    case "incident_logged":
    case "spread_projected":
      return "text-[var(--color-amber)] bg-[color-mix(in_srgb,var(--color-amber)_12%,transparent)]";
    case "map_viewport_changed":
    case "tts_activated":
      return "text-[var(--color-sage)] bg-[color-mix(in_srgb,var(--color-sage)_10%,transparent)]";
    default:
      return "text-[var(--color-sage)] bg-[color-mix(in_srgb,var(--color-sage)_10%,transparent)]";
  }
}

function formatTimestamp(iso: string, locale: string): string {
  try {
    const date = new Date(iso);
    const langCode = locale === "mr" ? "mr-IN" : locale === "hi" ? "hi-IN" : "en-IN";
    return date.toLocaleString(langCode, {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function LogsPage() {
  const { t, locale } = useLocale();
  const { activities, clearActivities } = useActivity();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleClear = () => {
    clearActivities();
    setShowConfirm(false);
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      {/* ── Header ── */}
      <div className="mb-6">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--color-brand-deep)]">
          {t("logsTitle")}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          {t("logsSubtitle")}
        </p>
      </div>

      {/* ── Actions bar ── */}
      {activities.length > 0 && (
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs text-[var(--color-muted-foreground)]">
            {activities.length} {activities.length === 1 ? "entry" : "entries"}
          </p>
          {!showConfirm ? (
            <button
              type="button"
              onClick={() => setShowConfirm(true)}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-[var(--color-clay)] transition-colors hover:bg-[color-mix(in_srgb,var(--color-clay)_8%,transparent)]"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t("logsClearAll")}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--color-clay)]">
                {t("logsClearConfirm")}
              </span>
              <button
                type="button"
                onClick={handleClear}
                className="rounded-md bg-[var(--color-clay)] px-3 py-1 text-xs font-medium text-white"
              >
                {t("logsClearAll")}
              </button>
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="rounded-md border border-[var(--color-border)] px-3 py-1 text-xs font-medium text-[var(--color-muted-foreground)]"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Empty state ── */}
      {activities.length === 0 && (
        <div className="fs-panel flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <FileWarning className="h-10 w-10 text-[var(--color-muted-foreground)] opacity-40" />
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {t("logsEmpty")}
          </p>
        </div>
      )}

      {/* ── Activity list ── */}
      <div className="flex flex-col gap-2">
        {activities.map((log) => {
          const Icon = ACTION_ICONS[log.action] || Eye;
          const labelKey = ACTION_LABEL_KEYS[log.action] || "logActionPageVisited";

          return (
            <div
              key={log.id}
              className="fs-panel flex items-start gap-3 p-4 transition-colors hover:bg-[var(--color-background-sunken)]"
            >
              {/* Icon badge */}
              <div
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${actionColor(log.action)}`}
              >
                <Icon className="h-4 w-4" />
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[var(--color-foreground)]">
                  {t(labelKey)}
                </p>
                <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
                  {log.summary}
                </p>

                {/* Meta tags */}
                {log.meta && Object.keys(log.meta).length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {Object.entries(log.meta).map(([key, value]) => (
                      <span
                        key={key}
                        className="inline-flex rounded-md bg-[var(--color-background-sunken)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-muted-foreground)]"
                      >
                        {key}: {value}
                      </span>
                    ))}
                  </div>
                )}

                {/* Timestamp */}
                <p className="mt-1.5 text-[10px] text-[var(--color-muted-foreground)] opacity-70">
                  {formatTimestamp(log.timestamp, locale)}
                </p>
              </div>

              {/* Contact Expert button */}
              <a
                href="tel:18001801551"
                title={t("contactExpertHint")}
                className="mt-0.5 flex shrink-0 items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-background-sunken)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--color-brand)] transition-colors hover:bg-[var(--color-sage-tint)]"
              >
                <Phone className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t("contactExpert")}</span>
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}
