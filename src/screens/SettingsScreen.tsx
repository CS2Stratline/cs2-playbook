import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import {
  ensureLiveShareToken,
  exportBookJson,
  isCloudMode,
  listAdminProfiles,
  regenerateLiveShareToken,
  resetLocalDemo,
  setAdminByEmail,
} from "../lib/api";
import type { AdminProfile } from "../lib/types";
import { MAPS, SCHEMA_VERSION } from "../lib/types";
import { CATALOG_SIZE } from "../lib/catalog";
import { usePlaybook } from "../lib/playbook";
import { AuthScreen } from "./AuthScreen";
import { Discord, LogOut } from "../components/icons";
import { DISCORD_INVITE_URL } from "../lib/community";
import { authRedirectTo } from "../lib/supabase";

export function SettingsScreen() {
  const { mode, user, signOut, supabaseReady, canEditShared, canManageAdmins, profile, refreshProfile, isPermanent } =
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
  const canResetLocal = !isCloudMode();

  useEffect(() => {
    if (!isPermanent || !supabaseReady) {
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
  }, [isPermanent, supabaseReady]);

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
          {mode}
          {isPermanent
            ? ` · ${user?.email || user?.user_metadata?.full_name || user?.user_metadata?.name || "signed in"}`
            : " · guest"}
          {isPermanent && canEditShared ? (profile?.is_super_admin ? " · super admin" : " · admin") : ""}
        </p>
        {isPermanent && (
          <button type="button" className="btn-ghost" style={{ marginTop: 10 }} onClick={() => void signOut()}>
            <LogOut size={14} /> Sign out
          </button>
        )}
      </div>

      {supabaseReady && !isPermanent && <AuthScreen />}

      {isPermanent && (
        <div className="panel">
          <p className="eyebrow">Live call</p>
          <p className="muted">Teammates see your current Match call. No login needed.</p>
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
              Copy link
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
                  setLiveMsg("New link created");
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

      {canManageAdmins && (
        <div className="panel">
          <p className="eyebrow">Admins</p>
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
        </div>
      )}

      <div className="panel">
        <p className="eyebrow">Library</p>
        <p className="muted">
          {packs.length} packs · {strats.length} strats · {CATALOG_SIZE} lineups
        </p>
        <div className="row" style={{ marginTop: 10 }}>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              // Prefer live in-memory playbook data (cloud or local), not the local seed blob.
              const payload = isCloudMode()
                ? { version: SCHEMA_VERSION, maps: [...MAPS], packs, strats }
                : exportBookJson();
              const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = "playbook-export.json";
              a.click();
              URL.revokeObjectURL(a.href);
            }}
          >
            Export JSON
          </button>
          {canResetLocal ? (
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
        <p className="eyebrow">Community</p>
        <p className="muted" style={{ marginBottom: 10 }}>
          Call talk, feedback, and Strat Roulette.
        </p>
        <a className="btn-discord" href={DISCORD_INVITE_URL} target="_blank" rel="noreferrer">
          <Discord size={16} />
          Join Stratline on Discord
        </a>
      </div>
    </div>
  );
}
