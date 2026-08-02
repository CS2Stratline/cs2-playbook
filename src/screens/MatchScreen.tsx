import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePlaybook } from "../lib/playbook";
import { useAuth } from "../lib/auth";
import type { Strat } from "../lib/types";
import { isAllMaps } from "../lib/types";
import { bumpStratUsage, sharedStratTargetId, upsertPrivateStrat, upsertSharedStrat } from "../lib/api";
import { RoundIcons, Shuffle, SiteIcon, Star } from "../components/icons";
import { LevelBadge } from "../components/LevelBadge";
import { MapLogo } from "../components/MapLogo";
import { StratTasks } from "../components/StratTasks";
import { NADE_CATALOG } from "../lib/catalog";
import { clampFaceitLevel } from "../lib/faceitLevels";
import { mergeSuggested, suggestLineupLinks } from "../lib/lineupMatch";
import { isValidLane, matchSiteFilters } from "../lib/mapLanes";
import { linksToText, textToLinks } from "../lib/stratLinksText";
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
    loading,
    usePersonalPool,
    refresh,
  } = usePlaybook();
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveBusy, setSaveBusy] = useState(false);
  const [form, setForm] = useState({ callout: "", description: "", tasks: "", links: "" });
  const filterKeyRef = useRef<string | null>(null);

  const side = session.selected_side;
  const isT = side === "T";
  const accent = side === "CT" ? "ct" : "";
  const needsMap = isAllMaps(session.selected_map);
  const siteFilters = useMemo(() => matchSiteFilters(session.selected_map), [session.selected_map]);

  // Drop lane filter when switching to a map that doesn't have that lane (e.g. Mid → Nuke).
  useEffect(() => {
    if (!isValidLane(session.selected_map, session.site_filter)) {
      void setSession({ site_filter: "all" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.selected_map]);

  // Resolve from full library — live share can set a pick outside the enabled pool.
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
      if (isT && session.site_filter !== "all" && s.site !== session.site_filter) return false;
      if (session.round_filter !== "all" && s.rounds.length && !s.rounds.includes(session.round_filter)) return false;
      return true;
    });
  }, [enabledStrats, session, isT]);

  const pickList = useMemo(() => {
    const pool = favoritesOnly && usePersonalPool ? eligible.filter((s) => isFavorite(s.id)) : eligible;
    if (!usePersonalPool) return pool;
    const fav = pool.filter((s) => isFavorite(s.id));
    const rest = pool.filter((s) => !isFavorite(s.id));
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
    void setSession({ current_pick_id: null, timer_ends_at: null, called_at: null });
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

  function startEdit() {
    if (!currentPick) return;
    setForm({
      callout: currentPick.callout,
      description: currentPick.description,
      tasks: currentPick.tasks.join("\n"),
      links: linksToText(currentPick.links || []),
    });
    setSaveError("");
    setEditing(true);
  }

  async function saveEdit() {
    if (!currentPick) return;
    setSaveBusy(true);
    setSaveError("");
    const tasks = form.tasks
      .split("\n")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 5);
    const patch = {
      callout: form.callout.trim(),
      description: form.description.trim(),
      tasks,
      rounds: currentPick.rounds,
      site: currentPick.site,
      status: currentPick.status,
      links: textToLinks(form.links),
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
        {isT && (
          <div className="row" style={{ marginBottom: 8 }}>
            {siteFilters.map((s) => (
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
            {eligible.length === 0 && (
              <p className="muted" style={{ marginBottom: 12 }}>
                No strats for {session.selected_map} {session.selected_side}.
              </p>
            )}
            {eligible.length > 0 && pickList.length === 0 && favoritesOnly && (
              <p className="muted" style={{ marginBottom: 12 }}>
                No favorites for this selection.
              </p>
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
                <textarea
                  className="input"
                  rows={4}
                  placeholder={"Tasks — one per line (max 5)\nSmoke jungle\nFlash CT"}
                  value={form.tasks}
                  onChange={(e) => setForm({ ...form, tasks: e.target.value })}
                />
                <textarea
                  className="input"
                  rows={3}
                  placeholder={"Lineups — one per line\nSmoke: Jungle | https://…\nhttps://…"}
                  value={form.links}
                  onChange={(e) => setForm({ ...form, links: e.target.value })}
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
                <div className="callout-hero">{currentPick.callout}</div>
                {currentPick.description && <p className="muted" style={{ marginBottom: 10 }}>{currentPick.description}</p>}
                <StratTasks tasks={currentPick.tasks} links={callLinks} accent={accent} />

                <div className="row" style={{ borderTop: "1px solid var(--line)", paddingTop: 10, marginTop: 4 }}>
                  <button type="button" className="btn-ghost" onClick={() => void changeStrat()}>
                    Change strat
                  </button>
                  <button type="button" className="btn-ghost" onClick={pickRandom} disabled={!pickList.length}>
                    <Shuffle size={14} /> Surprise me
                  </button>
                  {canEditCurrent && (
                    <button type="button" className="btn-ghost" onClick={startEdit}>
                      Edit
                    </button>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
