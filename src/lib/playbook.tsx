import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAuth } from "./auth";
import * as api from "./api";
import type { Pack, Strat, UserSession } from "./types";
import { MAPS, catalogIdFromSource, isAllMaps, isPackInMatchPool, isPackLocked, isPackDefaultEnabled } from "./types";

type PlaybookState = {
  loading: boolean;
  error: string | null;
  packs: Pack[];
  strats: Strat[];
  favorites: Set<string>;
  subscriptions: Record<string, boolean>;
  session: UserSession;
  /** Signed-in cloud users shop into a personal pool; guests use pack toggles. */
  usePersonalPool: boolean;
  catalogStrats: Strat[];
  myPoolStrats: Strat[];
  refresh: () => Promise<void>;
  setSession: (patch: Partial<UserSession>) => Promise<void>;
  setPackEnabled: (packId: string, enabled: boolean) => Promise<void>;
  /** True if this strat (or its My-pool copy / catalog source) is favorited. */
  isFavorite: (stratId: string) => boolean;
  /**
   * Pin a strat for Match sort. When signed in, starring a catalog strat
   * also copies it into My pool and pins the pool copy.
   */
  toggleFavorite: (stratId: string) => Promise<void>;
  addToPool: (catalogStrat: Strat) => Promise<void>;
  removeFromPool: (poolStratId: string) => Promise<void>;
  addFundamentalsStarter: (map: string) => Promise<number>;
  enabledStrats: Strat[];
};

const Ctx = createContext<PlaybookState | null>(null);

export function PlaybookProvider({ children }: { children: ReactNode }) {
  const { userId, loading: authLoading, user, mode } = useAuth();
  const usePersonalPool = mode === "cloud" && !!user;
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
  /** Keep latest session for atomic patches (fast map taps) without stale closures. */
  const sessionRef = useRef(session);
  sessionRef.current = session;
  /** Drop out-of-order cloud session upserts when the user taps maps quickly. */
  const sessionSaveGen = useRef(0);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      await api.ensureBootstrap();
      if (usePersonalPool) {
        // Ensure My pool pack exists so Match can toggle it like other packs.
        await api.ensureUserPrivatePack(userId);
      }
      const [p, s, fav, subs, sess] = await Promise.all([
        api.listPacks(),
        api.listStrats(),
        api.getFavorites(userId),
        api.getSubscriptions(userId),
        api.getSession(userId),
      ]);
      let nextStrats = s;
      // Signed-in users get Fundamentals auto-copied once so Match is ready
      // immediately (same day-1 feel as guest packs — no shop gate).
      if (usePersonalPool && !api.hasAutoSeededFundamentals(userId)) {
        const mine = s.filter((row) => row.owner_user_id === userId);
        if (mine.length === 0) {
          await api.ensureFundamentalsSeeded(userId, p);
          nextStrats = await api.listStrats();
        } else {
          api.markAutoSeededFundamentals(userId);
        }
      }
      setPacks(p);
      setStrats(nextStrats);
      // Signed-in favorites should key off My-pool copy ids (Match eligibility).
      // Migrate legacy catalog-id favorites onto existing pool copies when present.
      if (usePersonalPool) {
        const mine = nextStrats.filter((row) => row.owner_user_id === userId);
        const normalized = new Set<string>();
        for (const id of fav) {
          if (mine.some((row) => row.id === id)) {
            normalized.add(id);
            continue;
          }
          const copy = api.findPoolCopy(mine, id);
          if (copy) {
            normalized.add(copy.id);
            if (copy.id !== id) {
              void api.setFavorite(userId, copy.id, true);
              void api.setFavorite(userId, id, false);
            }
            continue;
          }
          normalized.add(id);
        }
        setFavorites(normalized);
      } else {
        setFavorites(new Set(fav));
      }
      const nextSubs = { ...subs };
      for (const pack of p) {
        const isMine = pack.visibility === "private" && pack.owner_user_id === userId;
        const isSystem = pack.visibility === "system";
        if (!isMine && !isSystem) continue;
        if (nextSubs[pack.id] === undefined) {
          // My pool defaults on; system packs use pack defaults (Meme/Advanced off).
          nextSubs[pack.id] = isMine ? true : isPackDefaultEnabled(pack);
        }
      }
      setSubscriptions(nextSubs);
      // Don't clobber a newer in-UI session with a slower getSession response.
      const incoming = sess;
      setSessionState((prev) => {
        const uiNewer =
          prev.selected_map !== incoming.selected_map ||
          prev.selected_side !== incoming.selected_side ||
          prev.site_filter !== incoming.site_filter ||
          prev.round_filter !== incoming.round_filter ||
          prev.current_pick_id !== incoming.current_pick_id;
        // On first load session matches defaults; always take server/local snapshot.
        // After the user has interacted, prefer the fresher UI patch fields for map/side/filters/pick.
        if (sessionSaveGen.current > 0 && uiNewer) {
          const merged = {
            ...incoming,
            selected_map: prev.selected_map,
            selected_side: prev.selected_side,
            site_filter: prev.site_filter,
            round_filter: prev.round_filter,
            current_pick_id: prev.current_pick_id,
            timer_ends_at: prev.timer_ends_at,
            called_at: prev.called_at,
          };
          sessionRef.current = merged;
          return merged;
        }
        sessionRef.current = incoming;
        return incoming;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load playbook");
    } finally {
      setLoading(false);
    }
  }, [userId, usePersonalPool]);

  useEffect(() => {
    if (authLoading) return;
    setLoading(true);
    void refresh();
  }, [authLoading, refresh]);

  const setSession = useCallback(
    async (patch: Partial<UserSession>) => {
      const gen = ++sessionSaveGen.current;
      const next = { ...sessionRef.current, ...patch };
      sessionRef.current = next;
      setSessionState(next);
      await api.saveSession(userId, next);
      // A newer tap already saved — don't let an older await leave stale DB state without a follow-up.
      if (gen !== sessionSaveGen.current) {
        await api.saveSession(userId, sessionRef.current);
      }
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

  const catalogStrats = useMemo(() => {
    return strats.filter((s) => {
      const pack = packs.find((p) => p.id === s.pack_id);
      return pack?.visibility === "system" && !s.owner_user_id;
    });
  }, [strats, packs]);

  const myPoolStrats = useMemo(() => {
    return strats.filter((s) => {
      const pack = packs.find((p) => p.id === s.pack_id);
      return s.owner_user_id === userId && pack?.visibility === "private";
    });
  }, [strats, packs, userId]);

  /** Match feed: enabled system packs; signed-in may also include My pool when that pack is on. */
  const enabledStrats = useMemo(() => {
    const fromPacks = strats.filter((s) => {
      if (s.owner_user_id) return false;
      return isPackInMatchPool(s.pack_id, subscriptions, packs);
    });
    // Local demo / guest: still surface privately created strats so New → Save is usable.
    if (!usePersonalPool) {
      return myPoolStrats.length ? [...myPoolStrats, ...fromPacks] : fromPacks;
    }

    const myPack = packs.find((p) => p.visibility === "private" && p.owner_user_id === userId);
    const myPoolOn = myPack ? isPackInMatchPool(myPack.id, subscriptions, packs) : false;
    if (!myPoolOn) return fromPacks;

    const coveredCatalogIds = new Set(
      myPoolStrats
        .map((s) => catalogIdFromSource(s.source))
        .filter((id): id is string => !!id)
    );
    // Prefer personal copies when the same catalog strat is also toggled on via packs.
    const packsWithoutDupes = fromPacks.filter((s) => !coveredCatalogIds.has(s.id));
    return [...myPoolStrats, ...packsWithoutDupes];
  }, [usePersonalPool, myPoolStrats, strats, subscriptions, packs, userId]);

  const isFavorite = useCallback(
    (stratId: string) => {
      if (favorites.has(stratId)) return true;
      if (!usePersonalPool) return false;
      const copy = api.findPoolCopy(myPoolStrats, stratId);
      if (copy && favorites.has(copy.id)) return true;
      const poolRow = myPoolStrats.find((s) => s.id === stratId);
      const catId = poolRow ? catalogIdFromSource(poolRow.source) : null;
      if (catId && favorites.has(catId)) return true;
      return false;
    },
    [favorites, usePersonalPool, myPoolStrats]
  );

  const toggleFavorite = useCallback(
    async (stratId: string) => {
      // Favorites are signed-in only — star adds to My pool and pins for Match.
      if (!usePersonalPool) return;

      const poolRow = myPoolStrats.find((s) => s.id === stratId);
      const catalogRow =
        catalogStrats.find((s) => s.id === stratId) ||
        strats.find((s) => s.id === stratId && !s.owner_user_id);

      let pinId = poolRow?.id ?? api.findPoolCopy(myPoolStrats, catalogRow?.id || stratId)?.id;

      // Catalog star with no pool copy yet → add to My pool, then pin the copy.
      if (!pinId && catalogRow) {
        const pack = packs.find((p) => p.id === catalogRow.pack_id);
        if (isPackLocked(pack)) return;
        try {
          pinId = await api.addCatalogStratToPool(userId, catalogRow, packs);
        } catch {
          return;
        }
        setFavorites((prev) => {
          const next = new Set(prev);
          next.add(pinId!);
          next.delete(catalogRow.id);
          return next;
        });
        await api.setFavorite(userId, pinId, true);
        if (favorites.has(catalogRow.id)) await api.setFavorite(userId, catalogRow.id, false);
        await refresh();
        return;
      }

      if (!pinId) pinId = stratId;

      const currentlyFav =
        favorites.has(pinId) || (!!catalogRow && favorites.has(catalogRow.id));

      setFavorites((prev) => {
        const next = new Set(prev);
        if (currentlyFav) {
          next.delete(pinId!);
          if (catalogRow) next.delete(catalogRow.id);
        } else {
          next.add(pinId!);
        }
        return next;
      });
      await api.setFavorite(userId, pinId, !currentlyFav);
      if (currentlyFav && catalogRow && favorites.has(catalogRow.id)) {
        await api.setFavorite(userId, catalogRow.id, false);
      }
    },
    [userId, usePersonalPool, myPoolStrats, catalogStrats, strats, packs, favorites, refresh]
  );

  const addToPool = useCallback(
    async (catalogStrat: Strat) => {
      await api.addCatalogStratToPool(userId, catalogStrat, packs);
      await refresh();
    },
    [userId, packs, refresh]
  );

  const removeFromPool = useCallback(
    async (poolStratId: string) => {
      setFavorites((prev) => {
        const next = new Set(prev);
        next.delete(poolStratId);
        return next;
      });
      await api.deleteStrat(userId, poolStratId);
      await refresh();
    },
    [userId, refresh]
  );

  const addFundamentalsStarter = useCallback(
    async (map: string) => {
      let n = 0;
      if (isAllMaps(map)) {
        for (const m of MAPS) n += await api.addFundamentalsForMap(userId, m, packs);
      } else {
        n = await api.addFundamentalsForMap(userId, map, packs);
      }
      await refresh();
      return n;
    },
    [userId, packs, refresh]
  );

  const value: PlaybookState = {
    loading,
    error,
    packs,
    strats,
    favorites,
    subscriptions,
    session,
    usePersonalPool,
    catalogStrats,
    myPoolStrats,
    refresh,
    setSession,
    setPackEnabled,
    isFavorite,
    toggleFavorite,
    addToPool,
    removeFromPool,
    addFundamentalsStarter,
    enabledStrats,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlaybook() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePlaybook outside provider");
  return ctx;
}
