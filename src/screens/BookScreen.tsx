import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePlaybook } from "../lib/playbook";
import { useAuth } from "../lib/auth";
import { bumpStratUsage, upsertPrivateStrat } from "../lib/api";
import type { PackTier, Strat } from "../lib/types";
import { MAPS, TIER_LABEL, isAllMaps, isPackInMatchPool, isPackLocked } from "../lib/types";
import { lanesForMap } from "../lib/mapLanes";
import { Plus, SideCT, SideT, SiteIcon, Star } from "../components/icons";
import { LevelBadge } from "../components/LevelBadge";
import { MapLogo } from "../components/MapLogo";
import { StratTasks } from "../components/StratTasks";
import { NADE_CATALOG } from "../lib/catalog";
import { clampFaceitLevel, tierToFaceitLevel } from "../lib/faceitLevels";
import { mergeSuggested, suggestLineupLinks } from "../lib/lineupMatch";
import { ensureUserPrivatePack, findPoolCopy as findCopy } from "../lib/api";

type Tab = "catalog" | "pool";

export function BookScreen() {
  const navigate = useNavigate();
  const { userId, user, supabaseReady } = useAuth();
  const {
    packs,
    favorites,
    toggleFavorite,
    refresh,
    session,
    setSession,
    loading,
    subscriptions,
    setPackEnabled,
    enabledStrats,
    usePersonalPool,
    catalogStrats,
    myPoolStrats,
    addToPool,
    removeFromPool,
    addFundamentalsStarter,
  } = usePlaybook();
  const [tab, setTab] = useState<Tab>("pool");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (usePersonalPool) setTab("pool");
  }, [usePersonalPool]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Strat | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [starterMsg, setStarterMsg] = useState("");
  const [form, setForm] = useState({
    map: "Mirage",
    callout: "",
    description: "",
    tasks: "",
    site: "default",
    rounds: "" as string,
    status: "ready" as "ready" | "practice",
  });
  const allMaps = isAllMaps(session.selected_map);

  const privatePack = packs.find((p) => p.visibility === "private" && p.owner_user_id === userId);

  /** v1: hide Advanced (locked) from the UI — dead end for new users. */
  const systemPacks = useMemo(
    () =>
      (["pug", "five_stack"] as PackTier[]).map((tier) => ({
        tier,
        items: packs.filter((p) => p.tier === tier && p.visibility === "system"),
      })),
    [packs]
  );

  const catalogList = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalogStrats
      .filter((s) => {
        const pack = packs.find((p) => p.id === s.pack_id);
        if (!pack || isPackLocked(pack)) return false;
        if (s.side !== session.selected_side) return false;
        if (!isAllMaps(session.selected_map) && s.map !== session.selected_map) return false;
        return true;
      })
      .filter((s) => !q || `${s.callout} ${s.description} ${s.tasks.join(" ")} ${s.map}`.toLowerCase().includes(q));
  }, [catalogStrats, packs, session.selected_map, session.selected_side, query]);

  const poolList = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = usePersonalPool ? myPoolStrats : enabledStrats;
    return base
      .filter((s) => {
        if (s.side !== session.selected_side) return false;
        if (!isAllMaps(session.selected_map) && s.map !== session.selected_map) return false;
        return true;
      })
      .filter((s) => !q || `${s.callout} ${s.description} ${s.tasks.join(" ")} ${s.map}`.toLowerCase().includes(q));
  }, [usePersonalPool, myPoolStrats, enabledStrats, session.selected_map, session.selected_side, query]);

  const displayList = usePersonalPool && tab === "catalog" ? catalogList : poolList;

  const formMap = allMaps ? form.map : session.selected_map;
  const formLanes = useMemo(() => lanesForMap(formMap), [formMap]);

  const groups = useMemo(() => {
    if (isAllMaps(session.selected_map)) {
      return MAPS.map((map) => ({
        id: map,
        label: map,
        kind: "map" as const,
        items: displayList.filter((s) => s.map === map),
      })).filter((g) => g.items.length);
    }
    if (session.selected_side === "CT") return [{ id: "ct", label: "CT setups", kind: "site" as const, items: displayList }];
    return lanesForMap(session.selected_map)
      .map((lane) => ({
        id: lane.id,
        label: lane.label,
        kind: "site" as const,
        items: displayList.filter((s) =>
          lane.id === "default" ? !s.site || s.site === "default" : s.site === lane.id
        ),
      }))
      .filter((g) => g.items.length);
  }, [displayList, session.selected_side, session.selected_map]);

  async function ensurePrivatePack() {
    if (privatePack) return privatePack.id;
    return ensureUserPrivatePack(userId);
  }

  async function saveForm() {
    const packId = editing?.pack_id || (await ensurePrivatePack());
    const tasks = form.tasks
      .split("\n")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 5);
    const map = isAllMaps(session.selected_map) ? form.map : session.selected_map;
    if (!map || isAllMaps(map)) return;
    const draft = {
      map,
      side: session.selected_side,
      callout: form.callout.trim(),
      description: form.description.trim(),
      tasks,
    };
    const lanes = lanesForMap(map);
    const site: Strat["site"] =
      session.selected_side === "T"
        ? lanes.some((l) => l.id === form.site)
          ? (form.site as Strat["site"])
          : "default"
        : null;
    let links = editing?.links || [];
    if (!links.length) links = suggestLineupLinks(draft, NADE_CATALOG, { limit: 5 });
    await upsertPrivateStrat(userId, packId, {
      id: editing?.id,
      ...draft,
      site,
      rounds: form.rounds
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean),
      status: form.status,
      links,
    });
    setShowForm(false);
    setEditing(null);
    setTab("pool");
    await refresh();
  }

  async function useInMatch(s: Strat) {
    const pack = packs.find((p) => p.id === s.pack_id);
    if (isPackLocked(pack)) return;
    if (!usePersonalPool && !isPackInMatchPool(s.pack_id, subscriptions, packs)) {
      await setPackEnabled(s.pack_id, true);
    }
    await bumpStratUsage(s.id);
    await setSession({
      selected_map: s.map,
      selected_side: s.side,
      site_filter: s.site || "all",
      current_pick_id: s.id,
      timer_ends_at: null,
      called_at: Date.now(),
      tab: "match",
    });
    navigate("/match");
  }

  if (loading) return <div className="empty">Loading playbook…</div>;

  return (
    <div>
      {usePersonalPool ? (
        <div className="panel" style={{ paddingBottom: 10 }}>
          <p className="eyebrow">Playbook</p>
          <div className="row" style={{ marginBottom: 8 }}>
            <button type="button" className={`pill ${tab === "pool" ? "active" : ""}`} onClick={() => setTab("pool")}>
              My pool · {myPoolStrats.length}
            </button>
            <button type="button" className={`pill ${tab === "catalog" ? "active" : ""}`} onClick={() => setTab("catalog")}>
              Add more
            </button>
          </div>
          <p className="muted">
            {tab === "pool"
              ? "These feed Match. Fundamentals are added automatically when you sign in."
              : "Optional — add Stack strats into My pool when you want more variety."}
          </p>
          {tab === "pool" && myPoolStrats.length === 0 && (
            <div className="row" style={{ marginTop: 10 }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1 }}
                disabled={!!busyId}
                onClick={async () => {
                  setBusyId("starter");
                  setStarterMsg("");
                  try {
                    const n = await addFundamentalsStarter(session.selected_map);
                    setStarterMsg(
                      n
                        ? `Added ${n} strat${n === 1 ? "" : "s"}${allMaps ? " across all maps" : ` for ${session.selected_map}`}`
                        : allMaps
                          ? "Fundamentals already in your pool"
                          : `Already in your pool for ${session.selected_map}`
                    );
                  } catch (e) {
                    setStarterMsg(e instanceof Error ? e.message : "Could not add starter kit");
                  } finally {
                    setBusyId(null);
                  }
                }}
              >
                {allMaps ? "Add Fundamentals (all maps)" : `Add Fundamentals for ${session.selected_map}`}
              </button>
            </div>
          )}
          {starterMsg && <p className="banner">{starterMsg}</p>}
        </div>
      ) : (
        <div className="panel">
          <p className="eyebrow">Packs</p>
          <p className="muted" style={{ marginBottom: 8 }}>
            Toggle what feeds Match on this device.
            {supabaseReady && !user ? " Sign in (Settings) to sync the same pool across phones." : ""}
          </p>
          <p className="muted" style={{ marginBottom: 8 }}>{enabledStrats.length} strats ready for Match.</p>
          {systemPacks.map(({ tier, items }) =>
            items.length ? (
              <div key={tier} style={{ marginTop: 8 }}>
                {items.map((p) => {
                  const on = isPackInMatchPool(p.id, subscriptions, packs);
                  return (
                    <div
                      key={p.id}
                      style={{
                        display: "flex",
                        gap: 10,
                        alignItems: "flex-start",
                        padding: "8px 0",
                        borderBottom: "1px solid var(--line)",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <strong style={{ fontSize: 13 }}>{p.title}</strong>
                        <p className="muted" style={{ marginTop: 2, fontSize: 11 }}>
                          {p.description || `${p.strat_count ?? "—"} strats`}
                        </p>
                      </div>
                      <button className={`pill ${on ? "active" : ""}`} onClick={() => void setPackEnabled(p.id, !on)} type="button">
                        {on ? "On" : "Off"}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : null
          )}
        </div>
      )}

      <div className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p className="eyebrow">{usePersonalPool ? (tab === "catalog" ? "Add more" : "My pool") : "Browse"}</p>
            <h2 className="h2 h2-map" style={{ fontSize: 24 }}>
              {!allMaps && <MapLogo map={session.selected_map} size={26} />}
              {allMaps ? "All maps" : session.selected_map}
              <span className={`side-tag ${session.selected_side === "CT" ? "ct" : ""}`}>
                {session.selected_side === "CT" ? <SideCT size={14} /> : <SideT size={14} />}
                {session.selected_side}
              </span>
            </h2>
          </div>
          {tab === "pool" && (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setEditing(null);
                setForm({
                  map: allMaps ? "Mirage" : session.selected_map,
                  callout: "",
                  description: "",
                  tasks: "",
                  site: "default",
                  rounds: "",
                  status: "ready",
                });
                setShowForm(true);
              }}
            >
              <Plus size={14} /> New
            </button>
          )}
        </div>
        <input
          className="input"
          placeholder={allMaps ? "Search maps, callouts, tasks…" : "Search callouts and tasks…"}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {showForm && (
        <div className="panel">
          <p className="eyebrow">{editing ? "Edit strat" : "New strat"}</p>
          {(allMaps || editing) && (
            <select className="input" value={form.map} onChange={(e) => setForm({ ...form, map: e.target.value })}>
              {MAPS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          )}
          <input className="input" placeholder="Callout" value={form.callout} onChange={(e) => setForm({ ...form, callout: e.target.value })} />
          <input className="input" placeholder="Short explanation" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <textarea
            className="input"
            rows={4}
            placeholder="Tasks (one per line, max 5)"
            value={form.tasks}
            onChange={(e) => setForm({ ...form, tasks: e.target.value })}
          />
          {session.selected_side === "T" && (
            <select
              className="input"
              value={formLanes.some((l) => l.id === form.site) ? form.site : formLanes[0]?.id || "default"}
              onChange={(e) => setForm({ ...form, site: e.target.value })}
            >
              {formLanes.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          )}
          <input className="input" placeholder="Rounds (full,force,eco — blank = all)" value={form.rounds} onChange={(e) => setForm({ ...form, rounds: e.target.value })} />
          <div className="row">
            <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={() => void saveForm()}>
              Save
            </button>
            <button type="button" className="btn-ghost" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {groups.length === 0 ? (
        <div className="empty">
          {tab === "pool" && usePersonalPool
            ? allMaps
              ? `Nothing for ${session.selected_side} yet. Add Fundamentals above, or switch side.`
              : `Nothing for ${session.selected_map} ${session.selected_side} yet. Add Fundamentals above, or switch side/map.`
            : tab === "catalog"
              ? "No more unlocked strats for this selection."
              : "Nothing here for this selection."}
        </div>
      ) : (
        groups.map((g) => (
          <div key={g.id} className="panel">
            <p className="eyebrow eyebrow-site">
              {g.kind === "map" ? <MapLogo map={g.id} size={14} /> : g.id !== "ct" && g.id !== "default" ? <SiteIcon site={g.id} size={12} /> : null}
              {g.label}
              {g.kind === "map" ? ` · ${g.items.length}` : null}
            </p>
            {g.items.map((s) => {
              const open = expanded === s.id;
              const pack = packs.find((p) => p.id === s.pack_id);
              const locked = isPackLocked(pack);
              const inPool = usePersonalPool ? !!findCopy(myPoolStrats, s.id) : false;
              const showingCatalog = tab === "catalog" && (usePersonalPool || !usePersonalPool);
              return (
                <div key={s.id} style={{ borderBottom: "1px solid var(--line)", padding: "10px 0", opacity: locked && showingCatalog ? 0.75 : 1 }}>
                  <button type="button" className="list-item" style={{ margin: 0 }} onClick={() => setExpanded(open ? null : s.id)}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <strong>{s.callout}</strong>
                      <span onClick={(e) => e.stopPropagation()}>
                        <button type="button" className="btn-ghost" style={{ padding: 4 }} onClick={() => void toggleFavorite(s.id)}>
                          <Star size={14} filled={favorites.has(s.id)} />
                        </button>
                      </span>
                    </div>
                    <div className="meta" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <LevelBadge
                        level={clampFaceitLevel(s.level || (pack ? tierToFaceitLevel(pack.tier as PackTier) : 5))}
                        size={18}
                        title={`Execution difficulty · Level ${s.level || "?"}`}
                      />
                      <span>
                        Lv {s.level || "?"}
                        {pack ? ` · ${TIER_LABEL[pack.tier as PackTier]}` : ""}
                        {s.tasks.length ? ` · ${s.tasks.length} tasks` : ""}
                        {locked ? " · Locked" : ""}
                        {usePersonalPool && tab === "catalog" && inPool ? " · In pool" : ""}
                        {!open ? " · Tap for details" : ""}
                      </span>
                    </div>
                  </button>
                  {open && (
                    <div style={{ padding: "8px 4px 0" }}>
                      {s.description && <p className="muted" style={{ marginBottom: 8 }}>{s.description}</p>}
                      <StratTasks
                        tasks={s.tasks}
                        links={(() => {
                          const sug = suggestLineupLinks(s, NADE_CATALOG, { limit: 4 });
                          const merged = mergeSuggested(s.links || [], sug, 4);
                          return [
                            ...merged.pinned.map((l) => ({ ...l, suggested: false as const })),
                            ...merged.suggested.map((l) => ({ ...l, suggested: true as const })),
                          ];
                        })()}
                        accent={session.selected_side === "CT" ? "ct" : ""}
                      />
                      <div className="row" style={{ marginTop: 8 }}>
                        {usePersonalPool && tab === "catalog" && (
                          <button
                            type="button"
                            className="btn-ghost"
                            disabled={locked || busyId === s.id || inPool}
                            onClick={async () => {
                              setBusyId(s.id);
                              try {
                                await addToPool(s);
                              } finally {
                                setBusyId(null);
                              }
                            }}
                          >
                            {locked ? "Locked" : inPool ? "In pool" : "Add to pool"}
                          </button>
                        )}
                        {(tab === "pool" || !usePersonalPool) && (
                          <button type="button" className="btn-ghost" onClick={() => void useInMatch(s)}>
                            Use in Match
                          </button>
                        )}
                        {tab === "pool" && usePersonalPool && s.owner_user_id === userId && (
                          <>
                            <button
                              type="button"
                              className="btn-ghost"
                              onClick={() => {
                                setEditing(s);
                                setForm({
                                  map: s.map,
                                  callout: s.callout,
                                  description: s.description,
                                  tasks: s.tasks.join("\n"),
                                  site: s.site || "default",
                                  rounds: s.rounds.join(","),
                                  status: s.status,
                                });
                                setShowForm(true);
                              }}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn-ghost"
                              style={{ color: "var(--warn)" }}
                              onClick={async () => {
                                await removeFromPool(s.id);
                              }}
                            >
                              Remove
                            </button>
                          </>
                        )}
                        {!usePersonalPool && s.owner_user_id === userId && (
                          <button
                            type="button"
                            className="btn-ghost"
                            style={{ color: "var(--warn)" }}
                            onClick={async () => {
                              await removeFromPool(s.id);
                            }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}
