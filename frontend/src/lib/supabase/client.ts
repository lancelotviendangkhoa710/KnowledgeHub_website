import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient | undefined;

/** Create the browser Supabase client when project settings are configured. */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) return null;

  supabase ??= createClient(url, key);
  return supabase;
}