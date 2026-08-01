import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import {
  ensureLiveShareToken,
  exportBookJson,
  isCloudMode,
  isSupabaseConfigured,
  listAdminProfiles,
  regenerateLiveShareToken,
  resetLocalDemo,
  setAdminByEmail,
} from "../lib/api";
import type { AdminProfile } from "../lib/types";
import { CATALOG_SIZE } from "../lib/catalog";
import { usePlaybook } from "../lib/playbook";
import { AuthScreen } from "./AuthScreen";
import { LevelLegend } from "../components/LevelBadge";
import { LogOut } from "../components/icons";
import { authRedirectTo } from "../lib/supabase";

export function SettingsScreen() {
  const { mode, user, signOut, userId, supabaseReady, canEditShared, canManageAdmins, profile, refreshProfile } =
    useAuth();
  const { packs, strats, refresh } = usePlaybook();
  const baseUrl = typeof window !== "undefined" ? authRedirectTo() || window.location.href.split("#")[0] : "";
  const [liveToken, setLiveToken] = useState<string | null>(null);
  const [liveMsg, setLiveMsg] = useState("");
  const [liveBusy, setLiveBusy] = useState(false);
  const [admins, setAdmins] = useState<AdminProfile[]>([]);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminMsg, setAdminMsg] = useState("");
  const [adminBusy, setAdminBusy] = useState(false);

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

  useEffect(() => {
    if (!canManageAdmins) {
      setAdmins([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const rows = await listAdminProfiles();
        if (!cancelled) setAdmins(rows);
      } catch {
        if (!cancelled) setAdmins([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canManageAdmins, profile?.is_super_admin]);

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
        <p className="eyebrow">Skill colors</p>
        <p className="muted" style={{ marginBottom: 10 }}>
          Each strat has a FACEIT-style execution level (1–10): how hard the call is to run in freeze time — not your personal Elo.
        </p>
        <LevelLegend />
      </div>

      <div className="panel">
        <p className="eyebrow">Shared edits</p>
        {canEditShared ? (
          <p className="muted">
            You can edit Fundamentals / Stack strats from Match or Playbook. Changes save for everyone
            {mode === "local" ? " on this device (local demo)." : " (admin)."}
          </p>
        ) : (
          <p className="muted">
            Shared library edits are admin-only. Ask a super admin to add your email in Settings → Admins (you must
            sign in once first).
          </p>
        )}
        {profile?.is_super_admin ? (
          <p className="banner" style={{ marginTop: 8 }}>
            Super admin · can edit strats and manage admins
          </p>
        ) : profile?.is_admin ? (
          <p className="banner" style={{ marginTop: 8 }}>
            Admin · shared edit enabled
          </p>
        ) : null}
        {adminMsg && !canManageAdmins && <p className="banner" style={{ marginTop: 8 }}>{adminMsg}</p>}
      </div>

      {canManageAdmins && (
        <div className="panel">
          <p className="eyebrow">Admins</p>
          <p className="muted" style={{ marginBottom: 10 }}>
            Super admin only. Add someone by the email they use to sign in — they must open the app once first so a
            profile exists. Admins can edit shared strats; only you can add or remove admins.
          </p>
          <div className="row" style={{ marginBottom: 10 }}>
            <input
              className="input"
              style={{ flex: 1 }}
              placeholder="email@example.com"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-primary"
              disabled={adminBusy || !adminEmail.trim()}
              onClick={async () => {
                setAdminBusy(true);
                setAdminMsg("");
                try {
                  await setAdminByEmail(adminEmail, true);
                  setAdminEmail("");
                  setAdmins(await listAdminProfiles());
                  setAdminMsg("Admin added");
                  await refreshProfile();
                } catch (e) {
                  setAdminMsg(e instanceof Error ? e.message : "Could not add admin");
                } finally {
                  setAdminBusy(false);
                }
              }}
            >
              Add
            </button>
          </div>
          {admins.length === 0 ? (
            <p className="muted">No admins loaded.</p>
          ) : (
            admins.map((a) => (
              <div
                key={a.id}
                className="row"
                style={{
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderTop: "1px solid var(--line)",
                  padding: "8px 0",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <strong style={{ display: "block", fontSize: 14 }}>{a.email || a.id.slice(0, 8)}</strong>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {a.is_super_admin ? "Super admin" : "Admin"}
                    {a.display_name ? ` · ${a.display_name}` : ""}
                  </span>
                </div>
                {!a.is_super_admin && (
                  <button
                    type="button"
                    className="btn-ghost"
                    style={{ color: "var(--warn)" }}
                    disabled={adminBusy}
                    onClick={async () => {
                      if (!a.email) return;
                      setAdminBusy(true);
                      setAdminMsg("");
                      try {
                        await setAdminByEmail(a.email, false);
                        setAdmins(await listAdminProfiles());
                        setAdminMsg("Admin removed");
                      } catch (e) {
                        setAdminMsg(e instanceof Error ? e.message : "Could not remove admin");
                      } finally {
                        setAdminBusy(false);
                      }
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))
          )}
          {adminMsg && <p className="banner" style={{ marginTop: 8 }}>{adminMsg}</p>}
          {mode === "cloud" && (
            <p className="muted" style={{ marginTop: 10, fontSize: 11 }}>
              First-time bootstrap (SQL once): set your account as super admin after migrations 007 + 008 — see DEPLOY.md.
            </p>
          )}
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
