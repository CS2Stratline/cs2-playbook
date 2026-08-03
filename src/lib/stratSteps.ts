import type { StratLink } from "./types";
import { attachLinksToTasks } from "./taskLinks";

/** One freeze-time instruction — build-order style step. */
export type StratStep = {
  /** Local React key only; not persisted. */
  id: string;
  text: string;
  /** Primary lineup pinned to this step (optional). */
  link: StratLink | null;
};

export type StratBuild = {
  steps: StratStep[];
  /** Lineups not attached to a specific step. */
  extraLinks: StratLink[];
};

export const MAX_STRAT_STEPS = 5;
export const MAX_STRAT_LINKS = 8;

let stepSeq = 0;
export function newStepId(): string {
  stepSeq += 1;
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `step-${crypto.randomUUID()}`;
  }
  return `step-${Date.now().toString(36)}-${stepSeq}-${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyStep(text = ""): StratStep {
  return { id: newStepId(), text, link: null };
}

/** Template filler lines like "Smoke …" — drop on save until the user edits them. */
export function isPlaceholderStep(text: string): boolean {
  const t = String(text || "").trim();
  if (!t) return true;
  return /…$/.test(t) || /\.{2,}$/.test(t);
}

/** Rebuild an editable build from stored tasks + links. */
export function buildFromTasksLinks(tasks: string[], links: StratLink[] = []): StratBuild {
  const { rows, leftover } = attachLinksToTasks(tasks, links);
  const steps: StratStep[] = rows.map((row) => ({
    id: newStepId(),
    text: row.task,
    link: row.links[0] || null,
  }));
  // Extra matched links beyond the first per step, plus unmatched
  const extras: StratLink[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    for (const l of row.links.slice(1)) {
      if (!seen.has(l.url)) {
        seen.add(l.url);
        extras.push(l);
      }
    }
  }
  for (const l of leftover) {
    if (!seen.has(l.url)) {
      seen.add(l.url);
      extras.push(l);
    }
  }
  return {
    steps: steps.length ? steps : [emptyStep()],
    extraLinks: extras,
  };
}

/** Persist build → tasks[] + links[] (existing storage shape). */
export function tasksLinksFromBuild(build: StratBuild): { tasks: string[]; links: StratLink[] } {
  const steps = build.steps
    .map((s) => ({ ...s, text: s.text.trim() }))
    .filter((s) => s.text && !isPlaceholderStep(s.text))
    .slice(0, MAX_STRAT_STEPS);

  const tasks = steps.map((s) => s.text);
  const links: StratLink[] = [];
  const seen = new Set<string>();

  for (const s of steps) {
    if (s.link?.url && !seen.has(s.link.url)) {
      seen.add(s.link.url);
      links.push({ label: s.link.label.slice(0, 80), url: s.link.url });
    }
  }
  for (const l of build.extraLinks) {
    if (links.length >= MAX_STRAT_LINKS) break;
    if (!l.url || seen.has(l.url)) continue;
    seen.add(l.url);
    links.push({ label: (l.label || "Lineup").slice(0, 80), url: l.url });
  }

  return { tasks, links: links.slice(0, MAX_STRAT_LINKS) };
}

export type StratTemplateId = "blank" | "execute" | "setup" | "default" | "retake";

export type StratTemplate = {
  id: StratTemplateId;
  label: string;
  hint: string;
  /** Side-aware starter lines (placeholders the user edits). */
  lines: (side: "T" | "CT") => string[];
};

/** Lightweight starters — same idea as RTS build-order templates. */
export const STRAT_TEMPLATES: StratTemplate[] = [
  {
    id: "blank",
    label: "Blank",
    hint: "Empty steps",
    lines: () => [""],
  },
  {
    id: "execute",
    label: "Execute",
    hint: "Util → entry → plant",
    lines: (side) =>
      side === "T"
        ? ["Smoke …", "Smoke …", "Molly …", "Flash in, entry …", "Plant for …"]
        : ["Anchor …", "Support flash …", "Fall to … on contact", "Retake from …"],
  },
  {
    id: "setup",
    label: "Setup",
    hint: "Man counts / holds",
    lines: (side) =>
      side === "CT"
        ? ["2 …", "2 …", "1 mid", "Rotate early on info"]
        : ["Lurk …", "2 mid control", "2 … pressure", "Info call by …"],
  },
  {
    id: "default",
    label: "Default",
    hint: "Map control then hit",
    lines: (side) =>
      side === "T"
        ? ["Take map control …", "Trade space, wait for info", "Hit the weak site", "Util on contact"]
        : ["Soft …, strong …", "Mid info first", "Stack on read", "Save util for retake"],
  },
  {
    id: "retake",
    label: "Retake",
    hint: "Post-plant / retake",
    lines: (side) =>
      side === "CT"
        ? ["Clear close angles first", "Flash for entry", "Trade together", "Watch flank"]
        : ["Crossfire for plant", "One close, one deep", "Watch for retake util", "Play time"],
  },
];

export function applyTemplate(id: StratTemplateId, side: "T" | "CT"): StratBuild {
  const tpl = STRAT_TEMPLATES.find((t) => t.id === id) || STRAT_TEMPLATES[0];
  const lines = tpl.lines(side).slice(0, MAX_STRAT_STEPS);
  return {
    steps: lines.map((text) => emptyStep(text)),
    extraLinks: [],
  };
}
