/**
 * FACEIT CS2 skill levels (1–10).
 * Elo brackets: https://support.faceit.com/hc/en-us/articles/10525200579740-FACEIT-CS2-Elo-and-skill-levels
 * Badge art lives in public/levels/ (PNG), not hex colors.
 */
export type FaceitLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export const FACEIT_LEVEL_ELO: Record<FaceitLevel, string> = {
  1: "100 – 500",
  2: "501 – 750",
  3: "751 – 900",
  4: "901 – 1050",
  5: "1051 – 1200",
  6: "1201 – 1350",
  7: "1351 – 1530",
  8: "1531 – 1750",
  9: "1751 – 2000",
  10: "2001+",
};

export function clampFaceitLevel(n: number): FaceitLevel {
  const v = Math.round(n);
  if (v <= 1) return 1;
  if (v >= 10) return 10;
  return v as FaceitLevel;
}

/**
 * Heuristic: how hard is this strat to execute in a real freeze-time call?
 * Used when assigning / regenerating levels — not a substitute for curated values.
 */
export function estimateStratLevel(input: {
  tier?: "pug" | "five_stack" | "pro" | string;
  callout?: string;
  description?: string;
  tasks?: string[];
  links?: { label?: string; url?: string }[];
  rounds?: string[];
  side?: string;
}): FaceitLevel {
  const callout = (input.callout || "").toLowerCase();
  const desc = (input.description || "").toLowerCase();
  const tasks = (input.tasks || []).map((t) => t.toLowerCase());
  const blob = `${callout} ${desc} ${tasks.join(" ")}`;
  const rounds = input.rounds || [];
  const links = input.links?.length || 0;
  const utilHits = (blob.match(/\b(smoke|flash|molly|molotov|nade|hegrenade|incendiary)\b/g) || []).length;

  let level =
    input.tier === "pro" ? 8 : input.tier === "five_stack" ? 6 : input.tier === "pug" ? 3 : 5;

  // Easy: rushes / pistol-eco / bare holds
  if (/\brush\b|\bfast\b|\bpop\b/.test(blob) || rounds.some((r) => r === "pistol" || r === "eco")) {
    level -= 2;
  }
  if (/\bhold\b|\bstack\b/.test(callout) && utilHits <= 1 && input.side === "CT") {
    level -= 1;
  }
  if (/\bdefault\b/.test(callout) && utilHits === 0) {
    level -= 1;
  }

  // Harder: dense util, fakes, splits, retakes
  if (utilHits >= 3 || links >= 3) level += 1;
  if (utilHits >= 5 || links >= 5) level += 1;
  if (/\bfake\b|\bsplit\b|\bretake\b|\bfour in\b|\bunder split\b/.test(blob)) level += 2;
  if (tasks.length >= 5) level += 1;

  return clampFaceitLevel(level);
}

/** Pack-tier → representative FACEIT level (for pack list chrome). */
export function tierToFaceitLevel(tier: "pug" | "five_stack" | "pro"): FaceitLevel {
  if (tier === "pug") return 3;
  if (tier === "five_stack") return 7;
  return 10;
}
