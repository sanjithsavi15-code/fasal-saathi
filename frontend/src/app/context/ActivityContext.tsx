"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import type { ReactNode } from "react";

/* ── Activity log entry ── */
export interface ActivityLog {
  id: string;
  /** ISO timestamp */
  timestamp: string;
  /** Machine-readable action type */
  action:
    | "diagnosis_started"
    | "diagnosis_completed"
    | "diagnosis_failed"
    | "weather_fetched"
    | "simulation_ran"
    | "profile_saved"
    | "photo_uploaded"
    | "language_changed"
    | "theme_changed"
    | "page_visited"
    | "incident_logged"
    | "map_viewport_changed"
    | "tts_activated"
    | "spread_projected";
  /** Human-readable summary (English) — translated at render time */
  summary: string;
  /** Optional metadata (crop, disease, district, etc.) */
  meta?: Record<string, string>;
}

interface ActivityContextValue {
  activities: ActivityLog[];
  logActivity: (
    action: ActivityLog["action"],
    summary: string,
    meta?: Record<string, string>
  ) => void;
  clearActivities: () => void;
}

const LOCAL_STORAGE_KEY = "fasal_saathi_activity_log";

const ActivityContext = createContext<ActivityContextValue | null>(null);

export function ActivityProvider({ children }: { children: ReactNode }) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  /* ── Hydrate from localStorage ── */
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setActivities(parsed as ActivityLog[]);
        }
      }
    } catch {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
    setIsHydrated(true);
  }, []);

  /* ── Persist to localStorage ── */
  useEffect(() => {
    if (!isHydrated) return;
    try {
      // Keep last 200 entries to avoid unbounded growth
      const trimmed = activities.slice(0, 200);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      /* ignore quota errors */
    }
  }, [activities, isHydrated]);

  const logActivity = useCallback(
    (
      action: ActivityLog["action"],
      summary: string,
      meta?: Record<string, string>
    ) => {
      const entry: ActivityLog = {
        id: `ACT-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: new Date().toISOString(),
        action,
        summary,
        meta,
      };
      setActivities((prev) => [entry, ...prev]);
    },
    []
  );

  const clearActivities = useCallback(() => {
    setActivities([]);
  }, []);

  return (
    <ActivityContext.Provider
      value={{ activities, logActivity, clearActivities }}
    >
      {children}
    </ActivityContext.Provider>
  );
}

export function useActivity(): ActivityContextValue {
  const context = useContext(ActivityContext);
  if (!context) {
    throw new Error("useActivity must be used within an ActivityProvider");
  }
  return context;
}
