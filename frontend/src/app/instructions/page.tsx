"use client";

import {
  ShieldCheck,
  Leaf,
  Bug,
  Phone,
  AlertTriangle,
} from "lucide-react";
import { useLocale } from "@/app/context/LocaleContext";

interface InstructionItem {
  key: string;
}

interface Section {
  titleKey: string;
  icon: typeof ShieldCheck;
  iconColor: string;
  items: InstructionItem[];
}

const SECTIONS: Section[] = [
  {
    titleKey: "instrPesticideTitle",
    icon: ShieldCheck,
    iconColor: "text-[var(--color-clay)]",
    items: [
      { key: "instrPesticide1" },
      { key: "instrPesticide2" },
      { key: "instrPesticide3" },
      { key: "instrPesticide4" },
      { key: "instrPesticide5" },
      { key: "instrPesticide6" },
      { key: "instrPesticide7" },
    ],
  },
  {
    titleKey: "instrCropMaintenanceTitle",
    icon: Leaf,
    iconColor: "text-[var(--color-brand)]",
    items: [
      { key: "instrCropMaint1" },
      { key: "instrCropMaint2" },
      { key: "instrCropMaint3" },
      { key: "instrCropMaint4" },
      { key: "instrCropMaint5" },
      { key: "instrCropMaint6" },
      { key: "instrCropMaint7" },
    ],
  },
  {
    titleKey: "instrOrganicTitle",
    icon: Bug,
    iconColor: "text-[var(--color-amber)]",
    items: [
      { key: "instrOrganic1" },
      { key: "instrOrganic2" },
      { key: "instrOrganic3" },
      { key: "instrOrganic4" },
      { key: "instrOrganic5" },
    ],
  },
];

export default function InstructionsPage() {
  const { t } = useLocale();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      {/* ── Header ── */}
      <div className="mb-6">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--color-brand-deep)]">
          {t("instructionsTitle")}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          {t("instructionsSubtitle")}
        </p>
      </div>

      {/* ── Instruction sections ── */}
      <div className="flex flex-col gap-4">
        {SECTIONS.map((section) => {
          const SectionIcon = section.icon;
          return (
            <section key={section.titleKey} className="fs-panel overflow-hidden">
              {/* Section header */}
              <div className="flex items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-background-sunken)] px-4 py-3">
                <SectionIcon className={`h-5 w-5 shrink-0 ${section.iconColor}`} />
                <h2 className="text-sm font-semibold text-[var(--color-foreground)]">
                  {t(section.titleKey)}
                </h2>
              </div>

              {/* Items */}
              <ul className="divide-y divide-[var(--color-border)]">
                {section.items.map((item, idx) => (
                  <li
                    key={item.key}
                    className="flex items-start gap-3 px-4 py-3"
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand)] text-[10px] font-bold text-white">
                      {idx + 1}
                    </span>
                    <p className="text-[13px] leading-relaxed text-[var(--color-foreground)]">
                      {t(item.key)}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        {/* ── Emergency contacts ── */}
        <section className="fs-panel overflow-hidden">
          <div className="flex items-center gap-3 border-b border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-clay)_8%,var(--color-background-sunken))] px-4 py-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-[var(--color-clay)]" />
            <h2 className="text-sm font-semibold text-[var(--color-foreground)]">
              {t("instrEmergencyTitle")}
            </h2>
          </div>

          <div className="flex flex-col gap-2 p-4">
            {/* Kisan Call Centre */}
            <a
              href="tel:18001801551"
              className="flex items-center gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-background-sunken)] px-4 py-3 transition-colors hover:bg-[var(--color-sage-tint)]"
            >
              <Phone className="h-5 w-5 text-[var(--color-brand)]" />
              <span className="text-[13px] font-medium text-[var(--color-foreground)]">
                {t("instrEmergencyKisan")}
              </span>
            </a>

            {/* Poison Helpline */}
            <a
              href="tel:18001116117"
              className="flex items-center gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-background-sunken)] px-4 py-3 transition-colors hover:bg-[var(--color-sage-tint)]"
            >
              <Phone className="h-5 w-5 text-[var(--color-clay)]" />
              <span className="text-[13px] font-medium text-[var(--color-foreground)]">
                {t("instrEmergencyPoison")}
              </span>
            </a>

            {/* District Agriculture Officer */}
            <div className="flex items-center gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-background-sunken)] px-4 py-3">
              <Phone className="h-5 w-5 text-[var(--color-amber)]" />
              <span className="text-[13px] font-medium text-[var(--color-foreground)]">
                {t("instrEmergencyAgri")}
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
