import type { FaceitLevel } from "../lib/faceitLevels";

/**
 * FACEIT skill icons from static assets in /public/levels/.
 * Files: public/levels/1.png … public/levels/10.png
 */
function levelAssetUrl(level: FaceitLevel) {
  const base = import.meta.env.BASE_URL || "/";
  const root = base.endsWith("/") ? base : `${base}/`;
  return `${root}levels/${level}.png`;
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

  return (
    <img
      className={className}
      src={levelAssetUrl(resolved)}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      draggable={false}
      style={{ width: size, height: size, objectFit: "contain", display: "block", flexShrink: 0 }}
      onError={(e) => {
        e.currentTarget.style.visibility = "hidden";
      }}
    />
  );
}
