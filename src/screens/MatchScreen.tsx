import { useEffect, useMemo, useRef, useState } from "react";
import { usePlaybook } from "../lib/playbook";
import type { Strat } from "../lib/types";
import { bumpStratUsage } from "../lib/api";
import { RoundIcons, Shuffle, SiteIcon, Star } from "../components/icons";
import { LevelBadge } from "../components/LevelBadge";
import { MapLogo } from "../components/MapLogo";
import { StratTasks } from "../components/StratTasks";
import { NADE_CATALOG } from "../lib/catalog";
import { clampFaceitLevel } from "../lib/faceitLevels";
import { mergeSuggested, suggestLineupLinks } from "../lib/lineupMatch";

const SITES = [
  { id: "all", label: "All" },
  { id: "a", label: "A" },
  { id: "b", label: "B" },
  { id: "mid", label: "Mid" },
  { id: "default", label: "Def" },
];
const ROUNDS = [
  { id: "all", label: "All" },
  { id: "full", label: "Full" },
  { id: "force", label: "Force" },
  { id: "eco", label: "Eco" },
  { id: "pistol", label: "Pistol" },
  { id: "anti", label: "Anti" },
] as const;

export function MatchScreen() {
  const {
    enabledStrats,
    strats,
    favorites,
    session,
    setSession,
    toggleFavorite,
    packs,
    loading,
    usePersonalPool,
    addFundamentalsStarter,
  } = usePlaybook();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [seedBusy, setSeedBusy] = useState(false);
  const filterKeyRef = useRef<string | null>(null);

  const side = session.selected_side;
  const isT = side === "T";
  const accent = side === "CT" ? "ct" : "";

  // Resolve from full library — Use in Match / live share can set a pick outside the enabled pool.
  const currentPick = useMemo(
    () =>
      strats.find((s) => s.id === session.current_pick_id) ||
      enabledStrats.find((s) => s.id === session.current_pick_id) ||
      null,
    [strats, enabledStrats, session.current_pick_id]
  );

  const eligible = useMemo(() => {
    return enabledStrats.filter((s) => {
      if (s.map !== session.selected_map || s.side !== session.selected_side) return false;
      if (s.status === "practice" && !session.include_practice) return false;
      if (isT && session.site_filter !== "all" && s.site !== session.site_filter) return false;
      if (session.round_filter !== "all" && s.rounds.length && !s.rounds.includes(session.round_filter)) return false;
      return true;
    });
  }, [enabledStrats, session, isT]);

  const pickList = useMemo(() => {
    const fav = eligible.filter((s) => favorites.has(s.id));
    const rest = eligible.filter((s) => !favorites.has(s.id));
    return [...fav, ...rest];
  }, [eligible, favorites]);

  const filterKey = `${session.selected_map}|${session.selected_side}|${session.site_filter}|${session.round_filter}|${session.include_practice}`;

  useEffect(() => {
    // Skip first run so Use in Match (map/side/site + pick together) is not wiped on Match mount.
    if (filterKeyRef.current === null) {
      filterKeyRef.current = filterKey;
      return;
    }
    if (filterKeyRef.current === filterKey) return;
    filterKeyRef.current = filterKey;
    void setSession({ current_pick_id: null, timer_ends_at: null, called_at: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

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
    let pool = eligible;
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

  const filterActive = session.round_filter !== "all" || session.include_practice;

  if (loading) return <div className="empty">Loading Match…</div>;

  return (
    <div>
      <div className="panel" style={{ paddingTop: 10, paddingBottom: 10 }}>
        {isT && (
          <div className="row" style={{ marginBottom: 8 }}>
            {SITES.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`pill pill-icon ${session.site_filter === s.id ? `active ${accent}` : ""}`}
                onClick={() => void setSession({ site_filter: s.id })}
              >
                <SiteIcon site={s.id} size={14} />
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        )}
        <button type="button" className="btn-ghost" style={{ width: "100%" }} onClick={() => setFiltersOpen((v) => !v)}>
          Filters{filterActive ? " · on" : ""} {filtersOpen ? "▴" : "▾"}
        </button>
        {filtersOpen && (
          <div style={{ marginTop: 10 }}>
            <p className="eyebrow">Round</p>
            <div className="row">
              {ROUNDS.map((r) => {
                const RoundIcon = RoundIcons[r.id] || RoundIcons.all;
                return (
                  <button
                    key={r.id}
                    type="button"
                    className={`pill pill-icon ${session.round_filter === r.id ? `active ${accent}` : ""}`}
                    onClick={() => void setSession({ round_filter: r.id })}
                  >
                    <RoundIcon size={13} />
                    <span>{r.label}</span>
                  </button>
                );
              })}
            </div>
            <label className="muted" style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={session.include_practice}
                onChange={(e) => void setSession({ include_practice: e.target.checked })}
              />
              Include practice strats
            </label>
          </div>
        )}
      </div>

      <div className="panel">
        {!currentPick ? (
          <>
            <p className="eyebrow">Choose a strat</p>
            <p className="muted" style={{ marginBottom: 12 }}>
              {eligible.length === 0
                ? usePersonalPool
                  ? `No strats for ${session.selected_map} ${session.selected_side} in your pool yet.`
                  : `No strats match this selection on ${session.selected_map}. Turn on a pack in Playbook, or loosen filters.`
                : `${eligible.length} strat${eligible.length === 1 ? "" : "s"} ready · tap one to call`}
            </p>

            {eligible.length === 0 && usePersonalPool && (
              <button
                type="button"
                className={`btn btn-primary ${accent}`}
                style={{ marginBottom: 12 }}
                disabled={seedBusy}
                onClick={async () => {
                  setSeedBusy(true);
                  try {
                    await addFundamentalsStarter(session.selected_map);
                  } finally {
                    setSeedBusy(false);
                  }
                }}
              >
                {seedBusy ? "Adding…" : `Add Fundamentals for ${session.selected_map}`}
              </button>
            )}

            {pickList.map((s) => {
              const pack = packs.find((p) => p.id === s.pack_id);
              return (
                <button key={s.id} type="button" className="list-item" onClick={() => void commitCall(s)}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                    <strong className="list-callout">
                      <LevelBadge level={clampFaceitLevel(s.level || 5)} size={20} />
                      {s.site && <SiteIcon site={String(s.site)} size={14} />}
                      {s.callout}
                    </strong>
                    <button
                      type="button"
                      className="btn-ghost"
                      style={{ padding: 4 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        void toggleFavorite(s.id);
                      }}
                      aria-label="Favorite"
                    >
                      <Star size={14} filled={favorites.has(s.id)} />
                    </button>
                  </div>
                  <div className="meta">
                    {s.description.slice(0, 80)}
                    {s.description.length > 80 ? "…" : ""}
                    {pack ? ` · ${pack.title}` : ""}
                    {favorites.has(s.id) ? " · Favorite" : ""}
                  </div>
                </button>
              );
            })}

            {eligible.length > 0 && (
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
                <button type="button" className="btn-ghost" onClick={() => void toggleFavorite(currentPick.id)}>
                  <Star size={14} filled={favorites.has(currentPick.id)} />
                </button>
              </div>
            </div>
            <div className="callout-hero">{currentPick.callout}</div>
            {currentPick.description && <p className="muted" style={{ marginBottom: 10 }}>{currentPick.description}</p>}
            <StratTasks tasks={currentPick.tasks} links={callLinks} accent={accent} />

            <div className="row" style={{ borderTop: "1px solid var(--line)", paddingTop: 10, marginTop: 4 }}>
              <button type="button" className="btn-ghost" onClick={() => void changeStrat()}>
                Change strat
              </button>
              <button type="button" className="btn-ghost" onClick={pickRandom} disabled={!eligible.length}>
                <Shuffle size={14} /> Surprise me
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
