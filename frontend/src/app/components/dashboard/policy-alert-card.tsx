import type { AlertSeverity, PolicyAlert } from "@/app/lib/dashboard-data";

const SEVERITY_STYLES: Record<AlertSeverity, { dot: string; text: string; label: string }> = {
  critical: { dot: "bg-red-600", text: "text-red-700", label: "Critical" },
  warning: { dot: "bg-amber-500", text: "text-amber-700", label: "Warning" },
  info: { dot: "bg-slate-400", text: "text-slate-600", label: "Advisory" },
};

export function PolicyAlertCard({ alert }: { alert: PolicyAlert }) {
  const styles = SEVERITY_STYLES[alert.severity];

  return (
    <article className="rounded-md border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} aria-hidden="true" />
          <span className={`text-[11px] font-semibold uppercase tracking-wide ${styles.text}`}>
            {styles.label}
          </span>
        </div>
        <span className="text-[11px] text-slate-400">{alert.timestamp}</span>
      </div>

      <p className="mt-2 text-[13px] leading-snug text-slate-700">{alert.message}</p>

      <div className="mt-2.5 flex items-center justify-between">
        <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10.5px] text-slate-500">
          {alert.sector}
        </span>
        <button
          type="button"
          className="text-[11px] font-medium text-green-800 underline-offset-2 hover:text-green-900 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
        >
          Review
        </button>
      </div>
    </article>
  );
}
