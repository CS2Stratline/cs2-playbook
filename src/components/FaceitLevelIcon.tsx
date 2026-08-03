import type { FaceitLevel } from "../lib/faceitLevels";

/**
 * FACEIT skill icons from static assets in /public/levels/.
 *
 * Expected files:
 *   public/levels/1.png … public/levels/10.png
 *
 * PNG preferred; .webp / .svg with the same basename also work.
 */
const EXT_CANDIDATES = ["png", "webp", "svg"] as const;

function levelAssetUrl(level: FaceitLevel, ext: string) {
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
  // Challenger not used. Map to level 10 artwork if ever requested.
  const resolved: FaceitLevel = level === "challenger" ? 10 : level;
  const primary = levelAssetUrl(resolved, EXT_CANDIDATES[0]);

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
          img.src = levelAssetUrl(resolved, EXT_CANDIDATES[next]);
          return;
        }
        img.style.visibility = "hidden";
      }}
    />
  );
}
