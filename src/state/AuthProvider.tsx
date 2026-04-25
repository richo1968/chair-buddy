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
  /** Send the user a 6-digit OTP code (and a magic link) by email. */
  signIn: (email: string) => Promise<{ error: string | null }>;
  /** Verify the 6-digit OTP code the user typed. Establishes the session in this device's storage on success. */
  verifyCode: (email: string, code: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string) => {
    if (!supabase) return { error: 'Cloud sync is not configured.' };
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        // The link still works for desktop browsers; the OTP code is the
        // primary path for the iPad PWA, since clicking the link would open
        // Safari outside the standalone PWA's storage container.
        emailRedirectTo: window.location.origin
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
