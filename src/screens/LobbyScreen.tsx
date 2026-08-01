import { Link } from "react-router-dom";
import { usePlaybook } from "../lib/playbook";
import { TIER_LABEL, type PackTier } from "../lib/types";
import { Pack } from "../components/icons";

export function LobbyScreen() {
  const { packs, subscriptions, setPackEnabled, enabledStrats, loading } = usePlaybook();

  if (loading) return <div className="empty">Loading packs…</div>;

  const byTier = (["pug", "five_stack", "pro"] as PackTier[]).map((tier) => ({
    tier,
    items: packs.filter((p) => p.tier === tier),
  }));

  return (
    <div>
      <div className="panel">
        <p className="eyebrow">Pre-match</p>
        <h2 className="h2">Strat packs</h2>
        <p className="muted">
          Enable packs before the game. Match Surprise / Pick draws from the union of enabled packs. Favorites pin to the top of Pick.
        </p>
        <p className="banner">{enabledStrats.length} strats in your Match pool right now.</p>
        <Link to="/match" className="btn btn-primary" style={{ display: "block", textAlign: "center", marginTop: 12, textDecoration: "none" }}>
          Open Match
        </Link>
      </div>

      {byTier.map(({ tier, items }) =>
        items.length ? (
          <div key={tier} className="panel">
            <p className="eyebrow">{TIER_LABEL[tier]}</p>
            {items.map((p) => {
              const on = subscriptions[p.id] !== false;
              return (
                <div
                  key={p.id}
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "flex-start",
                    padding: "10px 0",
                    borderBottom: "1px solid var(--line)",
                  }}
                >
                  <Pack size={18} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <strong>{p.title}</strong>
                      <span className={`badge ${p.tier}`}>{TIER_LABEL[p.tier]}</span>
                      {p.visibility === "system" ? <span className="badge">System</span> : <span className="badge">Yours</span>}
                    </div>
                    <p className="muted" style={{ marginTop: 4 }}>
                      {p.description}
                    </p>
                    <p className="muted" style={{ marginTop: 4, fontSize: 11 }}>
                      {p.strat_count ?? "—"} strats
                    </p>
                  </div>
                  <button
                    className={`pill ${on ? "active" : ""}`}
                    onClick={() => setPackEnabled(p.id, !on)}
                    type="button"
                  >
                    {on ? "On" : "Off"}
                  </button>
                </div>
              );
            })}
          </div>
        ) : null
      )}
    </div>
  );
}
