import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePlaybook } from "../lib/playbook";
import { useAuth } from "../lib/auth";
import { bumpStratUsage, createPrivatePack, deleteStrat, upsertPrivateStrat } from "../lib/api";
import type { PackTier, Strat } from "../lib/types";
import { FREEZE_SECONDS, TIER_LABEL } from "../lib/types";
import { ExternalLink, Pack, Plus, Star } from "../components/icons";
import { NADE_CATALOG } from "../lib/catalog";
import { suggestLineupLinks } from "../lib/lineupMatch";

export function BookScreen() {
  const navigate = useNavigate();
  const { userId } = useAuth();
  const {
    strats,
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
  } = usePlaybook();
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Strat | null>(null);
  const [form, setForm] = useState({
    callout: "",
    description: "",
    tasks: "",
    site: "default",
    rounds: "" as string,
    status: "ready" as "ready" | "practice",
  });

  const privatePack = packs.find((p) => p.visibility === "private" && p.owner_user_id === userId);

  const byTier = (["pug", "five_stack", "pro"] as PackTier[]).map((tier) => ({
    tier,
    items: packs.filter((p) => p.tier === tier),
  }));

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return strats
      .filter((s) => s.map === session.selected_map && s.side === session.selected_side)
      .filter((s) => !q || `${s.callout} ${s.description} ${s.tasks.join(" ")}`.toLowerCase().includes(q));
  }, [strats, session.selected_map, session.selected_side, query]);

  const groups = useMemo(() => {
    if (session.selected_side === "CT") return [{ id: "ct", label: "CT setups", items: list }];
    return [
      { id: "a", label: "A site", items: list.filter((s) => s.site === "a") },
      { id: "b", label: "B site", items: list.filter((s) => s.site === "b") },
      { id: "mid", label: "Mid", items: list.filter((s) => s.site === "mid") },
      { id: "default", label: "Default / other", items: list.filter((s) => !s.site || s.site === "default") },
    ].filter((g) => g.items.length);
  }, [list, session.selected_side]);

  async function ensurePrivatePack() {
    if (privatePack) return privatePack.id;
    return createPrivatePack(userId, {
      title: "My pack",
      description: "Private strats",
      tier: "five_stack",
    });
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
    await refresh();
  }

  async function useInMatch(s: Strat) {
    if (subscriptions[s.pack_id] === false) {
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
      <div className="panel">
        <p className="eyebrow">Packs</p>
        <p className="muted" style={{ marginBottom: 8 }}>
          Toggle packs for your Match pool. {enabledStrats.length} strats enabled.
        </p>
        {byTier.map(({ tier, items }) =>
          items.length ? (
            <div key={tier} style={{ marginTop: 8 }}>
              <p className="eyebrow">{TIER_LABEL[tier]}</p>
              {items.map((p) => {
                const on = subscriptions[p.id] !== false;
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
                    <Pack size={16} />
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: 13 }}>{p.title}</strong>
                      <p className="muted" style={{ marginTop: 2, fontSize: 11 }}>
                        {p.strat_count ?? "—"} strats · {p.visibility === "system" ? "System" : "Yours"}
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

      <div className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p className="eyebrow">Playbook</p>
            <h2 className="h2" style={{ fontSize: 24 }}>
              {session.selected_map} {session.selected_side}
            </h2>
          </div>
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
        <div className="empty">Nothing here for this map/side. Enable packs above or add a strat.</div>
      ) : (
        groups.map((g) => (
          <div key={g.id} className="panel">
            <p className="eyebrow">{g.label}</p>
            {g.items.map((s) => {
              const open = expanded === s.id;
              const pack = packs.find((p) => p.id === s.pack_id);
              return (
                <div key={s.id} style={{ borderBottom: "1px solid var(--line)", padding: "10px 0" }}>
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
                      {pack ? `${pack.title} · ${TIER_LABEL[pack.tier as PackTier]}` : ""}
                      {s.tasks.length ? ` · ${s.tasks.length} tasks` : ""}
                      {s.links.length ? ` · ${s.links.length} lineups` : ""}
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
                          <a key={i} className="chip-link" href={l.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink size={11} /> {l.label}
                          </a>
                        ))}
                      </div>
                      <div className="row" style={{ marginTop: 8 }}>
                        <button type="button" className="btn-ghost" onClick={() => void useInMatch(s)}>
                          Use in Match
                        </button>
                        {s.owner_user_id === userId && (
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
                                await deleteStrat(userId, s.id);
                                await refresh();
                              }}
                            >
                              Delete
                            </button>
                          </>
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
