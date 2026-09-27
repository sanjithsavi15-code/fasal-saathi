"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import { enableDemoAuth } from "@/app/lib/demo-auth";
import type { AuthError } from "@supabase/supabase-js";
import type { FormEvent, ChangeEvent } from "react";

type AuthStep = "phone" | "otp";

interface CountryCode {
  label: string;
  value: string;
}

const COUNTRY_CODES: CountryCode[] = [
  { label: "India (+91)", value: "+91" },
  { label: "USA (+1)", value: "+1" },
  { label: "UK (+44)", value: "+44" },
  { label: "Bangladesh (+880)", value: "+880" },
  { label: "Nepal (+977)", value: "+977" },
  { label: "Sri Lanka (+94)", value: "+94" },
  { label: "Australia (+61)", value: "+61" },
  { label: "UAE (+971)", value: "+971" },
];

/** Hackathon flag — set false to restore real Supabase OTP. */
const HACKATHON_AUTH_BYPASS = true;

function postLoginPath(): string {
  try {
    const stored = localStorage.getItem("fasal_saathi_locale");
    if (stored === "en" || stored === "hi" || stored === "mr") return "/";
  } catch {
    /* ignore */
  }
  return "/language";
}

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<AuthStep>("phone");
  const [countryCode, setCountryCode] = useState<string>("+91");
  const [phone, setPhone] = useState<string>("");
  const [otp, setOtp] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const fullPhoneNumber = `${countryCode}${phone.replace(/\s+/g, "")}`;

  const completeDemoLogin = useCallback(() => {
    enableDemoAuth();
    router.push(postLoginPath());
  }, [router]);

  const handleSendOtp = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setErrorMessage("");
      setIsSubmitting(true);

      /* ---- Hackathon bypass: skip Supabase fetch ---- */
      if (HACKATHON_AUTH_BYPASS) {
        completeDemoLogin();
        setIsSubmitting(false);
        return;
      }

      try {
        const { error }: { error: AuthError | null } =
          await supabase.auth.signInWithOtp({ phone: fullPhoneNumber });

        if (error) {
          setErrorMessage(error.message);
        } else {
          setStep("otp");
        }
      } catch {
        setErrorMessage("An unexpected error occurred. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [completeDemoLogin, fullPhoneNumber]
  );

  const handleVerifyOtp = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setErrorMessage("");
      setIsSubmitting(true);

      if (HACKATHON_AUTH_BYPASS) {
        completeDemoLogin();
        setIsSubmitting(false);
        return;
      }

      try {
        const { error }: { error: AuthError | null } =
          await supabase.auth.verifyOtp({
            phone: fullPhoneNumber,
            token: otp,
            type: "sms",
          });

        if (error) {
          setErrorMessage(error.message);
        } else {
          router.replace(postLoginPath());
        }
      } catch {
        setErrorMessage("Verification failed. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [completeDemoLogin, fullPhoneNumber, otp, router]
  );

  const handleEditPhone = useCallback(() => {
    setStep("phone");
    setOtp("");
    setErrorMessage("");
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="fs-panel w-full max-w-[400px] p-8">
        <div className="mb-8 text-center">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-[var(--color-brand-deep)]">
            Fasal Saathi
          </h1>
          <p className="mt-1 text-[13px] text-[var(--color-muted-foreground)]">
            Sign in with phone — we will send a one-time code via SMS
          </p>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mb-5 rounded-md border border-[color-mix(in_srgb,var(--color-clay)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-clay)_12%,transparent)] px-4 py-3 text-[13px] font-medium text-[var(--color-clay)]"
          >
            {errorMessage}
          </div>
        )}

        {step === "phone" && (
          <form onSubmit={handleSendOtp} noValidate>
            <fieldset disabled={isSubmitting} className="flex flex-col gap-4">
              <legend className="sr-only">Enter your phone number</legend>

              <div>
                <label
                  htmlFor="country-code"
                  className="mb-1.5 block text-[13px] font-medium"
                >
                  Country
                </label>
                <select
                  id="country-code"
                  value={countryCode}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                    setCountryCode(e.target.value)
                  }
                  className="fs-input"
                >
                  {COUNTRY_CODES.map((cc) => (
                    <option key={cc.value} value={cc.value}>
                      {cc.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="phone-number"
                  className="mb-1.5 block text-[13px] font-medium"
                >
                  Phone number
                </label>
                <input
                  id="phone-number"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  required={!HACKATHON_AUTH_BYPASS}
                  minLength={HACKATHON_AUTH_BYPASS ? undefined : 6}
                  maxLength={15}
                  value={phone}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setPhone(e.target.value)
                  }
                  placeholder="9876543210"
                  className="fs-input"
                />
              </div>

              <button type="submit" className="fs-btn-primary">
                {isSubmitting ? (
                  <>
                    <Spinner />
                    Sending OTP…
                  </>
                ) : (
                  "Send OTP"
                )}
              </button>

              {HACKATHON_AUTH_BYPASS && (
                <button
                  type="button"
                  onClick={completeDemoLogin}
                  className="text-center text-[11px] text-[var(--color-muted-foreground)] underline-offset-2 hover:underline"
                >
                  Demo Login
                </button>
              )}
            </fieldset>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleVerifyOtp} noValidate>
            <fieldset disabled={isSubmitting} className="flex flex-col gap-4">
              <legend className="sr-only">Verify OTP</legend>

              <p className="text-[13px] text-[var(--color-muted-foreground)]">
                A 6-digit code was sent to{" "}
                <span className="font-semibold text-[var(--color-foreground)]">
                  {fullPhoneNumber}
                </span>
                .{" "}
                <button
                  type="button"
                  onClick={handleEditPhone}
                  className="underline underline-offset-2 text-[var(--color-brand)]"
                >
                  Change
                </button>
              </p>

              <div>
                <label
                  htmlFor="otp-code"
                  className="mb-1.5 block text-[13px] font-medium"
                >
                  Verification code
                </label>
                <input
                  id="otp-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  minLength={6}
                  maxLength={6}
                  pattern="[0-9]{6}"
                  value={otp}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="000000"
                  className="fs-input text-center text-lg tracking-[0.3em]"
                />
              </div>

              <button type="submit" className="fs-btn-primary">
                {isSubmitting ? (
                  <>
                    <Spinner />
                    Verifying…
                  </>
                ) : (
                  "Verify & continue"
                )}
              </button>
            </fieldset>
          </form>
        )}

        <p className="mt-6 text-center text-[11px] text-[var(--color-muted-foreground)]">
          Crop disease detection &amp; risk mitigation for farmers
        </p>
      </div>
    </div>
  );
}

function Spinner(): React.ReactElement {
  return (
    <svg
      className="h-4 w-4 animate-spin"
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
  );
}
