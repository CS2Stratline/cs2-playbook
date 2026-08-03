import { useMemo } from "react";
import type { StratLink } from "../lib/types";
import { nadeChipClass, utilTagFromTask } from "../lib/nadeType";
import { attachLinksToTasks } from "../lib/taskLinks";
import { LineupChip } from "./LineupChip";

export type StratTaskLink = StratLink & { suggested?: boolean };

/** Call card tasks with lineup pills beside the matching line. */
export function StratTasks({
  tasks,
  links,
  accent = "",
}: {
  tasks: string[];
  links: StratTaskLink[];
  accent?: string;
}) {
  const suggestedKeys = useMemo(
    () => new Set(links.filter((l) => l.suggested).map((l) => `${l.url}\0${l.label}`)),
    [links]
  );

  const { rows, leftover } = useMemo(
    () => attachLinksToTasks(tasks, links.map(({ label, url }) => ({ label, url }))),
    [tasks, links]
  );

  const leftoverFull = leftover.map((l) => {
    const full = links.find((x) => x.url === l.url && x.label === l.label);
    return full || l;
  });

  if (!tasks.length && !links.length) return null;

  return (
    <div className={`task-rail ${accent}`}>
      {rows.map((row, i) => {
        const util = utilTagFromTask(row.task);
        return (
          <div key={i} className="task-row">
            <span className="task-step-num" aria-hidden>
              {i + 1}
            </span>
            {util && <span className={`task-util ${nadeChipClass(util.kind)}`}>{util.label}</span>}
            <p className="task-line">{row.task}</p>
            {row.links.length > 0 && (
              <div className="task-chips">
                {row.links.map((l, j) => (
                  <LineupChip
                    key={`${l.url}-${j}`}
                    label={l.label}
                    url={l.url}
                    compact
                    suggested={suggestedKeys.has(`${l.url}\0${l.label}`)}
                    title={suggestedKeys.has(`${l.url}\0${l.label}`) ? "Suggested from catalog" : undefined}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
      {leftoverFull.length > 0 && (
        <div className="task-row task-row-more">
          {tasks.length > 0 && <p className="task-more-label">More lineups</p>}
          <div className="task-chips">
            {leftoverFull.map((l, i) => (
              <LineupChip
                key={`m-${l.url}-${i}`}
                label={l.label}
                url={l.url}
                compact
                suggested={suggestedKeys.has(`${l.url}\0${l.label}`)}
                title={suggestedKeys.has(`${l.url}\0${l.label}`) ? "Suggested from catalog" : undefined}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
