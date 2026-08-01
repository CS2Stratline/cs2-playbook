import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchLiveCall, type LiveCallView } from "../lib/api";
import { SiteIcon } from "../components/icons";
import { MapLogo } from "../components/MapLogo";
import { StratTasks } from "../components/StratTasks";

export function LiveScreen() {
  const { token = "" } = useParams();
  const [data, setData] = useState<LiveCallView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetchLiveCall(token);
      if (cancelled) return;
      if (!res) {
        setError("This live link is invalid or was revoked.");
        setData(null);
        return;
      }
      setError(null);
      setData(res);
    }
    void load();
    const id = window.setInterval(() => void load(), 2000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [token]);

  const side = data?.selected_side === "CT" ? "CT" : "T";
  const accent = side === "CT" ? "ct" : "";

  return (
    <div className="app-shell live-shell">
      <header className="topbar">
        <p className="brand">
          <span>Live call</span>
          Playbook
        </p>
      </header>

      {error && <div className="panel"><p className="muted">{error}</p></div>}

      {!error && !data && <div className="empty">Connecting…</div>}

      {data && !data.has_pick && (
        <div className="panel">
          <p className="eyebrow">{data.selected_map} · {side}</p>
          <h2 className="h2" style={{ fontSize: 22 }}>
            Waiting for a call
          </h2>
          <p className="muted">The IGL has not picked a strat yet. This view updates automatically.</p>
        </div>
      )}

      {data?.has_pick && (
        <div className="panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span className={`badge badge-map ${accent === "ct" ? "five_stack" : "pro"}`}>
              <MapLogo map={data.selected_map} size={16} />
              {data.site ? (
                <>
                  {data.selected_map}
                  <SiteIcon site={String(data.site)} size={12} />
                  {String(data.site).toUpperCase()}
                </>
              ) : (
                data.selected_map
              )}
            </span>
          </div>
          <div className="callout-hero">{data.callout}</div>
          {data.description && <p className="muted" style={{ marginBottom: 10 }}>{data.description}</p>}
          <StratTasks tasks={data.tasks} links={data.links} accent={accent} />
        </div>
      )}

      <p className="muted" style={{ textAlign: "center", marginTop: 16, fontSize: 12 }}>
        <Link to="/match" style={{ color: "var(--dim)" }}>
          Open your own Match
        </Link>
      </p>
    </div>
  );
}
