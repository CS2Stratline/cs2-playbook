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
  updateDisplayName,
} from "./api";
import type { Profile } from "./types";
import { suggestedDisplayNameFromUser } from "./displayName";

/** True when the session is still a no-login browser identity. */
export function isAnonymousUser(user: User | null | undefined): boolean {
  if (!user) return false;
  // Prefer identities: a linked Discord/email means permanent even if the
  // is_anonymous claim is briefly stale after linking.
  const identities = user.identities ?? [];
  if (identities.some((i) => i.provider && i.provider !== "anonymous")) return false;
  return Boolean(user.is_anonymous);
}

/** PKCE / OAuth callback still in the address bar — do not create a new anon user yet. */
function authCallbackPending(): boolean {
  if (typeof window === "undefined") return false;
  const q = new URLSearchParams(window.location.search);
  if (q.has("code") || q.has("error") || q.has("error_description")) return true;
  const hash = window.location.hash || "";
  // Implicit-style tokens (rare with PKCE) — ignore HashRouter paths like #/settings.
  if (hash.includes("access_token=") || hash.includes("error_description=")) return true;
  return false;
}

function readAuthCallbackError(): string | null {
  if (typeof window === "undefined") return null;
  const q = new URLSearchParams(window.location.search);
  const fromQuery = q.get("error_description") || q.get("error");
  if (fromQuery) return fromQuery.replace(/\+/g, " ");
  return null;
}

function clearAuthCallbackParams() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has("code") && !url.searchParams.has("error") && !url.searchParams.has("error_description") && !url.searchParams.has("state")) {
    return;
  }
  url.searchParams.delete("code");
  url.searchParams.delete("state");
  url.searchParams.delete("error");
  url.searchParams.delete("error_description");
  window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
}

type AuthState = {
  loading: boolean;
  user: User | null;
  session: Session | null;
  mode: "cloud" | "local";
  /** Permanent Discord/email account (not anonymous). */
  isPermanent: boolean;
  supabaseReady: boolean;
  userId: string;
  profile: Profile | null;
  /** OAuth / magic-link error surfaced from the redirect URL. */
  authError: string | null;
  /** Edit shared system strats for everyone (admin), or this device in local demo. */
  canEditShared: boolean;
  /** Grant/revoke admins in Settings (super admin only). */
  canManageAdmins: boolean;
  signInWithEmail: (email: string) => Promise<{ error?: string }>;
  signInWithDiscord: () => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearAuthError: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  async function loadProfile(userId: string | null, authUser?: User | null) {
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
      let next = await getProfile(userId);
      // Permanent accounts with an empty profile name: seed once from Discord/email.
      if (authUser && !isAnonymousUser(authUser) && !next.display_name?.trim()) {
        const suggested = suggestedDisplayNameFromUser(authUser);
        if (suggested) {
          try {
            next = await updateDisplayName(suggested);
          } catch {
            /* keep empty; user can set in Settings */
          }
        }
      }
      setProfile(next);
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
    void loadProfile(next?.user?.id ?? null, next?.user ?? null);
  }

  /** Silent browser identity for voting. No email/Discord required. */
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
    const callbackError = readAuthCallbackError();
    if (callbackError) setAuthError(callbackError);

    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (cancelled) return;
      setSession(s);
      setCloudSignedInUser(s?.user?.id ?? null);
      void loadProfile(s?.user?.id ?? null, s?.user ?? null);
      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        clearAuthCallbackParams();
        if (s?.user && !isAnonymousUser(s.user)) setAuthError(null);
      }
    });

    void (async () => {
      // getSession waits for client init (including PKCE code exchange).
      let { data } = await supabase.auth.getSession();
      if (cancelled) return;

      // If a code is still present, give the exchange a moment before falling back to anon.
      if (authCallbackPending()) {
        for (let i = 0; i < 8 && !cancelled; i++) {
          await new Promise((r) => setTimeout(r, 150));
          const again = await supabase.auth.getSession();
          data = again.data;
          if (data.session && !isAnonymousUser(data.session.user)) break;
          if (!authCallbackPending()) break;
        }
        clearAuthCallbackParams();
      }

      if (cancelled) return;

      if (data.session) {
        applySession(data.session);
        setLoading(false);
        return;
      }

      // Never invent a guest session while an OAuth redirect is still resolving.
      if (authCallbackPending()) {
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
      isPermanent: permanent,
      supabaseReady: supabaseConfigured,
      userId,
      profile,
      authError,
      canEditShared: canEditSharedStrats({ profile }),
      canManageAdmins: canManageAdmins({ profile }),
      clearAuthError() {
        setAuthError(null);
      },
      async signInWithEmail(email: string) {
        if (!supabase) return { error: "Supabase is not configured." };
        const redirectTo = authRedirectTo();
        // Try upgrading the anonymous session in place (keeps votes).
        if (isAnonymousUser(user)) {
          const { error } = await supabase.auth.updateUser({ email });
          if (!error) return {};
          // Email already belongs to another account (or linking failed) —
          // send a magic link that signs into that permanent user instead.
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
        // Use OAuth sign-in, not linkIdentity. Linking Discord onto a fresh
        // anonymous session fails when that Discord user already exists
        // (returning IGLs) — the redirect comes back and the app stays guest.
        // signInWithOAuth switches to the permanent Discord account.
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
        await loadProfile(user?.id ?? null, user);
      },
    };
  }, [loading, session, profile, authError]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside provider");
  return ctx;
}
