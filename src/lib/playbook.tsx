import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "./auth";
import * as api from "./api";
import type { Pack, Strat, UserSession } from "./types";
import { isPackInMatchPool, isPackLocked } from "./types";

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
    tab: "match",
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
      const nextSubs = { ...subs };
      // default: free system packs on; Pro stays off (locked until premium)
      if (!Object.keys(nextSubs).length) {
        for (const pack of p.filter((x) => x.visibility === "system")) {
          nextSubs[pack.id] = pack.tier !== "pro";
        }
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
      const pack = packs.find((p) => p.id === packId);
      if (isPackLocked(pack)) return;
      setSubscriptions((prev) => ({ ...prev, [packId]: enabled }));
      await api.setPackEnabled(userId, packId, enabled);
    },
    [userId, packs]
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
    return strats.filter((s) => isPackInMatchPool(s.pack_id, subscriptions, packs));
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
