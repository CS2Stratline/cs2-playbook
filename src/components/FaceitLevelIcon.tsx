import type { FaceitLevel } from "../lib/faceitLevels";

/**
 * FACEIT skill icons from static assets in /public/levels/.
 *
 * Drop your files as:
 *   public/levels/1.png … public/levels/10.png
 *   public/levels/challenger.png  (optional)
 *
 * PNG / WebP / SVG all work — keep the basename (1–10).
 */
const EXT_CANDIDATES = ["png", "webp", "svg"] as const;

function levelAssetUrl(level: FaceitLevel | "challenger", ext: string) {
  const base = import.meta.env.BASE_URL || "/";
  const root = base.endsWith("/") ? base : `${base}/`;
  return `${root}levels/${level}.${ext}`;
}

export function FaceitLevelIcon({
  level,
  size = 22,
  className,
}: {
  level: FaceitLevel | "challenger";
  size?: number;
  className?: string;
}) {
  // Prefer png, then webp, then svg — browser 404s flip via onError.
  const primary = levelAssetUrl(level, EXT_CANDIDATES[0]);

  return (
    <img
      className={className}
      src={primary}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      draggable={false}
      style={{ width: size, height: size, objectFit: "contain", display: "block", flexShrink: 0 }}
      onError={(e) => {
        const img = e.currentTarget;
        const tried = Number(img.dataset.extIndex || "0");
        const next = tried + 1;
        if (next < EXT_CANDIDATES.length) {
          img.dataset.extIndex = String(next);
          img.src = levelAssetUrl(level, EXT_CANDIDATES[next]);
          return;
        }
        // Last resort: hide broken image rather than show a sad icon.
        img.style.visibility = "hidden";
      }}
    />
  );
}
