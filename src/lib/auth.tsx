import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { authRedirectTo, supabase, supabaseConfigured } from "./supabase";
import {
  canEditSharedStrats,
  canManageAdmins,
  getLocalUserId,
  getProfile,
  isCloudMode,
  setCloudSignedInUser,
} from "./api";
import type { Profile } from "./types";

type AuthState = {
  loading: boolean;
  user: User | null;
  session: Session | null;
  mode: "cloud" | "local";
  supabaseReady: boolean;
  userId: string;
  profile: Profile | null;
  /** Edit Fundamentals/Stack strats for everyone (admin), or this device in local demo. */
  canEditShared: boolean;
  /** Grant/revoke admins in Settings (super admin only). */
  canManageAdmins: boolean;
  signInWithEmail: (email: string) => Promise<{ error?: string }>;
  signInWithDiscord: () => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  async function loadProfile(userId: string | null) {
    if (!userId || !supabaseConfigured) {
      setProfile(
        supabaseConfigured
          ? null
          : {
              id: getLocalUserId(),
              display_name: "IGL",
              default_tier_filter: "all",
              is_admin: true,
              is_super_admin: true,
            }
      );
      return;
    }
    try {
      setProfile(await getProfile(userId));
    } catch {
      setProfile({
        id: userId,
        display_name: "IGL",
        default_tier_filter: "all",
        is_admin: false,
        is_super_admin: false,
      });
    }
  }

  useEffect(() => {
    if (!supabaseConfigured || !supabase) {
      setCloudSignedInUser(null);
      void loadProfile(null);
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCloudSignedInUser(data.session?.user?.id ?? null);
      void loadProfile(data.session?.user?.id ?? null).finally(() => setLoading(false));
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setCloudSignedInUser(s?.user?.id ?? null);
      void loadProfile(s?.user?.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthState>(() => {
    const user = session?.user ?? null;
    const cloud = isCloudMode();
    const userId = cloud && user ? user.id : getLocalUserId();
    return {
      loading,
      user,
      session,
      mode: cloud ? "cloud" : "local",
      supabaseReady: supabaseConfigured,
      userId,
      profile,
      canEditShared: canEditSharedStrats({ profile }),
      canManageAdmins: canManageAdmins({ profile }),
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
        setProfile(null);
      },
      async refreshProfile() {
        await loadProfile(user?.id ?? null);
      },
    };
  }, [loading, session, profile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside provider");
  return ctx;
}
