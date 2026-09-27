import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Cpu, Activity, Gauge } from "lucide-react";

export type MetricTrend = "up" | "down" | "flat";

export interface SystemMetric {
  label: string;
  value: string;
  meta: string;
  icon: LucideIcon;
  trend?: MetricTrend;
}

// In production this would come from a metrics/status API route,
// polled or streamed rather than statically defined here.
export const SYSTEM_METRICS: SystemMetric[] = [
  {
    label: "Active Outbreak Nodes",
    value: "14",
    meta: "Across 6 districts",
    icon: AlertTriangle,
    trend: "up",
  },
  {
    label: "RL Agent Status",
    value: "Calibrated",
    meta: "Last calibrated 42 min ago",
    icon: Cpu,
  },
  {
    label: "Latest Simulation",
    value: "12 min ago",
    meta: "Monte Carlo · 10,000 runs",
    icon: Activity,
  },
  {
    label: "Forecast Confidence",
    value: "94.2%",
    meta: "+1.4 pts vs prior run",
    icon: Gauge,
    trend: "up",
  },
];

export type AlertSeverity = "critical" | "warning" | "info";

export interface PolicyAlert {
  id: string;
  severity: AlertSeverity;
  timestamp: string;
  sector: string;
  message: string;
}

export const POLICY_ALERTS: PolicyAlert[] = [
  {
    id: "alert-01",
    severity: "critical",
    timestamp: "4 min ago",
    sector: "Sector 4",
    message:
      "Agent recommends targeted systemic fungicide application within 24 hrs to contain an estimated 82% downwind spread probability.",
  },
  {
    id: "alert-02",
    severity: "warning",
    timestamp: "26 min ago",
    sector: "Sector 7",
    message:
      "Soil moisture sensors show conditions favorable for rust propagation. Recommend increased surveillance cadence.",
  },
  {
    id: "alert-03",
    severity: "info",
    timestamp: "51 min ago",
    sector: "Sector 2",
    message:
      "Simulation batch #4471 completed with no material change to the 72-hr trajectory forecast.",
  },
];
