import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { usePlaybook } from "../lib/playbook";
import { useAuth } from "../lib/auth";
import {
  ensureUserPrivatePack,
  findPoolCopy as findCopy,
  MAX_PRIVATE_PACKS,
  sharedStratTargetId,
  upsertPrivateStrat,
  upsertSharedStrat,
} from "../lib/api";
import type { PackTier, Strat, StratLink } from "../lib/types";
import { MAPS, isAllMaps, isCommunityStrat, isPackInMatchPool, isPackLocked, isMemePack, compareSystemPacks } from "../lib/types";
import { lanesForMap } from "../lib/mapLanes";
import { Plus, SideCT, SideT, SiteIcon, Star } from "../components/icons";
import { LevelBadge } from "../components/LevelBadge";
import { MapLogo } from "../components/MapLogo";
import { StratTasks } from "../components/StratTasks";
import { StratStepEditor } from "../components/StratStepEditor";
import { StratVote } from "../components/StratVote";
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

type Tab = "catalog" | "pool" | "community";

const ROUND_OPTIONS = [
  { id: "full", label: "Full" },
  { id: "force", label: "Force" },
  { id: "eco", label: "Eco" },
  { id: "pistol", label: "Pistol" },
] as const;

export function BookScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userId, canEditShared, isPermanent, mode, supabaseReady } = useAuth();
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
    communityStrats,
    myPoolStrats,
    myPrivatePacks,
    defaultPackId,
    addToPool,
    removeFromPool,
    createPrivatePack,
    renamePrivatePack,
    deletePrivatePack,
    strats,
  } = usePlaybook();
  const [tab, setTab] = useState<Tab>("pool");
  const [query, setQuery] = useState("");
  const [catalogTargetPack, setCatalogTargetPack] = useState("");
  const [packDraftTitle, setPackDraftTitle] = useState("");
  const [renamingPackId, setRenamingPackId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [packBusy, setPackBusy] = useState(false);
  const [packError, setPackError] = useState("");

  useEffect(() => {
    if (usePersonalPool) setTab("pool");
    else setTab("catalog");
  }, [usePersonalPool]);

  useEffect(() => {
    if (!catalogTargetPack && defaultPackId) setCatalogTargetPack(defaultPackId);
  }, [defaultPackId, catalogTargetPack]);

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
    rounds: [] as string[],
    status: "ready" as "ready" | "practice",
    level: "" as string,
    packId: "" as string,
    /** Share to Community by default; toggle on for private-only. */
    isPrivate: false,
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
      rounds: [...(s.rounds || [])],
      status: s.status,
      // Empty when unset so the field shows a placeholder, not a mystery "5".
      level: s.level ? String(s.level) : "",
      packId: s.pack_id,
      isPrivate: s.is_private ?? true,
    });
    setSaveError("");
    setShowForm(true);
    setExpanded(s.id);
  }

  function toggleFormRound(id: string) {
    setForm((prev) => {
      const on = prev.rounds.includes(id);
      return {
        ...prev,
        rounds: on ? prev.rounds.filter((r) => r !== id) : [...prev.rounds, id],
      };
    });
  }

  useEffect(() => {
    const editId = (location.state as { editStratId?: string } | null)?.editStratId;
    if (!editId || loading) return;
    const s = strats.find((row) => row.id === editId);
    if (s) openEdit(s);
    navigate(location.pathname, { replace: true, state: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, location.state, strats]);

  /** Packs shown in Match toggles: personal packs first, then unlocked system packs. */
  const togglePacks = useMemo(() => {
    const system = packs
      .filter((p) => p.visibility === "system" && !isPackLocked(p))
      .sort(compareSystemPacks);
    const mine = usePersonalPool ? myPrivatePacks : [];
    // Personal packs first, then Starter Pack → … → Meme
    return [...mine, ...system];
  }, [packs, usePersonalPool, myPrivatePacks]);

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

  const communityList = useMemo(() => {
    const q = query.trim().toLowerCase();
    return communityStrats
      .filter((s) => {
        if (s.side !== session.selected_side) return false;
        if (!isAllMaps(session.selected_map) && s.map !== session.selected_map) return false;
        return true;
      })
      .filter((s) => !q || `${s.callout} ${s.description} ${s.tasks.join(" ")} ${s.map}`.toLowerCase().includes(q));
  }, [communityStrats, session.selected_map, session.selected_side, query]);

  const poolList = useMemo(() => {
    const q = query.trim().toLowerCase();
    // Guest / local: enabledStrats already includes privately created strats.
    const base = usePersonalPool ? myPoolStrats : enabledStrats;
    return base
      .filter((s) => {
        if (s.side !== session.selected_side) return false;
        if (!isAllMaps(session.selected_map) && s.map !== session.selected_map) return false;
        return true;
      })
      .filter((s) => !q || `${s.callout} ${s.description} ${s.tasks.join(" ")} ${s.map}`.toLowerCase().includes(q));
  }, [usePersonalPool, myPoolStrats, enabledStrats, session.selected_map, session.selected_side, query]);

  const displayList =
    tab === "community" ? communityList : tab === "catalog" ? catalogList : poolList;

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

  async function resolveSavePackId() {
    if (editing?.pack_id && editing.owner_user_id === userId) {
      // Allow moving between personal packs on edit.
      if (form.packId && myPrivatePacks.some((p) => p.id === form.packId)) return form.packId;
      return editing.pack_id;
    }
    if (form.packId && myPrivatePacks.some((p) => p.id === form.packId)) return form.packId;
    if (defaultPackId) return defaultPackId;
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
    const rounds = form.rounds.filter((r) => ROUND_OPTIONS.some((o) => o.id === r));
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
        // Public Community saves need a permanent account in cloud mode.
        if (!form.isPrivate && mode === "cloud" && supabaseReady && !isPermanent) {
          setSaveError("Sign in to share a call with Community (or mark it Private).");
          return;
        }
        const packId = await resolveSavePackId();
        await upsertPrivateStrat(userId, packId, {
          id: editing?.id,
          ...draft,
          site,
          rounds,
          status: form.status,
          links,
          level: Number.isFinite(levelNum) ? levelNum : undefined,
          is_private: form.isPrivate,
        });
        setTab(form.isPrivate ? "pool" : "community");
      }
      setShowForm(false);
      setEditing(null);
      await refresh();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Could not save strat");
    }
  }

  async function handleCreatePack() {
    setPackError("");
    const title = packDraftTitle.trim();
    if (!title) return;
    setPackBusy(true);
    try {
      const id = await createPrivatePack(title);
      setPackDraftTitle("");
      setCatalogTargetPack(id);
    } catch (e) {
      setPackError(e instanceof Error ? e.message : "Could not create pack");
    } finally {
      setPackBusy(false);
    }
  }

  async function handleRenamePack(packId: string) {
    setPackError("");
    const title = renameTitle.trim();
    if (!title) return;
    setPackBusy(true);
    try {
      await renamePrivatePack(packId, title);
      setRenamingPackId(null);
      setRenameTitle("");
    } catch (e) {
      setPackError(e instanceof Error ? e.message : "Could not rename");
    } finally {
      setPackBusy(false);
    }
  }

  async function handleDeletePack(packId: string) {
    setPackError("");
    setPackBusy(true);
    try {
      await deletePrivatePack(packId);
      if (catalogTargetPack === packId) setCatalogTargetPack(defaultPackId || "");
    } catch (e) {
      setPackError(e instanceof Error ? e.message : "Could not delete pack");
    } finally {
      setPackBusy(false);
    }
  }

  if (loading) return <div className="empty">Loading playbook…</div>;

  return (
    <div>
      <div className="panel">
        <p className="eyebrow">Packs</p>
        <p className="muted" style={{ fontSize: 11, marginBottom: 8 }}>
          Match only shows packs that are On.
          {!usePersonalPool && (
            <>
              {" "}
              <button type="button" className="btn-ghost" style={{ padding: 0, fontSize: 11 }} onClick={() => navigate("/settings")}>
                Sign in
              </button>{" "}
              to build your own.
            </>
          )}
        </p>
        {togglePacks.map((p) => {
          const on = isPackInMatchPool(p.id, subscriptions, packs);
          const isMine = p.visibility === "private" && p.owner_user_id === userId;
          const count = isMine
            ? myPoolStrats.filter((s) => s.pack_id === p.id).length
            : p.strat_count;
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
              <div style={{ flex: 1, minWidth: 0 }}>
                {renamingPackId === p.id ? (
                  <div className="row" style={{ gap: 6 }}>
                    <input
                      className="input"
                      style={{ marginBottom: 0, flex: 1 }}
                      value={renameTitle}
                      onChange={(e) => setRenameTitle(e.target.value)}
                      maxLength={40}
                      aria-label="Pack name"
                    />
                    <button type="button" className="btn-ghost" disabled={packBusy} onClick={() => void handleRenamePack(p.id)}>
                      Save
                    </button>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => {
                        setRenamingPackId(null);
                        setRenameTitle("");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <strong style={{ fontSize: 13 }}>{p.title}</strong>
                    <p className="muted" style={{ marginTop: 2, fontSize: 11 }}>
                      {isMine
                        ? `${count} strat${count === 1 ? "" : "s"} · personal`
                        : p.description || `${count ?? "—"} strats`}
                    </p>
                  </>
                )}
                {isMine && renamingPackId !== p.id && (
                  <div className="row" style={{ marginTop: 6, gap: 6 }}>
                    <button
                      type="button"
                      className="btn-ghost"
                      style={{ padding: "2px 8px", fontSize: 11 }}
                      onClick={() => {
                        setRenamingPackId(p.id);
                        setRenameTitle(p.title);
                      }}
                    >
                      Rename
                    </button>
                    {myPrivatePacks.length > 1 && (
                      <button
                        type="button"
                        className="btn-ghost"
                        style={{ padding: "2px 8px", fontSize: 11, color: "var(--warn)" }}
                        disabled={packBusy}
                        onClick={() => void handleDeletePack(p.id)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
              <button className={`pill ${on ? "active" : ""}`} onClick={() => void setPackEnabled(p.id, !on)} type="button">
                {on ? "On" : "Off"}
              </button>
            </div>
          );
        })}

        {usePersonalPool && (
          <div style={{ marginTop: 12 }}>
            <p className="eyebrow">New personal pack</p>
            <div className="row" style={{ gap: 6 }}>
              <input
                className="input"
                style={{ marginBottom: 0, flex: 1 }}
                placeholder="e.g. Solo queue, 5-stack"
                value={packDraftTitle}
                maxLength={40}
                onChange={(e) => setPackDraftTitle(e.target.value)}
                disabled={packBusy || myPrivatePacks.length >= MAX_PRIVATE_PACKS}
              />
              <button
                type="button"
                className="btn-ghost"
                disabled={packBusy || !packDraftTitle.trim() || myPrivatePacks.length >= MAX_PRIVATE_PACKS}
                onClick={() => void handleCreatePack()}
              >
                <Plus size={14} /> Add
              </button>
            </div>
            <p className="muted" style={{ fontSize: 11, marginTop: 6 }}>
              {myPrivatePacks.length}/{MAX_PRIVATE_PACKS} personal packs
            </p>
            {packError && (
              <p className="banner" style={{ color: "var(--warn)", marginTop: 8 }}>
                {packError}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="panel" style={{ paddingBottom: 10 }}>
        <p className="eyebrow">Browse</p>
        <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
          {usePersonalPool && (
            <button type="button" className={`pill ${tab === "pool" ? "active" : ""}`} onClick={() => setTab("pool")}>
              My packs · {myPoolStrats.length}
            </button>
          )}
          <button type="button" className={`pill ${tab === "catalog" ? "active" : ""}`} onClick={() => setTab("catalog")}>
            Catalog · {catalogList.length}
          </button>
          <button
            type="button"
            className={`pill ${tab === "community" ? "active" : ""}`}
            onClick={() => setTab("community")}
          >
            Community · {communityList.length}
          </button>
        </div>
        {(tab === "catalog" || tab === "community") && usePersonalPool && myPrivatePacks.length > 0 && (
          <select
            className="input"
            style={{ marginTop: 10, marginBottom: 0 }}
            aria-label="Add strats to pack"
            value={
              myPrivatePacks.some((p) => p.id === catalogTargetPack)
                ? catalogTargetPack
                : defaultPackId || myPrivatePacks[0].id
            }
            onChange={(e) => setCatalogTargetPack(e.target.value)}
          >
            {myPrivatePacks.map((p) => (
              <option key={p.id} value={p.id}>
                Add into: {p.title}
              </option>
            ))}
          </select>
        )}
        {tab === "community" && (
          <p className="muted" style={{ fontSize: 11, marginTop: 8, marginBottom: 0 }}>
            Player calls shared from the app. Add the ones you like into your packs.
          </p>
        )}
      </div>

      <div className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p className="eyebrow">
              {tab === "community" ? "Community" : tab === "catalog" ? "Catalog" : usePersonalPool ? "Saved" : "Browse"}
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
                rounds: [],
                status: "ready",
                level: "",
                packId: defaultPackId || myPrivatePacks[0]?.id || "",
                isPrivate: false,
              });
              setShowForm(true);
            }}
          >
            <Plus size={14} /> New
          </button>
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
          {usePersonalPool && myPrivatePacks.length > 0 && !(editing && canEditShared && sharedStratTargetId(editing)) && (
            <select
              className="input"
              aria-label="Save to pack"
              value={
                myPrivatePacks.some((p) => p.id === form.packId)
                  ? form.packId
                  : defaultPackId || myPrivatePacks[0].id
              }
              onChange={(e) => setForm({ ...form, packId: e.target.value })}
            >
              {myPrivatePacks.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          )}
          {!(editing && canEditShared && sharedStratTargetId(editing)) && (
            <div
              className="row"
              style={{
                marginBottom: 10,
                justifyContent: "space-between",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <strong style={{ fontSize: 13 }}>Private</strong>
                <p className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                  {form.isPrivate ? "Only in your packs." : "Shared in Community for others to use."}
                </p>
              </div>
              <button
                type="button"
                className={`pill ${form.isPrivate ? "active" : ""}`}
                aria-pressed={form.isPrivate}
                onClick={() => setForm({ ...form, isPrivate: !form.isPrivate })}
              >
                {form.isPrivate ? "On" : "Off"}
              </button>
            </div>
          )}
          {!form.isPrivate && mode === "cloud" && supabaseReady && !isPermanent && (
            <p className="muted" style={{ fontSize: 11, marginBottom: 10 }}>
              <button type="button" className="btn-ghost" style={{ padding: 0, fontSize: 11 }} onClick={() => navigate("/settings")}>
                Sign in
              </button>{" "}
              to share with Community — or turn Private on.
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
          <div style={{ marginBottom: 10 }}>
            <p className="muted" style={{ fontSize: 11, marginBottom: 6 }}>
              When to call this — leave none for any round
            </p>
            <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
              {ROUND_OPTIONS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={`pill ${form.rounds.includes(r.id) ? "active" : ""}`}
                  aria-pressed={form.rounds.includes(r.id)}
                  onClick={() => toggleFormRound(r.id)}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <input
            className="input"
            placeholder="Difficulty 1–10 (optional)"
            inputMode="numeric"
            value={form.level}
            onChange={(e) => setForm({ ...form, level: e.target.value.replace(/[^\d]/g, "").slice(0, 2) })}
            aria-label="Execution difficulty 1 to 10"
          />
          <p className="muted" style={{ fontSize: 11, marginTop: -6, marginBottom: 10 }}>
            How hard the call is to run in freeze time — not player Elo. Blank = auto.
          </p>
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
          {tab === "community"
            ? "No community calls for this selection yet — be the first."
            : tab === "pool" && usePersonalPool
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
              const targetPack =
                myPrivatePacks.some((p) => p.id === catalogTargetPack)
                  ? catalogTargetPack
                  : defaultPackId || myPrivatePacks[0]?.id;
              const inPool = usePersonalPool
                ? !!findCopy(myPoolStrats, s.id, tab === "catalog" || tab === "community" ? targetPack : undefined)
                : false;
              const showingShop = tab === "catalog" || tab === "community";
              const community = isCommunityStrat(s) || tab === "community";
              return (
                <div key={s.id} style={{ borderBottom: "1px solid var(--line)", padding: "10px 0", opacity: locked && tab === "catalog" ? 0.75 : 1 }}>
                  <button type="button" className="list-item" style={{ margin: 0 }} onClick={() => setExpanded(open ? null : s.id)}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <strong>{s.callout}</strong>
                      <span className="row" style={{ gap: 4, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                        <StratVote strat={s} compact />
                        {usePersonalPool && (
                          <button
                            type="button"
                            className="btn-ghost"
                            style={{ padding: 4 }}
                            onClick={() => void toggleFavorite(s.id)}
                            aria-label={isFavorite(s.id) ? "Unpin favorite" : "Add to pack"}
                            title={
                              showingShop && !inPool && !isFavorite(s.id)
                                ? "Add to pack"
                                : undefined
                            }
                          >
                            <Star size={14} filled={isFavorite(s.id)} />
                          </button>
                        )}
                      </span>
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
                        {community
                          ? s.owner_user_id === userId
                            ? " · Community · You"
                            : " · Community"
                          : pack
                            ? ` · ${pack.title}`
                            : ""}
                        {s.owner_user_id === userId && s.is_private ? " · Private" : ""}
                        {s.tasks.length ? ` · ${s.tasks.length} tasks` : ""}
                        {locked ? " · Locked" : ""}
                        {usePersonalPool && showingShop && inPool ? " · In pack" : ""}
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
                        {usePersonalPool && showingShop && (
                          <button
                            type="button"
                            className="btn-ghost"
                            disabled={locked || busyId === s.id || inPool || s.owner_user_id === userId}
                            onClick={async () => {
                              setBusyId(s.id);
                              try {
                                await addToPool(s, targetPack);
                              } finally {
                                setBusyId(null);
                              }
                            }}
                          >
                            {locked
                              ? "Locked"
                              : s.owner_user_id === userId
                                ? "Yours"
                                : inPool
                                  ? "In pack"
                                  : "Add to pack"}
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
