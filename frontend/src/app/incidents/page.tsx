"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy EpiGrid route → Fasal Saathi /logs */
export default function IncidentsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/logs");
  }, [router]);
  return null;
}
