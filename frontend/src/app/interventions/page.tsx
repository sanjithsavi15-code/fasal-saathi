"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy EpiGrid route → Diagnose tab */
export default function InterventionsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/");
  }, [router]);
  return null;
}
