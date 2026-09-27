"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import { isDemoAuthActive } from "@/app/lib/demo-auth";
import type { Session } from "@supabase/supabase-js";
import type { ReactNode } from "react";

interface AuthGuardProps {
  children: ReactNode;
}

/**
 * Protects the app shell. Accepts either a real Supabase session
 * or the hackathon demo-auth flag set by the login bypass.
 */
export function AuthGuard({ children }: AuthGuardProps): ReactNode {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [demoOk, setDemoOk] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isDemoAuthActive()) {
      setDemoOk(true);
      setIsLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);

      if (!data.session) {
        router.replace("/login");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (isDemoAuthActive()) {
        setDemoOk(true);
        return;
      }
      setSession(currentSession);
      if (!currentSession) {
        router.replace("/login");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  if (isLoading) {
    return (
      <div
        role="status"
        aria-label="Checking authentication"
        className="flex min-h-screen items-center justify-center"
        style={{ backgroundColor: "var(--color-background-sunken)" }}
      >
        <svg
          className="h-6 w-6 animate-spin"
          style={{ color: "var(--color-brand)" }}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <span className="sr-only">Checking authentication…</span>
      </div>
    );
  }

  if (!session && !demoOk) {
    return null;
  }

  return <>{children}</>;
}
