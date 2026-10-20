import { createClient } from '@supabase/supabase-js';

// Publishable/anon keys are designed to be client-visible — Supabase enforces
// access via row-level security on the database side, not via key secrecy.
// The project is fixed in code on purpose: the Cloudflare build still had
// VITE_SUPABASE_* vars pointing at the old (deleted) project, which silently
// overrode these. Only `npm run dev` honours .env overrides.
const DEFAULT_URL = 'https://jlpcyvayrrxzhwwdldfj.supabase.co';
const DEFAULT_KEY = 'sb_publishable_kyKcPCVwuRkAkckJqqpF_A_ywC8mZ_7';

const devEnv: Record<string, string | undefined> = import.meta.env.DEV ? import.meta.env : {};
const url = (devEnv.VITE_SUPABASE_URL as string | undefined) ?? DEFAULT_URL;
const key = (devEnv.VITE_SUPABASE_ANON_KEY as string | undefined) ?? DEFAULT_KEY;

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // v2: sessions saved for the old project can't be refreshed.
    storageKey: 'chairbuddy:auth:v2'
  }
});

export const cloudEnabled = true;
