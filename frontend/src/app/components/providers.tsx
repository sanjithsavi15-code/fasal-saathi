"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "@/app/context/ThemeContext";
import { LocaleProvider } from "@/app/context/LocaleContext";
import { FarmerProfileProvider } from "@/app/context/FarmerProfileContext";
import { IncidentProvider } from "@/app/context/IncidentContext";
import { ActivityProvider } from "@/app/context/ActivityContext";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <LocaleProvider>
        <FarmerProfileProvider>
          <IncidentProvider>
            <ActivityProvider>{children}</ActivityProvider>
          </IncidentProvider>
        </FarmerProfileProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}
