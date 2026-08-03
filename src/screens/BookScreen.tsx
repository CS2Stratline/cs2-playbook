import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { usePlaybook } from "../lib/playbook";
import { useAuth } from "../lib/auth";
import {
  ensureUserPrivatePack,
  findPoolCopy as findCopy,
  sharedStratTargetId,
  upsertPrivateStrat,
  upsertSharedStrat,
} from "../lib/api";
import type { PackTier, Strat, StratLink } from "../lib/types";
import { MAPS, isAllMaps, isPackInMatchPool, isPackLocked, isMemePack } from "../lib/types";
import { lanesForMap } from "../lib/mapLanes";
import { Plus, SideCT, SideT, SiteIcon, Star } from "../components/icons";
import { LevelBadge } from "../components/LevelBadge";
import { MapLogo } from "../components/MapLogo";
import { StratTasks } from "../components/StratTasks";
import { StratStepEditor } from "../components/StratStepEditor";
import { NADE_CATALOG } from "../lib/catalog";
import { clampFaceitLevel, tierToFaceitLevel } from "../lib/faceitLevels";
import { mergeSuggested, suggestLineupLinks } from "../lib/lineupMatch";
import {
  applyTemplate,
  buildFromTasksLinks,
  emptyStep,
  tasksLinksFromBuild,
  type StratBuild,
} from "../lib/stratSteps";

type Tab = "catalog" | "pool";

export function BookScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userId, canEditShared } = useAuth();
  const {
    packs,
    isFavorite,
    toggleFavorite,
    refresh,
    session,
    loading,
    subscriptions,
    setPackEnabled,
    enabledStrats,
    usePersonalPool,
    catalogStrats,
    myPoolStrats,
    addToPool,
    removeFromPool,
    strats,
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
  const [saveError, setSaveError] = useState("");
  const [form, setForm] = useState({
    map: "Mirage",
    callout: "",
    description: "",
    build: { steps: [emptyStep()], extraLinks: [] as StratLink[] } as StratBuild,
    site: "default",
    rounds: "" as string,
    status: "ready" as "ready" | "practice",
    level: "" as string,
  });
  const allMaps = isAllMaps(session.selected_map);

  function openEdit(s: Strat) {
    setEditing(s);
    setForm({
      map: s.map,
      callout: s.callout,
      description: s.description,
      build: buildFromTasksLinks(s.tasks, s.links || []),
      site: s.site || "default",
      rounds: s.rounds.join(","),
      status: s.status,
      level: String(s.level || ""),
    });
    setSaveError("");
    setShowForm(true);
    setExpanded(s.id);
  }

  useEffect(() => {
    const editId = (location.state as { editStratId?: string } | null)?.editStratId;
    if (!editId || loading) return;
    const s = strats.find((row) => row.id === editId);
    if (s) openEdit(s);
    // clear one-shot navigation state
    navigate(location.pathname, { replace: true, state: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, location.state, strats]);

  const privatePack = packs.find((p) => p.visibility === "private" && p.owner_user_id === userId);

  /** Packs you can put in Match (My pool when signed in + unlocked system packs). */
  const systemPacks = useMemo(() => {
    const items = packs.filter((p) => p.visibility === "system" && !isPackLocked(p));
    const order = ["essentials-pug", "stack-standard", "meme-strats"];
    items.sort((a, b) => {
      const ai = order.indexOf(a.slug);
      const bi = order.indexOf(b.slug);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
    const mine =
      usePersonalPool && privatePack
        ? [{ ...privatePack, description: privatePack.description || "Your saved strats for Match" }]
        : [];
    return [{ tier: "visible" as const, items: [...mine, ...items] }];
  }, [packs, usePersonalPool, privatePack]);

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

  const formSuggestedLinks = useMemo(() => {
    if (!showForm) return [] as StratLink[];
    const map = isAllMaps(session.selected_map) ? form.map : editing?.map || session.selected_map;
    if (!map || isAllMaps(map)) return [];
    const { tasks, links: pinned } = tasksLinksFromBuild(form.build);
    const draft = {
      map,
      side: (editing?.side || session.selected_side) as Strat["side"],
      callout: form.callout.trim(),
      description: form.description.trim(),
      tasks,
    };
    return mergeSuggested(pinned, suggestLineupLinks(draft, NADE_CATALOG, { limit: 6 }), 6).suggested;
  }, [showForm, form, editing, session.selected_map, session.selected_side]);

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

  function canEditStrat(s: Strat) {
    if (s.owner_user_id === userId) return true;
    return canEditShared && !!sharedStratTargetId(s);
  }

  async function saveForm() {
    setSaveError("");
    const { tasks, links: builtLinks } = tasksLinksFromBuild(form.build);
    const map = isAllMaps(session.selected_map) ? form.map : editing?.map || session.selected_map;
    if (!map || isAllMaps(map)) return;
    const side = editing?.side || session.selected_side;
    const draft = {
      map,
      side,
      callout: form.callout.trim(),
      description: form.description.trim(),
      tasks,
    };
    const lanes = lanesForMap(map);
    const site: Strat["site"] =
      side === "T"
        ? lanes.some((l) => l.id === form.site)
          ? (form.site as Strat["site"])
          : "default"
        : null;
    let links = builtLinks;
    // New strat with empty lineups: seed suggestions from tasks (editable after).
    if (!editing && !links.length) links = suggestLineupLinks(draft, NADE_CATALOG, { limit: 5 });
    const rounds = form.rounds
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean);
    const levelNum = form.level.trim() ? Number(form.level) : undefined;

    try {
      const sharedId = editing ? sharedStratTargetId(editing) : null;
      if (editing && sharedId && canEditShared) {
        await upsertSharedStrat(sharedId, {
          ...draft,
          site,
          rounds,
          status: form.status,
          links,
          level: Number.isFinite(levelNum) ? levelNum : editing.level,
        });
      } else {
        const packId = editing?.pack_id || (await ensurePrivatePack());
        await upsertPrivateStrat(userId, packId, {
          id: editing?.id,
          ...draft,
          site,
          rounds,
          status: form.status,
          links,
          level: Number.isFinite(levelNum) ? levelNum : undefined,
        });
        setTab("pool");
      }
      setShowForm(false);
      setEditing(null);
      await refresh();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Could not save strat");
    }
  }

  if (loading) return <div className="empty">Loading playbook…</div>;

  return (
    <div>
      <div className="panel">
        <p className="eyebrow">Packs</p>
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

      {usePersonalPool && (
        <div className="panel" style={{ paddingBottom: 10 }}>
          <p className="eyebrow">My pool</p>
          <div className="row">
            <button type="button" className={`pill ${tab === "pool" ? "active" : ""}`} onClick={() => setTab("pool")}>
              Saved · {myPoolStrats.length}
            </button>
            <button type="button" className={`pill ${tab === "catalog" ? "active" : ""}`} onClick={() => setTab("catalog")}>
              Add more
            </button>
          </div>
        </div>
      )}

      <div className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p className="eyebrow">
              {usePersonalPool ? (tab === "catalog" ? "Add more" : "Saved") : "Browse"}
            </p>
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
                  build: applyTemplate("execute", session.selected_side),
                  site: "default",
                  rounds: "",
                  status: "ready",
                  level: "",
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
          <p className="eyebrow">
            {editing
              ? canEditShared && sharedStratTargetId(editing)
                ? "Edit shared strat"
                : "Edit strat"
              : "New strat"}
          </p>
          {editing && canEditShared && sharedStratTargetId(editing) && (
            <p className="banner" style={{ marginBottom: 10 }}>
              Saves for everyone
            </p>
          )}
          {(allMaps || editing) && (
            <select className="input" value={form.map} onChange={(e) => setForm({ ...form, map: e.target.value })} aria-label="Map">
              {MAPS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
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
            side={(editing?.side || session.selected_side) as "T" | "CT"}
            suggestedLinks={formSuggestedLinks}
          />
          {(editing?.side || session.selected_side) === "T" && (
            <select
              className="input"
              aria-label="Site / lane"
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
          <div className="strat-meta-row">
            <input
              className="input"
              placeholder="Rounds — full, force, eco"
              value={form.rounds}
              onChange={(e) => setForm({ ...form, rounds: e.target.value })}
            />
            <input
              className="input"
              placeholder="Level 1–10"
              inputMode="numeric"
              value={form.level}
              onChange={(e) => setForm({ ...form, level: e.target.value })}
            />
          </div>
          {saveError && <p className="banner" style={{ color: "var(--warn)" }}>{saveError}</p>}
          <div className="row">
            <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={() => void saveForm()}>
              Save
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setShowForm(false);
                setEditing(null);
                setSaveError("");
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {groups.length === 0 ? (
        <div className="empty">
          {tab === "pool" && usePersonalPool
            ? allMaps
              ? `Nothing for ${session.selected_side} yet.`
              : `Nothing for ${session.selected_map} ${session.selected_side} yet.`
            : tab === "catalog"
              ? "Nothing left for this selection."
              : "Nothing for this selection."}
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
                      {usePersonalPool && (
                        <span onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="btn-ghost"
                            style={{ padding: 4 }}
                            onClick={() => void toggleFavorite(s.id)}
                            aria-label={isFavorite(s.id) ? "Unpin favorite" : "Add to My pool"}
                            title={
                              tab === "catalog" && !inPool && !isFavorite(s.id)
                                ? "Add to My pool"
                                : undefined
                            }
                          >
                            <Star size={14} filled={isFavorite(s.id)} />
                          </button>
                        </span>
                      )}
                    </div>
                    <div className="meta" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <LevelBadge
                        level={clampFaceitLevel(
                          s.level ||
                            (pack
                              ? isMemePack(pack)
                                ? 1
                                : tierToFaceitLevel(pack.tier as PackTier)
                              : 5)
                        )}
                        size={18}
                        title={`Level ${s.level || "?"}`}
                      />
                      <span>
                        Lv {s.level || "?"}
                        {pack ? ` · ${pack.title}` : ""}
                        {s.tasks.length ? ` · ${s.tasks.length} tasks` : ""}
                        {locked ? " · Locked" : ""}
                        {usePersonalPool && tab === "catalog" && inPool ? " · In pool" : ""}
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
                        {canEditStrat(s) && (
                          <button type="button" className="btn-ghost" onClick={() => openEdit(s)}>
                            Edit
                          </button>
                        )}
                        {tab === "pool" && usePersonalPool && s.owner_user_id === userId && (
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
