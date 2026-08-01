import { FREEZE_SECONDS } from "../lib/types";

type Props = {
  secondsLeft: number;
  total?: number;
  /** When true, uses CT blue instead of T gold. */
  ct?: boolean;
};

/** Circular freeze-time countdown ring. */
export function FreezeTimer({ secondsLeft, total = FREEZE_SECONDS, ct }: Props) {
  const r = 14;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, secondsLeft / total));
  const urgent = secondsLeft <= 4;
  return (
    <div
      className={`freeze-timer${ct ? " ct" : ""}${urgent ? " urgent" : ""}`}
      aria-label={`${secondsLeft} seconds left`}
    >
      <svg viewBox="0 0 36 36" width={36} height={36}>
        <circle className="freeze-timer-track" cx="18" cy="18" r={r} />
        <circle
          className="freeze-timer-progress"
          cx="18"
          cy="18"
          r={r}
          strokeDasharray={`${pct * c} ${c}`}
          transform="rotate(-90 18 18)"
        />
      </svg>
      <span className="freeze-timer-num">{secondsLeft}</span>
    </div>
  );
}
