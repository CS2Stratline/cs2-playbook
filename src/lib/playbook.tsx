import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "./auth";
import * as api from "./api";
import type { Pack, Strat, UserSession } from "./types";

type PlaybookState = {
  loading: boolean;
  error: string | null;
  packs: Pack[];
  strats: Strat[];
  favorites: Set<string>;
  subscriptions: Record<string, boolean>;
  session: UserSession;
  refresh: () => Promise<void>;
  setSession: (patch: Partial<UserSession>) => Promise<void>;
  setPackEnabled: (packId: string, enabled: boolean) => Promise<void>;
  toggleFavorite: (stratId: string) => Promise<void>;
  enabledStrats: Strat[];
};

const Ctx = createContext<PlaybookState | null>(null);

export function PlaybookProvider({ children }: { children: ReactNode }) {
  const { userId, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [strats, setStrats] = useState<Strat[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [subscriptions, setSubscriptions] = useState<Record<string, boolean>>({});
  const [session, setSessionState] = useState<UserSession>({
    tab: "lobby",
    selected_map: "Mirage",
    selected_side: "T",
    site_filter: "all",
    round_filter: "all",
    include_practice: false,
    current_pick_id: null,
    logged: null,
    timer_ends_at: null,
    called_at: null,
  });

  const refresh = useCallback(async () => {
    setError(null);
    try {
      await api.ensureBootstrap();
      const [p, s, fav, subs, sess] = await Promise.all([
        api.listPacks(),
        api.listStrats(),
        api.getFavorites(userId),
        api.getSubscriptions(userId),
        api.getSession(userId),
      ]);
      setPacks(p);
      setStrats(s);
      setFavorites(new Set(fav));
      // default: all system packs on if no subs yet
      const nextSubs = { ...subs };
      if (!Object.keys(nextSubs).length) {
        for (const pack of p.filter((x) => x.visibility === "system")) nextSubs[pack.id] = true;
      }
      setSubscriptions(nextSubs);
      setSessionState(sess);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load playbook");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (authLoading) return;
    setLoading(true);
    refresh();
  }, [authLoading, refresh]);

  const setSession = useCallback(
    async (patch: Partial<UserSession>) => {
      setSessionState((prev) => {
        const next = { ...prev, ...patch };
        void api.saveSession(userId, next);
        return next;
      });
    },
    [userId]
  );

  const setPackEnabled = useCallback(
    async (packId: string, enabled: boolean) => {
      setSubscriptions((prev) => ({ ...prev, [packId]: enabled }));
      await api.setPackEnabled(userId, packId, enabled);
    },
    [userId]
  );

  const toggleFavorite = useCallback(
    async (stratId: string) => {
      setFavorites((prev) => {
        const next = new Set(prev);
        if (next.has(stratId)) next.delete(stratId);
        else next.add(stratId);
        return next;
      });
      await api.toggleFavorite(userId, stratId);
    },
    [userId]
  );

  const enabledStrats = useMemo(() => {
    const enabled = new Set(Object.entries(subscriptions).filter(([, v]) => v).map(([k]) => k));
    // if nothing enabled, treat all system packs as on
    const any = enabled.size > 0;
    return strats.filter((s) => {
      if (any) return enabled.has(s.pack_id);
      const pack = packs.find((p) => p.id === s.pack_id);
      return pack?.visibility === "system";
    });
  }, [strats, subscriptions, packs]);

  const value: PlaybookState = {
    loading,
    error,
    packs,
    strats,
    favorites,
    subscriptions,
    session,
    refresh,
    setSession,
    setPackEnabled,
    toggleFavorite,
    enabledStrats,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlaybook() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePlaybook outside provider");
  return ctx;
}
