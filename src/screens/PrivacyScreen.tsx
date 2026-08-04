import { Link } from "react-router-dom";

/**
 * Plain-language privacy notice. Reachable from Settings only — never forced on launch.
 */
export function PrivacyScreen() {
  return (
    <div>
      <div className="panel">
        <p className="eyebrow">Legal</p>
        <h2 className="h2" style={{ fontSize: 24 }}>
          Privacy
        </h2>
        <p className="muted" style={{ marginBottom: 12 }}>
          Stratline is a Counter-Strike 2 playbook tool. This page explains what we store and
          why. It is not legal advice.
        </p>
        <Link to="/settings" className="btn-ghost" style={{ display: "inline-flex" }}>
          ← Back to Settings
        </Link>
      </div>

      <div className="panel privacy-panel">
        <h3 className="privacy-h">What we don’t do</h3>
        <p className="muted">
          We do not run ads, marketing pixels, or third-party analytics (no Google Analytics,
          Facebook Pixel, etc.). Opening Stratline does not load those trackers.
        </p>

        <h3 className="privacy-h">Fonts</h3>
        <p className="muted">
          Typefaces are self-hosted with the app. We do not load fonts from Google’s CDN, so
          visiting Stratline does not contact Google Fonts.
        </p>

        <h3 className="privacy-h">Data on your device</h3>
        <p className="muted">
          Stratline uses your browser’s <code>localStorage</code> and{" "}
          <code>sessionStorage</code> so the playbook, packs, and demo data work offline and
          between visits. That storage is needed for the app to function.
        </p>

        <h3 className="privacy-h">When you use cloud features</h3>
        <p className="muted">
          If Supabase cloud is configured for this build, Stratline may create a session so
          community votes and (optionally) sign-in work:
        </p>
        <ul className="privacy-list muted">
          <li>
            <strong>Guest / anonymous session</strong> — a browser-linked id used for voting
            and similar features, without Discord or email.
          </li>
          <li>
            <strong>Signed-in account</strong> — if you choose Discord or email login, auth is
            handled by Supabase (and Discord when you pick that). Your profile, personal packs,
            favorites, and live-call link are stored in the project database so they sync across
            devices.
          </li>
        </ul>
        <p className="muted">
          Live call links share your current Match pick with teammates who open the link. They
          do not require viewers to sign in.
        </p>

        <h3 className="privacy-h">What you control</h3>
        <ul className="privacy-list muted">
          <li>Local demo: Settings → Reset local data clears this browser’s demo store.</li>
          <li>Signed in: Sign out from Settings. Contact us via Discord if you need account help.</li>
        </ul>

        <h3 className="privacy-h">Contact</h3>
        <p className="muted" style={{ marginBottom: 0 }}>
          Questions: Stratline Discord (link in Settings → Community).
        </p>
      </div>
    </div>
  );
}
