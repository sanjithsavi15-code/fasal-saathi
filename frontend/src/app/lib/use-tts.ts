/**
 * useTTS — Text-to-Speech hook for the Web Speech API.
 *
 * Dynamically assigns voice/language based on the user's selected locale.
 * Supports English, Hindi, and Marathi with automatic fallback.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale } from "@/app/lib/i18n";

/** Map app locales to BCP-47 language tags for SpeechSynthesis */
const LOCALE_TO_LANG: Record<Locale, string[]> = {
  en: ["en-IN", "en-US", "en-GB", "en"],
  hi: ["hi-IN", "hi"],
  mr: ["mr-IN", "mr"],
};

/**
 * Pick the best available voice for the target language.
 * Prefers on-device voices over remote/network ones.
 */
function pickVoice(
  voices: SpeechSynthesisVoice[],
  locale: Locale,
): SpeechSynthesisVoice | null {
  const langCandidates = LOCALE_TO_LANG[locale];

  for (const lang of langCandidates) {
    // Prefer local voices
    const localMatch = voices.find(
      (v) => v.lang.toLowerCase().startsWith(lang.toLowerCase()) && !v.localService === false,
    );
    if (localMatch) return localMatch;

    // Accept any match
    const anyMatch = voices.find((v) =>
      v.lang.toLowerCase().startsWith(lang.toLowerCase()),
    );
    if (anyMatch) return anyMatch;
  }

  // Absolute fallback: default voice
  return voices.find((v) => v.default) ?? voices[0] ?? null;
}

export interface UseTTSOptions {
  locale: Locale;
  /** Speech rate (0.1–10, default 0.95) */
  rate?: number;
  /** Speech pitch (0–2, default 1.0) */
  pitch?: number;
}

export interface UseTTSReturn {
  /** Whether the browser supports TTS */
  supported: boolean;
  /** Whether speech is currently playing */
  isSpeaking: boolean;
  /** Start reading the given text */
  speak: (text: string) => void;
  /** Stop any active speech */
  stop: () => void;
}

export function useTTS({
  locale,
  rate = 0.95,
  pitch = 1.0,
}: UseTTSOptions): UseTTSReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Check support on mount
  useEffect(() => {
    setSupported(
      typeof window !== "undefined" && "speechSynthesis" in window,
    );
  }, []);

  // Cancel on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!supported || !text.trim()) return;

      // Cancel any ongoing speech first
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      utterance.pitch = pitch;

      // Assign the best voice for the current locale
      const voices = window.speechSynthesis.getVoices();
      const voice = pickVoice(voices, locale);
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } else {
        // Fallback lang tag even without a matched voice
        utterance.lang = LOCALE_TO_LANG[locale][0];
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [supported, locale, rate, pitch],
  );

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [supported]);

  return { supported, isSpeaking, speak, stop };
}
