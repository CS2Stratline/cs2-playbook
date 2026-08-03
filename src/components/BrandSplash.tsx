import { stratlineMarkUrl } from "../lib/icons";

/** Full-shell branded wait state (auth boot, etc.). */
export function BrandSplash({ label = "Loading" }: { label?: string }) {
  return (
    <div className="app-shell splash-shell">
      <div className="splash" role="status" aria-live="polite" aria-label={label}>
        <img className="splash-mark" src={stratlineMarkUrl()} alt="" width={48} height={48} />
        <p className="splash-wordmark">Stratline</p>
        <p className="splash-label">{label}</p>
      </div>
    </div>
  );
}
