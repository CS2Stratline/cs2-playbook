import { FaceitLevelIcon } from "./FaceitLevelIcon";
import type { FaceitLevel } from "../lib/faceitLevels";

type Props = {
  level: FaceitLevel | "challenger";
  size?: number;
  title?: string;
  showLabel?: boolean;
};

/** FACEIT-style level badge: icon + optional "Lv N" label. */
export function LevelBadge({ level, size = 22, title, showLabel }: Props) {
  const label = level === "challenger" ? "Challenger" : `Level ${level}`;

  return (
    <span className="level-badge-wrap" title={title || label}>
      <FaceitLevelIcon level={level} size={size} />
      {showLabel && (
        <span className="level-badge-label">Lv {level === "challenger" ? "C" : level}</span>
      )}
    </span>
  );
}
