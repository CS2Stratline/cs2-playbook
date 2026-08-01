import type { FaceitLevel } from "../lib/faceitLevels";
import { FACEIT_LEVEL_COLOR } from "../lib/faceitLevels";

/**
 * FACEIT skill icons (Lv 1–10) — dark disc, colored numeral, left arc that
 * fills with rank. Matched to the official badge set (support article +
 * platform icons): white→green→yellow→orange→red.
 */
export function FaceitLevelIcon({
  level,
  size = 22,
  className,
}: {
  level: FaceitLevel | "challenger";
  size?: number;
  className?: string;
}) {
  if (level === "challenger") {
    return (
      <svg className={className} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r="31" fill="#121212" />
        <g fill="#E10600">
          <path d="M18 40c2-8 6-14 14-18-2 6-2 12 0 18-5 1-10 1-14 0Z" />
          <path d="M46 40c-2-8-6-14-14-18 2 6 2 12 0 18 5 1 10 1 14 0Z" />
          <path d="M26 28 32 18l6 10-6 3Z" />
        </g>
      </svg>
    );
  }

  const color = FACEIT_LEVEL_COLOR[level];
  // Number color: Lv9 uses white numeral on orange arc (platform icon); Lv10 uses deep red numeral.
  const numColor = level === 1 ? "#FFFFFF" : level === 9 ? "#FFFFFF" : level === 10 ? "#B01010" : color;
  const arcColor = level === 10 ? "#FF1E1E" : color;

  // Arc span grows with level (degrees of a circle starting ~210° / 7 o'clock, clockwise).
  // Lv1 uses a diamond instead of an arc (exact platform icon).
  const arcDegrees: Record<FaceitLevel, number> = {
    1: 0,
    2: 36,
    3: 54,
    4: 90,
    5: 110,
    6: 150,
    7: 180,
    8: 230,
    9: 280,
    10: 300,
  };

  const start = 210; // degrees, 0 = 3 o'clock, CSS-like clockwise from there… we use SVG polar
  const sweep = arcDegrees[level];
  const r = 22;
  const cx = 32;
  const cy = 32;
  const arcPath = sweep > 0 ? describeArc(cx, cy, r, start, start + sweep) : "";

  return (
    <svg className={className} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="31" fill="#121212" />
      {level === 1 && (
        <rect x="14" y="40" width="7" height="7" rx="1" transform="rotate(45 17.5 43.5)" fill="#FFFFFF" />
      )}
      {level === 2 && (
        <rect x="12" y="38" width="10" height="4" rx="1.5" transform="rotate(-40 17 40)" fill={arcColor} />
      )}
      {sweep > 0 && level > 2 && (
        <path d={arcPath} fill="none" stroke={arcColor} strokeWidth="6" strokeLinecap="butt" />
      )}
      <text
        x="32"
        y="38"
        textAnchor="middle"
        fill={numColor}
        fontFamily="Arial Black, Arial, sans-serif"
        fontSize={level === 10 ? 22 : 26}
        fontWeight="800"
      >
        {level}
      </text>
    </svg>
  );
}

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const start = polar(cx, cy, r, endDeg);
  const end = polar(cx, cy, r, startDeg);
  const large = endDeg - startDeg <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y}`;
}
