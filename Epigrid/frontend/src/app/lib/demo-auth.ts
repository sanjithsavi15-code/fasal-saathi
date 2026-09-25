/** Hackathon / local demo auth — skips Supabase when SMS OTP is not configured. */

export const DEMO_AUTH_KEY = "fasal_saathi_demo_auth";

export function enableDemoAuth(): void {
  try {
    localStorage.setItem(DEMO_AUTH_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function clearDemoAuth(): void {
  try {
    localStorage.removeItem(DEMO_AUTH_KEY);
  } catch {
    /* ignore */
  }
}

export function isDemoAuthActive(): boolean {
  try {
    return localStorage.getItem(DEMO_AUTH_KEY) === "1";
  } catch {
    return false;
  }
}
