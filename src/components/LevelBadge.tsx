import { FaceitLevelIcon } from "./FaceitLevelIcon";
import { FACEIT_LEVEL_ELO, type FaceitLevel } from "../lib/faceitLevels";

type Props = {
  level: FaceitLevel | "challenger";
  size?: number;
  title?: string;
  showLabel?: boolean;
};

/** FACEIT skill badge — exact icon style + optional "Lv N" label. */
export function LevelBadge({ level, size = 22, title, showLabel }: Props) {
  const label =
    level === "challenger"
      ? "Challenger · Top 1,000"
      : `Level ${level} · ${FACEIT_LEVEL_ELO[level]} Elo`;

  return (
    <span className="level-badge-wrap" title={title || label}>
      <FaceitLevelIcon level={level} size={size} />
      {showLabel && (
        <span className="level-badge-label">Lv {level === "challenger" ? "C" : level}</span>
      )}
    </span>
  );
}

/** Compact strip of levels 1–10 for Settings / legend. */
export function LevelLegend({ active }: { active?: FaceitLevel }) {
  const levels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as FaceitLevel[];
  return (
    <div className="level-legend" aria-label="FACEIT skill level colors">
      {levels.map((lv) => (
        <LevelBadge key={lv} level={lv} size={active === lv ? 28 : 22} />
      ))}
    </div>
  );
}
