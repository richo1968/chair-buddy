import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, cloudEnabled } from '@/lib/supabase';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  cloudEnabled: boolean;
  /** Send the user an OTP code (and a magic link) by email. */
  signIn: (email: string) => Promise<{ error: string | null }>;
  /** Verify the OTP code the user typed. Establishes the session in this device's storage on success. */
  verifyCode: (email: string, code: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Where Supabase magic-link emails should send the user. Always production —
 *  see comment in `signIn` for why we don't use window.location.origin. */
const PRODUCTION_URL = 'https://app.chairbuddy.com.au';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    // Never let auth block the app: games are loaded only once auth settles,
    // and getSession can stall for a long time refreshing a token when the
    // network is poor (e.g. a stadium). Fall back to local-only after 4s;
    // onAuthStateChange still picks the session up when it arrives.
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      setLoading(false);
    };
    const timer = setTimeout(settle, 4000);
    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session);
        settle();
      })
      .catch(settle);

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => {
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string) => {
    if (!supabase) return { error: 'Cloud sync is not configured.' };
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        // Magic-link target. Always send users to the production domain —
        // window.location.origin would be http://localhost:5173 when signing
        // in from `npm run dev`, which would bake an unusable link into the
        // email. The OTP code is the primary auth path on iPad anyway; the
        // link is a fallback for desktop browsers.
        emailRedirectTo: PRODUCTION_URL
      }
    });
    return { error: error?.message ?? null };
  }, []);

  const verifyCode = useCallback(async (email: string, code: string) => {
    if (!supabase) return { error: 'Cloud sync is not configured.' };
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'email'
    });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    loading,
    cloudEnabled,
    signIn,
    verifyCode,
    signOut
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
