import { useAuth } from "../lib/auth";
import { exportBookJson, isCloudMode, resetLocalDemo } from "../lib/api";
import { CATALOG_SIZE } from "../lib/catalog";
import { usePlaybook } from "../lib/playbook";
import { AuthScreen } from "./AuthScreen";
import { LogOut } from "../components/icons";

export function SettingsScreen() {
  const { mode, user, signOut, userId } = useAuth();
  const { packs, strats, refresh } = usePlaybook();

  return (
    <div>
      <div className="panel">
        <p className="eyebrow">Account</p>
        <h2 className="h2" style={{ fontSize: 24 }}>
          Settings
        </h2>
        <p className="muted">
          Mode: <strong>{mode}</strong>
          {user ? ` · ${user.email}` : isCloudMode() ? " · signed out" : " · local demo user"}
        </p>
        <p className="banner">
          Data stays on this device in local demo. With Supabase, packs and session sync to your account. Team sharing is reserved in the schema (Phase 5) — solo IGL for v1.
        </p>
        {isCloudMode() && user && (
          <button type="button" className="btn-ghost" style={{ marginTop: 10 }} onClick={() => signOut()}>
            <LogOut size={14} /> Sign out
          </button>
        )}
      </div>

      {isCloudMode() && !user && <AuthScreen />}

      <div className="panel">
        <p className="eyebrow">Library</p>
        <p className="muted">
          {packs.length} packs · {strats.length} strats · {CATALOG_SIZE} CSNADES lineups in catalog
        </p>
        <p className="muted" style={{ marginTop: 8, fontSize: 11 }}>
          User id: {userId.slice(0, 12)}…
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
          {!isCloudMode() && (
            <button
              type="button"
              className="btn-ghost"
              onClick={async () => {
                resetLocalDemo();
                await refresh();
              }}
            >
              Reset local demo
            </button>
          )}
        </div>
      </div>

      <div className="panel">
        <p className="eyebrow">Sibling app</p>
        <p className="muted">
          Lightweight freeze-time tool (no login):{" "}
          <a href="https://jonaslundervold.github.io/cs2-callout-app/" target="_blank" rel="noreferrer">
            cs2-callout-app
          </a>
        </p>
      </div>
    </div>
  );
}
