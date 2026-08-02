import { useState } from "react";
import { useAuth } from "../lib/auth";
import { isSupabaseConfigured } from "../lib/api";

export function AuthScreen() {
  const { signInWithEmail, signInWithDiscord, supabaseReady } = useAuth();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  if (!isSupabaseConfigured() && !supabaseReady) {
    return (
      <div className="panel">
        <p className="eyebrow">Local only</p>
        <p className="muted">Supabase is not configured.</p>
      </div>
    );
  }

  return (
    <div className="panel">
      <p className="eyebrow">Sign in</p>
      <h2 className="h2" style={{ fontSize: 22 }}>
        Sync across devices
      </h2>

      <button
        type="button"
        className="btn btn-primary"
        style={{ marginBottom: 10 }}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setMsg("");
          const res = await signInWithDiscord();
          setBusy(false);
          if (res.error) setMsg(res.error);
        }}
      >
        Continue with Discord
      </button>

      <p className="eyebrow" style={{ marginTop: 8 }}>
        Or email
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setMsg("");
          const res = await signInWithEmail(email.trim());
          setBusy(false);
          setMsg(res.error || "Check your email for the login link.");
        }}
      >
        <input
          className="input"
          type="email"
          required
          placeholder="you@team.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button className="btn-ghost" type="submit" disabled={busy} style={{ width: "100%", padding: 12 }}>
          {busy ? "Sending…" : "Send magic link"}
        </button>
      </form>
      {msg && <p className="banner">{msg}</p>}
    </div>
  );
}
