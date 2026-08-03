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

function isAnonymousUser(user: User | null | undefined): boolean {
  return Boolean(user?.is_anonymous);
}

type AuthState = {
  loading: boolean;
  user: User | null;
  session: Session | null;
  mode: "cloud" | "local";
  /** True when the session is an anonymous (no-login) cloud user. */
  isAnonymous: boolean;
  /** Permanent Discord/email account (not anonymous). */
  isPermanent: boolean;
  supabaseReady: boolean;
  userId: string;
  profile: Profile | null;
  /** Edit shared system strats for everyone (admin), or this device in local demo. */
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

  function applySession(next: Session | null) {
    setSession(next);
    setCloudSignedInUser(next?.user?.id ?? null);
    void loadProfile(next?.user?.id ?? null);
  }

  /** Silent browser identity for voting — no email/Discord required. */
  async function ensureAnonymousSession(): Promise<Session | null> {
    if (!supabase) return null;
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error || !data.session) {
      console.warn("Anonymous sign-in unavailable:", error?.message || "no session");
      return null;
    }
    return data.session;
  }

  useEffect(() => {
    if (!supabaseConfigured || !supabase) {
      setCloudSignedInUser(null);
      void loadProfile(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) {
        applySession(data.session);
        setLoading(false);
        return;
      }
      const anon = await ensureAnonymousSession();
      if (cancelled) return;
      if (anon) applySession(anon);
      else {
        setCloudSignedInUser(null);
        setSession(null);
        void loadProfile(null);
      }
      setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setCloudSignedInUser(s?.user?.id ?? null);
      void loadProfile(s?.user?.id ?? null);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(() => {
    const user = session?.user ?? null;
    const cloud = isCloudMode();
    const anonymous = isAnonymousUser(user);
    const permanent = Boolean(user && !anonymous);
    const userId = cloud && user ? user.id : getLocalUserId();
    return {
      loading,
      user,
      session,
      mode: cloud ? "cloud" : "local",
      isAnonymous: anonymous,
      isPermanent: permanent,
      supabaseReady: supabaseConfigured,
      userId,
      profile,
      canEditShared: canEditSharedStrats({ profile }),
      canManageAdmins: canManageAdmins({ profile }),
      async signInWithEmail(email: string) {
        if (!supabase) return { error: "Supabase is not configured." };
        const redirectTo = authRedirectTo();
        // Upgrade anonymous → permanent while keeping the same user id (and votes).
        if (isAnonymousUser(user)) {
          const { error } = await supabase.auth.updateUser({ email });
          return { error: error?.message };
        }
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: redirectTo },
        });
        return { error: error?.message };
      },
      async signInWithDiscord() {
        if (!supabase) return { error: "Supabase is not configured." };
        const redirectTo = authRedirectTo();
        if (isAnonymousUser(user)) {
          const { error } = await supabase.auth.linkIdentity({
            provider: "discord",
            options: { redirectTo },
          });
          return { error: error?.message };
        }
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "discord",
          options: { redirectTo },
        });
        return { error: error?.message };
      },
      async signOut() {
        if (!supabase) return;
        await supabase.auth.signOut();
        // Drop back to a fresh anonymous identity so voting still works.
        const anon = await ensureAnonymousSession();
        if (anon) applySession(anon);
        else {
          setCloudSignedInUser(null);
          setSession(null);
          setProfile(null);
        }
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
