import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePlaybook } from "../lib/playbook";
import { useAuth } from "../lib/auth";
import type { Strat } from "../lib/types";
import { catalogIdFromSource, isAllMaps, isPackInMatchPool, isPackLocked, compareSystemPacks } from "../lib/types";
import { bumpStratUsage, findPoolCopy, sharedStratTargetId, upsertPrivateStrat, upsertSharedStrat } from "../lib/api";
import { RoundIcons, Shuffle, SiteIcon, Star } from "../components/icons";
import { LevelBadge } from "../components/LevelBadge";
import { MapLogo } from "../components/MapLogo";
import { StratTasks } from "../components/StratTasks";
import { StratVote } from "../components/StratVote";
import { NADE_CATALOG } from "../lib/catalog";
import { clampFaceitLevel } from "../lib/faceitLevels";
import { mergeSuggested, suggestLineupLinks } from "../lib/lineupMatch";
import { isValidLane, matchSiteFilters } from "../lib/mapLanes";
import { StratStepEditor } from "../components/StratStepEditor";
import {
  buildFromTasksLinks,
  emptyStep,
  tasksLinksFromBuild,
  type StratBuild,
} from "../lib/stratSteps";
import type { StratLink } from "../lib/types";
const ROUNDS = [
  { id: "all", label: "All" },
  { id: "full", label: "Full" },
  { id: "force", label: "Force" },
  { id: "eco", label: "Eco" },
  { id: "pistol", label: "Pistol" },
] as const;

export function MatchScreen() {
  const navigate = useNavigate();
  const { userId, canEditShared } = useAuth();
  const {
    enabledStrats,
    strats,
    session,
    setSession,
    isFavorite,
    toggleFavorite,
    packs,
    subscriptions,
    setPackEnabled,
    loading,
    usePersonalPool,
    refresh,
    myPrivatePacks,
    myPoolStrats,
    addToPool,
    removeFromPool,
  } = usePlaybook();
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveBusy, setSaveBusy] = useState(false);
  const [addToOpen, setAddToOpen] = useState(false);
  const [packBusyId, setPackBusyId] = useState<string | null>(null);
  const [form, setForm] = useState({
    callout: "",
    description: "",
    build: { steps: [emptyStep()], extraLinks: [] as StratLink[] } as StratBuild,
  });
  const filterKeyRef = useRef<string | null>(null);

  const side = session.selected_side;
  const isT = side === "T";
  const accent = side === "CT" ? "ct" : "";
  const needsMap = isAllMaps(session.selected_map);
  const siteFilters = useMemo(() => matchSiteFilters(session.selected_map), [session.selected_map]);

  /** Compact Match pool switches — personal packs + unlocked system packs. Only On packs feed the call list. */
  const matchPacks = useMemo(() => {
    const system = packs
      .filter((p) => p.visibility === "system" && !isPackLocked(p))
      .sort(compareSystemPacks);
    if (!usePersonalPool) return system;
    const mine = packs
      .filter((p) => p.visibility === "private" && p.owner_user_id === userId)
      .sort((a, b) => {
        if (a.title === "My pool" && b.title !== "My pool") return -1;
        if (b.title === "My pool" && a.title !== "My pool") return 1;
        return a.slug.localeCompare(b.slug);
      });
    // Personal packs first, then catalog: Starter Pack → … → Meme
    return [...mine, ...system];
  }, [packs, usePersonalPool, userId]);

  // Drop lane filter when switching to a map that doesn't have that lane (e.g. Mid → Nuke).
  // Map pills already reset this atomically; keep as a safety net for other session writers.
  useEffect(() => {
    if (!isValidLane(session.selected_map, session.site_filter)) {
      void setSession({ site_filter: "all" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.selected_map]);

  // Resolve from full library. Ignore picks that don't match the active filters
  // (fast map/side/site/round taps used to leave a stale call on screen).
  const currentPick = useMemo(() => {
    const pick =
      strats.find((s) => s.id === session.current_pick_id) ||
      enabledStrats.find((s) => s.id === session.current_pick_id) ||
      null;
    if (!pick) return null;
    if (pick.map !== session.selected_map || pick.side !== session.selected_side) return null;
    if (isT && session.site_filter !== "all" && pick.site !== session.site_filter) return null;
    if (session.round_filter !== "all" && pick.rounds.length && !pick.rounds.includes(session.round_filter)) {
      return null;
    }
    return pick;
  }, [
    strats,
    enabledStrats,
    session.current_pick_id,
    session.selected_map,
    session.selected_side,
    session.site_filter,
    session.round_filter,
    isT,
  ]);

  const eligible = useMemo(() => {
    return enabledStrats.filter((s) => {
      if (s.map !== session.selected_map || s.side !== session.selected_side) return false;
      if (isT && session.site_filter !== "all" && s.site !== session.site_filter) return false;
      if (session.round_filter !== "all" && s.rounds.length && !s.rounds.includes(session.round_filter)) return false;
      return true;
    });
  }, [enabledStrats, session.selected_map, session.selected_side, session.site_filter, session.round_filter, isT]);

  const pickList = useMemo(() => {
    const pool = favoritesOnly && usePersonalPool ? eligible.filter((s) => isFavorite(s.id)) : eligible;
    // Dedupe by id so React keys stay stable if catalog + pool ever overlap.
    const seen = new Set<string>();
    const unique = pool.filter((s) => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });
    if (!usePersonalPool) return unique;
    const fav = unique.filter((s) => isFavorite(s.id));
    const rest = unique.filter((s) => !isFavorite(s.id));
    return [...fav, ...rest];
  }, [eligible, isFavorite, favoritesOnly, usePersonalPool]);

  const filterKey = `${session.selected_map}|${session.selected_side}|${session.site_filter}|${session.round_filter}`;

  useEffect(() => {
    if (filterKeyRef.current === null) {
      filterKeyRef.current = filterKey;
      return;
    }
    if (filterKeyRef.current === filterKey) return;
    filterKeyRef.current = filterKey;
    if (session.current_pick_id || session.timer_ends_at || session.called_at) {
      void setSession({ current_pick_id: null, timer_ends_at: null, called_at: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  // Guests have no favorites — clear the filter if session mode changes.
  useEffect(() => {
    if (!usePersonalPool) setFavoritesOnly(false);
  }, [usePersonalPool]);

  // Retired round filter — normalize old sessions.
  useEffect(() => {
    if (session.round_filter === "anti") void setSession({ round_filter: "all" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.round_filter]);

  const activeFilters = useMemo(() => {
    const chips: { key: string; label: string; clear: () => void }[] = [];
    if (isT && session.site_filter !== "all") {
      const lane = siteFilters.find((s) => s.id === session.site_filter);
      chips.push({
        key: "site",
        label: lane?.label || session.site_filter,
        clear: () =>
          void setSession({
            site_filter: "all",
            current_pick_id: null,
            timer_ends_at: null,
            called_at: null,
          }),
      });
    }
    if (session.round_filter !== "all") {
      chips.push({
        key: "round",
        label: session.round_filter,
        clear: () =>
          void setSession({
            round_filter: "all",
            current_pick_id: null,
            timer_ends_at: null,
            called_at: null,
          }),
      });
    }
    if (favoritesOnly && usePersonalPool) {
      chips.push({
        key: "fav",
        label: "Favorites",
        clear: () => setFavoritesOnly(false),
      });
    }
    return chips;
  }, [isT, session.site_filter, session.round_filter, favoritesOnly, usePersonalPool, siteFilters, setSession]);

  async function commitCall(strat: Strat) {
    const calledAt = Date.now();
    await bumpStratUsage(strat.id);
    await setSession({
      current_pick_id: strat.id,
      timer_ends_at: null,
      called_at: calledAt,
      tab: "match",
    });
  }

  function pickRandom() {
    let pool = pickList;
    if (currentPick && pool.length > 1) pool = pool.filter((s) => s.id !== currentPick.id);
    if (!pool.length) return;
    const weights = pool.map((s) => 1 / (s.times_used + 1));
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < pool.length; i++) {
      r -= weights[i];
      if (r <= 0) {
        void commitCall(pool[i]);
        return;
      }
    }
    void commitCall(pool[pool.length - 1]);
  }

  async function changeStrat() {
    await setSession({ current_pick_id: null, timer_ends_at: null, called_at: null });
  }

  const linkGroups = useMemo(() => {
    if (!currentPick) return { pinned: [], suggested: [] };
    const suggested = suggestLineupLinks(currentPick, NADE_CATALOG, { limit: 5 });
    return mergeSuggested(currentPick.links || [], suggested, 5);
  }, [currentPick]);

  const callLinks = useMemo(
    () => [
      ...linkGroups.pinned.map((l) => ({ ...l, suggested: false as const })),
      ...linkGroups.suggested.map((l) => ({ ...l, suggested: true as const })),
    ],
    [linkGroups]
  );

  const canEditCurrent =
    !!currentPick &&
    (currentPick.owner_user_id === userId || (canEditShared && !!sharedStratTargetId(currentPick)));

  useEffect(() => {
    setAddToOpen(false);
    setPackBusyId(null);
  }, [currentPick?.id]);

  function poolCopyInPack(s: Strat, packId: string): Strat | undefined {
    if (s.owner_user_id === userId && s.pack_id === packId) return s;
    const src = catalogIdFromSource(s.source);
    if (src) {
      const bySource = findPoolCopy(myPoolStrats, src, packId);
      if (bySource) return bySource;
    }
    return findPoolCopy(myPoolStrats, s.id, packId);
  }

  function sourceRowForAdd(s: Strat): Strat {
    const src = catalogIdFromSource(s.source);
    if (!src) return s;
    return strats.find((row) => row.id === src) || s;
  }

  async function togglePackMembership(s: Strat, packId: string) {
    setPackBusyId(packId);
    try {
      const existing = poolCopyInPack(s, packId);
      if (existing) await removeFromPool(existing.id);
      else await addToPool(sourceRowForAdd(s), packId);
    } finally {
      setPackBusyId(null);
    }
  }

  function startEdit() {
    if (!currentPick) return;
    setForm({
      callout: currentPick.callout,
      description: currentPick.description,
      build: buildFromTasksLinks(currentPick.tasks, currentPick.links || []),
    });
    setSaveError("");
    setEditing(true);
  }

  async function saveEdit() {
    if (!currentPick) return;
    setSaveBusy(true);
    setSaveError("");
    const { tasks, links } = tasksLinksFromBuild(form.build);
    const patch = {
      callout: form.callout.trim(),
      description: form.description.trim(),
      tasks,
      rounds: currentPick.rounds,
      site: currentPick.site,
      status: currentPick.status,
      links,
      level: currentPick.level,
      map: currentPick.map,
      side: currentPick.side,
    };
    try {
      const sharedId = sharedStratTargetId(currentPick);
      if (sharedId && canEditShared) {
        await upsertSharedStrat(sharedId, patch);
      } else if (currentPick.owner_user_id === userId) {
        await upsertPrivateStrat(userId, currentPick.pack_id, { id: currentPick.id, ...patch });
      } else {
        throw new Error("You cannot edit this strat");
      }
      setEditing(false);
      await refresh();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaveBusy(false);
    }
  }

  if (loading) return <div className="empty">Loading Match…</div>;

  return (
    <div>
      <div className="panel" style={{ paddingTop: 10, paddingBottom: 10 }}>
        {matchPacks.length > 0 && (
          <div className="row" style={{ marginBottom: 8 }}>
            {matchPacks.map((p) => {
              const on = isPackInMatchPool(p.id, subscriptions, packs);
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`pill ${on ? `active ${accent}` : ""}`}
                  onClick={() => {
                    void setPackEnabled(p.id, !on);
                    // If the open call belongs to this pack, drop it so the list can refresh.
                    if (session.current_pick_id) {
                      const pick =
                        strats.find((s) => s.id === session.current_pick_id) ||
                        enabledStrats.find((s) => s.id === session.current_pick_id);
                      if (pick?.pack_id === p.id) {
                        void setSession({ current_pick_id: null, timer_ends_at: null, called_at: null });
                      }
                    }
                  }}
                  aria-pressed={on}
                  title={p.description || p.title}
                >
                  {p.title}
                </button>
              );
            })}
          </div>
        )}
        {isT && (
          <div className="row" style={{ marginBottom: 8 }}>
            {siteFilters.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`pill pill-icon ${session.site_filter === s.id ? `active ${accent}` : ""}`}
                onClick={() =>
                  void setSession({
                    site_filter: s.id,
                    current_pick_id: null,
                    timer_ends_at: null,
                    called_at: null,
                  })
                }
              >
                <SiteIcon site={s.id} size={14} />
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        )}
        <div className="row">
          {ROUNDS.map((r) => {
            const RoundIcon = RoundIcons[r.id] || RoundIcons.all;
            return (
              <button
                key={r.id}
                type="button"
                className={`pill pill-icon ${session.round_filter === r.id ? `active ${accent}` : ""}`}
                onClick={() =>
                  void setSession({
                    round_filter: r.id,
                    current_pick_id: null,
                    timer_ends_at: null,
                    called_at: null,
                  })
                }
              >
                <RoundIcon size={13} />
                <span>{r.label}</span>
              </button>
            );
          })}
          {usePersonalPool && (
            <button
              type="button"
              className={`pill pill-icon ${favoritesOnly ? `active ${accent}` : ""}`}
              onClick={() => setFavoritesOnly((v) => !v)}
              aria-pressed={favoritesOnly}
            >
              <Star size={13} filled={favoritesOnly} />
              <span>Favorites</span>
            </button>
          )}
        </div>
      </div>

      <div className="panel">
        {needsMap && !currentPick ? (
          <p className="eyebrow">Pick a map</p>
        ) : !currentPick ? (
          <>
            <p className="eyebrow">Choose a strat</p>
            {activeFilters.length > 0 && (
              <div className="filter-summary">
                {activeFilters.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    className={`chip active ${accent}`}
                    onClick={c.clear}
                    aria-label={`Clear ${c.label}`}
                  >
                    {c.label} ×
                  </button>
                ))}
                <button
                  type="button"
                  className="chip"
                  onClick={() => {
                    void setSession({
                      site_filter: "all",
                      round_filter: "all",
                      current_pick_id: null,
                      timer_ends_at: null,
                      called_at: null,
                    });
                    setFavoritesOnly(false);
                  }}
                >
                  Clear
                </button>
              </div>
            )}
            {eligible.length === 0 && (
              <div className="empty" style={{ padding: "20px 8px" }}>
                <p className="h2" style={{ fontSize: 22, marginBottom: 8 }}>
                  No strategies
                </p>
                <p className="muted" style={{ marginBottom: 14 }}>
                  Nothing for {session.selected_map} {session.selected_side}
                  {activeFilters.length ? " with these filters" : ""}.
                </p>
                {activeFilters.length > 0 ? (
                  <button
                    type="button"
                    className={`btn btn-primary ${accent}`}
                    onClick={() => {
                      void setSession({
                        site_filter: "all",
                        round_filter: "all",
                        current_pick_id: null,
                        timer_ends_at: null,
                        called_at: null,
                      });
                      setFavoritesOnly(false);
                    }}
                  >
                    Clear filters
                  </button>
                ) : (
                  <button type="button" className={`btn btn-primary ${accent}`} onClick={() => navigate("/playbook")}>
                    Open Playbook
                  </button>
                )}
              </div>
            )}
            {eligible.length > 0 && pickList.length === 0 && favoritesOnly && (
              <div className="empty" style={{ padding: "16px 8px" }}>
                <p className="muted" style={{ marginBottom: 12 }}>
                  No favorites for this selection.
                </p>
                <button type="button" className="btn-ghost" onClick={() => setFavoritesOnly(false)}>
                  Show all
                </button>
              </div>
            )}

            {pickList.map((s) => {
              const pack = packs.find((p) => p.id === s.pack_id);
              return (
                <button
                  key={`${session.selected_map}:${session.selected_side}:${s.id}`}
                  type="button"
                  className="list-item"
                  onClick={() => void commitCall(s)}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                    <strong className="list-callout">
                      <LevelBadge level={clampFaceitLevel(s.level || 5)} size={20} />
                      {s.site && <SiteIcon site={String(s.site)} size={14} />}
                      {s.callout}
                    </strong>
                    <div className="row" style={{ gap: 4, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                      <StratVote strat={s} compact />
                      {usePersonalPool && (
                        <button
                          type="button"
                          className="btn-ghost"
                          style={{ padding: 4 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            void toggleFavorite(s.id);
                          }}
                          aria-label={isFavorite(s.id) ? "Unpin favorite" : "Favorite"}
                        >
                          <Star size={14} filled={isFavorite(s.id)} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="meta">
                    {s.description.slice(0, 80)}
                    {s.description.length > 80 ? "…" : ""}
                    {pack ? ` · ${pack.title}` : ""}
                  </div>
                </button>
              );
            })}

            {pickList.length > 0 && (
              <button type="button" className="btn-ghost" style={{ width: "100%", marginTop: 8 }} onClick={pickRandom}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                  <Shuffle size={14} /> Surprise me
                </span>
              </button>
            )}
          </>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span className={`badge badge-map ${accent === "ct" ? "five_stack" : "pro"}`}>
                <MapLogo map={session.selected_map} size={16} />
                {session.selected_map}
                {currentPick.site ? <SiteIcon site={String(currentPick.site)} size={12} /> : null}
              </span>
              <div className="row">
                <LevelBadge level={clampFaceitLevel(currentPick.level || 5)} size={28} showLabel />
                <StratVote strat={currentPick} />
                {usePersonalPool && (
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => void toggleFavorite(currentPick.id)}
                    aria-label={isFavorite(currentPick.id) ? "Unpin favorite" : "Favorite"}
                  >
                    <Star size={14} filled={isFavorite(currentPick.id)} />
                  </button>
                )}
              </div>
            </div>
            {editing ? (
              <>
                <p className="eyebrow">Edit call</p>
                {canEditShared && sharedStratTargetId(currentPick) && (
                  <p className="banner" style={{ marginBottom: 10 }}>
                    Saves for everyone
                  </p>
                )}
                <input
                  className="input"
                  placeholder="Title — e.g. Palace pop"
                  value={form.callout}
                  onChange={(e) => setForm({ ...form, callout: e.target.value })}
                />
                <input
                  className="input"
                  placeholder="Short description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
                <StratStepEditor
                  build={form.build}
                  onChange={(build) => setForm({ ...form, build })}
                  side={currentPick.side}
                  showTemplates={false}
                  suggestedLinks={mergeSuggested(
                    tasksLinksFromBuild(form.build).links,
                    suggestLineupLinks(
                      {
                        map: currentPick.map,
                        side: currentPick.side,
                        callout: form.callout.trim(),
                        description: form.description.trim(),
                        tasks: tasksLinksFromBuild(form.build).tasks,
                      },
                      NADE_CATALOG,
                      { limit: 5 }
                    ),
                    5
                  ).suggested}
                />
                {saveError && (
                  <p className="banner" style={{ color: "var(--warn)" }}>
                    {saveError}
                  </p>
                )}
                <div className="row" style={{ marginTop: 8 }}>
                  <button
                    type="button"
                    className={`btn btn-primary ${accent}`}
                    style={{ flex: 1 }}
                    disabled={saveBusy}
                    onClick={() => void saveEdit()}
                  >
                    {saveBusy ? "Saving…" : "Save"}
                  </button>
                  <button type="button" className="btn-ghost" disabled={saveBusy} onClick={() => setEditing(false)}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => navigate("/playbook", { state: { editStratId: currentPick.id } })}
                  >
                    More fields
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className={`callout-hero ${accent}`}>{currentPick.callout}</div>
                {currentPick.description && <p className="muted" style={{ marginBottom: 10 }}>{currentPick.description}</p>}
                <StratTasks tasks={currentPick.tasks} links={callLinks} accent={accent} />

                <div className="row" style={{ borderTop: "1px solid var(--line)", paddingTop: 10, marginTop: 4, flexWrap: "wrap", gap: 6 }}>
                  <button type="button" className="btn-ghost" onClick={() => void changeStrat()}>
                    Change strat
                  </button>
                  <button type="button" className="btn-ghost" onClick={pickRandom} disabled={!pickList.length}>
                    <Shuffle size={14} /> Surprise again
                  </button>
                  {usePersonalPool && myPrivatePacks.length > 0 && (
                    <button
                      type="button"
                      className={`btn-ghost ${addToOpen ? "active" : ""}`}
                      onClick={() => setAddToOpen((v) => !v)}
                    >
                      Add to…
                    </button>
                  )}
                  {canEditCurrent && (
                    <button type="button" className="btn-ghost" onClick={startEdit}>
                      Edit
                    </button>
                  )}
                </div>
                {addToOpen && usePersonalPool && currentPick && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: "8px 10px",
                      border: "1px solid var(--line)",
                      borderRadius: 8,
                    }}
                  >
                    <p className="muted" style={{ fontSize: 11, marginBottom: 6 }}>
                      Packs that include this call
                    </p>
                    {myPrivatePacks.map((p) => {
                      const copy = poolCopyInPack(currentPick, p.id);
                      const checked = !!copy;
                      const rowBusy = packBusyId === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          className="list-item"
                          style={{ margin: 0, padding: "8px 0" }}
                          disabled={rowBusy}
                          onClick={() => void togglePackMembership(currentPick, p.id)}
                          aria-pressed={checked}
                        >
                          <span className="row" style={{ justifyContent: "space-between", width: "100%" }}>
                            <span>{p.title}</span>
                            <span className="muted" style={{ fontSize: 13 }}>
                              {rowBusy ? "…" : checked ? "✓" : ""}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
