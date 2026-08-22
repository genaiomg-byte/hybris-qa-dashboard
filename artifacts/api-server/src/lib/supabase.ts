import { createClient } from "@supabase/supabase-js";

const supabaseUrl  = process.env.VITE_SUPABASE_URL  ?? "";
const supabaseKey  = process.env.VITE_SUPABASE_ANON_KEY ?? "";

if (!supabaseUrl || !supabaseKey) {
  console.warn("Supabase env vars not set — allowed_users checks will deny all.");
}

/**
 * Server-side Supabase client (anon key).
 * The allowed_users table must have a SELECT policy that allows anon/public reads.
 */
export const supabase = createClient(supabaseUrl, supabaseKey);