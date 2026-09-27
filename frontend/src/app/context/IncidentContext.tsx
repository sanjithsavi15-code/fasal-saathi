"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import type { ReactNode } from "react";
import type { RiskZone } from "@/app/lib/api";

export type LatLngTuple = [number, number];

export interface Incident {
  id: string;
  timestamp: string;
  district: string;
  sector: string;
  cropType: string;
  pathogen: string;
  severity: "critical" | "warning" | "contained";
  latitude?: number;
  longitude?: number;
  preventionSteps?: string[];
  riskZones?: RiskZone[];
  dispersion?: LatLngTuple[];
  policyId?: string;
}

interface IncidentContextValue {
  incidents: Incident[];
  addIncident: (incident: Incident) => void;
  latestIncident: Incident | null;
}

const LOCAL_STORAGE_KEY = "fasal_saathi_logs";

const IncidentContext = createContext<IncidentContextValue | null>(null);

export function IncidentProvider({ children }: { children: ReactNode }) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored =
        localStorage.getItem(LOCAL_STORAGE_KEY) ??
        localStorage.getItem("epigrid_logs");
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setIncidents(parsed as Incident[]);
        }
      }
    } catch {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(incidents));
    } catch {
      /* ignore */
    }
  }, [incidents, isHydrated]);

  const addIncident = useCallback((incident: Incident) => {
    setIncidents((prev) => [incident, ...prev]);
  }, []);

  const latestIncident = incidents.length > 0 ? incidents[0] : null;

  return (
    <IncidentContext.Provider value={{ incidents, addIncident, latestIncident }}>
      {children}
    </IncidentContext.Provider>
  );
}

export function useIncident(): IncidentContextValue {
  const context = useContext(IncidentContext);
  if (!context) {
    throw new Error("useIncident must be used within an IncidentProvider");
  }
  return context;
}
