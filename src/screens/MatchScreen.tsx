import { useEffect, useMemo, useRef, useState } from "react";
import { usePlaybook } from "../lib/playbook";
import { FREEZE_SECONDS, type Strat } from "../lib/types";
import { bumpStratUsage, logStratResult } from "../lib/api";
import { ExternalLink, Shuffle, Star } from "../components/icons";
import { NADE_CATALOG } from "../lib/catalog";
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
];

export function MatchScreen() {
  const { enabledStrats, favorites, session, setSession, toggleFavorite, packs, loading } = usePlaybook();
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const timerRef = useRef<number | null>(null);
  const suppressRef = useRef(true);

  const side = session.selected_side;
  const isT = side === "T";
  const accent = side === "CT" ? "ct" : "";

  const currentPick = useMemo(
    () => enabledStrats.find((s) => s.id === session.current_pick_id) || null,
    [enabledStrats, session.current_pick_id]
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

  function clearTimer() {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    setSecondsLeft(null);
  }

  function startTimer(endMs?: number) {
    clearTimer();
    const end = endMs || Date.now() + FREEZE_SECONDS * 1000;
    const tick = () => {
      const left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0 && timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
    tick();
    timerRef.current = window.setInterval(tick, 200);
    return end;
  }

  useEffect(() => {
    suppressRef.current = true;
    if (session.timer_ends_at && session.timer_ends_at > Date.now() && session.current_pick_id) {
      startTimer(session.timer_ends_at);
    }
    queueMicrotask(() => {
      suppressRef.current = false;
    });
    return () => clearTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  useEffect(() => {
    if (suppressRef.current) return;
    clearTimer();
    void setSession({ current_pick_id: null, logged: null, timer_ends_at: null, called_at: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.selected_map, session.selected_side, session.site_filter, session.round_filter, session.include_practice]);

  async function commitCall(strat: Strat) {
    const end = startTimer();
    const calledAt = Date.now();
    await bumpStratUsage(strat.id);
    await setSession({
      current_pick_id: strat.id,
      logged: null,
      timer_ends_at: end,
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
    clearTimer();
    await setSession({ current_pick_id: null, logged: null, timer_ends_at: null, called_at: null });
  }

  async function onLog(result: "win" | "loss") {
    if (!currentPick || session.logged) return;
    await logStratResult(currentPick.id, result);
    await setSession({ logged: result });
  }

  const linkGroups = useMemo(() => {
    if (!currentPick) return { pinned: [], suggested: [] };
    const suggested = suggestLineupLinks(currentPick, NADE_CATALOG, { limit: 5 });
    return mergeSuggested(currentPick.links || [], suggested, 5);
  }, [currentPick]);

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
                className={`pill ${session.site_filter === s.id ? `active ${accent}` : ""}`}
                onClick={() => void setSession({ site_filter: s.id })}
              >
                {s.label}
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
              {ROUNDS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={`pill ${session.round_filter === r.id ? `active ${accent}` : ""}`}
                  onClick={() => void setSession({ round_filter: r.id })}
                >
                  {r.label}
                </button>
              ))}
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
                ? `No strats match this selection on ${session.selected_map}. Enable more packs in Book.`
                : `${eligible.length} strat${eligible.length === 1 ? "" : "s"} ready · tap one to call`}
            </p>

            {pickList.map((s) => {
              const pack = packs.find((p) => p.id === s.pack_id);
              return (
                <button key={s.id} type="button" className="list-item" onClick={() => void commitCall(s)}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <strong>{s.callout}</strong>
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
              <span className={`badge ${accent === "ct" ? "five_stack" : "pro"}`}>
                {currentPick.site ? `${session.selected_map} · ${String(currentPick.site).toUpperCase()}` : session.selected_map}
              </span>
              <div className="row">
                <button type="button" className="btn-ghost" onClick={() => void toggleFavorite(currentPick.id)}>
                  <Star size={14} filled={favorites.has(currentPick.id)} />
                </button>
                {secondsLeft !== null && (
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: secondsLeft <= 4 ? "var(--warn)" : "var(--faint)" }}>
                    {secondsLeft}s
                  </span>
                )}
              </div>
            </div>
            <div className="callout-hero">{currentPick.callout}</div>
            {currentPick.description && <p className="muted" style={{ marginBottom: 10 }}>{currentPick.description}</p>}
            {currentPick.tasks.length > 0 && (
              <div style={{ borderLeft: `2px solid ${side === "CT" ? "var(--accent-ct)" : "var(--accent-t)"}`, paddingLeft: 10, marginBottom: 12 }}>
                {currentPick.tasks.map((t, i) => (
                  <p key={i} style={{ margin: "0 0 3px", fontSize: 13, color: "#b4bac2", fontFamily: "var(--font-mono)" }}>
                    {t}
                  </p>
                ))}
              </div>
            )}

            {(linkGroups.pinned.length > 0 || linkGroups.suggested.length > 0) && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                {linkGroups.pinned.map((l, i) => (
                  <a key={`p-${i}`} className="chip-link" href={l.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink size={11} /> {l.label}
                  </a>
                ))}
                {linkGroups.suggested.map((l, i) => (
                  <a key={`s-${i}`} className="chip-link suggested" href={l.url} target="_blank" rel="noopener noreferrer" title="Suggested from catalog">
                    <ExternalLink size={11} /> {l.label}
                  </a>
                ))}
              </div>
            )}

            <div className="row" style={{ borderTop: "1px solid var(--line)", paddingTop: 10 }}>
              {session.logged ? (
                <span className="badge" style={{ color: session.logged === "win" ? "var(--good)" : "var(--warn)" }}>
                  {session.logged === "win" ? "Round won" : "Round lost"}
                </span>
              ) : (
                <>
                  <button type="button" className="pill" style={{ color: "var(--good)" }} onClick={() => void onLog("win")}>
                    Won
                  </button>
                  <button type="button" className="pill" style={{ color: "var(--warn)" }} onClick={() => void onLog("loss")}>
                    Lost
                  </button>
                </>
              )}
            </div>
            <div className="row" style={{ marginTop: 10 }}>
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
