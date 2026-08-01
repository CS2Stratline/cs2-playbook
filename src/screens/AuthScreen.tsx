import { useState } from "react";
import { useAuth } from "../lib/auth";
import { isCloudMode } from "../lib/api";

export function AuthScreen() {
  const { signInWithEmail, mode } = useAuth();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  if (!isCloudMode()) {
    return (
      <div className="panel">
        <p className="eyebrow">Local demo</p>
        <h2 className="h2">Cloud Playbook</h2>
        <p className="muted">
          Supabase env vars are not set. You are running a full local demo with system packs (PUG / 5-stack / Pro), favorites, and Match — data stays in this browser.
        </p>
        <p className="banner">Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable magic-link login and cloud sync.</p>
      </div>
    );
  }

  return (
    <div className="panel">
      <p className="eyebrow">Sign in</p>
      <h2 className="h2">Cloud Playbook</h2>
      <p className="muted">Email a magic link to sync packs and session across devices. Mode: {mode}.</p>
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
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? "Sending…" : "Send magic link"}
        </button>
      </form>
      {msg && <p className="banner">{msg}</p>}
    </div>
  );
}
