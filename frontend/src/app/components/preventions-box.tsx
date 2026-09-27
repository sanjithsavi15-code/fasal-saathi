"use client";

import { useState, useCallback } from "react";
import { Landmark, ShieldCheck, Volume2, VolumeX, FlaskConical } from "lucide-react";
import { useLocale } from "@/app/context/LocaleContext";
import { useActivity } from "@/app/context/ActivityContext";
import { useTTS } from "@/app/lib/use-tts";
import {
  getChemicalPlan,
  formatPlanForSpeech,
  type DiseaseChemicalPlan,
} from "@/app/lib/chemical-interventions";

interface PreventionsBoxProps {
  steps: string[];
  /** Official ICAR / govt cure from diagnosis classify */
  icarCure?: string | null;
  /** Detected disease name (used for chemical intervention lookup) */
  disease?: string;
}

export function PreventionsBox({ steps, icarCure, disease }: PreventionsBoxProps) {
  const { t, locale } = useLocale();
  const { logActivity } = useActivity();
  const { supported: ttsSupported, isSpeaking, speak, stop } = useTTS({
    locale,
    rate: 0.9,
  });

  const hasCure = Boolean(icarCure && icarCure.trim());
  const hasSteps = steps.length > 0;

  // Look up disease-specific chemical intervention plan
  const chemPlan: DiseaseChemicalPlan | null = disease
    ? getChemicalPlan(disease)
    : null;

  // Build the full text for TTS
  const buildSpeechText = useCallback(() => {
    const parts: string[] = [];
    if (hasCure && icarCure) {
      parts.push(`ICAR official cure: ${icarCure}`);
    }
    if (chemPlan) {
      parts.push(formatPlanForSpeech(chemPlan));
    }
    if (hasSteps) {
      parts.push("Recommended prevention steps:");
      steps.forEach((step, i) => {
        parts.push(`Step ${i + 1}: ${step}`);
      });
    }
    return parts.join(". ");
  }, [hasCure, icarCure, chemPlan, hasSteps, steps]);

  const handleTTSToggle = useCallback(() => {
    if (isSpeaking) {
      stop();
    } else {
      const text = buildSpeechText();
      if (text.trim()) {
        speak(text);
        logActivity("tts_activated", `Read aloud (${locale})`, {
          language: locale,
          contentLength: `${text.length} chars`,
          disease: disease ?? "unknown",
        });
      }
    }
  }, [isSpeaking, stop, buildSpeechText, speak, logActivity, locale, disease]);

  const hasAnyContent = hasCure || hasSteps || chemPlan;

  return (
    <section className="fs-panel p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck
            className="h-4 w-4 text-[var(--color-brand)]"
            strokeWidth={1.75}
          />
          <h2 className="text-[13px] font-semibold text-[var(--color-brand-deep)]">
            {t("preventions")}
          </h2>
        </div>

        {/* TTS Speaker Button */}
        {ttsSupported && hasAnyContent && (
          <button
            type="button"
            onClick={handleTTSToggle}
            aria-label={isSpeaking ? t("ttsStop") : t("ttsSpeak")}
            title={isSpeaking ? t("ttsStop") : t("ttsSpeak")}
            className={[
              "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors",
              isSpeaking
                ? "bg-[var(--color-clay)] text-white hover:bg-[color-mix(in_srgb,var(--color-clay)_85%,black)]"
                : "border border-[var(--color-border)] bg-[var(--color-background-sunken)] text-[var(--color-brand)] hover:bg-[var(--color-sage-tint)]",
            ].join(" ")}
          >
            {isSpeaking ? (
              <>
                <VolumeX className="h-3.5 w-3.5" />
                {t("ttsStop")}
              </>
            ) : (
              <>
                <Volume2 className="h-3.5 w-3.5" />
                {t("ttsSpeak")}
              </>
            )}
          </button>
        )}
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

      {/* Disease-specific chemical interventions */}
      {chemPlan ? (
        <div className={`${hasCure ? "mt-4" : ""}`}>
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-brand-deep)]">
            <FlaskConical className="h-3.5 w-3.5" strokeWidth={1.75} />
            {t("chemicalInterventions")} — {chemPlan.diseaseName}
          </div>

          {/* Primary treatment */}
          <div className="rounded-md border border-[color-mix(in_srgb,var(--color-brand)_25%,transparent)] bg-[color-mix(in_srgb,var(--color-brand)_6%,transparent)] px-3 py-2.5">
            <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-brand)]">
              Primary
            </p>
            <p className="text-[13px] font-medium text-[var(--color-foreground)]">
              {chemPlan.primary.product}
            </p>
            <p className="mt-0.5 text-[11px] text-[var(--color-muted-foreground)]">
              {chemPlan.primary.activeIngredient}
            </p>
            <p className="mt-1 text-[12px] text-[var(--color-foreground)]">
              <strong>Dosage:</strong> {chemPlan.primary.dosage}
            </p>
            <p className="text-[12px] text-[var(--color-foreground)]">
              <strong>Method:</strong> {chemPlan.primary.method}
            </p>
            {chemPlan.primary.phi != null && (
              <p className="mt-0.5 text-[10px] text-[var(--color-muted-foreground)]">
                Pre-harvest interval: {chemPlan.primary.phi} days
              </p>
            )}
          </div>

          {/* Alternate treatments */}
          {chemPlan.alternates.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {chemPlan.alternates.map((alt, i) => (
                <div
                  key={`alt-${i}-${alt.product}`}
                  className="rounded-md border border-[var(--color-border)] bg-[var(--color-background-sunken)] px-3 py-2"
                >
                  <p className="text-[12px] font-medium text-[var(--color-foreground)]">
                    Alt {i + 1}: {alt.product}
                  </p>
                  <p className="text-[11px] text-[var(--color-muted-foreground)]">
                    {alt.activeIngredient} · {alt.dosage}
                  </p>
                  <p className="text-[11px] text-[var(--color-muted-foreground)]">
                    {alt.method}
                  </p>
                  {alt.phi != null && (
                    <p className="text-[10px] text-[var(--color-muted-foreground)]">
                      PHI: {alt.phi} days
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Cultural practice notes */}
          {chemPlan.notes.length > 0 && (
            <ul className="mt-2 space-y-1">
              {chemPlan.notes.map((note, i) => (
                <li
                  key={`note-${i}`}
                  className="flex items-start gap-2 text-[12px] leading-relaxed text-[var(--color-muted-foreground)]"
                >
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-brand)]" />
                  {note}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {hasSteps ? (
        <ol className={`flex flex-col gap-2.5 ${hasCure || chemPlan ? "mt-4" : ""}`}>
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

      {!hasCure && !hasSteps && !chemPlan ? (
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
