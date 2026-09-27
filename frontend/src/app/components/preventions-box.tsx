"use client";

import { Landmark, ShieldCheck } from "lucide-react";
import { useLocale } from "@/app/context/LocaleContext";

interface PreventionsBoxProps {
  steps: string[];
  /** Official ICAR / govt cure from diagnosis classify */
  icarCure?: string | null;
}

export function PreventionsBox({ steps, icarCure }: PreventionsBoxProps) {
  const { t } = useLocale();
  const hasCure = Boolean(icarCure && icarCure.trim());
  const hasSteps = steps.length > 0;

  return (
    <section className="fs-panel p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <ShieldCheck
          className="h-4 w-4 text-[var(--color-brand)]"
          strokeWidth={1.75}
        />
        <h2 className="text-[13px] font-semibold text-[var(--color-brand-deep)]">
          {t("preventions")}
        </h2>
      </div>

      {/* Only show ICAR cure after a successful classification */}
      {hasCure ? (
        <div
          role="status"
          className="rounded-md border border-[color-mix(in_srgb,var(--color-brand)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-brand)_10%,transparent)] px-3 py-3"
        >
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-brand)]">
            <Landmark className="h-3.5 w-3.5" strokeWidth={1.75} />
            ICAR official cure
          </div>
          <p className="text-[13px] leading-relaxed text-[var(--color-foreground)]">
            {icarCure}
          </p>
        </div>
      ) : null}

      {hasSteps ? (
        <ol className={`flex flex-col gap-2.5 ${hasCure ? "mt-4" : ""}`}>
          {steps.map((step, i) => (
            <li
              key={`${i}-${step.slice(0, 24)}`}
              className="flex gap-3 rounded-md bg-[var(--color-background-sunken)] px-3 py-2.5 text-[13px] leading-relaxed text-[var(--color-foreground)]"
            >
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[var(--color-brand)] text-[11px] font-bold text-white">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      ) : null}

      {!hasCure && !hasSteps ? (
        <p className="text-[13px] text-[var(--color-muted-foreground)]">
          Run a diagnosis to receive RL-recommended mitigation steps.
        </p>
      ) : null}

      {hasCure && !hasSteps ? (
        <p className="mt-3 text-[12px] text-[var(--color-muted-foreground)]">
          Run risk simulation for additional RL mitigation steps.
        </p>
      ) : null}
    </section>
  );
}
