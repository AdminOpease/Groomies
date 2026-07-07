import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  throw new Error(
    "Security tests require NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
}

export const anon = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export const service = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export const SUPABASE_URL = url;
