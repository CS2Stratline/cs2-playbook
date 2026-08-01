import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import {
  ensureLiveShareToken,
  exportBookJson,
  isCloudMode,
  isSupabaseConfigured,
  regenerateLiveShareToken,
  resetLocalDemo,
} from "../lib/api";
import { CATALOG_SIZE } from "../lib/catalog";
import { usePlaybook } from "../lib/playbook";
import { AuthScreen } from "./AuthScreen";
import { LogOut } from "../components/icons";
import { authRedirectTo } from "../lib/supabase";

export function SettingsScreen() {
  const { mode, user, signOut, userId, supabaseReady } = useAuth();
  const { packs, strats, refresh } = usePlaybook();
  const baseUrl = typeof window !== "undefined" ? authRedirectTo() || window.location.href.split("#")[0] : "";
  const [liveToken, setLiveToken] = useState<string | null>(null);
  const [liveMsg, setLiveMsg] = useState("");
  const [liveBusy, setLiveBusy] = useState(false);

  const liveUrl = liveToken && baseUrl ? `${baseUrl.replace(/\/$/, "")}/#/live/${liveToken}` : "";

  useEffect(() => {
    if (!user || !supabaseReady) {
      setLiveToken(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const token = await ensureLiveShareToken();
        if (!cancelled) {
          setLiveToken(token);
          setLiveMsg("");
        }
      } catch (e) {
        if (!cancelled) setLiveMsg(e instanceof Error ? e.message : "Could not create live link");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, supabaseReady]);

  return (
    <div>
      <div className="panel">
        <p className="eyebrow">Account</p>
        <h2 className="h2" style={{ fontSize: 24 }}>
          Settings
        </h2>
        <p className="muted">
          Mode: <strong>{mode}</strong>
          {user
            ? ` · ${user.email || user.user_metadata?.full_name || user.user_metadata?.name || "signed in"}`
            : " · guest (this device only)"}
        </p>
        <p className="banner">
          Login is optional. Guests get Match with Fundamentals + Stack on this phone. Sign in to sync that pool across devices and share a live-call link — Match stays ready either way.
        </p>
        {user && (
          <button type="button" className="btn-ghost" style={{ marginTop: 10 }} onClick={() => void signOut()}>
            <LogOut size={14} /> Sign out
          </button>
        )}
      </div>

      {supabaseReady && !user && (
        <div className="panel">
          <AuthScreen />
        </div>
      )}

      {user && (
        <div className="panel">
          <p className="eyebrow">Live call link</p>
          <p className="muted">
            Private URL for teammates — no login. They see your current Match call and it updates as you change strats.
          </p>
          <input className="input" readOnly value={liveUrl || (liveMsg ? "—" : "Creating link…")} onFocus={(e) => e.target.select()} />
          <div className="row">
            <button
              type="button"
              className="btn-ghost"
              disabled={!liveUrl}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(liveUrl);
                  setLiveMsg("Copied");
                } catch {
                  setLiveMsg("Could not copy");
                }
              }}
            >
              Copy live link
            </button>
            <button
              type="button"
              className="btn-ghost"
              disabled={liveBusy}
              onClick={async () => {
                setLiveBusy(true);
                setLiveMsg("");
                try {
                  const token = await regenerateLiveShareToken();
                  setLiveToken(token);
                  setLiveMsg("New link created (old one revoked)");
                } catch (e) {
                  setLiveMsg(e instanceof Error ? e.message : "Failed to regenerate");
                } finally {
                  setLiveBusy(false);
                }
              }}
            >
              Regenerate
            </button>
          </div>
          {liveMsg && <p className="banner">{liveMsg}</p>}
        </div>
      )}

      <div className="panel">
        <p className="eyebrow">Library</p>
        <p className="muted">
          {packs.length} packs · {strats.length} strats · {CATALOG_SIZE} CSNADES lineups in catalog
        </p>
        <p className="muted" style={{ marginTop: 8, fontSize: 11 }}>
          User id: {userId.slice(0, 12)}…{isCloudMode() ? " (cloud)" : " (local)"}
        </p>
        <div className="row" style={{ marginTop: 10 }}>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              const blob = new Blob([JSON.stringify(exportBookJson(), null, 2)], { type: "application/json" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = "playbook-export.json";
              a.click();
            }}
          >
            Export JSON
          </button>
          {!isSupabaseConfigured() || !user ? (
            <button
              type="button"
              className="btn-ghost"
              onClick={async () => {
                resetLocalDemo();
                await refresh();
              }}
            >
              Reset local data
            </button>
          ) : null}
        </div>
      </div>

      <div className="panel">
        <p className="eyebrow">Sibling app</p>
        <p className="muted">
          Lightweight freeze-time tool:{" "}
          <a href="https://jonaslundervold.github.io/cs2-callout-app/" target="_blank" rel="noreferrer">
            cs2-callout-app
          </a>
        </p>
      </div>
    </div>
  );
}
