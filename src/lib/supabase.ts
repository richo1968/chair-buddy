import { createClient } from '@supabase/supabase-js';

// Publishable/anon keys are designed to be client-visible — Supabase enforces
// access via row-level security on the database side, not via key secrecy.
// Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env (or a platform env
// var) to override these defaults.
const DEFAULT_URL = 'https://pkzrkxycvyouxkvjwpju.supabase.co';
const DEFAULT_KEY = 'sb_publishable_CiGEFyHbfzwwWvAicWIUhA_A7m9lG5d';

const url =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? DEFAULT_URL;
const key =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? DEFAULT_KEY;

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'scoretable-chair:auth'
  }
});

export const cloudEnabled = true;
