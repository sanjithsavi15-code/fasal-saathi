import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { SystemMetric, MetricTrend } from "@/app/lib/dashboard-data";

const TREND_ICON: Record<MetricTrend, LucideIcon> = {
  up: TrendingUp,
  down: TrendingDown,
  flat: Minus,
};

const TREND_COLOR: Record<MetricTrend, string> = {
  up: "text-green-700",
  down: "text-red-600",
  flat: "text-slate-400",
};

export function MetricCard({ metric }: { metric: SystemMetric }) {
  const Icon = metric.icon;
  const TrendIcon = metric.trend ? TREND_ICON[metric.trend] : null;

  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
          {metric.label}
        </span>
        <Icon className="h-4 w-4 text-slate-300" strokeWidth={1.75} aria-hidden="true" />
      </div>

      <div className="mt-2">
        <span className="text-2xl font-semibold tabular-nums text-slate-900">
          {metric.value}
        </span>
      </div>

      <div className="mt-1 flex items-center gap-1">
        {TrendIcon && (
          <TrendIcon
            className={`h-3 w-3 ${TREND_COLOR[metric.trend as MetricTrend]}`}
            strokeWidth={2}
            aria-hidden="true"
          />
        )}
        <span className="text-[12px] text-slate-500">{metric.meta}</span>
      </div>
    </div>
  );
}
