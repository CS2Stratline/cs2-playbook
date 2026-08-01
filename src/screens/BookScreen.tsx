import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePlaybook } from "../lib/playbook";
import { useAuth } from "../lib/auth";
import { bumpStratUsage, upsertPrivateStrat } from "../lib/api";
import type { PackTier, Strat } from "../lib/types";
import { FREEZE_SECONDS, TIER_LABEL, isPackInMatchPool, isPackLocked } from "../lib/types";
import { MapIcon, Pack, Plus, SideCT, SideT, SiteIcon, Star } from "../components/icons";
import { LineupChip } from "../components/LineupChip";
import { NADE_CATALOG } from "../lib/catalog";
import { suggestLineupLinks } from "../lib/lineupMatch";
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
    callout: "",
    description: "",
    tasks: "",
    site: "default",
    rounds: "" as string,
    status: "ready" as "ready" | "practice",
  });

  const privatePack = packs.find((p) => p.visibility === "private" && p.owner_user_id === userId);

  const systemPacks = useMemo(
    () =>
      (["pug", "five_stack", "pro"] as PackTier[]).map((tier) => ({
        tier,
        items: packs.filter((p) => p.tier === tier && p.visibility === "system"),
      })),
    [packs]
  );

  const catalogList = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalogStrats
      .filter((s) => s.map === session.selected_map && s.side === session.selected_side)
      .filter((s) => !q || `${s.callout} ${s.description} ${s.tasks.join(" ")}`.toLowerCase().includes(q));
  }, [catalogStrats, session.selected_map, session.selected_side, query]);

  const poolList = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = usePersonalPool ? myPoolStrats : enabledStrats;
    return base
      .filter((s) => s.map === session.selected_map && s.side === session.selected_side)
      .filter((s) => !q || `${s.callout} ${s.description} ${s.tasks.join(" ")}`.toLowerCase().includes(q));
  }, [usePersonalPool, myPoolStrats, enabledStrats, session.selected_map, session.selected_side, query]);

  const displayList = usePersonalPool && tab === "catalog" ? catalogList : poolList;

  const groups = useMemo(() => {
    if (session.selected_side === "CT") return [{ id: "ct", label: "CT setups", items: displayList }];
    return [
      { id: "a", label: "A site", items: displayList.filter((s) => s.site === "a") },
      { id: "b", label: "B site", items: displayList.filter((s) => s.site === "b") },
      { id: "mid", label: "Mid", items: displayList.filter((s) => s.site === "mid") },
      { id: "default", label: "Default / other", items: displayList.filter((s) => !s.site || s.site === "default") },
    ].filter((g) => g.items.length);
  }, [displayList, session.selected_side]);

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
    const draft = {
      map: session.selected_map,
      side: session.selected_side,
      callout: form.callout.trim(),
      description: form.description.trim(),
      tasks,
    };
    let links = editing?.links || [];
    if (!links.length) links = suggestLineupLinks(draft, NADE_CATALOG, { limit: 5 });
    await upsertPrivateStrat(userId, packId, {
      id: editing?.id,
      ...draft,
      site: session.selected_side === "T" ? (form.site as Strat["site"]) : null,
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
    const end = Date.now() + FREEZE_SECONDS * 1000;
    await bumpStratUsage(s.id);
    await setSession({
      selected_map: s.map,
      selected_side: s.side,
      site_filter: s.site || "all",
      current_pick_id: s.id,
      logged: null,
      timer_ends_at: end,
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
              Catalog
            </button>
          </div>
          <p className="muted">
            {tab === "pool"
              ? "Match uses only strats in My pool. Shop from Catalog or create your own."
              : "Browse levels and add strats to My pool. Advanced stays locked for now."}
          </p>
          {tab === "pool" && (
            <div className="row" style={{ marginTop: 10 }}>
              <button
                type="button"
                className="btn-ghost"
                disabled={!!busyId}
                onClick={async () => {
                  setBusyId("starter");
                  setStarterMsg("");
                  try {
                    const n = await addFundamentalsStarter(session.selected_map);
                    setStarterMsg(n ? `Added ${n} Fundamentals for ${session.selected_map}` : `Fundamentals for ${session.selected_map} already in your pool`);
                  } catch (e) {
                    setStarterMsg(e instanceof Error ? e.message : "Could not add starter kit");
                  } finally {
                    setBusyId(null);
                  }
                }}
              >
                Add Fundamentals for {session.selected_map}
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setEditing(null);
                  setForm({ callout: "", description: "", tasks: "", site: "default", rounds: "", status: "ready" });
                  setShowForm(true);
                }}
              >
                <Plus size={14} /> New
              </button>
            </div>
          )}
          {starterMsg && <p className="banner">{starterMsg}</p>}
        </div>
      ) : (
        <div className="panel">
          <p className="eyebrow">Packs</p>
          <p className="muted" style={{ marginBottom: 8 }}>
            Guest mode: toggle packs for Match. Sign in to shop individual strats into your own pool.
            {supabaseReady && !user ? " (Discord in Settings)" : ""}
          </p>
          <p className="muted" style={{ marginBottom: 8 }}>{enabledStrats.length} strats in the pool right now.</p>
          {systemPacks.map(({ tier, items }) =>
            items.length ? (
              <div key={tier} style={{ marginTop: 8 }}>
                <p className="eyebrow">{TIER_LABEL[tier]}</p>
                {items.map((p) => {
                  const locked = isPackLocked(p);
                  const on = !locked && isPackInMatchPool(p.id, subscriptions, packs);
                  return (
                    <div
                      key={p.id}
                      style={{
                        display: "flex",
                        gap: 10,
                        alignItems: "flex-start",
                        padding: "8px 0",
                        borderBottom: "1px solid var(--line)",
                        opacity: locked ? 0.72 : 1,
                      }}
                    >
                      <Pack size={16} />
                      <div style={{ flex: 1 }}>
                        <strong style={{ fontSize: 13 }}>{p.title}</strong>
                        <p className="muted" style={{ marginTop: 2, fontSize: 11 }}>
                          {p.strat_count ?? "—"} strats
                          {locked ? " · Premium soon" : ""}
                        </p>
                      </div>
                      {locked ? (
                        <span className="badge pro">Locked</span>
                      ) : (
                        <button className={`pill ${on ? "active" : ""}`} onClick={() => void setPackEnabled(p.id, !on)} type="button">
                          {on ? "On" : "Off"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : null
          )}
        </div>
      )}

      {usePersonalPool && tab === "catalog" && (
        <div className="panel">
          <p className="eyebrow">Levels</p>
          {systemPacks.map(({ tier, items }) =>
            items.map((p) => (
              <div key={p.id} className="row" style={{ marginBottom: 6 }}>
                <span className={`badge ${p.tier}`}>{TIER_LABEL[p.tier]}</span>
                <span className="muted" style={{ fontSize: 12 }}>
                  {p.title}
                  {isPackLocked(p) ? " · Locked" : ""}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      <div className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p className="eyebrow">{tab === "catalog" || !usePersonalPool ? "Browse" : "My pool"}</p>
            <h2 className="h2 h2-map" style={{ fontSize: 24 }}>
              <MapIcon map={session.selected_map} size={22} />
              {session.selected_map}
              <span className={`side-tag ${session.selected_side === "CT" ? "ct" : ""}`}>
                {session.selected_side === "CT" ? <SideCT size={14} /> : <SideT size={14} />}
                {session.selected_side}
              </span>
            </h2>
          </div>
          {!usePersonalPool && (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setEditing(null);
                setForm({ callout: "", description: "", tasks: "", site: "default", rounds: "", status: "ready" });
                setShowForm(true);
              }}
            >
              <Plus size={14} /> New
            </button>
          )}
        </div>
        <input className="input" placeholder="Search callouts and tasks…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      {showForm && (
        <div className="panel">
          <p className="eyebrow">{editing ? "Edit strat" : "New strat"}</p>
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
            <select className="input" value={form.site} onChange={(e) => setForm({ ...form, site: e.target.value })}>
              <option value="a">A</option>
              <option value="b">B</option>
              <option value="mid">Mid</option>
              <option value="default">Default</option>
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
            ? `My pool is empty for ${session.selected_map} ${session.selected_side}. Add Fundamentals above or shop the Catalog.`
            : "Nothing here for this map/side."}
        </div>
      ) : (
        groups.map((g) => (
          <div key={g.id} className="panel">
            <p className="eyebrow eyebrow-site">
              {g.id !== "ct" && g.id !== "default" ? <SiteIcon site={g.id} size={12} /> : null}
              {g.label}
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
                    <div className="meta">
                      {pack ? `${TIER_LABEL[pack.tier as PackTier]}` : ""}
                      {s.tasks.length ? ` · ${s.tasks.length} tasks` : ""}
                      {locked ? " · Locked" : ""}
                      {usePersonalPool && tab === "catalog" && inPool ? " · In pool" : ""}
                      {!open ? " · Tap for details" : ""}
                    </div>
                  </button>
                  {open && (
                    <div style={{ padding: "8px 4px 0" }}>
                      {s.description && <p className="muted">{s.description}</p>}
                      {s.tasks.map((t, i) => (
                        <p key={i} style={{ margin: "4px 0", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--dim)" }}>
                          {t}
                        </p>
                      ))}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                        {s.links.map((l, i) => (
                          <LineupChip key={i} label={l.label} url={l.url} />
                        ))}
                      </div>
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
