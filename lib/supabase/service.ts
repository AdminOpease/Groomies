import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null | undefined;

/**
 * Service-role client for server-side operations that need elevated privileges
 * (reading private business_settings, admin-scoped inserts, etc.).
 *
 * Returns null if SUPABASE_SERVICE_ROLE_KEY is not set — callers must handle
 * that case gracefully. This lets local dev work without leaking the key into
 * the public bundle, and lets features gracefully degrade in production if the
 * env var hasn't been added yet.
 */
export function getSupabaseService(): SupabaseClient | null {
  if (client !== undefined) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    client = null;
    return client;
  }

  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
