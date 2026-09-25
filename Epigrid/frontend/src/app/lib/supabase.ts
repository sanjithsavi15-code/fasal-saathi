import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

/* -------------------------------------------------------------------------- */
/*  Environment validation                                                     */
/* -------------------------------------------------------------------------- */

const supabaseUrl: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey: string | undefined =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error(
    "[Fasal Saathi] Missing NEXT_PUBLIC_SUPABASE_URL. " +
      "Add it to .env.local or the deployment environment."
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    "[Fasal Saathi] Missing NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
      "Add it to .env.local or the deployment environment."
  );
}

/* -------------------------------------------------------------------------- */
/*  Client singleton                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Browser-safe Supabase client.
 *
 * Uses the public anon key — Row Level Security on the Supabase side is the
 * authorisation boundary, not this key.
 */
export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey
);
