import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAuth } from "./auth";
import * as api from "./api";
import type { Pack, Strat, StratVoteValue, UserSession } from "./types";
import { catalogIdFromSource, comparePersonalPacks, isCommunityStrat, isPackInMatchPool, isPackLocked, isPackDefaultEnabled } from "./types";

type PlaybookState = {
  loading: boolean;
  error: string | null;
  packs: Pack[];
  strats: Strat[];
  subscriptions: Record<string, boolean>;
  session: UserSession;
  /** Signed-in (or local demo) users manage personal packs; cloud guests use system toggles only. */
  usePersonalPool: boolean;
  catalogStrats: Strat[];
  /** Public user-authored strats (Community). */
  communityStrats: Strat[];
  myPoolStrats: Strat[];
  /** Personal packs owned by the current user. */
  myPrivatePacks: Pack[];
  /** Default pack id for New / catalog add / stars. */
  defaultPackId: string | null;
  refresh: () => Promise<void>;
  setSession: (patch: Partial<UserSession>) => Promise<void>;
  setPackEnabled: (packId: string, enabled: boolean) => Promise<void>;
  /** True if this strat (or its My-pool copy / catalog source) is favorited. */
  isFavorite: (stratId: string) => boolean;
  /**
   * Pin a strat for Match sort. When signed in, starring a catalog strat
   * also copies it into the default personal pack and pins the pool copy.
   */
  toggleFavorite: (stratId: string) => Promise<void>;
  /** Current user's vote for a strat (−1 / 0 / +1), keyed by shared catalog id when present. */
  getVote: (strat: Strat) => StratVoteValue;
  /** Net score (up − down) for the shared vote target. */
  getVoteScore: (strat: Strat) => { upvotes: number; downvotes: number; score: number };
  /** True when a cloud session exists (anonymous browser id or Discord/email). */
  canVote: boolean;
  /** Toggle upvote (1) or downvote (−1); same click again clears. No-op unless canVote. */
  castVote: (strat: Strat, value: 1 | -1) => Promise<void>;
  addToPool: (catalogStrat: Strat, packId?: string) => Promise<void>;
  removeFromPool: (poolStratId: string) => Promise<void>;
  createPrivatePack: (title: string, description?: string) => Promise<string>;
  renamePrivatePack: (packId: string, title: string, description?: string) => Promise<void>;
  deletePrivatePack: (packId: string) => Promise<void>;
  enabledStrats: Strat[];
};

const Ctx = createContext<PlaybookState | null>(null);

export function PlaybookProvider({ children }: { children: ReactNode }) {
  const { userId, loading: authLoading, user, mode, isPermanent } = useAuth();
  // Local demo uses the signed-in pack UX so personal packs are testable without Supabase.
  // Anonymous cloud users stay on system pack toggles (no My pool), same as old guests.
  const usePersonalPool = mode === "local" || (mode === "cloud" && isPermanent);
  /** Anyone with a cloud session (anonymous or Discord/email) can cast one vote per strat. */
  const canVote = mode === "cloud" && !!user;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [strats, setStrats] = useState<Strat[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [votes, setVotes] = useState<Record<string, StratVoteValue>>({});
  const [subscriptions, setSubscriptions] = useState<Record<string, boolean>>({});
  const [session, setSessionState] = useState<UserSession>(() => api.createDefaultSession());
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
        // Ensure at least one personal pack exists so Match can toggle it.
        await api.ensureUserPrivatePack(userId);
      }
      const [p, s, fav, myVotes, subs, sess] = await Promise.all([
        api.listPacks(),
        api.listStrats(),
        api.getFavorites(userId),
        api.getMyVotes(userId),
        api.getSubscriptions(userId),
        api.getSession(userId),
      ]);
      let nextStrats = s;
      // Signed-in users get Starter Pack auto-copied once so Match is ready
      // immediately (same day-1 feel as guest packs, no shop gate).
      if (usePersonalPool && !api.hasAutoSeededStarterPack(userId)) {
        const mine = s.filter((row) => row.owner_user_id === userId);
        if (mine.length === 0) {
          await api.ensureStarterPackSeeded(userId, p);
          nextStrats = await api.listStrats();
        } else {
          api.markAutoSeededStarterPack(userId);
        }
      }
      setPacks(p);
      setStrats(nextStrats);
      setVotes(myVotes);
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
          // Personal packs default on; system packs use pack defaults (Meme/Advanced off).
          nextSubs[pack.id] = isMine ? true : isPackDefaultEnabled(pack);
        }
      }
      // Old handle_new_user enabled every system pack. One-time heal when the unlocked
      // catalog looks like that bootstrap (Starter+Meme both On) so Match starts Starter-only.
      try {
        const healKey = `cs2-playbook-starter-only-defaults:${userId}`;
        if (!localStorage.getItem(healKey)) {
          const unlockedSystem = p.filter((pack) => pack.visibility === "system" && !isPackLocked(pack));
          const looksLikeBootstrap =
            unlockedSystem.length >= 2 && unlockedSystem.every((pack) => nextSubs[pack.id] === true);
          if (looksLikeBootstrap) {
            for (const pack of p.filter((x) => x.visibility === "system")) {
              const want = isPackDefaultEnabled(pack);
              if (nextSubs[pack.id] !== want) {
                nextSubs[pack.id] = want;
                void api.setPackEnabled(userId, pack.id, want);
              }
            }
          }
          localStorage.setItem(healKey, "1");
        }
      } catch {
        /* ignore private-mode / SSR */
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
      // A newer tap already saved. Don't let an older await leave stale DB state without a follow-up.
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

  const communityStrats = useMemo(() => {
    return strats.filter((s) => isCommunityStrat(s));
  }, [strats]);

  const myPrivatePacks = useMemo(() => {
    return packs
      .filter((p) => p.visibility === "private" && p.owner_user_id === userId)
      .sort(comparePersonalPacks);
  }, [packs, userId]);

  const defaultPackId = useMemo(
    () => api.defaultPrivatePackId(packs, userId),
    [packs, userId]
  );

  const myPoolStrats = useMemo(() => {
    return strats.filter((s) => {
      const pack = packs.find((p) => p.id === s.pack_id);
      return s.owner_user_id === userId && pack?.visibility === "private";
    });
  }, [strats, packs, userId]);

  /**
   * Match feed: enabled system packs + strats from each personal pack that is On.
   * Off packs stay out of Match so the call deck stays uncluttered.
   * Guests with private "Yours" packs follow the same On/Off rules.
   */
  const enabledStrats = useMemo(() => {
    const fromPacks = strats.filter((s) => {
      if (s.owner_user_id) return false;
      return isPackInMatchPool(s.pack_id, subscriptions, packs);
    });

    const fromMine = myPoolStrats.filter((s) => isPackInMatchPool(s.pack_id, subscriptions, packs));
    if (!fromMine.length) return fromPacks;

    const coveredCatalogIds = new Set(
      fromMine
        .map((s) => catalogIdFromSource(s.source))
        .filter((id): id is string => !!id)
    );
    const packsWithoutDupes = fromPacks.filter((s) => !coveredCatalogIds.has(s.id));
    return [...fromMine, ...packsWithoutDupes];
  }, [myPoolStrats, strats, subscriptions, packs]);

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
      if (!usePersonalPool) return;

      const poolRow = myPoolStrats.find((s) => s.id === stratId);
      const catalogRow =
        catalogStrats.find((s) => s.id === stratId) ||
        communityStrats.find((s) => s.id === stratId) ||
        strats.find((s) => s.id === stratId && !s.owner_user_id);

      let pinId = poolRow?.id ?? api.findPoolCopy(myPoolStrats, catalogRow?.id || stratId)?.id;

      if (!pinId && catalogRow) {
        const pack = packs.find((p) => p.id === catalogRow.pack_id);
        // Community rows may not expose their private pack; still allow copy.
        if (pack && isPackLocked(pack)) return;
        try {
          pinId = await api.addCatalogStratToPool(userId, catalogRow, packs, defaultPackId || undefined);
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
    [userId, usePersonalPool, myPoolStrats, catalogStrats, communityStrats, strats, packs, favorites, refresh, defaultPackId]
  );

  const getVote = useCallback(
    (strat: Strat): StratVoteValue => {
      const target = api.voteTargetId(strat);
      const v = votes[target];
      return v === 1 || v === -1 ? v : 0;
    },
    [votes]
  );

  const getVoteScore = useCallback(
    (strat: Strat) => {
      const target = api.voteTargetId(strat);
      const row = strats.find((s) => s.id === target) || strat;
      const upvotes = Number(row.upvotes || 0);
      const downvotes = Number(row.downvotes || 0);
      return { upvotes, downvotes, score: upvotes - downvotes };
    },
    [strats]
  );

  const castVote = useCallback(
    async (strat: Strat, value: 1 | -1) => {
      if (!canVote) return;
      const target = api.voteTargetId(strat);
      try {
        const result = await api.setStratVote(target, value);
        setVotes((prev) => {
          const next = { ...prev };
          if (result.myVote === 0) delete next[target];
          else next[target] = result.myVote;
          return next;
        });
        setStrats((prev) =>
          prev.map((s) =>
            s.id === target ? { ...s, upvotes: result.upvotes, downvotes: result.downvotes } : s
          )
        );
      } catch {
        // Keep UI stable if the vote RPC fails (network / schema lag).
      }
    },
    [canVote]
  );

  const addToPool = useCallback(
    async (catalogStrat: Strat, packId?: string) => {
      await api.addCatalogStratToPool(userId, catalogStrat, packs, packId || defaultPackId || undefined);
      await refresh();
    },
    [userId, packs, refresh, defaultPackId]
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

  const createPrivatePack = useCallback(
    async (title: string, description?: string) => {
      const id = await api.createPrivatePack(userId, {
        title,
        description: description || "",
        tier: "five_stack",
      });
      await refresh();
      return id;
    },
    [userId, refresh]
  );

  const renamePrivatePack = useCallback(
    async (packId: string, title: string, description?: string) => {
      await api.renamePrivatePack(userId, packId, { title, description });
      await refresh();
    },
    [userId, refresh]
  );

  const deletePrivatePack = useCallback(
    async (packId: string) => {
      await api.deletePrivatePack(userId, packId);
      await refresh();
    },
    [userId, refresh]
  );

  const value: PlaybookState = {
    loading,
    error,
    packs,
    strats,
    subscriptions,
    session,
    usePersonalPool,
    catalogStrats,
    communityStrats,
    myPoolStrats,
    myPrivatePacks,
    defaultPackId,
    refresh,
    setSession,
    setPackEnabled,
    isFavorite,
    toggleFavorite,
    getVote,
    getVoteScore,
    canVote,
    castVote,
    addToPool,
    removeFromPool,
    createPrivatePack,
    renamePrivatePack,
    deletePrivatePack,
    enabledStrats,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlaybook() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePlaybook outside provider");
  return ctx;
}
