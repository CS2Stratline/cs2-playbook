import { useAuth } from "../lib/auth";
import { exportBookJson, isCloudMode, isSupabaseConfigured, resetLocalDemo } from "../lib/api";
import { CATALOG_SIZE } from "../lib/catalog";
import { usePlaybook } from "../lib/playbook";
import { AuthScreen } from "./AuthScreen";
import { LogOut } from "../components/icons";
import { authRedirectTo } from "../lib/supabase";

export function SettingsScreen() {
  const { mode, user, signOut, userId, supabaseReady } = useAuth();
  const { packs, strats, refresh } = usePlaybook();
  const shareUrl = typeof window !== "undefined" ? authRedirectTo() || window.location.href.split("#")[0] : "";

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
          Login is optional. Guests get full Match + system packs on this phone. Sign in to sync across devices. Share the app link below so teammates can open it without an account.
        </p>
        {user && (
          <button type="button" className="btn-ghost" style={{ marginTop: 10 }} onClick={() => signOut()}>
            <LogOut size={14} /> Sign out
          </button>
        )}
      </div>

      {supabaseReady && !user && (
        <div className="panel">
          <AuthScreen />
        </div>
      )}

      <div className="panel">
        <p className="eyebrow">Share (no login required)</p>
        <p className="muted">Send this link to the team. They can use packs and Match as guests.</p>
        <input className="input" readOnly value={shareUrl} onFocus={(e) => e.target.select()} />
        <button
          type="button"
          className="btn-ghost"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(shareUrl);
            } catch {
              /* ignore */
            }
          }}
        >
          Copy link
        </button>
      </div>

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
