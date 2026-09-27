"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy EpiGrid route → Fasal Saathi /map */
export default function RiskMapsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/map");
  }, [router]);
  return null;
}
