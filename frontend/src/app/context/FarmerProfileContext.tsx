"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

export interface FarmerProfile {
  name: string;
  district: string;
  farmSizeAcres: number;
  preferredCrop: string;
  phone?: string;
}

interface FarmerProfileContextValue {
  profile: FarmerProfile;
  updateProfile: (patch: Partial<FarmerProfile>) => void;
  saveProfile: (next: FarmerProfile) => void;
}

const STORAGE_KEY = "fasal_saathi_profile";

const DEFAULT_PROFILE: FarmerProfile = {
  name: "",
  district: "Nashik",
  farmSizeAcres: 2,
  preferredCrop: "Potato",
};

const FarmerProfileContext = createContext<FarmerProfileContextValue | null>(null);

export function FarmerProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<FarmerProfile>(DEFAULT_PROFILE);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as FarmerProfile;
        setProfile({ ...DEFAULT_PROFILE, ...parsed });
      }
    } catch {
      /* ignore */
    }
  }, []);

  const persist = useCallback((next: FarmerProfile) => {
    setProfile(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const updateProfile = useCallback(
    (patch: Partial<FarmerProfile>) => {
      persist({ ...profile, ...patch });
    },
    [persist, profile]
  );

  const value = useMemo(
    () => ({
      profile,
      updateProfile,
      saveProfile: persist,
    }),
    [profile, updateProfile, persist]
  );

  return (
    <FarmerProfileContext.Provider value={value}>
      {children}
    </FarmerProfileContext.Provider>
  );
}

export function useFarmerProfile(): FarmerProfileContextValue {
  const ctx = useContext(FarmerProfileContext);
  if (!ctx) {
    throw new Error("useFarmerProfile must be used within FarmerProfileProvider");
  }
  return ctx;
}
