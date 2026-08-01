import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { authRedirectTo, supabase, supabaseConfigured } from "./supabase";
import { getLocalUserId, isCloudMode, setCloudSignedInUser } from "./api";

type AuthState = {
  loading: boolean;
  user: User | null;
  session: Session | null;
  mode: "cloud" | "local";
  supabaseReady: boolean;
  userId: string;
  signInWithEmail: (email: string) => Promise<{ error?: string }>;
  signInWithDiscord: () => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    if (!supabaseConfigured || !supabase) {
      setCloudSignedInUser(null);
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCloudSignedInUser(data.session?.user?.id ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setCloudSignedInUser(s?.user?.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthState>(() => {
    const user = session?.user ?? null;
    const cloud = isCloudMode();
    return {
      loading,
      user,
      session,
      mode: cloud ? "cloud" : "local",
      supabaseReady: supabaseConfigured,
      userId: cloud && user ? user.id : getLocalUserId(),
      async signInWithEmail(email: string) {
        if (!supabase) return { error: "Supabase is not configured." };
        const redirectTo = authRedirectTo();
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: redirectTo },
        });
        return { error: error?.message };
      },
      async signInWithDiscord() {
        if (!supabase) return { error: "Supabase is not configured." };
        const redirectTo = authRedirectTo();
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "discord",
          options: { redirectTo },
        });
        return { error: error?.message };
      },
      async signOut() {
        if (supabase) await supabase.auth.signOut();
        setCloudSignedInUser(null);
      },
    };
  }, [loading, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside provider");
  return ctx;
}
