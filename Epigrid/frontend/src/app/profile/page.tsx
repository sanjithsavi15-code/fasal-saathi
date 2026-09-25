"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Save } from "lucide-react";
import { useFarmerProfile } from "@/app/context/FarmerProfileContext";
import type { FarmerProfile } from "@/app/context/FarmerProfileContext";
import { useLocale } from "@/app/context/LocaleContext";
import { supabase } from "@/app/lib/supabase";
import { clearDemoAuth } from "@/app/lib/demo-auth";

const DISTRICTS = [
  "Nashik",
  "Pune Rural",
  "Ahmednagar",
  "Satara",
  "Kolhapur",
  "Solapur",
  "Aurangabad",
  "Jalgaon",
];

const CROPS = [
  "Potato",
  "Tomato",
  "Cotton",
  "Soybean",
  "Wheat",
  "Onion",
  "Grapes",
  "Sugarcane",
];

export default function ProfilePage() {
  const { profile, saveProfile } = useFarmerProfile();
  const { t } = useLocale();
  const router = useRouter();
  const [form, setForm] = useState<FarmerProfile>(profile);
  const [saved, setSaved] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    setForm(profile);
  }, [profile]);

  function patch<K extends keyof FarmerProfile>(key: K, value: FarmerProfile[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    saveProfile(form);
    setSaved(true);
  }

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      clearDemoAuth();
      await supabase.auth.signOut();
    } finally {
      router.replace("/login");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 p-4 sm:p-6">
      <header>
        <h1 className="font-display text-xl font-semibold text-[var(--color-brand-deep)]">
          {t("profileTitle")}
        </h1>
      </header>

      <form onSubmit={handleSave} className="fs-panel flex flex-col gap-4 p-4 sm:p-5">
        <div>
          <label htmlFor="name" className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
            {t("name")}
          </label>
          <input
            id="name"
            className="fs-input"
            value={form.name}
            onChange={(e) => patch("name", e.target.value)}
            placeholder="Your name"
          />
        </div>

        <div>
          <label htmlFor="district" className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
            {t("district")}
          </label>
          <select
            id="district"
            className="fs-input"
            value={form.district}
            onChange={(e) => patch("district", e.target.value)}
          >
            {DISTRICTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="farmSize" className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
            {t("farmSize")}
          </label>
          <input
            id="farmSize"
            type="number"
            min={0}
            step={0.1}
            className="fs-input"
            value={form.farmSizeAcres}
            onChange={(e) =>
              patch("farmSizeAcres", parseFloat(e.target.value) || 0)
            }
          />
        </div>

        <div>
          <label htmlFor="crop" className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
            {t("preferredCrop")}
          </label>
          <select
            id="crop"
            className="fs-input"
            value={form.preferredCrop}
            onChange={(e) => patch("preferredCrop", e.target.value)}
          >
            {CROPS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" className="fs-btn-primary">
          <Save className="h-4 w-4" />
          {saved ? "Saved" : t("saveProfile")}
        </button>
      </form>

      <button
        type="button"
        onClick={() => void handleLogout()}
        disabled={isLoggingOut}
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--color-clay)_45%,transparent)] bg-[color-mix(in_srgb,var(--color-clay)_12%,transparent)] px-4 py-3 text-[13px] font-semibold text-[var(--color-clay)] transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        <LogOut className="h-4 w-4" />
        {isLoggingOut ? "…" : t("logout")}
      </button>
    </div>
  );
}
